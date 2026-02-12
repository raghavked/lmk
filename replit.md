# LMK - Personalized Recommendations App

## Overview

LMK is an AI-powered recommendation engine designed to provide personalized suggestions across five core categories: restaurants, movies, TV shows, books, and activities. The application leverages advanced AI models for recommendation ranking and "Plan My Day" features, utilizing user taste profiles and social signals to deliver highly relevant and engaging content. Its primary purpose is to offer intelligent, personalized discovery experiences to users.

The project aims for a robust and scalable architecture, incorporating features like extended caching, rate limiting, and comprehensive database indexing to support a growing user base. It focuses on a secure multi-user environment with Row Level Security across all data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: Next.js 14 with App Router (web), Expo/React Native (mobile)
- **UI**: React 18, TypeScript, Tailwind CSS
- **Design System**: Dark mode with a soft coral accent color (`#feafb0`)
- **Components**: Card-based displays, modal details, category tabs, pull-to-refresh.
- **State Management**: React hooks with `localStorage` for persistence.

### Backend
- **API Routes**: Next.js API routes (`/app/api/`)
- **Main Endpoint**: `/api/recommend` for all recommendation requests.
- **AI Integration**:
    - AI ranking primarily uses Claude (claude-3-haiku) via `AIRanker` class.
    - "Plan My Day" feature utilizes OpenAI (GPT-4o-mini) for generating plans and chat interactions.
    - AI personalization from ratings: AI ranker fetches user's past 50 ratings (loved/disliked items) to deeply personalize recommendations, incorporating specific preferences and past ratings into explanations.

### Data Management
- **Database**: Supabase (PostgreSQL)
- **Tables**: `profiles`, `ratings`, `friends`, `groups`, `group_members`, `group_messages`, `group_invites`, `polls`, `plan_sessions`. All tables have Row Level Security (RLS) policies.
- **Data Normalization**: External API data is normalized into a common object format.
- **Caching**: 15-minute recommendation cache, 30-minute AI response cache, user-aware caching of AI responses.

### Database Schema Notes
- **lmk_objects table**: Central object catalog. Ratings FK to this table. Must upsert objects before creating ratings.
  - Columns: id (uuid PK), created_at, updated_at, category (text NOT NULL), title (text), description (text), primary_image (text), secondary_images, external_ids, external_ratings, lmk_score, lmk_rating_count (int default 0), lmk_avg_rating, tags (array), mood_tags (array), location, price_level, time_commitment, availability, source_links (array), last_fetched, data_stale (bool default false)
- **ratings table**: Uses `object_id` (uuid FK to lmk_objects) to store item identifiers. API accepts `item_id` (string), converts to deterministic UUID via SHA256 hash, stores original ID in `context.original_id`.
  - Columns: id (uuid), user_id (uuid FK to profiles), object_id (uuid FK to lmk_objects), item_title (text), category (text), score (numeric), description (text), context (jsonb - stores metrics, original_id), photos (text[]), is_favorite (boolean), created_at, updated_at. Also has: rating (integer), review (text), feedback (text) columns.
  - **UUID conversion**: String item IDs (Yelp/TMDB) are converted to UUIDs via `stringToUUID()` using SHA256. Original ID stored in `context.original_id` and returned as `object_id` in API responses.
  - **Category-specific metrics (1-10)**: restaurants (Food Quality, Service, Ambiance), movies (Acting, Story, Cinematography), tv_shows (Acting, Plot, Production), reading (Writing, Story, Engagement), activities (Fun Factor, Value, Accessibility)
- **profiles table**: id matches Supabase auth user ID. Note: email is NOT stored in profiles, it lives in Supabase auth.users. Display names must be unique (case-insensitive, enforced in signup + profile POST/PATCH APIs).
  - Columns: id (uuid), full_name (text, unique), location (jsonb), taste_profile (jsonb), preferences_completed (boolean), created_at, updated_at
  - Note: Supabase profiles table does NOT have `avatar_url` column - do not query for it
- **group_messages table**: Uses `user_id` column (renamed from `sender_id`).
  - Columns: id (uuid), group_id (uuid), user_id (uuid), content (text), poll_id (uuid nullable), created_at
- **poll_options table**: Stores poll option data directly in columns. AI-generated options populate title/description/personalized_score on creation.
  - Columns: id (uuid PK), poll_id (uuid FK NOT NULL), title (text NOT NULL), description (text), personalized_score (real), votes (integer default 0), created_at
  - Note: Vote counts are tracked via `poll_votes` table for accuracy; `votes` column may be used for display caching.
- **poll_votes table**: Tracks user votes on polls (one vote per user per poll). Vote counts calculated from this table.
  - Columns: id (uuid), poll_id (uuid FK), option_id (uuid FK), user_id (uuid), created_at, UNIQUE(poll_id, user_id)
- **groups table**: Both `created_by` (uuid NOT NULL) and `creator_id` (uuid) columns must be set. `group_members` has NO `role` column.
- **RLS**: Disabled on all tables (rowsecurity=false). Direct Supabase client queries work without policies.
- **API trailing slashes**: next.config.js has `trailingSlash: true` - ALL API fetch calls must include trailing slashes to prevent 308 redirects.

### Authentication
- **Provider**: Supabase Auth, client-side `@supabase/auth-helpers-nextjs`.
- **Middleware**: `middleware.ts` for authentication checks and API rate limiting.
- **Profile Creation**: Robust multi-layer approach - database trigger (Supabase), API fallback (`/api/profile` POST), and client-side retry in `useAuth` hook.
- **Session Persistence**: Mobile AuthContext refreshes sessions on app resume (background → foreground) and proactively refreshes tokens near expiry.
- **Rate Limiting**: In-memory rate limiter in middleware.ts with per-route limits (auth: 10/min, recommend: 30/min, etc.).

### Features
- **Personalized Recommendations**: AI-driven suggestions across 5 categories based on user profiles and social signals.
- **"Plan My Day"**: AI-powered event planning with chat-based interface and session saving.
- **Location-Based Services**: Real-time geolocation with distance calculation, sorting, and filtering options.
- **Social Features**: Friends system (search, requests, viewing ratings), Group creation with chat and polls.
- **User Feedback**: 5-star rating system with optional reviews.
- **Preference Quiz**: Onboarding quiz to build initial taste profiles, influencing AI ranking.
- **Robust UX**: One-time onboarding, improved swipe gestures, better modal interactions, memory leak prevention, enhanced error handling, and skeleton loaders.

## External Dependencies

- **AI Providers**:
    - Anthropic (Claude)
    - OpenAI (GPT-4o-mini)
- **Data APIs**:
    - Yelp API (Restaurant data)
    - TMDB API (Movie and TV show data)
    - NewsAPI (Article data)
    - Open Library API (Book recommendations)
- **Database & Authentication**:
    - Supabase (PostgreSQL, Supabase Auth)
- **NPM Packages**:
    - `@anthropic-ai/sdk`
    - `@supabase/auth-helpers-nextjs`
    - `@supabase/supabase-js`
    - `axios`
    - `lucide-react`
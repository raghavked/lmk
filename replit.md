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
- **ratings table**: Uses `object_id` column (NOT `item_id`) to store item identifiers. Code accepts `item_id` in API requests but maps to `object_id` in database.
  - Columns: id (uuid), user_id (uuid), object_id (text), item_title (text), category (text), rating (integer 1-5), review (text), is_favorite (boolean), created_at, updated_at
- **profiles table**: id matches Supabase auth user ID. Note: email is NOT stored in profiles, it lives in Supabase auth.users.
  - Columns: id (uuid), full_name (text), avatar_url (text), location (jsonb), taste_profile (jsonb), preferences_completed (boolean), created_at, updated_at

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
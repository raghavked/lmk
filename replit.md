# LMK - Personalized Recommendations App

## Overview

LMK is an AI-powered recommendation engine that provides personalized suggestions across multiple categories: restaurants, movies, TV shows, YouTube videos, books, and activities. The app uses Claude AI to generate personalized rankings and explanations based on user taste profiles and social signals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router
- **UI**: React 18 with TypeScript, Tailwind CSS for styling
- **Design System**: Dark mode aesthetic with coral accent color (#FF6B6B) for AI metrics
- **Components**: Card-based recommendation display with modal details, category tabs, pull-to-refresh
- **State Management**: React hooks (useState, useEffect, useCallback) with localStorage for persistence

### Backend Architecture
- **API Routes**: Next.js API routes under `/app/api/`
- **Main Endpoint**: `/api/recommend` handles all recommendation requests
- **AI Integration**: AIRanker class in `lib/ai/ranker.ts` uses Claude (Anthropic) or OpenAI for intelligent ranking
- **External APIs**: Aggregates data from multiple sources then ranks with AI

### Data Sources
- **Yelp API**: Restaurant data with location-based search
- **TMDB API**: Movies and TV show metadata
- **YouTube API**: Video recommendations
- **NewsAPI**: Articles for reading category
- **Open Library API**: Book recommendations

### Authentication
- **Provider**: Supabase Auth
- **Middleware**: Auth check in `middleware.ts` (currently relaxed for development)
- **Client**: Uses `@supabase/auth-helpers-nextjs` for session management

### Database
- **Provider**: Supabase (PostgreSQL)
- **Tables**: profiles (user data, taste profiles), ratings (user feedback)
- **Types**: Defined in `lib/supabase/types.ts`

### Recent Enhancements (January 2026)
- **Decide Tab**: Reshuffle button, decision history modal, localStorage persistence for seen items
- **Friends System**: Real user search, friend request management, view friend's ratings/recommendations modal
- **Groups**: Server-side friend loading for invites, proper name/avatar display
- **Navigation**: ModeNavigation component for consistent tab switching across Discover/Decide/Groups/Profile

### Key Design Patterns
- **Normalized Data**: Each API wrapper normalizes external data to a common object format
- **Fallback Ranking**: If AI API keys are missing, uses deterministic fallback scoring
- **Duplicate Prevention**: Tracks seen IDs in localStorage to avoid showing repeated items
- **Lazy Loading**: Pagination with offset-based loading for "Show More" functionality

## External Dependencies

### Required API Keys (Environment Variables)
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY`: AI ranking and personalization
- `YELP_API_KEY`: Restaurant search
- `TMDB_API_KEY`: Movie and TV show data
- `YOUTUBE_API_KEY`: Video recommendations
- `NEWS_API_KEY`: Article/reading content

### Supabase Configuration
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side operations (if needed)

### npm Dependencies
- `@anthropic-ai/sdk`: Claude AI integration
- `@supabase/auth-helpers-nextjs`: Authentication helpers
- `@supabase/supabase-js`: Database client
- `axios`: HTTP requests to external APIs
- `lucide-react`: Icon components
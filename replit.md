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
- **Dark/Coral Theme**: Consistent dark mode (#0D1117 background) with coral accent (#FF6B6B) across all pages
- **Location-Based Recommendations**: Real-time geolocation with distance calculation and sorting (closest first)
- **Location Fallback**: Uses profile location when geolocation is unavailable; proper null checks for 0 coordinates
- **Sorting Options**: AI Score, Distance, Rating, and Review Count sorting for all recommendations
- **Distance Display**: Distance shown in miles/feet on cards; "Nearby" for very close distances (<0.01 mi)
- **Distance Filter**: Dropdown on Decide page (5/10/25/50/100 mi) with instant refresh when changed
- **3 Real API Metrics**: ObjectCard displays category-specific metrics from actual API data (rating/reviews/price for restaurants, rating/votes/year for movies, views/likes/channel for YouTube, length/published/author for books) with fallback to category/genre/type when data is sparse
- **Longer Descriptions**: AI explanation and object description displayed in separate paragraphs for richer content
- **Decide Tab**: Reshuffle button, decision history modal, localStorage persistence for seen items
- **Friends System**: Real user search, friend request management, view friend's ratings/recommendations modal
- **Item Rating**: ObjectCard includes Rate button with 5-star modal and optional review, saved to Supabase ratings table
- **Groups**: Server-side friend loading for invites, proper name/avatar display
- **Navigation**: ModeNavigation component for consistent tab switching across Discover/Decide/Groups/Profile
- **API Formatting**: Enhanced descriptions with cuisine types, ratings, and price info for restaurants; genre/year info for movies/TV
- **Settings Page**: Full profile settings with name change, password update, and secure account deletion (uses service role key)
- **AI Preferences**: All quiz preferences (cuisines, dining atmosphere, movie genres, TV preferences, YouTube content, etc.) fully utilized in AI ranking prompts

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

## Mobile App (Capacitor)

### Overview
The app is configured to build as a native iOS/Android app using Capacitor. Capacitor wraps the web app in a native shell while providing access to device features.

### Mobile Files
- `capacitor.config.ts`: Capacitor configuration (app ID, plugins, platform settings)
- `lib/mobile/config.ts`: Mobile detection utilities and API base URL configuration
- `lib/mobile/plugins.ts`: Native plugin wrappers (haptics, status bar, geolocation, keyboard)
- `components/MobileProvider.tsx`: React provider for initializing mobile plugins

### Building for Mobile
```bash
# Build for iOS (requires Mac with Xcode)
npm run mobile:ios

# Build for Android
npm run mobile:android

# Just sync changes to native projects
npm run cap:sync
```

### Requirements for iOS App Store
1. Mac with Xcode installed
2. Apple Developer account ($99/year)
3. App icons and splash screens configured
4. Privacy policy and app metadata

### Capacitor Plugins Installed
- `@capacitor/core`: Core functionality
- `@capacitor/ios`: iOS platform
- `@capacitor/android`: Android platform
- `@capacitor/app`: App lifecycle events
- `@capacitor/keyboard`: Keyboard control
- `@capacitor/splash-screen`: Splash screen control
- `@capacitor/status-bar`: Status bar styling
- `@capacitor/haptics`: Haptic feedback
- `@capacitor/geolocation`: GPS location

### Mobile-Specific CSS
- Safe area insets for notch/home indicator
- Touch-friendly styling
- Disabled pull-to-refresh for app-like feel
- Optimized viewport settings
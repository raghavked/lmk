# LMK - Personalized Recommendations App

## Overview

LMK is an AI-powered recommendation engine that provides personalized suggestions across 5 categories: restaurants, movies, TV shows, books, and activities. The app uses Claude (claude-3-haiku) for AI ranking and OpenAI (GPT-4o-mini) for Plan My Day, generating personalized rankings and explanations based on user taste profiles and social signals.

## Beta Launch Status

The app is ready for beta launch with multiple users. Key scaling features include:
- **Extended Caching**: 15-minute recommendation cache, 30-minute AI response cache
- **Rate Limiting**: 20 AI requests per user per minute to prevent abuse
- **User-Aware Caching**: AI responses cached by user preference profile for cost efficiency
- **Fallback Ranking**: Graceful degradation if AI limits exceeded
- **Database Indexes**: 38+ performance indexes for fast queries across all tables
- **Row Level Security**: All tables have RLS policies for secure multi-user access

### Database Tables (9 total)
- `profiles` - User profiles with preferences and taste profiles
- `ratings` - User ratings and reviews for recommendations
- `friends` - Friend connections and requests (pending/accepted)
- `groups` - User-created groups for social recommendations
- `group_members` - Group membership tracking
- `group_messages` - Group chat messages
- `group_invites` - Pending group invitations
- `polls` - Group polls for decision making
- `plan_sessions` - Plan My Day chat history and saved plans

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Next.js 14 with App Router
- **UI**: React 18 with TypeScript, Tailwind CSS for styling
- **Design System**: Dark mode aesthetic with soft coral accent color (#feafb0) for AI metrics
- **Components**: Card-based recommendation display with modal details, category tabs, pull-to-refresh
- **State Management**: React hooks (useState, useEffect, useCallback) with localStorage for persistence

### Backend Architecture
- **API Routes**: Next.js API routes under `/app/api/`
- **Main Endpoint**: `/api/recommend` handles all recommendation requests
- **AI Integration**: AIRanker class in `lib/ai/ranker.ts` uses Claude (primary) for intelligent ranking, OpenAI for Plan My Day
- **External APIs**: Aggregates data from multiple sources then ranks with AI

### Data Sources
- **Yelp API**: Restaurant data with location-based search
- **TMDB API**: Movies and TV show metadata
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

### Recent Enhancements (February 2026)
- **Switched to OpenAI**: All AI features now use OpenAI GPT-4o-mini for faster, more reliable responses. Plan My Day uses 256 max tokens for ~1-2s response times.
- **Yelp API Caching**: Added 30-minute cache with location rounding and request throttling to prevent rate limit errors.
- **Mobile App Beta Readiness**: Added global error boundary, skeleton loaders, pull-to-refresh, network error detection, and retry buttons across all screens for improved stability.
- **Improved Logout**: Sign out now clears all local storage (AsyncStorage) including onboarding, quiz, and decision history data.
- **Beta Feedback Link**: Profile screen now includes Send Feedback option for beta testers to submit feedback via email.
- **Enhanced Error Handling**: All API-calling screens (Discover, Decide, Friends, Groups, Profile) now show proper error states with retry buttons.
- **Faster Recommendation Loading**: AI ranker now uses OpenAI GPT-4o-mini with JSON response format for reliable, fast AI ranking.
- **Improved Location Services**: Mobile app location detection now uses balanced accuracy mode for faster results with fallback to last known position if current location fails.
- **Plan My Day Chat Memory**: Plan sessions are now automatically saved to a `plan_sessions` database table. Users can view and resume recent plans from the Plan My Day screen. Sessions include event type, city, day intent, full chat history, and AI-generated categories.
- **Plan My Day Feature**: AI-powered event planning with OpenAI GPT-4o-mini. Users select event type (Date, Hang Out, Solo, Other), enter city, describe their ideal day, and receive categorized recommendations tailored to their event type. Chat-based interface with iterative refinement support.
- **YouTube Category Removed**: YouTube recommendations have been completely removed from the app (category, API, and UI)
- **AI Personalization from Ratings**: AI ranker now fetches user's past 50 ratings (with item titles, categories, scores, and reviews) to deeply personalize recommendations
- **Loved/Disliked Item Grouping**: Ratings are grouped by score - items rated 4-5 stars are shown as "loved" and 1-2 stars as "disliked" in AI prompts
- **Enhanced AI System Prompt**: Updated to emphasize referencing user's specific preferences and past ratings in explanations
- **Ratings Field Normalization**: Handles both rating/score and review/feedback field names for schema flexibility
- **Accent Color Update**: Changed from #FF6B6B to softer coral #feafb0 throughout the app
- **Preference Quiz Improvements**: Q5 (movie style) now allows multiple selections; Pizza removed from cuisine options
- **Smart Walkthrough**: Only shows for first-time users who haven't completed preferences

### Enhancements (January 2026)
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
- `NEWS_API_KEY`: Article/reading content

### Recommended Database Indexes (Run in Supabase SQL Editor)
For optimal performance with multiple users, add these indexes:
```sql
-- Ratings table indexes
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_object_id ON ratings(object_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);

-- Friends table indexes
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

-- Group members indexes
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_group_id ON messages(group_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
```

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

## Mobile App (Expo/React Native)

### Overview
The mobile app is built with Expo and React Native in the `mobile-app/` directory. This allows building iOS apps without a Mac using Expo's cloud build service.

### Project Structure
```
mobile-app/
├── app/              # Expo Router screens
│   ├── auth/         # Login and signup screens
│   ├── (tabs)/       # Main tab screens (Discover, Decide, Profile)
│   └── _layout.tsx   # Root layout with auth state
├── components/       # Reusable components
├── constants/        # Colors and config
└── lib/              # Supabase client
```

### Getting Started
```bash
cd mobile-app
npm install
npm start
```
Then scan the QR code with Expo Go app on your phone.

### Publishing to iOS App Store (No Mac Required!)
1. Create an Expo account at https://expo.dev
2. Install EAS CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. Configure: `eas build:configure`
5. Build for iOS: `eas build --platform ios`
6. Submit: `eas submit --platform ios`

### Requirements for App Store
1. Apple Developer account ($99/year)
2. App icons and splash screens (in assets folder)
3. Privacy policy URL
4. Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` environment variables

### Key Features (February 2026 Enhancements)
- Dark theme matching web app (#0D1117 background, #FF6B6B coral accent)
- 5 Tab navigation: Discover, Decide, Friends, Groups, Profile
- Supabase authentication with JWT Bearer token support
- Full feature parity with web app

### Discover Screen
- Category tabs (Restaurants, Movies, TV Shows, Reading, Activities)
- Search bar with real-time search
- Sorting options (AI Score, Distance, Rating, Reviews)
- Distance filter (5/10/25/50/100 miles) for location-based categories
- Detailed item cards with AI score badges, metrics, location, distance
- Item detail modal with full information and rating capability
- 5-star rating modal with optional review
- Pull-to-refresh with haptic feedback

### Decide Screen
- Full category selector (5 categories)
- Distance filter for restaurants/activities
- Yes/No decision buttons with haptic feedback
- Decision history modal with AsyncStorage persistence
- Reshuffle functionality to clear seen items
- Match popup celebration animation
- Bounded storage (max 50 history, 200 seen IDs)

### Friends Screen
- User search functionality
- Friend request management (send/accept/reject)
- View friend list with avatars
- API-based data loading via /api/friends endpoint

### Groups Screen
- Create groups with name/description
- Group chat messaging
- Poll creation for group decisions
- API-based data loading via /api/groups endpoint

### Profile Screen
- User info display (name, email, avatar)
- Preference quiz status and retake option
- Settings menu items
- Sign out functionality

### API Authentication
- Mobile app uses Bearer token authentication
- User-scoped Supabase client respects RLS policies
- Secure JWT validation on all API endpoints
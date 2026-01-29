# LMK Application Setup Guide

This guide will help you set up the complete LMK application with all features working.

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier available at https://supabase.com)
- API keys for:
  - Yelp API
  - TMDB (The Movie Database)
  - YouTube API
  - News API
  - Claude/Anthropic API

## Step 1: Supabase Setup

### 1.1 Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in the project details
4. Wait for the project to be created

### 1.2 Create Database Tables

1. Go to the SQL Editor in your Supabase dashboard
2. Copy and paste the SQL from `docs/SUPABASE_SCHEMA.md`
3. Execute the SQL to create all tables
4. Enable Row Level Security (RLS) on each table
5. Create RLS policies as described in the schema documentation

### 1.3 Get Your Credentials

1. Go to Settings → API
2. Copy your:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

## Step 2: Environment Setup

### 2.1 Create `.env.local`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# External APIs
YELP_API_KEY=your_yelp_key
TMDB_API_KEY=your_tmdb_key
YOUTUBE_API_KEY=your_youtube_key
NEWS_API_KEY=your_news_api_key
CLAUDE_API_KEY=your_claude_key

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Step 5: Test the Complete User Flow

### 5.1 Sign Up

1. Go to `/auth/signup`
2. Create a new account with email and password
3. Verify your email (check your inbox)

### 5.2 Walkthrough

1. After signing in, you'll see the walkthrough modal
2. Click through the 4 walkthrough steps
3. Click "Get Started" to proceed

### 5.3 Preference Test

1. You'll immediately see the preference test modal
2. Answer all 20 questions across 6 categories:
   - Restaurants (3 questions)
   - Movies (3 questions)
   - TV Shows (3 questions)
   - YouTube (2 questions)
   - Reading (3 questions)
   - Activities (3 questions)
   - General (2 questions)
3. Click "Complete" to save your preferences

### 5.4 Discover Feed

1. After completing preferences, you'll see the Discover Feed
2. Browse personalized recommendations
3. Switch between categories using the category buttons
4. Click on a recommendation to see details
5. Rate recommendations to improve personalization

### 5.5 Features to Test

#### Location-Based Filtering
- Click the location icon to enable location services
- Recommendations will be filtered by distance

#### Search
- Use the search bar to find specific recommendations
- Results will be personalized based on your preferences

#### Map View
- Click the map icon to see location-based recommendations
- View recommendations on an interactive map (coming soon)

#### Friends
- Navigate to the Friends section
- Add friends and manage friend requests
- View your friend list

#### Group Chats
- Create group chats with friends
- Send and receive messages
- Manage group membership

## Step 6: Deployment

### Deploy to Replit

1. Push your code to GitHub
2. Go to https://replit.com
3. Click "Import from GitHub"
4. Select your repository
5. Add environment variables in Replit Secrets
6. Click "Run" to start the server

### Deploy to Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables
5. Click "Deploy"

### Deploy to Other Platforms

The app can be deployed to any Node.js hosting platform:
- Heroku
- Railway
- Fly.io
- AWS
- Google Cloud
- Azure

## Troubleshooting

### Supabase Connection Issues

If you see "Unauthorized" errors:
1. Check your API keys in `.env.local`
2. Verify Row Level Security policies
3. Check that your user is authenticated

### Preference Test Not Showing

If the preference test doesn't appear:
1. Clear browser cache
2. Check browser console for errors
3. Verify the profile table exists in Supabase

### Recommendations Not Loading

If recommendations aren't appearing:
1. Check API keys for external services (Yelp, TMDB, etc.)
2. Verify the recommend API route is working
3. Check browser console for API errors

### Location Not Working

If location services aren't working:
1. Check browser permissions
2. Ensure HTTPS is enabled (required for geolocation)
3. Verify location coordinates in user profile

## Features Overview

### Discover Feed
- Browse personalized recommendations
- Filter by category (Restaurants, Movies, TV Shows, YouTube, Reading, Activities)
- Search within categories
- View AI match scores
- Rate recommendations

### Map View
- See recommendations on a map
- Filter by distance
- View nearby restaurants and activities

### Friends
- Add and manage friends
- Accept/decline friend requests
- View friend list

### Group Chats
- Create group chats
- Send and receive messages
- Manage group members

### Preference Test
- 20 in-depth questions
- Covers all recommendation categories
- Saves to user profile
- Used for personalization

### AI Ranking
- Personalized match scores
- Based on user preferences
- Updated with user ratings
- Improves over time

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the code comments in components
3. Check Supabase documentation
4. Open an issue on GitHub

## Next Steps

1. Customize the branding and colors
2. Add more API integrations
3. Implement advanced features (social sharing, recommendations from friends, etc.)
4. Set up analytics and monitoring
5. Create a mobile app using React Native

Good luck! 🚀

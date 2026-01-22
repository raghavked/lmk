# LMK - AI-Powered Social Recommendation Platform

LMK helps you decide what to do by combining AI intelligence with recommendations from friends and trusted sources.

## Features

- 🤖 AI-powered recommendations using Claude
- 👥 Social recommendations from friends
- 🎬 Multi-category support (Restaurants, Movies, TV Shows, Articles, YouTube, Activities)
- ⭐ Personalized rating system
- 🎯 Taste matching with friends
- 📍 Location-based discovery
- 📊 Taste profile analytics

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **External APIs**: Yelp Fusion, TMDB, YouTube Data API, NewsAPI

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account
- API keys for:
  - Anthropic Claude
  - Yelp Fusion
  - TMDB
  - YouTube Data API
  - NewsAPI

### Installation

1. Clone the repository:
\`\`\`bash
git clone 
cd lmk-app
\`\`\`

2. Install dependencies:
\`\`\`bash
npm install
\`\`\`

3. Set up environment variables:
\`\`\`bash
cp .env.example .env
\`\`\`

4. Fill in your \`.env\` file with the required API keys and Supabase credentials.

5. Set up Supabase:
   - Create a new Supabase project
   - Run the SQL schema from \`supabase/schema.sql\` in the Supabase SQL Editor
   - Copy your project URL and keys to \`.env\`

6. Run the development server:
\`\`\`bash
npm run dev
\`\`\`

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
\`\`\`
lmk-app/
├── app/
│   ├── api/              # API routes
│   │   ├── recommend/    # Recommendation endpoint
│   │   ├── ratings/      # Ratings CRUD
│   │   └── friends/      # Friend management
│   ├── discover/         # Main discovery page
│   ├── friends/          # Friends management page
│   ├── profile/          # User profile page
│   ├── login/            # Login page
│   └── signup/           # Signup page
├── components/           # Reusable React components
├── lib/
│   ├── api/             # External API integrations
│   ├── ai/              # AI ranking logic
│   ├── supabase/        # Supabase client setup
│   └── scorer.ts        # Scoring algorithm
├── supabase/
│   └── schema.sql       # Database schema
└── public/              # Static assets
\`\`\`

## Environment Variables

See \`.env.example\` for all required environment variables.

## Database Schema

The app uses the following main tables:
- \`profiles\` - User profiles
- \`objects\` - Recommended items (restaurants, movies, etc.)
- \`ratings\` - User ratings
- \`friendships\` - Friend connections
- \`recommendation_sessions\` - Recommendation history
- \`api_cache\` - API response cache

## API Endpoints

### POST /api/recommend
Generate personalized recommendations based on query and user preferences.

### POST /api/ratings
Submit a rating for an object.

### GET /api/ratings
Get user's ratings and favorites.

### POST /api/friends
Send a friend request.

### GET /api/friends
Get friend list and pending requests.

### POST /api/friends/[id]/accept
Accept a friend request.

## Deployment

### Deploy to Replit

1. Import this repository to Replit
2. Set environment variables in Replit Secrets
3. Run \`npm install\`
4. Run \`npm run dev\`

### Deploy to Vercel

1. Push code to GitHub
2. Import repository to Vercel
3. Set environment variables
4. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

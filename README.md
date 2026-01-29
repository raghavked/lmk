# LMK - Personalized Recommendations

LMK is an AI-powered recommendation engine that provides personalized suggestions across multiple categories including restaurants, movies, TV shows, YouTube videos, books, and activities.

## Features

- **AI-Powered Recommendations**: Uses Claude AI to generate personalized recommendations based on user taste profiles
- **Multi-Category Support**: Restaurants, Movies, TV Shows, YouTube, Reading, and Activities
- **Personalized Metrics**: Each recommendation includes unique, category-specific metrics
- **Social Signals**: Trending items and community ratings inform recommendations
- **User Ratings**: Rate recommendations to improve future suggestions
- **Fast Pagination**: Efficient "Show More" functionality with no duplicates
- **Responsive Design**: Beautiful UI that works on desktop, tablet, and mobile

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Anthropic Claude API
- **External APIs**: Yelp, TMDB, YouTube, NewsAPI, OpenLibrary

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- API keys for: Claude, Yelp, TMDB, YouTube, NewsAPI

### Installation

1. Clone the repository:
```bash
git clone https://github.com/raghavked/lmk.git
cd lmk
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Fill in your API keys in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
CLAUDE_API_KEY=your_claude_api_key
YELP_API_KEY=your_yelp_api_key
TMDB_API_KEY=your_tmdb_api_key
YOUTUBE_API_KEY=your_youtube_api_key
NEWS_API_KEY=your_news_api_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
lmk/
├── app/                      # Next.js app directory
│   ├── (main)/              # Main app routes (protected)
│   │   ├── discover/        # Recommendation feed
│   │   └── layout.tsx       # Main layout with auth check
│   ├── api/                 # API routes
│   │   └── recommend/       # Recommendation endpoint
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page (redirects to /discover)
│   ├── loading.tsx          # Loading state
│   ├── error.tsx            # Error boundary
│   └── not-found.tsx        # 404 page
├── components/              # React components
│   ├── ObjectCard.tsx       # Recommendation card
│   ├── Navigation.tsx       # App navigation
│   ├── RatingModal.tsx      # Rating modal
│   └── Walkthrough.tsx      # Onboarding walkthrough
├── lib/                     # Utilities and libraries
│   ├── api/                 # External API wrappers
│   │   ├── yelp.ts
│   │   ├── tmdb.ts
│   │   ├── youtube.ts
│   │   ├── articles.ts
│   │   └── openLibrary.ts
│   ├── ai/                  # AI integration
│   │   └── ranker.ts        # Claude-based ranking
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   └── useRecommendations.ts
│   ├── supabase/            # Supabase utilities
│   │   ├── client.ts
│   │   └── types.ts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── constants.ts         # App constants
│   ├── haptics.ts           # Haptic feedback
│   └── socialSignals.ts     # Social signals
├── middleware.ts            # Next.js middleware
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── next.config.js           # Next.js config
├── tailwind.config.ts       # Tailwind config
└── postcss.config.js        # PostCSS config
```

## API Endpoints

### GET /api/recommend

Fetch personalized recommendations for a category.

**Query Parameters:**
- `category` (required): One of `restaurants`, `movies`, `tv_shows`, `youtube_videos`, `reading`, `activities`
- `limit` (optional): Number of results (default: 10)
- `offset` (optional): Pagination offset (default: 0)
- `seen_ids` (optional): Comma-separated IDs to exclude from results

**Response:**
```json
{
  "results": [
    {
      "rank": 1,
      "object": { ... },
      "personalized_score": 8.5,
      "explanation": {
        "hook": "...",
        "why_youll_like": "...",
        "detailed_ratings": { ... }
      }
    }
  ]
}
```

## Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
npm run start
```

### Linting
```bash
npm run lint
```

## Environment Variables

See `.env.local.example` for all required environment variables.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@lmk.app or open an issue on GitHub.

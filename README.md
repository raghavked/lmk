# LMK — AI-Ranked Personal Recommendations

LMK ("let me know") turns a short taste quiz into ranked recommendations across
**restaurants, movies, TV, YouTube, books and activities**. Candidates come from
live data sources (Yelp, TMDB, YouTube, Open Library, NewsAPI); an LLM ranking
layer then scores each one against the user's taste profile and friends'
ratings and explains *why* it fits.

**Stack:** Next.js · React · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) ·
Anthropic Claude & OpenAI APIs · Capacitor · React Native / Expo

## What's interesting here

- **LLM ranking with grounded output.** `lib/ai/ranker.ts` sends the candidate set and
  the user's taste profile to the model, validates the structured response, and
  returns a personalized score plus a short explanation and category-specific ratings
  for each item. It uses Claude by default and falls back to OpenAI when only that key is configured.
  If the model's JSON is malformed or empty, a deterministic fallback ranking takes over, so the feed never comes back empty.
- **Cost and abuse controls.** Responses are cached in-memory with a 30-minute TTL and
  size-bounded eviction. Requests are rate-limited per user (20/min).
- **Taste profiles that learn.** A quiz seeds the profile (`lib/tasteProfileBuilder.ts`),
  and later ratings update it (`lib/updateTasteProfiles.ts`).
- **Social layer.** Friend ratings feed the ranking context, and groups get their own
  polls for choosing together. A separate **Decide** mode narrows choices down to one.
- **Plan My Day.** It assembles an itinerary from the user's recommendations
  (`app/api/plan-my-day`).
- **Multi-user security.** Row-level security protects every Supabase table. The schema
  and indexes are in `docs/SUPABASE_SCHEMA.md` and `docs/SUPABASE_SCALABILITY_SQL.md`.
- **Three clients, one backend.** The web app ships through Capacitor for iOS and
  Android, and a separate native Expo app lives in `mobile-app/`.

## Architecture

```
Browser / Capacitor / Expo
        │
        ▼
Next.js API routes  (app/api/*: recommend, plan-my-day, groups, friends, ratings, profile)
        │
        ├── Source adapters ── Yelp · TMDB · YouTube · Open Library · NewsAPI   (lib/api, lib/*.ts)
        ├── AI ranker ──────── Claude (primary) · OpenAI (fallback), cached + rate-limited  (lib/ai)
        └── Supabase ───────── Postgres + RLS · Auth · taste profiles · ratings
```

## Running locally

Requirements: Node 18+, a Supabase project, and API keys for the sources you want to use.

```bash
git clone https://github.com/raghavked/lmk.git && cd lmk
npm install
cp .env.local.example .env.local   # fill in Supabase URL/anon key and API keys
npm run dev                        # http://localhost:5000
```

Database setup steps are in [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md). Other checks:
`npm run lint`, `npm run type-check`, `npm run build`.

## API

`GET /api/recommend?category=movies&limit=10&offset=0&seen_ids=…`

Valid categories are `restaurants`, `movies`, `tv_shows`, `youtube_videos`, `reading`
and `activities`. The endpoint returns ranked results, each with `personalized_score`
and an `explanation` (`hook`, `why_youll_like`, `detailed_ratings`). `seen_ids` keeps
pagination free of duplicates.

## Repository layout

```
app/            Next.js App Router: pages (discover, decide, plan, friends, groups, quiz, profile) and API routes
components/     UI components (recommendation cards, rating modal, onboarding)
lib/            AI ranker, source adapters, taste-profile logic, Supabase clients, types
mobile-app/     Native React Native / Expo client
docs/           Setup, schema, design specs, beta-testing guide; dev-notes/ holds debugging reports
design/         UI mockups and design system notes
```

## Status

This is a working prototype built by [Raghav Kedia](https://github.com/raghavked), and
it is not deployed publicly.

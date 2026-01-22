# LMK Deployment Guide

This guide covers deploying LMK to Replit and other platforms.

## Deploying to Replit

### Step 1: Setup Replit Project

1. Create a new Repl on Replit
2. Import this repository from GitHub
3. Replit will automatically detect it as a Next.js project

### Step 2: Configure Environment Variables

In Replit, go to the "Secrets" tab (lock icon) and add these environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key

ANTHROPIC_API_KEY=your_anthropic_key

YELP_API_KEY=your_yelp_key
TMDB_API_KEY=your_tmdb_key
YOUTUBE_API_KEY=your_youtube_key
NEWS_API_KEY=your_news_key

NEXT_PUBLIC_APP_URL=https://your-repl-name.replit.app
```

### Step 3: Setup Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor
3. Copy and paste the contents of `supabase/schema.sql`
4. Execute the SQL to create all tables and policies
5. Go to Settings > API to get your project URL and keys
6. Add URL and keys to Replit Secrets

### Step 4: Get API Keys

#### Anthropic Claude
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create API key
3. Add to Replit Secrets as `ANTHROPIC_API_KEY`

#### Yelp Fusion API
1. Go to [yelp.com/developers](https://www.yelp.com/developers)
2. Create an app
3. Get API key
4. Add to Replit Secrets as `YELP_API_KEY`

#### TMDB API
1. Go to [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api)
2. Request API key
3. Add to Replit Secrets as `TMDB_API_KEY`

#### YouTube Data API
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Add to Replit Secrets as `YOUTUBE_API_KEY`

#### NewsAPI
1. Go to [newsapi.org](https://newsapi.org)
2. Register for free API key
3. Add to Replit Secrets as `NEWS_API_KEY`

### Step 5: Install Dependencies

In the Replit Shell, run:
```bash
npm install
```

### Step 6: Run Development Server

Click the "Run" button in Replit, or in the Shell:
```bash
npm run dev
```

The app should now be running at your Replit URL.

### Step 7: Configure Supabase Auth Redirect

1. Go to your Supabase project
2. Navigate to Authentication > URL Configuration
3. Add your Replit URL to "Site URL"
4. Add `https://your-repl-name.replit.app/auth/callback` to "Redirect URLs"

---

## Deploying to Vercel

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/lmk-app.git
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Import your GitHub repository
4. Vercel will auto-detect Next.js

### Step 3: Configure Environment Variables

In Vercel project settings, add all environment variables from `.env.example`

### Step 4: Deploy

Click "Deploy" - Vercel will build and deploy automatically.

### Step 5: Update Supabase Auth URLs

Add your Vercel deployment URL to Supabase Authentication settings.

---

## Production Checklist

### Security
- [ ] All environment variables are set in Secrets/Environment Variables
- [ ] `.env` is in `.gitignore`
- [ ] Supabase RLS policies are enabled
- [ ] API keys are restricted to necessary domains

### Database
- [ ] Supabase schema is deployed
- [ ] Database indexes are created
- [ ] RLS policies are tested

### Performance
- [ ] Images are optimized
- [ ] API responses are cached where appropriate
- [ ] Rate limiting is configured

### Monitoring
- [ ] Error tracking is set up (optional: Sentry)
- [ ] Analytics are configured (optional: Vercel Analytics)

### Testing
- [ ] User signup/login works
- [ ] Recommendations are being generated
- [ ] Ratings are being saved
- [ ] Friend requests work
- [ ] All API integrations are functional

---

## Troubleshooting

### "Unauthorized" errors
- Check that Supabase keys are correctly set
- Verify RLS policies are enabled
- Check that user is authenticated

### API errors
- Verify all API keys are set correctly
- Check API rate limits haven't been exceeded
- Look at server logs for detailed error messages

### Database errors
- Verify schema was deployed correctly
- Check that all required tables exist
- Ensure RLS policies allow the operation

### Build errors on Replit
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (should be 18+)
- Clear `.next` folder and rebuild

---

## Environment-Specific Notes

### Replit
- Uses built-in PostgreSQL option (or connect to external Supabase)
- Automatic HTTPS
- Environment variables via Secrets tab
- May need to keep the Repl always on (paid feature)

### Vercel
- Automatic CI/CD from GitHub
- Edge functions for API routes
- Automatic HTTPS
- Preview deployments for branches

---

## Scaling Considerations

When your app grows:

1. **Database**: Consider upgrading Supabase tier for more connections
2. **API Caching**: Implement Redis for better caching
3. **Rate Limiting**: Add rate limiting middleware
4. **CDN**: Use Vercel's built-in CDN or Cloudflare
5. **Monitoring**: Add application monitoring (Sentry, LogRocket)
6. **Background Jobs**: Consider adding a job queue for heavy operations

---

## Support

For deployment issues:
- Replit: Check Replit documentation or community forums
- Vercel: Check Vercel documentation
- Supabase: Check Supabase documentation

For app-specific issues, refer to the main README.md

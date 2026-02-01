# LMK Beta Testing Guide

## Quick Start for Beta Testers

### Web App
Your beta testers can access the web app at your Replit deployment URL.

### Mobile App (iOS/Android)
Beta testers can use the mobile app via Expo Go:
1. Download "Expo Go" from App Store or Google Play
2. Scan the QR code from your Expo tunnel
3. The app loads directly on their phone

---

## Step 1: Set Up Your Database

Run this SQL in your **Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

Copy the contents from `docs/sql/complete_schema.sql` and run it.

This creates all tables, indexes, and security policies needed for beta.

---

## Step 2: Deploy the Web App

### Option A: Use Replit's Built-in Hosting (Recommended)
1. Click the **Publish** button in Replit
2. Choose "Autoscale" deployment type
3. Your app gets a public URL like `your-app.replit.app`
4. Share this URL with beta testers

### Option B: Development Mode Testing
1. The app runs at your Replit dev URL
2. Share the URL with testers (they need to be online when you're running it)

---

## Step 3: Invite Beta Testers

### For Web App:
1. Share your deployment URL
2. Testers sign up with email/password
3. They complete the 15-question preference quiz
4. They start getting personalized recommendations

### For Mobile App:
1. Run the Expo workflow in Replit
2. Share the QR code or Expo link with testers
3. They download Expo Go and scan the code
4. Same signup flow as web

---

## Step 4: What to Test

### Core Features (Priority 1)
- [ ] Sign up / Sign in
- [ ] Complete preference quiz (15 questions)
- [ ] Browse recommendations in all 5 categories
- [ ] Rate items (1-5 stars with optional review)
- [ ] Search for specific items
- [ ] Sort by AI Score, Distance, Rating, Reviews

### Social Features (Priority 2)
- [ ] Send friend requests
- [ ] Accept/decline friend requests
- [ ] View friend's ratings
- [ ] Create a group
- [ ] Send messages in group

### Decide Mode (Priority 3)
- [ ] Swipe through recommendations
- [ ] Use distance filter
- [ ] View decision history
- [ ] Reshuffle to see new items

---

## Step 5: Collect Feedback

Ask beta testers to report:
1. **Bugs** - What broke? What error did they see?
2. **Confusion** - What was unclear or hard to use?
3. **Missing Features** - What did they expect that wasn't there?
4. **Performance** - Was anything slow?

Create a simple feedback form (Google Forms works great) or have them message you directly.

---

## Monitoring Your Beta

### Check Supabase Dashboard
- **Authentication** → See how many users signed up
- **Table Editor** → View ratings, profiles, friends data
- **Logs** → Check for errors

### Check Replit Logs
- View workflow console output for API errors
- Monitor for rate limiting messages

---

## Scaling Tips for Beta

Your app is already configured for beta with:

| Feature | Setting | Purpose |
|---------|---------|---------|
| Recommendation Cache | 15 minutes | Reduces external API calls |
| AI Response Cache | 30 minutes | Reduces Claude AI costs |
| Rate Limiting | 20 req/user/min | Prevents abuse |
| Fallback Ranking | Automatic | Works even if AI limit hit |

### If You Hit API Limits:
- **Yelp API**: 5,000 calls/day free tier
- **TMDB API**: Unlimited (with rate limits)
- **Claude AI**: Pay per use, cached to reduce costs

---

## Troubleshooting Common Issues

### "Unauthorized" errors
- User needs to sign in again
- Check Supabase auth settings

### No recommendations showing
- Check that API keys are set in Replit Secrets
- Check workflow logs for API errors

### Slow loading
- Normal for first load (cache building)
- Subsequent loads should be faster

### Mobile app not connecting
- Make sure Expo tunnel is running
- Check that Supabase URL is correct in mobile-app config

---

## Ready for App Store?

After beta testing, to publish to iOS App Store:

1. Create Apple Developer account ($99/year)
2. Run: `cd mobile-app && eas build --platform ios`
3. Submit: `eas submit --platform ios`
4. No Mac required - Expo builds in the cloud!

---

## Need Help?

- Check Supabase logs for database issues
- Check Replit workflow logs for API issues
- Review the `replit.md` file for architecture details

# Comprehensive Bug Hunt & Fix Analysis

## Phase 1: Expected User Journeys

### Happy Path: New User Signup → Preference Test → Discover → Detail View → Preference Update

```
1. User navigates to /auth/signup
   ├─ Fills form (name, email, password)
   ├─ Agrees to terms
   ├─ Submits form
   └─ Expected: Redirects to /auth/verify-email

2. User checks email & clicks verify link
   ├─ Supabase callback processes
   └─ Expected: Redirects to /discover or onboarding

3. User completes onboarding walkthrough (if shown)
   └─ Expected: Navigates to /discover

4. User navigates to /profile
   ├─ Clicks "Preferences" tab
   ├─ Completes preference test (14 questions)
   ├─ Submits preferences
   └─ Expected: Preferences saved to DB, profile refreshes

5. User navigates to /discover
   ├─ Feed loads recommendations
   ├─ Each card shows: image, title, location, 3 metrics, description
   └─ Expected: AI-personalized metrics based on preferences

6. User clicks on a recommendation
   ├─ Card expands to show details
   ├─ Clicks "Get Directions"
   └─ Expected: Google Maps opens with location

7. User retakes preference test
   ├─ Changes preferences
   ├─ Saves new preferences
   ├─ Navigates to /discover
   └─ Expected: Recommendations update based on new preferences

8. User logs out
   └─ Expected: Redirects to /auth/login
```

### Edge Cases to Handle

- Email rate limiting (Supabase default: 3/hour)
- Session expiration
- Network failures during API calls
- Missing preference data
- Missing location data for recommendations
- Claude API failures
- Yelp/TMDB API failures
- Empty recommendation results
- User navigates away during async operations
- Browser back button during auth flow
- Multiple simultaneous preference updates

---

## Phase 2: Critical Flows to Trace

### Flow 1: Authentication & Session
**Entry:** `/auth/login` → Form submit  
**Expected:** Session established → Redirect to `/discover`  
**Actual:** ???

### Flow 2: Preference Test → Recommendation Update
**Entry:** `/profile` → Preference test → Save  
**Expected:** Preferences saved → AI re-ranks recommendations  
**Actual:** ???

### Flow 3: Discover Feed Loading
**Entry:** `/discover` loads  
**Expected:** Fetch recommendations → AI ranks → Display with metrics  
**Actual:** ???

### Flow 4: Item Detail View
**Entry:** Click recommendation card  
**Expected:** Expand → Show map → Click "Get Directions" → Google Maps  
**Actual:** ???

---

## Phase 3: Known Issues to Investigate

1. **Login Not Working**
   - User reports: Can't log in, redirects back to login
   - Possible causes:
     - Session cookie not being set
     - Middleware rejecting session
     - Redirect logic broken
     - Supabase client misconfigured

2. **Show Password Toggle Not Working**
   - User reports: Toggle doesn't change input type
   - Possible causes:
     - Event handler not firing
     - State not updating
     - Input type binding broken
     - z-index/pointer-events issue

3. **Chunk Loading Error**
   - Error: "Failed to load chunk /_next/static/chunks/..."
   - Possible causes:
     - Build cache corruption
     - Turbopack misconfiguration
     - Dependency conflicts
     - Module resolution issues

---

## Phase 4: Systematic Bug Hunt Checklist

### Authentication Issues
- [ ] Login form submits correctly
- [ ] Supabase auth API is called with correct credentials
- [ ] Session cookie is set after successful login
- [ ] Middleware recognizes session
- [ ] Redirect to /discover works
- [ ] Error messages display for failed login
- [ ] Show password toggle works
- [ ] Signup form validation works
- [ ] Email verification flow works

### State Management Issues
- [ ] Form state updates correctly on input change
- [ ] Form state clears after successful submission
- [ ] Loading state prevents double-submit
- [ ] Error state displays and clears correctly
- [ ] Preference test state persists during submission
- [ ] Profile data refreshes after preference update

### API & Data Issues
- [ ] Recommendation API returns data
- [ ] Claude API generates metrics correctly
- [ ] Yelp API returns restaurant data
- [ ] TMDB API returns movie data
- [ ] YouTube API returns video data
- [ ] Location data is present in recommendations
- [ ] Preference data is saved to Supabase
- [ ] Preference data is retrieved for AI ranking

### UI & Navigation Issues
- [ ] All routes are accessible
- [ ] Protected routes redirect unauthenticated users
- [ ] Navigation between modes works
- [ ] Back button works correctly
- [ ] Mobile responsiveness is correct
- [ ] No dead-end states
- [ ] Error states have recovery options

### Async Flow Issues
- [ ] API calls complete before rendering
- [ ] Loading states show during async operations
- [ ] Error states show if API fails
- [ ] Race conditions don't occur
- [ ] Cleanup happens on component unmount
- [ ] Timeouts don't cause hangs

---

## Bugs Found & Fixes Applied

(To be filled in during systematic hunt)


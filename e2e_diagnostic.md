# End-to-End Diagnostic Test Plan

## Overview
This document outlines a comprehensive diagnostic of the entire user journey in the "lmk" application, from account creation through personalized recommendations and preference updates.

## Test Phases

### Phase 1: Account Creation & Login Flow
**Objective:** Verify that new users can create accounts and log in successfully.

- [ ] Navigate to `/auth/signup`
- [ ] Fill in form with:
  - Full Name: "Test User E2E"
  - Email: Generate unique email (e.g., `e2e_test_${timestamp}@example.com`)
  - Password: "TestPassword123!"
  - Agree to Terms
- [ ] Submit and verify email verification page appears
- [ ] Navigate to `/auth/login`
- [ ] Log in with the created account
- [ ] Verify redirect to `/discover` or onboarding walkthrough

**Expected Outcome:** User successfully logs in and is directed to the next step (walkthrough or discover).

---

### Phase 2: Preference Test & Profile Integration
**Objective:** Verify that the preference test works and saves preferences.

- [ ] Navigate to `/profile`
- [ ] Locate and click "Retake Preference Test" or similar button
- [ ] Complete the preference test by selecting preferences across multiple categories
- [ ] Submit the preference test
- [ ] Verify that preferences are saved to the database
- [ ] Check that the profile displays the saved preferences

**Expected Outcome:** Preferences are saved and visible in the profile.

---

### Phase 3: Discover Feed & AI Personalization
**Objective:** Verify that recommendations are personalized with correct formatting.

- [ ] Navigate to `/discover`
- [ ] Verify that recommendations are displayed in a feed format
- [ ] For each recommendation card, verify:
  - **3 Unique Metrics:** Each metric should be specific to the item and user preferences
    - Example: "Dumpling Craftsmanship", "Szechuan Authenticity", "Dining Ambiance"
  - **Rating:** Numeric rating (e.g., 4.5/5)
  - **Description:** "Why you'll like it" text that connects user preferences to factual data
    - Example: "Perfect for your love of spicy food, with 395 Yelp reviews praising the authentic flavors"
  - **Image:** Item image displayed
  - **Category Tag:** Category label (e.g., "Restaurant", "Activity")

- [ ] Scroll through multiple categories (if available)
- [ ] Verify formatting consistency across all items

**Expected Outcome:** All recommendations follow the agreed-upon format with personalized metrics and descriptions.

---

### Phase 4: Item Detail View & Map Integration
**Objective:** Verify that clicking on an item shows detailed information and maps.

- [ ] Click on a restaurant or activity recommendation
- [ ] Verify detail view displays:
  - [ ] Full item name and description
  - [ ] Complete metric information
  - [ ] Full "Why you'll like it" description
  - [ ] Location information (address, coordinates)
  - [ ] **Mini map** showing the location (for restaurants/activities)
  - [ ] Additional details (hours, phone, website, etc.)
  - [ ] Option to go back to discover feed

**Expected Outcome:** Detail view displays all information including a functional mini map.

---

### Phase 5: Preference Update & Recommendation Refresh
**Objective:** Verify that updating preferences refreshes recommendations.

- [ ] Navigate to `/profile`
- [ ] Click "Retake Preference Test"
- [ ] Change preferences (select different categories or preferences)
- [ ] Submit the updated preferences
- [ ] Verify preferences are saved
- [ ] Navigate to `/discover`
- [ ] Verify that recommendations have changed based on new preferences
- [ ] Confirm that metrics and descriptions reflect the new preferences

**Expected Outcome:** Recommendations update based on new preferences.

---

## Diagnostic Checklist

### Authentication
- [ ] Signup form works without email rate limiting
- [ ] Login form works with created account
- [ ] Show/Hide password toggle works
- [ ] Redirect to discover/walkthrough after login

### Profile & Preferences
- [ ] Preference test is accessible from profile
- [ ] Preference test saves correctly
- [ ] Preferences are displayed in profile
- [ ] Retaking preference test updates saved preferences

### Discover Feed
- [ ] Feed displays recommendations
- [ ] Each recommendation has 3 unique metrics
- [ ] Each recommendation has a rating
- [ ] Each recommendation has a personalized description
- [ ] Descriptions reference user preferences and factual data
- [ ] Images are displayed correctly
- [ ] Category tags are shown

### Detail View
- [ ] Clicking on item opens detail view
- [ ] Detail view shows all information
- [ ] Mini map is displayed for restaurants/activities
- [ ] Map shows correct location
- [ ] Back button returns to discover feed

### AI Personalization
- [ ] Claude AI generates unique metrics
- [ ] Metrics are relevant to the item and user preferences
- [ ] Descriptions are editorial and sophisticated
- [ ] Descriptions connect user preferences to factual data
- [ ] Recommendations change when preferences are updated

---

## Issues to Watch For

1. **Email Rate Limiting:** If signup fails with rate limit error, use the `create_test_user.py` script
2. **Session Management:** If login redirects back to login page, check middleware and session cookies
3. **Preference Test:** Verify that preferences are actually saved to the database
4. **AI Metrics:** Ensure Claude generates unique, relevant metrics (not generic)
5. **Map Integration:** Verify maps load correctly and show accurate locations
6. **Recommendation Refresh:** Ensure recommendations update when preferences change

---

## Success Criteria

✅ **All phases completed successfully**
✅ **All formatting requirements met**
✅ **All features functional**
✅ **No console errors or warnings**
✅ **Smooth user experience throughout**

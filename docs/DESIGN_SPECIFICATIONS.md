# LMK App - Complete Design Specifications

## Overview

This document contains all design specifications, UI mockups, and reference materials for the LMK (Let Me Know) personalized recommendation application. The design follows a modern dark mode aesthetic with coral accent colors throughout.

## Design System

### Color Palette

| Color | Hex Value | Usage |
|-------|-----------|-------|
| Primary Background | #230f10 | Main app background |
| Secondary Background | #181011 | Card backgrounds, panels |
| Accent Color | #fea4a7 | Buttons, highlights, interactive elements |
| Text Primary | #f5f5f5 (Gray-50) | Main text content |
| Text Secondary | #9ca3af (Gray-400) | Secondary text, descriptions |
| Border Color | #374151 (Gray-700) | Card borders, dividers |
| Dark Red Logo | #8b3a3a | Logo color |

### Typography

- **Headings**: Bold, large font sizes (24px-32px)
- **Body Text**: Regular weight, 14px-16px
- **Labels**: Small, uppercase, 12px
- **Taglines**: Bold, coral color, uppercase, 12px

### Spacing & Layout

- **Card Padding**: 24px (6 units)
- **Gap Between Elements**: 16px (4 units)
- **Border Radius**: 24px (rounded-3xl) for cards
- **Image Height**: 380px for recommendation cards

## Authentication Pages

### Sign In Page (`/auth/login`)

**Layout**: Split screen with left visual panel and right form

**Left Panel**:
- Dark background (#181011)
- Gradient overlay with coral accents
- Logo and branding
- Descriptive text: "Discover what's happening around you"

**Right Panel**:
- Dark background (#230f10)
- Email input field with envelope icon
- Password input field with lock icon
- Show password toggle (eye icon)
- Forgot password link in coral
- Sign In button (coral background)
- Sign up link

**Features**:
- Email validation
- Password visibility toggle
- Loading state with spinner
- Error message display
- Responsive design (stacked on mobile)

### Sign Up Page (`/auth/signup`)

**Layout**: Similar split screen design

**Form Fields**:
- Full Name input
- Email input
- Password input with show/hide toggle
- Confirm Password input
- Terms of Service checkbox

**Buttons**:
- Create Account button (coral, full width)
- Sign in link for existing users

**Features**:
- Form validation
- Password strength indicator
- Success state with redirect
- Error handling

### Email Verification Page (`/auth/verify-email`)

**Layout**: Centered card design

**Content**:
- Email icon
- Verification instructions
- "Resend Verification Email" button
- "Change Email" button
- Login link

**Features**:
- Clear messaging
- Resend functionality
- Email change option

## Recommendation Card Design

### Card Structure

**Image Section** (380px height)
- High-quality image from API
- Gradient overlay (top to bottom)
- Category badge (top-left corner)
- Fallback emoji if image unavailable

**Content Section**
- Title (large, bold)
- Tagline (coral color, uppercase)
- Location (with map pin icon)
- Description (detailed explanation)
- Rating metrics (category-specific)
- Tags/Hashtags
- Action buttons (Save, View, Share)

### Category-Specific Metrics

#### Restaurants
- Cuisine Diversity
- Authenticity
- Ambiance
- Value

#### Movies
- Plot Depth
- Cinematography
- Emotional Impact
- Originality

#### TV Shows
- Character Development
- Pacing
- Storytelling
- Production Quality

#### YouTube Videos
- Production Quality
- Entertainment Value
- Educational Content
- Engagement

#### Reading
- Writing Quality
- Pacing
- Character Development
- Originality

#### Activities
- Adventure Level
- Social Opportunity
- Value
- Accessibility

### Metric Display

Each metric includes:
- Label (uppercase, gray)
- Numeric value (coral color)
- Star rating (1-5 stars)
- Progress bar (coral gradient)

## Navigation & Modes

### Mode Navigation Bar

Persistent navigation with 7 modes:
1. **Discover** - AI-powered recommendations
2. **Map** - Location-based view
3. **Friends** - Friends' recommendations
4. **Chats** - Group messaging
5. **Ratings** - Your ratings
6. **Saved** - Saved items
7. **Profile** - User profile

### Navigation Styling

- Dark background (#230f10)
- Coral highlight for active mode
- Smooth transitions between modes
- Responsive design

## Walkthrough Flow

### 4-Step Introduction

1. **Welcome** - Introduction to LMK
2. **Browse Categories** - Overview of recommendation categories
3. **Personalized** - Explanation of personalization
4. **Rate & Refine** - How ratings improve recommendations

**Features**:
- Progress indicators
- Next/Previous buttons
- Skip option
- Smooth transitions

## Preference Test

### 20-Question Format

**Structure**:
- Left panel with progress
- Right panel with questions
- Multiple choice answers
- Category indicators

**Categories Covered**:
- Restaurants (3 questions)
- Movies (3 questions)
- TV Shows (3 questions)
- YouTube (2 questions)
- Reading (3 questions)
- Activities (3 questions)
- General Preferences (2 questions)

**Features**:
- Progress bar
- Category icons
- Clear question text
- Easy selection
- Submit button

## Responsive Design

### Mobile (< 768px)

- Single column layout
- Full-width cards
- Stacked navigation
- Larger touch targets
- Simplified navigation

### Tablet (768px - 1024px)

- Two column layout
- Optimized spacing
- Responsive images
- Flexible navigation

### Desktop (> 1024px)

- Full layout
- Split panels
- Optimized for large screens
- Complete feature set

## Animation & Interactions

### Hover States

- Cards: Border color changes to coral, shadow increases
- Buttons: Background darkens, text color changes
- Links: Underline appears, color changes to coral

### Transitions

- Smooth color transitions (300ms)
- Scale animations on click (active:scale-98)
- Fade transitions for modals
- Slide transitions for navigation

### Loading States

- Spinner animation
- Disabled button states
- Loading skeleton screens
- Progress indicators

## Accessibility

### Color Contrast

- All text meets WCAG AA standards
- Sufficient contrast between text and background
- Color not used as only indicator

### Interactive Elements

- Clear focus states
- Keyboard navigation support
- ARIA labels where needed
- Semantic HTML

### Text

- Readable font sizes (minimum 14px)
- Proper line height (1.5+)
- Clear hierarchy
- Descriptive labels

## Design Assets

All design reference files are stored in `/public/design-references/`:
- Stitch discover feed mockups
- Sign in/sign up designs
- Email verification design
- Recommendation card examples
- Logo specifications

## Implementation Notes

### Current UI Implementation

The current implementation maintains:
- Dark mode aesthetic (#230f10, #181011)
- Coral accent color (#fea4a7)
- Detailed recommendation cards with metrics
- Category-specific rating scales
- Responsive design
- Smooth animations
- Accessible components

### Design Consistency

All components follow:
- Consistent color scheme
- Unified typography
- Standard spacing (4-unit grid)
- Rounded corners (24px)
- Coral accent usage
- Dark mode throughout

## Future Enhancements

- Additional animation effects
- Advanced filtering options
- Social sharing features
- Collaborative playlists
- Advanced search
- Recommendation history
- User preferences refinement

---

**Last Updated**: January 28, 2026
**Version**: 1.0
**Status**: Production Ready

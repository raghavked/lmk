# Design Assets Manifest

## Overview

This document lists all design assets, mockups, and reference materials included in the LMK project. These assets serve as reference materials and design specifications for the application.

## Asset Locations

All design assets are stored in the following directories:

### `/public/design-assets/`

High-resolution design mockups and screenshots:

| File | Description | Dimensions |
|------|-------------|-----------|
| `Screenshot2026-01-26at10.48.43PM.png` | Detailed restaurant recommendation card design with metrics | 1440x900 |
| `Screenshot2026-01-26at11.53.37PM.png` | Complete restaurant recommendations layout with multiple cards | 1440x900 |
| `screen.png` | Logo design (phone with location pin) | 1024x1024 |

### `/public/design-references/stitch_discover_feed_personalized_recommendations/`

Complete Stitch AI design system mockups:

#### Sign In Page
- **Directory**: `sign_in_page/`
- **Files**:
  - `screen.png` - Visual mockup
  - `code.html` - HTML implementation reference

#### Sign Up Page
- **Directory**: `sign_up_page/`
- **Files**:
  - `screen.png` - Visual mockup
  - `code.html` - HTML implementation reference

#### Email Verification Page
- **Directory**: `email_verification_page/`
- **Files**:
  - `screen.png` - Visual mockup
  - `code.html` - HTML implementation reference

#### Discover Feed
- **Directory**: `discover_feed/`
- **Files**:
  - `screen.png` - Visual mockup
  - `code.html` - HTML implementation reference

#### Preference Test
- **Directory**: `preference_test/`
- **Files**:
  - `screen.png` - Visual mockup
  - `code.html` - HTML implementation reference

#### Additional Pages
- **Walkthrough Page** - `walkthrough_page/`
- **Map View** - `map_view/`
- **Profile Page** - `profile_page/`
- **Friends Feed** - `friends_feed/`

## Design Specifications

### Color System

The design uses a sophisticated color palette:

**Primary Colors**:
- Dark Background: `#230f10` (used throughout the app)
- Secondary Background: `#181011` (card backgrounds)
- Accent Color: `#fea4a7` (coral pink for interactive elements)

**Text Colors**:
- Primary Text: `#f5f5f5` (Gray-50)
- Secondary Text: `#9ca3af` (Gray-400)
- Tertiary Text: `#6b7280` (Gray-500)

**Border & Divider**:
- Border Color: `#374151` (Gray-700)
- Hover Border: `#fea4a7` with opacity

**Special Colors**:
- Logo Color: `#8b3a3a` (Dark red)
- Success: `#10b981` (Green)
- Error: `#ef4444` (Red)
- Warning: `#f59e0b` (Amber)

### Typography

**Font Stack**: System fonts (San Francisco, Segoe UI, Roboto)

**Sizes**:
- Display: 32px (bold)
- Heading 1: 28px (bold)
- Heading 2: 24px (bold)
- Heading 3: 20px (bold)
- Body: 16px (regular)
- Small: 14px (regular)
- Tiny: 12px (regular)

**Weights**:
- Regular: 400
- Medium: 500
- Bold: 700
- Black: 900

### Spacing

Grid-based spacing system (4px units):

- `xs`: 4px
- `sm`: 8px
- `md`: 16px
- `lg`: 24px
- `xl`: 32px
- `2xl`: 48px

### Border Radius

- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 20px
- `2xl`: 24px (used for cards)
- `full`: 9999px (used for buttons)

## Component Specifications

### Recommendation Cards

**Structure**:
1. Image Section (380px height)
   - High-quality image
   - Gradient overlay
   - Category badge
   - Fallback emoji

2. Content Section
   - Title (24px, bold)
   - Tagline (12px, coral, uppercase)
   - Location (14px, with icon)
   - Description (14px, gray-300)
   - Metrics (category-specific)
   - Tags (12px, gray-400)
   - Action buttons

**Metrics Display**:
- Label: 12px, gray-400, uppercase
- Value: 12px, coral
- Stars: 1-5 rating
- Progress bar: Coral gradient

### Buttons

**Primary Button**:
- Background: `#fea4a7`
- Text: `#230f10`
- Padding: 12px 24px
- Border Radius: 24px
- Font Weight: Bold

**Secondary Button**:
- Background: `#374151`
- Text: `#f5f5f5`
- Padding: 12px 24px
- Border Radius: 24px
- Border: 1px solid `#374151`

**Icon Button**:
- Size: 40px
- Background: `#374151`
- Border Radius: 12px
- Hover: Border color changes to coral

### Input Fields

**Style**:
- Background: `#374151`
- Border: 1px solid `#374151`
- Text: `#f5f5f5`
- Placeholder: `#9ca3af`
- Border Radius: 24px
- Padding: 12px 16px
- Focus: Border color changes to coral, ring added

### Cards

**Style**:
- Background: `#230f10`
- Border: 1px solid `#374151`
- Border Radius: 24px
- Padding: 24px
- Shadow: Subtle shadow on hover
- Hover: Border color changes to coral

## Animation & Transitions

### Timing

- Quick: 150ms
- Standard: 300ms
- Slow: 500ms

### Easing

- Linear: Linear progression
- Ease-in: Slow start, fast end
- Ease-out: Fast start, slow end
- Ease-in-out: Slow start and end

### Effects

- Fade: Opacity transition
- Scale: Size transformation
- Slide: Position transformation
- Color: Background/text color change

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|-----------|-------|-------|
| Mobile | < 640px | Small phones |
| Tablet | 640px - 1024px | Tablets and large phones |
| Desktop | > 1024px | Desktop and large screens |

## Implementation Status

### Completed Components

- ✅ Authentication pages (Sign In, Sign Up, Email Verification)
- ✅ Recommendation cards with detailed metrics
- ✅ Mode navigation (7 modes)
- ✅ Preference test (20 questions)
- ✅ Walkthrough (4 steps)
- ✅ Dark mode design system
- ✅ Responsive layout
- ✅ Accessibility features

### In Progress

- 🔄 Friends feed with social metrics
- 🔄 Map view with location filtering
- 🔄 Group chats functionality
- 🔄 Advanced filtering and search

### Planned

- 📋 Recommendation history
- 📋 Collaborative playlists
- 📋 Advanced analytics
- 📋 Social sharing features

## Design System Documentation

For detailed design specifications, see:
- `DESIGN_SPECIFICATIONS.md` - Complete design system guide
- `SETUP_GUIDE.md` - Implementation and setup instructions
- `SUPABASE_SCHEMA.md` - Database schema documentation

## Asset Usage Guidelines

### When to Use Design Assets

Design assets should be used as:
1. **Reference Materials** - For understanding design intent
2. **Specification Guides** - For implementing new features
3. **Quality Assurance** - For comparing implementation to design
4. **Documentation** - For explaining design decisions

### Asset Maintenance

- Keep assets organized by page/component
- Update assets when design changes
- Document design rationale
- Version control all assets
- Maintain consistency across assets

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 28, 2026 | Initial design system and assets |

---

**Last Updated**: January 28, 2026
**Maintained By**: Design & Development Team
**Status**: Active

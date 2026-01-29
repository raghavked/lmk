# LMK UI Redesign: Design System and Component Mapping

This document outlines the design system and component mapping required to implement the new UI based on the Google Stitch AI mockups. The goal is to translate the modern, content-first dark mode aesthetic into a functional and maintainable Tailwind CSS structure, ensuring all existing functionality is preserved and enhanced.

## 1. Design System Definition

The new design adopts a **dark mode** aesthetic with a focus on high contrast and a vibrant accent color for personalized metrics.

### 1.1. Color Palette (Tailwind CSS Configuration)

The color palette is defined to provide a sleek, immersive dark experience. The primary accent color, "coral," will be used to highlight the AI-driven personalized metrics, as specified in the design brief.

| Name | Usage | Hex Code (Inferred) | Tailwind Class |
| :--- | :--- | :--- | :--- |
| **Primary Background** | Main application background | `#0D1117` | `bg-gray-950` (or custom) |
| **Secondary Background** | Card and panel backgrounds | `#161B22` | `bg-gray-900` (or custom) |
| **Primary Text** | Main content text | `#F0F6FC` | `text-gray-50` |
| **Secondary Text** | Subheadings, metadata | `#8B949E` | `text-gray-400` |
| **Accent (Coral)** | AI Match Score, key metrics | `#FF6B6B` | `text-coral` (custom) |
| **Accent (Blue)** | Interactive elements, links | `#58A6FF` | `text-blue-400` |

**Custom Tailwind Color Definition (`tailwind.config.js`):**

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        'coral': '#FF6B6B', // Vibrant coral for AI metrics
        'background-primary': '#0D1117',
        'background-secondary': '#161B22',
      },
    },
  },
  // ...
}
```

### 1.2. Typography

A clean, modern sans-serif font will be used for all text elements, prioritizing readability in a dark environment.

| Element | Font Size (Tailwind) | Weight (Tailwind) | Color | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Page Title** | `text-3xl` to `text-4xl` | `font-bold` | `text-gray-50` | e.g., "Discover Feed" |
| **Card Title** | `text-xl` to `text-2xl` | `font-semibold` | `text-gray-50` | Recommendation name |
| **AI Metric** | `text-lg` to `text-xl` | `font-extrabold` | `text-coral` | Highlighting the personalized match score |
| **Body Text** | `text-base` | `font-normal` | `text-gray-400` | Descriptions and metadata |

## 2. Component Mapping and Implementation Plan

The redesign requires significant modifications to existing components and the introduction of new views.

### 2.1. Core Layout and Structure

The root layout (`app/layout.tsx`) and the main discovery page (`src/components/DiscoverClient.tsx`) will be updated to implement the new dark mode theme and the dashboard-style layout.

| Existing File | New Component/View | Description of Changes |
| :--- | :--- | :--- |
| `app/layout.tsx` | Root Layout | Apply the new `background-primary` color and set the global dark mode class. |
| `src/components/DiscoverClient.tsx` | Discover Feed Layout | Implement the new dashboard layout with a persistent sidebar for category navigation and the main content grid. |
| **New File** | Category Navigation | Dedicated component for the category tabs (Restaurants, Movies, etc.) to fit the new sidebar design. |

### 2.2. Recommendation Card (`ObjectCard.tsx`)

The existing `ObjectCard.tsx` will be completely redesigned to match the sleek, high-quality card style from the mockups.

| Feature | Existing Implementation | New Implementation |
| :--- | :--- | :--- |
| **Aesthetic** | Light mode, simple box | Dark mode, elevated card with subtle shadows/borders. |
| **Metrics** | Generic text/badges | Prominently displayed **AI Match Score** in `text-coral`. |
| **Image** | Simple background image | Large, high-quality image with a subtle overlay for text legibility. |
| **Interaction** | Simple click | Smooth hover effects and a clear "Details" or "Go" button. |

### 2.3. New Views and Functionality

The mockups introduce new views that require new components and potentially new data fetching logic.

| New View | Purpose | Existing Backend Integration | Implementation Notes |
| :--- | :--- | :--- | :--- |
| **Recommendation Detail View** | Expanded view of a single recommendation. | Data is available via existing API routes (`/api/recommend/route.ts`). | Requires a new page/modal component to display large image, full AI description, and similar recommendations carousel. |
| **Interactive Recommendation Map** | Map-based view for location-aware recommendations (e.g., Restaurants). | Yelp API provides location data. | Requires a new component (e.g., `MapView.tsx`) and a map library (e.g., Leaflet or Google Maps API, if necessary, but Leaflet is preferred for simplicity). This will be a significant new feature. |
| **Empty State** | Clear screen when no recommendations are found. | Handled in `DiscoverClient.tsx` logic. | Requires a new dedicated component to match the mockup's friendly, clean design. |

This plan provides a clear roadmap for the implementation, starting with the foundational design system and moving to component-level redesign and new feature implementation. The next step will be to apply these design system changes to the Tailwind configuration and core layout.

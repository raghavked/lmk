// Categories
export const CATEGORIES = [
  { id: 'restaurants', label: 'Restaurants', emoji: '🍽️' },
  { id: 'movies', label: 'Movies', emoji: '🎬' },
  { id: 'tv_shows', label: 'TV Shows', emoji: '📺' },
  { id: 'youtube_videos', label: 'YouTube', emoji: '▶️' },
  { id: 'reading', label: 'Reading', emoji: '📚' },
  { id: 'activities', label: 'Activities', emoji: '🎯' },
] as const;

// API Limits
export const API_LIMITS = {
  INITIAL_LOAD: 10,
  SHOW_MORE_INCREMENT: 10,
  MAX_RESULTS_PER_REQUEST: 30,
  OVER_FETCH_MULTIPLIER: 3,
} as const;

// Timeouts
export const TIMEOUTS = {
  API_CALL: 30000, // 30 seconds
  DEBOUNCE: 300, // 300ms
  TOAST_DURATION: 3000, // 3 seconds
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  SEEN_IDS: 'lmk_seen_ids',
  TASTE_PROFILE: 'lmk_taste_profile',
  WALKTHROUGH_COMPLETED: 'lmk_walkthrough_completed',
  PREFERRED_CATEGORY: 'lmk_preferred_category',
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'Failed to fetch recommendations. Please try again.',
  AUTH_ERROR: 'Authentication failed. Please log in again.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  RATING_SUBMITTED: 'Rating submitted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  RECOMMEND: '/api/recommend',
  RATE: '/api/rate',
  PROFILE: '/api/profile',
} as const;

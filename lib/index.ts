// User and Profile Types
export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  profile_image?: string;
  taste_profile: string[];
  location?: {
    coordinates: [number, number];
    city?: string;
    state?: string;
    country?: string;
  };
  created_at: string;
  updated_at: string;
}

// Recommendation Object Types
export interface RecommendationObject {
  id: string;
  category: 'restaurants' | 'movies' | 'tv_shows' | 'reading' | 'activities';
  title: string;
  description: string;
  primary_image?: {
    url: string;
    width: number;
    height: number;
  };
  secondary_images?: Array<{
    url: string;
  }>;
  external_ids?: Record<string, any>;
  external_ratings?: Array<{
    source: string;
    score: number;
    count: number;
  }>;
  source_links?: Array<{
    type: string;
    url: string;
    label: string;
  }>;
  tags?: string[];
  mood_tags?: string[];
  location?: {
    city: string;
    state?: string;
    country?: string;
    coordinates?: [number, number];
  };
  price?: string;
  review_count?: number;
  vote_count?: number;
  vote_average?: number;
  genres?: string[];
  release_date?: string;
  first_air_date?: string;
  time_commitment?: {
    min_minutes: number;
    max_minutes: number;
    typical_minutes: number;
  };
  availability?: {
    streaming_services: string[];
  };
  last_fetched: string;
  data_stale: boolean;
}

// AI Ranker Explanation Types
export interface RankerExplanation {
  hook?: string;
  why_youll_like?: string;
  friend_callout?: string;
  caveats?: string;
  detailed_ratings?: Record<string, number>;
  tags?: string[];
  tagline?: string;
}

// Ranked Result Type
export interface RankedResult {
  rank: number;
  object: RecommendationObject;
  personalized_score: number;
  explanation: RankerExplanation;
}

// API Response Types
export interface RecommendationResponse {
  results: RankedResult[];
  sections?: Record<string, Section>;
  category: string;
  mode: string;
  error?: string;
  message?: string;
}

export interface Section {
  title: string;
  emoji: string;
  items: RankedResult[];
}

// Rating Types
export interface UserRating {
  id: string;
  user_id: string;
  object_id: string;
  score: number;
  feedback?: string;
  is_public: boolean;
  created_at: string;
}

// Social Signals Types
export interface SocialSignals {
  trendingItems: Array<{
    objectId: string;
    averageScore: number;
    ratingCount: number;
  }>;
  userTasteProfile: string[];
  timestamp: string;
}

// API Request Parameters
export interface RecommendationParams {
  category: string;
  query?: string;
  limit?: number;
  offset?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  mode?: 'feed' | 'quick';
  seen_ids?: string;
}

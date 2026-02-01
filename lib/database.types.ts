
export type CategoryType = 'restaurants' | 'movies' | 'tv_shows' | 'reading' | 'activities';

export interface Profile {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  profile_image?: string;
  location?: {
    city: string;
    state: string;
    country: string;
    coordinates: [number, number];
  };
  timezone?: string;
  preferences?: {
    categories_enabled: CategoryType[];
    discovery_radius_miles: number;
    price_range_preference: [number, number];
    time_availability: string;
    dietary_restrictions?: string[];
    streaming_services?: string[];
  };
  taste_profile?: TasteProfile[];
  stats?: {
    total_ratings: number;
    ratings_by_category: { category: string; count: number }[];
    friends_count: number;
    avg_rating_given: number;
  };
  settings?: {
    notifications_enabled: boolean;
    friend_ratings_visible: boolean;
    profile_public: boolean;
  };
}

export interface TasteProfile {
  category: CategoryType;
  tags: { tag: string; weight: number }[];
  avg_price_rated: number;
  avg_time_commitment: number;
  mood_affinity: { mood: string; score: number }[];
  last_computed: string;
}

export interface LMKObject {
  id: string;
  created_at: string;
  updated_at: string;
  category: CategoryType;
  title: string;
  description?: string;
  primary_image?: {
    url: string;
    width: number;
    height: number;
    blurhash?: string;
  };
  secondary_images?: {
    url: string;
    caption?: string;
  }[];
  external_ids?: {
    yelp_id?: string;
    google_place_id?: string;
    tmdb_id?: number;
    youtube_video_id?: string;
    imdb_id?: string;
  };
  external_ratings?: {
    source: string;
    score: number;
    count: number;
    url?: string;
  }[];
  lmk_score?: number;
  lmk_rating_count: number;
  lmk_avg_rating?: number;
  tags: string[];
  mood_tags: string[];
  location?: {
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
    coordinates: [number, number];
    neighborhood?: string;
  };
  price_level?: 1 | 2 | 3 | 4;
  time_commitment?: {
    min_minutes: number;
    max_minutes: number;
    typical_minutes: number;
  };
  availability?: {
    hours?: string;
    streaming_services?: string[];
    platforms?: string[];
  };
  source_links: {
    type: string;
    url: string;
    label: string;
  }[];
  last_fetched?: string;
  data_stale: boolean;
}

export interface Rating {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  object_id: string;
  score: number;
  feedback?: string;
  context?: {
    when_experienced?: string;
    with_who?: string;
    occasion?: string;
  };
  is_public: boolean;
  is_favorite: boolean;
  helpfulness_score: number;
}

export interface Friendship {
  id: string;
  created_at: string;
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted' | 'blocked';
  initiated_by: string;
  taste_compatibility?: {
    overall_score: number;
    by_category: { category: string; score: number }[];
    shared_ratings_count: number;
    agreement_rate: number;
  };
}

export interface RecommendationSession {
  id: string;
  created_at: string;
  user_id: string;
  query: {
    natural_language?: string;
    category?: CategoryType;
    location?: [number, number];
    filters?: any;
  };
  results: {
    object_id: string;
    rank: number;
    personalized_score: number;
    explanation?: any;
  }[];
  action_taken?: {
    object_id: string;
    action: string;
  };
}

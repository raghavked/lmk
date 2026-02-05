export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          taste_profile: any | null;
          location: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          preferences_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          avatar_url?: string | null;
          taste_profile?: any | null;
          location?: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          preferences_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          taste_profile?: any | null;
          location?: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          preferences_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          item_title: string;
          category: string;
          rating: number;
          review: string | null;
          is_favorite: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          item_title: string;
          category: string;
          rating: number;
          review?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          item_id?: string;
          item_title?: string;
          category?: string;
          rating?: number;
          review?: string | null;
          is_favorite?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string;
          profile_image: string | null;
          taste_profile: string[] | null;
          location: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email: string;
          profile_image?: string | null;
          taste_profile?: string[] | null;
          location?: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string;
          profile_image?: string | null;
          taste_profile?: string[] | null;
          location?: {
            coordinates: [number, number];
            city?: string;
            state?: string;
            country?: string;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ratings: {
        Row: {
          id: string;
          user_id: string;
          object_id: string;
          score: number;
          feedback: string | null;
          is_public: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          object_id: string;
          score: number;
          feedback?: string | null;
          is_public?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          object_id?: string;
          score?: number;
          feedback?: string | null;
          is_public?: boolean;
          created_at?: string;
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

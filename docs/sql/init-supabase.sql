-- LMK Database Initialization Script
-- This script creates all necessary tables, functions, and triggers for the LMK application

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pgvector"; -- Removed due to user environment error

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  full_name TEXT,
  profile_image TEXT,
  location JSONB,
  timezone TEXT,
  preferences JSONB,
  taste_profile JSONB,
  stats JSONB,
  settings JSONB DEFAULT '{
    "notifications_enabled": true,
    "friend_ratings_visible": true,
    "profile_public": false
  }'::jsonb
);

-- Create lmk_objects table
CREATE TABLE IF NOT EXISTS lmk_objects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  primary_image JSONB,
  secondary_images JSONB,
  external_ids JSONB,
  external_ratings JSONB,
  lmk_score NUMERIC,
  lmk_rating_count INTEGER DEFAULT 0,
  lmk_avg_rating NUMERIC,
  tags TEXT[] DEFAULT '{}',
  mood_tags TEXT[] DEFAULT '{}',
  location JSONB,
  price_level SMALLINT,
  time_commitment JSONB,
  availability JSONB,
  source_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_fetched TIMESTAMP WITH TIME ZONE,
  data_stale BOOLEAN DEFAULT false
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES lmk_objects(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL CHECK (score >= 1 AND score <= 5),
  feedback TEXT,
  context JSONB,
  is_public BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  helpfulness_score INTEGER DEFAULT 0
);

-- Create friendships table
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  taste_compatibility JSONB,
  CONSTRAINT different_users CHECK (user_id_1 != user_id_2)
  -- The unique_friendship constraint is now handled by a functional index below
);

-- Create recommendation_sessions table
CREATE TABLE IF NOT EXISTS recommendation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query JSONB NOT NULL,
  results JSONB DEFAULT '[]'::jsonb,
  action_taken JSONB
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_lmk_objects_category ON lmk_objects(category);
CREATE INDEX IF NOT EXISTS idx_lmk_objects_created_at ON lmk_objects(created_at);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_object_id ON ratings(object_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_1 ON friendships(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friendships_user_id_2 ON friendships(user_id_2);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);
CREATE INDEX IF NOT EXISTS idx_recommendation_sessions_user_id ON recommendation_sessions(user_id);

-- Functional index to enforce unique friendships regardless of user order
CREATE UNIQUE INDEX IF NOT EXISTS unique_friendship_idx ON friendships (LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lmk_objects_updated_at ON lmk_objects;
CREATE TRIGGER update_lmk_objects_updated_at
  BEFORE UPDATE ON lmk_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lmk_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles (Added DROP POLICY for idempotency)
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
CREATE POLICY "Users can view public profiles" ON profiles
  FOR SELECT USING ((settings->>'profile_public')::boolean = true);

-- Create RLS policies for ratings
DROP POLICY IF EXISTS "Users can view public ratings" ON ratings;
CREATE POLICY "Users can view public ratings" ON ratings
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS "Users can view their own ratings" ON ratings;
CREATE POLICY "Users can view their own ratings" ON ratings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create ratings" ON ratings;
CREATE POLICY "Users can create ratings" ON ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own ratings" ON ratings;
CREATE POLICY "Users can update their own ratings" ON ratings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own ratings" ON ratings;
CREATE POLICY "Users can delete their own ratings" ON ratings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for friendships
DROP POLICY IF EXISTS "Users can view their own friendships" ON friendships;
CREATE POLICY "Users can view their own friendships" ON friendships
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

DROP POLICY IF EXISTS "Users can create friendships" ON friendships;
CREATE POLICY "Users can create friendships" ON friendships
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

DROP POLICY IF EXISTS "Users can update their own friendships" ON friendships;
CREATE POLICY "Users can update their own friendships" ON friendships
  FOR UPDATE USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Create RLS policies for recommendation_sessions
DROP POLICY IF EXISTS "Users can view their own sessions" ON recommendation_sessions;
CREATE POLICY "Users can view their own sessions" ON recommendation_sessions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create sessions" ON recommendation_sessions;
CREATE POLICY "Users can create sessions" ON recommendation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for lmk_objects (public read)
DROP POLICY IF EXISTS "Anyone can view lmk_objects" ON lmk_objects;
CREATE POLICY "Anyone can view lmk_objects" ON lmk_objects
  FOR SELECT USING (true);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON profiles TO anon, authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
GRANT SELECT ON lmk_objects TO anon, authenticated;
GRANT SELECT ON ratings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ratings TO authenticated;
GRANT SELECT ON friendships TO authenticated;
GRANT INSERT, UPDATE ON friendships TO authenticated;
GRANT SELECT, INSERT ON recommendation_sessions TO authenticated;

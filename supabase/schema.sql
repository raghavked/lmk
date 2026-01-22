-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  profile_image TEXT,
  
  location JSONB,
  timezone TEXT,
  preferences JSONB DEFAULT '{}',
  taste_profile JSONB DEFAULT '[]',
  stats JSONB DEFAULT '{"total_ratings": 0, "ratings_by_category": [], "friends_count": 0, "avg_rating_given": 0}',
  settings JSONB DEFAULT '{"notifications_enabled": true, "friend_ratings_visible": true, "profile_public": true}'
);

-- Objects table
CREATE TABLE public.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  category TEXT NOT NULL CHECK (category IN ('restaurant', 'movie', 'tv_show', 'article', 'youtube', 'activity')),
  title TEXT NOT NULL,
  description TEXT,
  
  primary_image JSONB,
  secondary_images JSONB,
  
  external_ids JSONB,
  external_ratings JSONB,
  
  lmk_score DECIMAL(3,1),
  lmk_rating_count INT DEFAULT 0,
  lmk_avg_rating DECIMAL(3,1),
  
  tags TEXT[],
  mood_tags TEXT[],
  
  location JSONB,
  price_level INT CHECK (price_level >= 1 AND price_level <= 4),
  time_commitment JSONB,
  availability JSONB,
  source_links JSONB,
  
  last_fetched TIMESTAMPTZ,
  data_stale BOOLEAN DEFAULT FALSE
);

-- Ratings table
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  object_id UUID NOT NULL REFERENCES public.objects(id) ON DELETE CASCADE,
  
  score DECIMAL(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
  feedback TEXT,
  context JSONB,
  
  is_public BOOLEAN DEFAULT TRUE,
  is_favorite BOOLEAN DEFAULT FALSE,
  helpfulness_score INT DEFAULT 0,
  
  UNIQUE(user_id, object_id)
);

-- Friendships table
CREATE TABLE public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id_1 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  initiated_by UUID NOT NULL REFERENCES public.profiles(id),
  
  taste_compatibility JSONB,
  
  CHECK (user_id_1 < user_id_2),
  UNIQUE(user_id_1, user_id_2)
);

-- Recommendation sessions table
CREATE TABLE public.recommendation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  query JSONB NOT NULL,
  results JSONB NOT NULL,
  action_taken JSONB
);

-- API cache table
CREATE TABLE public.api_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  cache_key TEXT UNIQUE NOT NULL,
  endpoint TEXT NOT NULL,
  response_data JSONB NOT NULL,
  hit_count INT DEFAULT 0
);

-- Indexes
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_objects_category ON public.objects(category);
CREATE INDEX idx_objects_lmk_score ON public.objects(lmk_score DESC);
CREATE INDEX idx_objects_tags ON public.objects USING GIN(tags);
CREATE INDEX idx_ratings_user ON public.ratings(user_id);
CREATE INDEX idx_ratings_object ON public.ratings(object_id);
CREATE INDEX idx_ratings_score ON public.ratings(score DESC);
CREATE INDEX idx_ratings_created ON public.ratings(created_at DESC);
CREATE INDEX idx_friendships_users ON public.friendships(user_id_1, user_id_2);
CREATE INDEX idx_friendships_status ON public.friendships(status);
CREATE INDEX idx_recsessions_user ON public.recommendation_sessions(user_id);
CREATE INDEX idx_recsessions_created ON public.recommendation_sessions(created_at DESC);
CREATE INDEX idx_cache_key ON public.api_cache(cache_key);
CREATE INDEX idx_cache_expires ON public.api_cache(expires_at);

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Objects policies
CREATE POLICY "Objects are viewable by everyone" ON public.objects
  FOR SELECT USING (true);

-- Ratings policies
CREATE POLICY "Users can view public ratings" ON public.ratings
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can insert own ratings" ON public.ratings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ratings" ON public.ratings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own ratings" ON public.ratings
  FOR DELETE USING (user_id = auth.uid());

-- Friendships policies
CREATE POLICY "Users can view own friendships" ON public.friendships
  FOR SELECT USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

CREATE POLICY "Users can create friendships" ON public.friendships
  FOR INSERT WITH CHECK (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

CREATE POLICY "Users can update own friendships" ON public.friendships
  FOR UPDATE USING (user_id_1 = auth.uid() OR user_id_2 = auth.uid());

-- Recommendation sessions policies
CREATE POLICY "Users can view own sessions" ON public.recommendation_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions" ON public.recommendation_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON public.objects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

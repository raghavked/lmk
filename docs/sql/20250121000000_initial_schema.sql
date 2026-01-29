-- Initial Schema for LMK
CREATE TYPE category_type AS ENUM ('restaurant', 'movie', 'tv_show', 'article', 'youtube', 'activity');

CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  profile_image TEXT,
  location JSONB,
  taste_profile JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category category_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  primary_image JSONB,
  external_ids JSONB,
  external_ratings JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  mood_tags TEXT[] DEFAULT '{}',
  location JSONB,
  price_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  score INTEGER CHECK (score >= 1 AND score <= 10),
  feedback TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, object_id)
);

CREATE TABLE saved_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  object_id UUID REFERENCES objects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, object_id)
);

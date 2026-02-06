-- ============================================
-- LMK: Fix All RLS Policies & Schema Issues
-- Run this ONCE in Supabase SQL Editor
-- Safe to re-run (idempotent)
-- ============================================

-- STEP 1: Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ratings' AND column_name = 'is_favorite') THEN
    ALTER TABLE ratings ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ratings' AND column_name = 'item_title') THEN
    ALTER TABLE ratings ADD COLUMN item_title TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ratings' AND column_name = 'category') THEN
    ALTER TABLE ratings ADD COLUMN category TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'creator_id') THEN
    ALTER TABLE groups ADD COLUMN creator_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- STEP 2: Drop the email column from profiles if it exists (email lives in auth.users)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
    DROP INDEX IF EXISTS idx_profiles_email;
    ALTER TABLE profiles DROP COLUMN email;
  END IF;
END $$;

-- STEP 3: Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_sessions ENABLE ROW LEVEL SECURITY;

-- STEP 4: Remove ALL existing policies (clean slate, prevents duplicates)

-- Profiles (remove all known duplicates)
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;

-- Ratings
DROP POLICY IF EXISTS "Users can view own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can insert own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can update own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can delete own ratings" ON ratings;
DROP POLICY IF EXISTS "Users can view friend ratings" ON ratings;

-- Friends
DROP POLICY IF EXISTS "Users can view friends" ON friends;
DROP POLICY IF EXISTS "Users can send friend requests" ON friends;
DROP POLICY IF EXISTS "Users can update friends" ON friends;
DROP POLICY IF EXISTS "Users can delete friends" ON friends;

-- Groups
DROP POLICY IF EXISTS "Users can view groups" ON groups;
DROP POLICY IF EXISTS "Users can create groups" ON groups;

-- Group members
DROP POLICY IF EXISTS "Users can view group_members" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
DROP POLICY IF EXISTS "Group creators can manage members" ON group_members;
DROP POLICY IF EXISTS "Group creators can remove members" ON group_members;

-- Group messages
DROP POLICY IF EXISTS "Users can view messages" ON group_messages;
DROP POLICY IF EXISTS "Users can send messages" ON group_messages;
DROP POLICY IF EXISTS "Users can view messages in their groups" ON group_messages;
DROP POLICY IF EXISTS "Users can send messages to their groups" ON group_messages;

-- Group invites
DROP POLICY IF EXISTS "Users can view invites" ON group_invites;
DROP POLICY IF EXISTS "Users can create invites" ON group_invites;
DROP POLICY IF EXISTS "Users can update invites" ON group_invites;
DROP POLICY IF EXISTS "Users can delete invites" ON group_invites;

-- Polls
DROP POLICY IF EXISTS "Users can view polls" ON polls;
DROP POLICY IF EXISTS "Users can create polls" ON polls;
DROP POLICY IF EXISTS "Users can view polls in their groups" ON polls;
DROP POLICY IF EXISTS "Users can create polls in their groups" ON polls;

-- Plan sessions
DROP POLICY IF EXISTS "Users can view own plans" ON plan_sessions;
DROP POLICY IF EXISTS "Users can create plans" ON plan_sessions;
DROP POLICY IF EXISTS "Users can update own plans" ON plan_sessions;
DROP POLICY IF EXISTS "Users can delete own plans" ON plan_sessions;

-- STEP 5: Create clean RLS policies

-- PROFILES
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON profiles FOR DELETE USING (auth.uid() = id);

-- RATINGS
CREATE POLICY "Users can view own ratings" ON ratings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ratings" ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ratings" ON ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ratings" ON ratings FOR DELETE USING (auth.uid() = user_id);

-- FRIENDS
CREATE POLICY "Users can view friends" ON friends FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can send friend requests" ON friends FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update friends" ON friends FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "Users can delete friends" ON friends FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- GROUPS
CREATE POLICY "Users can view groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- GROUP MEMBERS
CREATE POLICY "Users can view group_members" ON group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);

-- GROUP MESSAGES
CREATE POLICY "Users can view messages" ON group_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Users can send messages" ON group_messages FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = group_messages.group_id AND group_members.user_id = auth.uid())
);

-- GROUP INVITES
CREATE POLICY "Users can view invites" ON group_invites FOR SELECT USING (auth.uid() = user_id OR auth.uid() = invited_by);
CREATE POLICY "Users can create invites" ON group_invites FOR INSERT WITH CHECK (auth.uid() = invited_by);
CREATE POLICY "Users can update invites" ON group_invites FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete invites" ON group_invites FOR DELETE USING (auth.uid() = user_id OR auth.uid() = invited_by);

-- POLLS
CREATE POLICY "Users can view polls" ON polls FOR SELECT USING (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = polls.group_id AND group_members.user_id = auth.uid())
);
CREATE POLICY "Users can create polls" ON polls FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM group_members WHERE group_members.group_id = polls.group_id AND group_members.user_id = auth.uid())
);

-- PLAN SESSIONS
CREATE POLICY "Users can view own plans" ON plan_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create plans" ON plan_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own plans" ON plan_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own plans" ON plan_sessions FOR DELETE USING (auth.uid() = user_id);

-- STEP 6: Fix the auto-create profile trigger (no email column)
-- IMPORTANT: Uses EXCEPTION handler so trigger failures never block user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Could not auto-create profile for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 7: Add performance indexes
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_object_id ON ratings(object_id);
CREATE INDEX IF NOT EXISTS idx_ratings_category ON ratings(category);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_category ON ratings(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ratings_is_favorite ON ratings(user_id, is_favorite) WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);
CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group ON group_members(user_id, group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_invites_user_id ON group_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_group_id ON group_invites(group_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_status ON group_invites(status);
CREATE INDEX IF NOT EXISTS idx_group_invites_user_status ON group_invites(user_id, status);
CREATE INDEX IF NOT EXISTS idx_polls_group_id ON polls(group_id);
CREATE INDEX IF NOT EXISTS idx_polls_created_by ON polls(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_user_id ON plan_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_updated_at ON plan_sessions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_plan_sessions_user_updated ON plan_sessions(user_id, updated_at DESC);

-- ============================================
-- Done! All tables secured and optimized.
-- ============================================

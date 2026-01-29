-- SQL Script to ensure correct Row Level Security (RLS) for profile updates
-- MUST be run manually in your Supabase SQL Editor

-- 1. Enable RLS on the profiles table (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view their own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;

-- 3. Create a SELECT policy: Users can view their own profile
CREATE POLICY "Users can view their own profile."
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Create an UPDATE policy: Users can update their own profile
CREATE POLICY "Users can update their own profile."
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 5. Create an INSERT policy: Users can create their own profile (used during signup)
CREATE POLICY "Users can insert their own profile."
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Note: The update API logic handles the case where a profile might not exist yet (create on first update).
-- The RLS policies above ensure that only the authenticated user can read, update, or create their own profile row.

-- Final and Comprehensive RLS Fix for Profiles Table

-- 1. Enable RLS on the profiles table (just in case)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role has full access" ON profiles;

-- 3. Create a policy to allow anyone to view profiles (needed for discovery/friends)
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
USING (true);

-- 4. Create a policy to allow users to insert their own profile
-- This is critical for the first-time login/auto-creation
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 5. Create a policy to allow users to update their own profile
CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. Ensure the service role (used by some background tasks) has full access
CREATE POLICY "Service role has full access" 
ON profiles FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- 7. Grant necessary permissions to the authenticated role
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- 8. Verify the table structure has the correct defaults
ALTER TABLE profiles ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE profiles ALTER COLUMN updated_at SET DEFAULT now();

-- scripts/extend-ratings-schema.sql

-- This script extends the 'ratings' table to support the Rich Ratings System
-- as required by the new MVP features.
-- The user MUST run this script in the Supabase SQL Editor.

-- 1. Add columns for Rich Ratings System
ALTER TABLE public.ratings
ADD COLUMN photos text[] NULL,        -- Array of Supabase Storage URLs for 1-5 photos
ADD COLUMN description text NULL,     -- Short description (280-500 chars)
ADD COLUMN hashtags text[] NULL;      -- Array of freeform/suggested hashtags

-- 2. Update RLS Policy (User must verify this in Supabase)
-- The existing RLS policy for 'ratings' should be updated to allow authenticated users
-- to INSERT and UPDATE these new columns on their own rows.
-- Example policy (assuming policy already exists):
-- Policy: "Allow users to update their own ratings"
-- USING (auth.uid() = user_id)
-- WITH CHECK (auth.uid() = user_id)

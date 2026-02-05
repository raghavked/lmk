# Supabase Scalability SQL

Run these SQL commands in your Supabase Dashboard > SQL Editor to improve performance and reliability for multiple users.

## Quick Fix: Run Everything At Once

For the fastest setup, copy and paste the contents of `docs/sql/fix_all_rls_and_schema.sql` into your Supabase SQL Editor and run it. That single file handles everything below (schema fixes, RLS, trigger, indexes). It is safe to re-run.

---

## 1. Automatic Profile Creation Trigger

This trigger automatically creates a profile row when a new user signs up, preventing the app from "hanging" on a missing profile.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 2. Database Indexes for Performance

These indexes speed up common queries as user count grows.

```sql
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_object_id ON ratings(object_id);
CREATE INDEX IF NOT EXISTS idx_ratings_category ON ratings(category);
CREATE INDEX IF NOT EXISTS idx_ratings_user_category ON ratings(user_id, category);
CREATE INDEX IF NOT EXISTS idx_ratings_is_favorite ON ratings(user_id, is_favorite) WHERE is_favorite = TRUE;

CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON friends(friend_id);
CREATE INDEX IF NOT EXISTS idx_friends_status ON friends(status);

CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_plan_sessions_user_id ON plan_sessions(user_id);
```

## 3. Verify RLS is Enabled

```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

All tables should show `true` for rowsecurity. If any show `false`, run the fix_all_rls_and_schema.sql script.

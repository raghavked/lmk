# Supabase Schema Setup

This document outlines the required Supabase tables and columns for the LMK application.

## Tables Required

### 1. profiles
Stores user profile information and preferences.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  location JSONB, -- { coordinates: [lat, lng], city: "string" }
  taste_profile JSONB, -- Stores user preferences from the preference test
  preferences_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2. friends
Manages friend relationships between users.

```sql
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);
```

### 3. group_chats
Stores group chat information.

```sql
CREATE TABLE group_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 4. group_members
Manages group chat membership.

```sql
CREATE TABLE group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'admin', 'moderator', 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);
```

### 5. messages
Stores direct and group messages.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- NULL for group messages
  group_id UUID REFERENCES group_chats(id) ON DELETE CASCADE, -- NULL for direct messages
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 6. recommendations
Stores user ratings and recommendations history.

```sql
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  object_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'restaurants', 'movies', 'tv_shows', 'youtube_videos', 'reading', 'activities'
  rating INTEGER, -- 1-5 stars
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, object_id, category)
);
```

## Row Level Security (RLS) Policies

Enable RLS on all tables and set up the following policies:

### profiles
- Users can view their own profile
- Users can update their own profile

### friends
- Users can view their own friend list
- Users can create friend requests
- Users can accept/decline friend requests

### group_chats
- Users can view groups they're members of
- Group admins can manage group settings

### messages
- Users can view their own messages
- Users can send messages to friends or group members

### recommendations
- Users can view their own recommendations
- Users can create/update their own recommendations

## Setup Instructions

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the SQL statements above to create the tables
4. Enable Row Level Security on each table
5. Create the RLS policies as described above

## Environment Variables

Add these to your `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

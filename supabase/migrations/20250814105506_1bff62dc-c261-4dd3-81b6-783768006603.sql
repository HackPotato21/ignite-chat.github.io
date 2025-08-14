-- Complete database rebuild - drop everything and recreate properly

-- Drop existing policies and functions
DROP POLICY IF EXISTS "Anyone can read public rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Room owners can update their own rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can read rooms they belong to" ON public.chat_rooms;

DROP POLICY IF EXISTS "Users can create messages in their rooms" ON public.messages;
DROP POLICY IF EXISTS "Users can read messages from their rooms" ON public.messages;

DROP POLICY IF EXISTS "Anyone can see users in public rooms" ON public.room_users;
DROP POLICY IF EXISTS "Users can join rooms" ON public.room_users;
DROP POLICY IF EXISTS "Users can leave their own room entries" ON public.room_users;
DROP POLICY IF EXISTS "Users can see room users for their rooms" ON public.room_users;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.check_user_room_access(uuid, text);
DROP FUNCTION IF EXISTS public.user_belongs_to_room(uuid, text);
DROP FUNCTION IF EXISTS public.user_has_room_access(uuid, text);
DROP FUNCTION IF EXISTS public.get_active_room_user_count(uuid);
DROP FUNCTION IF EXISTS public.get_room_user_count(uuid);
DROP FUNCTION IF EXISTS public.cleanup_idle_users();
DROP FUNCTION IF EXISTS public.cleanup_user_from_room(uuid, text);
DROP FUNCTION IF EXISTS public.cleanup_user_from_room_beacon(uuid, text);

-- Recreate tables with better structure
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.room_users CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.G CASCADE;

-- Create room type enum
DROP TYPE IF EXISTS room_type CASCADE;
CREATE TYPE room_type AS ENUM ('public', 'private');

-- Create chat_rooms table
CREATE TABLE public.chat_rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name text NOT NULL,
    room_type room_type NOT NULL DEFAULT 'public',
    owner_name text NOT NULL,
    session_id text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Create room_users table
CREATE TABLE public.room_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    is_owner boolean DEFAULT false,
    joined_at timestamptz DEFAULT now(),
    last_activity timestamptz DEFAULT now(),
    UNIQUE(room_id, user_name)
);

-- Create messages table
CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id uuid REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
    user_name text NOT NULL,
    message text,
    media_url text,
    media_type text,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create security definer functions to avoid recursion
CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT current_setting('app.current_user_name'::text, true);
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_room(p_room_id uuid, p_user_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_users 
    WHERE room_id = p_room_id AND user_name = p_user_name
  );
$$;

-- Simple RLS policies without recursion
-- Chat rooms policies
CREATE POLICY "Public rooms are readable" 
ON public.chat_rooms FOR SELECT 
USING (room_type = 'public');

CREATE POLICY "Users can create rooms" 
ON public.chat_rooms FOR INSERT 
WITH CHECK (owner_name = get_current_user() AND owner_name IS NOT NULL);

CREATE POLICY "Room owners can update" 
ON public.chat_rooms FOR UPDATE 
USING (owner_name = get_current_user());

-- Room users policies  
CREATE POLICY "Users can join rooms" 
ON public.room_users FOR INSERT 
WITH CHECK (user_name = get_current_user() AND user_name IS NOT NULL);

CREATE POLICY "Users can see room members" 
ON public.room_users FOR SELECT 
USING (user_is_in_room(room_id, get_current_user()));

CREATE POLICY "Users can leave rooms" 
ON public.room_users FOR DELETE 
USING (user_name = get_current_user());

-- Messages policies
CREATE POLICY "Users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (user_name = get_current_user() AND user_is_in_room(room_id, user_name));

CREATE POLICY "Users can read room messages" 
ON public.messages FOR SELECT 
USING (user_is_in_room(room_id, get_current_user()));

-- Utility functions
CREATE OR REPLACE FUNCTION public.cleanup_idle_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.room_users 
  WHERE last_activity < now() - interval '10 minutes';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_room_user_count(p_room_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.room_users WHERE room_id = p_room_id;
$$;
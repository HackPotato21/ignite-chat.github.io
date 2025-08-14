-- Fix infinite recursion in chat_rooms RLS policy
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read rooms they belong to" ON public.chat_rooms;

-- Create a security definer function to check room access safely
CREATE OR REPLACE FUNCTION public.check_user_room_access(room_uuid uuid, username text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_users 
    WHERE room_id = room_uuid 
    AND user_name = username
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Users can read rooms they belong to" 
ON public.chat_rooms 
FOR SELECT 
USING (
  room_type = 'public'::room_type 
  OR check_user_room_access(id, current_setting('app.current_user_name'::text, true))
);
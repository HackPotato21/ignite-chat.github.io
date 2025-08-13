-- Fix infinite recursion in room_users RLS policy
-- First, create a security definer function to check if user belongs to room
CREATE OR REPLACE FUNCTION public.user_belongs_to_room(p_room_id uuid, p_user_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_users 
    WHERE room_id = p_room_id 
    AND user_name = p_user_name
  );
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can see room users for their rooms" ON public.room_users;

-- Create a new policy using the security definer function
CREATE POLICY "Users can see room users for their rooms" 
ON public.room_users 
FOR SELECT 
USING (public.user_belongs_to_room(room_id, current_setting('app.current_user_name'::text, true)));

-- Also create a simpler policy for viewing room users in public rooms
CREATE POLICY "Anyone can see users in public rooms" 
ON public.room_users 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.chat_rooms cr 
  WHERE cr.id = room_users.room_id 
  AND cr.room_type = 'public'
));
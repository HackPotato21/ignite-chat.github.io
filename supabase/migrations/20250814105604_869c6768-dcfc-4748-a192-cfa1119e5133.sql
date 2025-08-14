-- Fix security warnings by setting search paths
CREATE OR REPLACE FUNCTION public.get_current_user()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT current_setting('app.current_user_name'::text, true);
$$;

CREATE OR REPLACE FUNCTION public.user_is_in_room(p_room_id uuid, p_user_name text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_users 
    WHERE room_id = p_room_id AND user_name = p_user_name
  );
$$;

CREATE OR REPLACE FUNCTION public.cleanup_idle_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::integer FROM public.room_users WHERE room_id = p_room_id;
$$;
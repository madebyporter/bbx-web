-- Drop the existing function first (if it exists)
DROP FUNCTION IF EXISTS public.get_users_with_last_sign_in();

-- Create the function with correct return type
CREATE FUNCTION public.get_users_with_last_sign_in()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied. Authentication required.';
  END IF;

  -- Return users with their profile data and last_sign_in_at
  -- Use a subquery to order first, then aggregate
  SELECT json_agg(row_to_json(ordered_users)) INTO result
  FROM (
    SELECT 
      up.id,
      up.username,
      up.display_name,
      au.email,
      au.last_sign_in_at
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    ORDER BY up.created_at DESC
  ) ordered_users;

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_users_with_last_sign_in() TO authenticated;


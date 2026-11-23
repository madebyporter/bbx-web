-- Expose user_profiles.created_at so Admin can show "New" for recent signups
DROP FUNCTION IF EXISTS public.get_users_with_last_sign_in();

CREATE FUNCTION public.get_users_with_last_sign_in()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied. Authentication required.';
  END IF;

  SELECT json_agg(row_to_json(ordered_users)) INTO result
  FROM (
    SELECT
      up.id,
      up.username,
      up.display_name,
      up.created_at,
      au.email,
      au.last_sign_in_at
    FROM public.user_profiles up
    LEFT JOIN auth.users au ON up.id = au.id
    ORDER BY up.created_at DESC
  ) ordered_users;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_last_sign_in() TO authenticated;

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_resource_use_counts();

-- Create function to get resource use counts
CREATE OR REPLACE FUNCTION public.get_resource_use_counts()
RETURNS TABLE (
  resource_id bigint,
  count text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ur.resource_id,
    COUNT(DISTINCT ur.user_id)::text as count
  FROM user_resources ur
  GROUP BY ur.resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_resource_use_counts() TO authenticated;

-- Create policy for user_resources table if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_resources' 
    AND policyname = 'Users can view all resource counts'
  ) THEN
    CREATE POLICY "Users can view all resource counts" 
    ON public.user_resources FOR SELECT 
    USING (true);
  END IF;
END $$; 
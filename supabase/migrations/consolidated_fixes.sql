-- First, ensure tables have correct relationships
ALTER TABLE IF EXISTS resource_tags
  DROP CONSTRAINT IF EXISTS resource_tags_resource_id_fkey,
  DROP CONSTRAINT IF EXISTS resource_tags_tag_id_fkey,
  ADD CONSTRAINT resource_tags_resource_id_fkey 
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  ADD CONSTRAINT resource_tags_tag_id_fkey 
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS user_resources
  DROP CONSTRAINT IF EXISTS user_resources_user_id_fkey,
  DROP CONSTRAINT IF EXISTS user_resources_resource_id_fkey,
  ADD CONSTRAINT user_resources_resource_id_fkey 
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE;

-- Create trigger function for new user creation if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    username,
    display_name,
    avatar_url,
    user_type,
    social_links,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'other',
    '{}'::jsonb,
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

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

-- Enable RLS on tables if not already enabled
ALTER TABLE IF EXISTS resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS resource_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Create or replace policies
DROP POLICY IF EXISTS "Anyone can view approved resources" ON resources;
CREATE POLICY "Anyone can view approved resources" ON resources
  FOR SELECT USING (status = 'approved' OR auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can view all resource tags" ON resource_tags;
CREATE POLICY "Users can view all resource tags" ON resource_tags
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view all resource counts" ON user_resources;
CREATE POLICY "Users can view all resource counts" ON user_resources
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own resource usage" ON user_resources;
CREATE POLICY "Users can manage their own resource usage" ON user_resources
  FOR ALL USING (auth.uid() = user_id);

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
CREATE POLICY "Users can view all profiles" ON user_profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Verify table structure
DO $$ 
BEGIN
  -- Ensure resource_tags has required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'resource_tags' AND column_name = 'tag_id'
  ) THEN
    ALTER TABLE resource_tags ADD COLUMN tag_id bigint;
  END IF;

  -- Ensure user_resources has required columns
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_resources' AND column_name = 'used_at'
  ) THEN
    ALTER TABLE user_resources ADD COLUMN used_at timestamptz DEFAULT now();
  END IF;

  -- Create user_profiles table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    CREATE TABLE public.user_profiles (
      id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
      username text UNIQUE,
      display_name text,
      bio text,
      website text,
      avatar_url text,
      user_type text CHECK (user_type IN ('producer', 'engineer', 'writer', 'performer', 'other')),
      social_links jsonb DEFAULT '{}'::jsonb,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  END IF;
END $$; 
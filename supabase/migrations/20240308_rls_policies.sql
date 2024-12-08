-- Enable RLS on tables
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resources ENABLE ROW LEVEL SECURITY;

-- Allow all users to read approved resources
CREATE POLICY "Anyone can view approved resources"
ON resources FOR SELECT
USING (status = 'approved');

-- Allow authenticated users to submit resources
CREATE POLICY "Authenticated users can submit resources"
ON resources FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow admins to update any resource
CREATE POLICY "Admins can update resources"
ON resources FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND (users.app_metadata->>'roles')::jsonb ? 'admin'
));

-- Allow users to track their used resources
CREATE POLICY "Users can track their used resources"
ON user_resources FOR ALL
TO authenticated
USING (user_id = auth.uid()); 
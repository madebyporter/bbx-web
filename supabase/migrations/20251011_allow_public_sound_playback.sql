-- Allow public (unauthenticated) users to read sound files for playback
-- This enables logged-out users to play music from any user's profile

CREATE POLICY "Public users can read all sounds"
ON storage.objects
FOR SELECT
TO anon, public
USING (bucket_id = 'sounds');


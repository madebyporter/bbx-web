-- Profile collections visibility + library panel first-view defaults

ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS show_on_profile boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS profile_panels jsonb NOT NULL DEFAULT
    '{"bio":false,"collections":false,"software":false,"music":true}'::jsonb;

-- Global PRO genre lookup (BMI ∪ ASCAP writer/creator genres, deduped).
-- sounds.genre remains TEXT matching genres.name (no FK).

CREATE TABLE IF NOT EXISTS public.genres (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_genres_sort_order ON public.genres (sort_order);

ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Seed-only table: clients may read; no client writes.
DROP POLICY IF EXISTS "Anyone can read genres" ON public.genres;
CREATE POLICY "Anyone can read genres"
  ON public.genres
  FOR SELECT
  USING (true);

INSERT INTO public.genres (name, sort_order) VALUES
  ('Afrobeat', 1),
  ('Americana', 2),
  ('Blues', 3),
  ('Choral', 4),
  ('Christian', 5),
  ('Classical', 6),
  ('Country', 7),
  ('Dance/Electronic', 8),
  ('Educational', 9),
  ('Film, TV & Visual Media', 10),
  ('Folk', 11),
  ('Gospel', 12),
  ('Indie', 13),
  ('Jazz', 14),
  ('Latin', 15),
  ('Library/Production', 16),
  ('Musical Theatre', 17),
  ('New Age', 18),
  ('Other', 19),
  ('Pop', 20),
  ('R&B/Hip-Hop', 21),
  ('Reggae', 22),
  ('Rock', 23),
  ('Symphonic/Concert/Chamber', 24),
  ('Theatre/Cabaret', 25)
ON CONFLICT (name) DO NOTHING;

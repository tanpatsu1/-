-- genres: per-user master list
CREATE TABLE IF NOT EXISTS genres (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- brand_genres: many-to-many junction
CREATE TABLE IF NOT EXISTS brand_genres (
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (brand_id, genre_id)
);

ALTER TABLE genres       ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genres: own rows"     ON genres;
DROP POLICY IF EXISTS "brand_genres: select" ON brand_genres;
DROP POLICY IF EXISTS "brand_genres: insert" ON brand_genres;
DROP POLICY IF EXISTS "brand_genres: delete" ON brand_genres;

CREATE POLICY "genres: own rows" ON genres
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "brand_genres: select" ON brand_genres FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM brands WHERE brands.id = brand_id AND brands.user_id = auth.uid()
  ));

CREATE POLICY "brand_genres: insert" ON brand_genres FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM brands WHERE brands.id = brand_id AND brands.user_id = auth.uid()
  ));

CREATE POLICY "brand_genres: delete" ON brand_genres FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM brands WHERE brands.id = brand_id AND brands.user_id = auth.uid()
  ));

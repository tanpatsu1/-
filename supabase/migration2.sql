-- ============================================================
-- Migration 2: memo, tags, manual products, bookmarks
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- brands: tags
ALTER TABLE brands ADD COLUMN IF NOT EXISTS tags TEXT;

-- products: tags, notes, is_manual flag
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags  TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_manual BOOLEAN NOT NULL DEFAULT false;

-- bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bookmarks_user_product_unique UNIQUE(user_id, product_id)
);
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON bookmarks;
CREATE POLICY "Users can manage own bookmarks" ON bookmarks
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

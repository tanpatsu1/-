-- ============================================================
-- Multi-user migration: add user_id + RLS policies
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Add user_id column to brands
ALTER TABLE brands ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Brands RLS: each user sees only their own brands
DROP POLICY IF EXISTS "Users can view own brands"   ON brands;
DROP POLICY IF EXISTS "Users can insert own brands" ON brands;
DROP POLICY IF EXISTS "Users can update own brands" ON brands;
DROP POLICY IF EXISTS "Users can delete own brands" ON brands;

CREATE POLICY "Users can view own brands"
  ON brands FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own brands"
  ON brands FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own brands"
  ON brands FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own brands"
  ON brands FOR DELETE USING (auth.uid() = user_id);

-- 3. Products RLS: visible if you own the parent brand
DROP POLICY IF EXISTS "Users can view own brand products" ON products;

CREATE POLICY "Users can view own brand products"
  ON products FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = products.brand_id
        AND brands.user_id = auth.uid()
    )
  );
-- Note: cron (service_role key) bypasses RLS and can insert products for all brands

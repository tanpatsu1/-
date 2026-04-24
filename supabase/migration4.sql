-- ============================================================
-- Migration 4: brands.notes + products.status
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ブランドへのメモ（notes）追加
ALTER TABLE brands ADD COLUMN IF NOT EXISTS notes TEXT;

-- 商品ステータス（ほしい / 検討中 / 購入済み）
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'wishlist'
  CHECK (status IN ('wishlist', 'considering', 'purchased'));

-- products UPDATE policy（ステータス変更に必要）
DROP POLICY IF EXISTS "Users can update own brand products" ON products;
CREATE POLICY "Users can update own brand products" ON products
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM brands WHERE brands.id = products.brand_id AND brands.user_id = auth.uid())
  );

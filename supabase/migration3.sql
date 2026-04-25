-- ============================================================
-- Migration 3: products RLS policies for manual product CRUD
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Allow authenticated users to manually insert products for brands they own
DROP POLICY IF EXISTS "Users can insert own brand products" ON products;
CREATE POLICY "Users can insert own brand products"
  ON products FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = brand_id
        AND brands.user_id = auth.uid()
    )
  );

-- Allow authenticated users to update manually added products for brands they own
DROP POLICY IF EXISTS "Users can update own brand products" ON products;
CREATE POLICY "Users can update own brand products"
  ON products FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = products.brand_id
        AND brands.user_id = auth.uid()
    )
  );

-- Allow authenticated users to delete products for brands they own
DROP POLICY IF EXISTS "Users can delete own brand products" ON products;
CREATE POLICY "Users can delete own brand products"
  ON products FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM brands
      WHERE brands.id = products.brand_id
        AND brands.user_id = auth.uid()
    )
  );

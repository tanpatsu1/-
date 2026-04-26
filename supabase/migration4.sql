-- ============================================================
-- Migration 4: user_data table for React SPA
-- Stores each user's brands/products/genres as a single JSON blob.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE IF NOT EXISTS user_data (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own data"   ON user_data;
DROP POLICY IF EXISTS "Users can upsert own data" ON user_data;
DROP POLICY IF EXISTS "Users can delete own data" ON user_data;

CREATE POLICY "Users can read own data"
  ON user_data FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own data"
  ON user_data FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data"
  ON user_data FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data"
  ON user_data FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS user_data_updated_at_idx ON user_data (updated_at DESC);

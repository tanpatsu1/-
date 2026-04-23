-- ============================================================
-- Fashion Brand Manager — Supabase Setup SQL
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

CREATE TABLE brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  url           TEXT NOT NULL,
  logo_url      TEXT,
  og_image_url  TEXT,
  description   TEXT,
  style         TEXT,
  price_range   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  image_url     TEXT,
  product_url   TEXT,
  price         TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_brand_url_unique UNIQUE (brand_id, product_url)
);

CREATE TABLE cron_log (
  id             BIGSERIAL PRIMARY KEY,
  ran_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  brands_synced  INT NOT NULL DEFAULT 0,
  products_added INT NOT NULL DEFAULT 0,
  errors         JSONB
);

CREATE INDEX products_brand_id_seen_idx ON products (brand_id, first_seen_at DESC);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS (all access goes through API using service_role key which bypasses RLS)
ALTER TABLE brands   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- V6: Per-location product stock
-- Each location tracks its own inventory independently.
-- ============================================================

-- Drop old single-config unique constraint
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_config_id_unique;

-- Add location column
ALTER TABLE products ADD COLUMN IF NOT EXISTS location_id INT REFERENCES locations(id) ON DELETE CASCADE;

-- One product entry per (config, location)
ALTER TABLE products ADD CONSTRAINT products_config_location_unique UNIQUE (config_id, location_id);

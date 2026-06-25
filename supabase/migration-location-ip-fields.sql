-- Replace single free-text location with structured country/state/city fields
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS country TEXT,
  ADD COLUMN IF NOT EXISTS state_region TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE profiles DROP COLUMN IF EXISTS location;

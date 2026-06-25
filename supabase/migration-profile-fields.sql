-- Profile fields migration
-- Run this in Supabase SQL Editor AFTER profiles.sql has been applied.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS years_of_experience TEXT,
  ADD COLUMN IF NOT EXISTS designation TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN DEFAULT FALSE;

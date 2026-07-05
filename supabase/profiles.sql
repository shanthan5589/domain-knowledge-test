-- ============================================================
-- Profiles table — run this in Supabase SQL Editor
-- Stores users for both Google and credentials login
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name TEXT,
  password_hash TEXT,        -- null for Google-only users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read and update only their own profile.
-- Scoped to the email claim in the request JWT so the anon key cannot be
-- used to read/write other users' rows. Server-side app code uses the
-- service-role client (supabaseAdmin), which bypasses RLS entirely, so
-- normal app functionality (e.g. Google sign-in profile creation) is
-- unaffected by this restriction.
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (email = auth.jwt()->>'email');

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (email = auth.jwt()->>'email');

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (email = auth.jwt()->>'email')
  WITH CHECK (email = auth.jwt()->>'email');

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles (email);

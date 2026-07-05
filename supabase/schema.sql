-- ============================================================
-- Domain Knowledge Test Platform — Supabase Schema
-- Run this in Supabase SQL Editor before running seed.sql
-- ============================================================

-- Questions table (populated via seed.sql, read only by server)
CREATE TABLE IF NOT EXISTS questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL CHECK (domain IN ('ai', 'cloud', 'cybersecurity', 'devops', 'data_science')),
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test results table (one row per completed test)
CREATE TABLE IF NOT EXISTS test_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('ai', 'cloud', 'cybersecurity', 'devops', 'data_science')),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  time_taken_seconds INTEGER NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Questions: no direct client access — only via service role in API routes
-- (No RLS policies needed; service role bypasses RLS)

-- Test results: users can insert and read only their own rows
-- NOTE: these policies only affect requests made with the anon/authenticated
-- key (e.g. direct client access). The app's server-side result-submission
-- code uses the service-role client, which bypasses RLS entirely, so normal
-- app behavior is unaffected by this restriction.
CREATE POLICY "Users can insert own results"
  ON test_results FOR INSERT
  WITH CHECK (user_email = auth.jwt()->>'email');

CREATE POLICY "Users can read own results"
  ON test_results FOR SELECT
  USING (user_email = auth.jwt()->>'email');

-- Index for fast random question fetching by domain
CREATE INDEX IF NOT EXISTS idx_questions_domain ON questions (domain);
CREATE INDEX IF NOT EXISTS idx_results_user_email ON test_results (user_email);

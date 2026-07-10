-- Security and integrity hardening. Apply after schema.sql.

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL REFERENCES profiles(email) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN ('ai', 'cloud', 'cybersecurity', 'devops', 'data_science')),
  question_ids UUID[] NOT NULL CHECK (cardinality(question_ids) = 10),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ
);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON quiz_attempts (user_email, started_at DESC);

ALTER TABLE test_results ADD COLUMN IF NOT EXISTS quiz_attempt_id UUID;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_results_quiz_attempt_id_key') THEN
    ALTER TABLE test_results ADD CONSTRAINT test_results_quiz_attempt_id_key UNIQUE (quiz_attempt_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'test_results_quiz_attempt_id_fkey') THEN
    ALTER TABLE test_results
      ADD CONSTRAINT test_results_quiz_attempt_id_fkey
      FOREIGN KEY (quiz_attempt_id) REFERENCES quiz_attempts(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  window_started TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL CHECK (request_count > 0)
);

-- Returns true only when the request consumes one of the permitted slots.
CREATE OR REPLACE FUNCTION consume_rate_limit(
  p_bucket_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  consumed BOOLEAN;
BEGIN
  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit configuration';
  END IF;

  INSERT INTO rate_limit_buckets AS bucket (bucket_key, window_started, request_count)
  VALUES (p_bucket_key, NOW(), 1)
  ON CONFLICT (bucket_key) DO UPDATE
    SET window_started = CASE
          WHEN bucket.window_started <= NOW() - make_interval(secs => p_window_seconds) THEN NOW()
          ELSE bucket.window_started
        END,
        request_count = CASE
          WHEN bucket.window_started <= NOW() - make_interval(secs => p_window_seconds) THEN 1
          ELSE bucket.request_count + 1
        END
    WHERE bucket.window_started <= NOW() - make_interval(secs => p_window_seconds)
       OR bucket.request_count < p_limit
  RETURNING TRUE INTO consumed;

  RETURN COALESCE(consumed, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION latest_results_for_domain(p_domain TEXT)
RETURNS TABLE (user_email TEXT, score INTEGER, time_taken_seconds INTEGER, completed_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (result.user_email)
    result.user_email, result.score, result.time_taken_seconds, result.completed_at
  FROM test_results AS result
  WHERE result.domain = p_domain
  ORDER BY result.user_email, result.completed_at DESC, result.id DESC;
$$;

CREATE OR REPLACE FUNCTION latest_results_for_all_domains()
RETURNS TABLE (domain TEXT, user_email TEXT, score INTEGER, time_taken_seconds INTEGER, completed_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (result.domain, result.user_email)
    result.domain, result.user_email, result.score, result.time_taken_seconds, result.completed_at
  FROM test_results AS result
  ORDER BY result.domain, result.user_email, result.completed_at DESC, result.id DESC;
$$;

CREATE INDEX IF NOT EXISTS idx_results_domain_user_latest
  ON test_results (domain, user_email, completed_at DESC, id DESC);

REVOKE ALL ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION latest_results_for_domain(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION latest_results_for_all_domains() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION latest_results_for_domain(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION latest_results_for_all_domains() TO service_role;

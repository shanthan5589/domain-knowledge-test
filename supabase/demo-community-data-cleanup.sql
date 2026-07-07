-- Removes only the temporary demo rows created by demo-community-data.sql.

BEGIN;

DELETE FROM test_results
WHERE user_email IN (
  'demo.community.01@example.com',
  'demo.community.02@example.com',
  'demo.community.03@example.com',
  'demo.community.04@example.com',
  'demo.community.05@example.com',
  'demo.community.06@example.com',
  'demo.community.07@example.com',
  'demo.community.08@example.com',
  'demo.community.09@example.com',
  'demo.community.10@example.com',
  'demo.community.11@example.com',
  'demo.community.12@example.com'
);

DELETE FROM profiles
WHERE email IN (
  'demo.community.01@example.com',
  'demo.community.02@example.com',
  'demo.community.03@example.com',
  'demo.community.04@example.com',
  'demo.community.05@example.com',
  'demo.community.06@example.com',
  'demo.community.07@example.com',
  'demo.community.08@example.com',
  'demo.community.09@example.com',
  'demo.community.10@example.com',
  'demo.community.11@example.com',
  'demo.community.12@example.com'
);

COMMIT;

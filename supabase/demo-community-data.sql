-- Temporary demo data for Community Insights.
-- Run this in Supabase SQL Editor to create enough non-real users/results
-- for the stats graphs to render. Remove with demo-community-data-cleanup.sql.

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

INSERT INTO profiles (
  email,
  first_name,
  last_name,
  full_name,
  country,
  state_region,
  city,
  years_of_experience,
  designation,
  profile_completed
) VALUES
  ('demo.community.01@example.com', 'Aarav', 'Demo', 'Aarav Demo', 'India', 'Telangana', 'Hyderabad', '1-3 years', 'Software Engineer / Developer', true),
  ('demo.community.02@example.com', 'Meera', 'Demo', 'Meera Demo', 'India', 'Telangana', 'Hyderabad', '3-5 years', 'Data Scientist', true),
  ('demo.community.03@example.com', 'Rohan', 'Demo', 'Rohan Demo', 'India', 'Telangana', 'Hyderabad', '1-3 years', 'DevOps Engineer', true),
  ('demo.community.04@example.com', 'Anika', 'Demo', 'Anika Demo', 'India', 'Telangana', 'Hyderabad', '5-10 years', 'Product Owner', true),
  ('demo.community.05@example.com', 'Kabir', 'Demo', 'Kabir Demo', 'India', 'Telangana', 'Hyderabad', 'Fresher', 'AI / Machine Learning Engineer', true),
  ('demo.community.06@example.com', 'Isha', 'Demo', 'Isha Demo', 'India', 'Telangana', 'Hyderabad', '3-5 years', 'Business Analyst', true),
  ('demo.community.07@example.com', 'Dev', 'Demo', 'Dev Demo', 'India', 'Telangana', 'Hyderabad', '10+ years', 'Cloud Architect / Engineer', true),
  ('demo.community.08@example.com', 'Nisha', 'Demo', 'Nisha Demo', 'India', 'Telangana', 'Hyderabad', '1-3 years', 'UI/UX Designer', true),
  ('demo.community.09@example.com', 'Vikram', 'Demo', 'Vikram Demo', 'India', 'Telangana', 'Warangal', '3-5 years', 'Software Engineer / Developer', true),
  ('demo.community.10@example.com', 'Sara', 'Demo', 'Sara Demo', 'India', 'Telangana', 'Warangal', '5-10 years', 'Cybersecurity Specialist', true),
  ('demo.community.11@example.com', 'Arjun', 'Demo', 'Arjun Demo', 'India', 'Karnataka', 'Bengaluru', '3-5 years', 'Data Scientist', true),
  ('demo.community.12@example.com', 'Priya', 'Demo', 'Priya Demo', 'India', 'Maharashtra', 'Pune', '1-3 years', 'Full-Stack Developer', true);

INSERT INTO test_results (
  user_id,
  user_email,
  domain,
  score,
  time_taken_seconds,
  completed_at
) VALUES
  ('demo.community.01@example.com', 'demo.community.01@example.com', 'ai', 9, 210, NOW() - INTERVAL '12 days'),
  ('demo.community.02@example.com', 'demo.community.02@example.com', 'ai', 7, 245, NOW() - INTERVAL '11 days'),
  ('demo.community.03@example.com', 'demo.community.03@example.com', 'ai', 6, 270, NOW() - INTERVAL '10 days'),
  ('demo.community.04@example.com', 'demo.community.04@example.com', 'ai', 8, 230, NOW() - INTERVAL '9 days'),
  ('demo.community.05@example.com', 'demo.community.05@example.com', 'ai', 5, 295, NOW() - INTERVAL '8 days'),
  ('demo.community.06@example.com', 'demo.community.06@example.com', 'ai', 7, 260, NOW() - INTERVAL '7 days'),
  ('demo.community.07@example.com', 'demo.community.07@example.com', 'ai', 10, 205, NOW() - INTERVAL '6 days'),
  ('demo.community.08@example.com', 'demo.community.08@example.com', 'ai', 6, 285, NOW() - INTERVAL '5 days'),
  ('demo.community.09@example.com', 'demo.community.09@example.com', 'ai', 8, 240, NOW() - INTERVAL '4 days'),
  ('demo.community.10@example.com', 'demo.community.10@example.com', 'ai', 4, 300, NOW() - INTERVAL '3 days'),
  ('demo.community.11@example.com', 'demo.community.11@example.com', 'ai', 9, 220, NOW() - INTERVAL '2 days'),
  ('demo.community.12@example.com', 'demo.community.12@example.com', 'ai', 6, 275, NOW() - INTERVAL '1 day'),
  
  ('demo.community.01@example.com', 'demo.community.01@example.com', 'cloud', 8, 200, NOW() - INTERVAL '10 days'),
  ('demo.community.02@example.com', 'demo.community.02@example.com', 'cloud', 9, 215, NOW() - INTERVAL '9 days'),
  ('demo.community.03@example.com', 'demo.community.03@example.com', 'cloud', 5, 260, NOW() - INTERVAL '8 days'),
  ('demo.community.04@example.com', 'demo.community.04@example.com', 'cloud', 7, 225, NOW() - INTERVAL '7 days'),
  ('demo.community.05@example.com', 'demo.community.05@example.com', 'cloud', 6, 285, NOW() - INTERVAL '6 days'),
  ('demo.community.06@example.com', 'demo.community.06@example.com', 'cloud', 8, 250, NOW() - INTERVAL '5 days'),
  
  ('demo.community.07@example.com', 'demo.community.07@example.com', 'cybersecurity', 9, 195, NOW() - INTERVAL '5 days'),
  ('demo.community.08@example.com', 'demo.community.08@example.com', 'cybersecurity', 7, 275, NOW() - INTERVAL '4 days'),
  ('demo.community.09@example.com', 'demo.community.09@example.com', 'cybersecurity', 8, 230, NOW() - INTERVAL '3 days');

COMMIT;

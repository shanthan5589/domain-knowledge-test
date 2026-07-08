// Canonical option lists for the profile "Designation" and "Years of Experience"
// fields — the single source of truth shared by client-side dropdowns
// (profile edit form, complete-profile page, stats filters) and server-side
// validation (PATCH /api/profile). Keep this in sync everywhere these values
// are used so the server never rejects a value the UI just offered.
export const DESIGNATION_OPTIONS: string[] = [
  'Software Engineer / Developer',
  'Full-Stack Developer',
  'Data Scientist',
  'Cloud Architect / Engineer',
  'DevOps Engineer',
  'Cybersecurity Specialist',
  'AI / Machine Learning Engineer',
  'UI/UX Designer',
  'IT Project Manager',
  'Product Owner',
  'Business Analyst',
  'Other',
]

export const EXPERIENCE_OPTIONS: string[] = [
  'Fresher',
  '1-3 years',
  '3-5 years',
  '5-10 years',
  '10+ years',
]

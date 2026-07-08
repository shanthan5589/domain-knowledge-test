import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'

describe('lib/profile-options', () => {
  it('DESIGNATION_OPTIONS has exactly the 12 expected designations, in order', () => {
    expect(DESIGNATION_OPTIONS).toEqual([
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
    ])
  })

  it('EXPERIENCE_OPTIONS has exactly the 5 expected bands, in order', () => {
    expect(EXPERIENCE_OPTIONS).toEqual([
      'Fresher',
      '1-3 years',
      '3-5 years',
      '5-10 years',
      '10+ years',
    ])
  })
})

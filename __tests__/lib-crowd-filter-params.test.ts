import { crowdFilterParams } from '@/lib/crowd-filter-params'

describe('lib/crowd-filter-params', () => {
  it('returns exactly the 5 crowd-filter fields as a plain record', () => {
    const result = crowdFilterParams({
      designation: 'Engineer',
      experience: '3-5',
      country: 'India',
      state_region: 'Telangana',
      city: 'Hyderabad',
    })

    expect(result).toEqual({
      designation: 'Engineer',
      experience: '3-5',
      country: 'India',
      state_region: 'Telangana',
      city: 'Hyderabad',
    })
  })

  it('passes values through unchanged, including the "all" sentinel', () => {
    const result = crowdFilterParams({
      designation: 'all',
      experience: 'all',
      country: 'all',
      state_region: 'all',
      city: 'all',
    })

    expect(result).toEqual({
      designation: 'all',
      experience: 'all',
      country: 'all',
      state_region: 'all',
      city: 'all',
    })
  })

  it('produces a record usable directly by URLSearchParams', () => {
    const params = new URLSearchParams(
      crowdFilterParams({
        designation: 'Manager',
        experience: '5+',
        country: 'USA',
        state_region: 'California',
        city: 'San Francisco',
      })
    )

    expect(params.get('designation')).toBe('Manager')
    expect(params.get('experience')).toBe('5+')
    expect(params.get('country')).toBe('USA')
    expect(params.get('state_region')).toBe('California')
    expect(params.get('city')).toBe('San Francisco')
  })
})

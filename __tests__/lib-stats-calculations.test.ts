import {
  averageScoreFor,
  averageTimeFor,
  buildLocationComparisons,
  buildUserProgress,
  getLocationDimension,
  roundToOne,
  toAverageScoreByGroup,
  toDistribution,
  type ProfileRow,
  type ResultRow,
  type ScoreEntry,
} from '@/lib/stats-calculations'

function makeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    email: 'user@test.com',
    designation: 'Software Engineer / Developer',
    years_of_experience: '1-3 years',
    country: 'India',
    state_region: 'Telangana',
    city: 'Hyderabad',
    ...overrides,
  }
}

function makeEntry(overrides: Partial<ScoreEntry> = {}): ScoreEntry {
  return {
    email: 'user@test.com',
    score: 7,
    time_taken_seconds: 240,
    completed_at: '2026-01-01',
    profile: makeProfile(),
    ...overrides,
  }
}

describe('roundToOne', () => {
  it('rounds to one decimal place', () => {
    expect(roundToOne(2.25)).toBe(2.3)
    expect(roundToOne(2.24)).toBe(2.2)
    expect(roundToOne(2)).toBe(2)
    expect(roundToOne(2.05)).toBe(2.1)
  })
})

describe('averageScoreFor', () => {
  it('returns null for an empty list', () => {
    expect(averageScoreFor([])).toBeNull()
  })

  it('averages scores and rounds to one decimal', () => {
    const entries = [makeEntry({ score: 8 }), makeEntry({ score: 7 }), makeEntry({ score: 6 })]
    expect(averageScoreFor(entries)).toBe(7)
  })

  it('rounds a repeating average to one decimal', () => {
    const entries = [makeEntry({ score: 8 }), makeEntry({ score: 7 }), makeEntry({ score: 7 })]
    // (8 + 7 + 7) / 3 = 7.333... -> 7.3
    expect(averageScoreFor(entries)).toBe(7.3)
  })
})

describe('averageTimeFor', () => {
  it('returns null for an empty list', () => {
    expect(averageTimeFor([])).toBeNull()
  })

  it('averages time and rounds to the nearest whole second', () => {
    const entries = [
      makeEntry({ time_taken_seconds: 200 }),
      makeEntry({ time_taken_seconds: 241 }),
    ]
    // (200 + 241) / 2 = 220.5 -> rounds to 221 (Math.round half-up)
    expect(averageTimeFor(entries)).toBe(221)
  })
})

describe('toDistribution', () => {
  it('counts entries per label and computes percent share', () => {
    const entries = [
      makeEntry({ profile: makeProfile({ designation: 'Software Engineer / Developer' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Software Engineer / Developer' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Data Scientist' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Data Scientist' }) }),
    ]
    const result = toDistribution(entries, (entry) => entry.profile.designation)
    expect(result).toEqual([
      { label: 'Data Scientist', count: 2, percent: 50 },
      { label: 'Software Engineer / Developer', count: 2, percent: 50 },
    ])
  })

  it('groups missing/blank labels as Unknown', () => {
    const entries = [
      makeEntry({ profile: makeProfile({ designation: null }) }),
      makeEntry({ profile: makeProfile({ designation: '  ' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Data Scientist' }) }),
    ]
    const result = toDistribution(entries, (entry) => entry.profile.designation)
    expect(result).toEqual(
      expect.arrayContaining([
        { label: 'Unknown', count: 2, percent: 67 },
        { label: 'Data Scientist', count: 1, percent: 33 },
      ])
    )
  })

  it('sorts by count descending, then alphabetically on ties', () => {
    const entries = [
      makeEntry({ profile: makeProfile({ designation: 'Zeta' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Alpha' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Beta' }) }),
      makeEntry({ profile: makeProfile({ designation: 'Beta' }) }),
    ]
    const result = toDistribution(entries, (entry) => entry.profile.designation)
    expect(result.map((r) => r.label)).toEqual(['Beta', 'Alpha', 'Zeta'])
  })

  it('returns an empty array and 0 percent for no entries', () => {
    expect(toDistribution([], (entry) => entry.profile.designation)).toEqual([])
  })
})

describe('toAverageScoreByGroup', () => {
  it('averages scores per group and sorts by average score descending', () => {
    const entries = [
      makeEntry({ score: 8, profile: makeProfile({ designation: 'Software Engineer / Developer' }) }),
      makeEntry({ score: 6, profile: makeProfile({ designation: 'Software Engineer / Developer' }) }),
      makeEntry({ score: 9, profile: makeProfile({ designation: 'Data Scientist' }) }),
    ]
    const result = toAverageScoreByGroup(entries, (entry) => entry.profile.designation)
    expect(result).toEqual([
      { label: 'Data Scientist', count: 1, averageScore: 9 },
      { label: 'Software Engineer / Developer', count: 2, averageScore: 7 },
    ])
  })

  it('breaks a tied average score by larger group first', () => {
    const entries = [
      makeEntry({ score: 8, profile: makeProfile({ designation: 'A' }) }),
      makeEntry({ score: 8, profile: makeProfile({ designation: 'B' }) }),
      makeEntry({ score: 8, profile: makeProfile({ designation: 'B' }) }),
    ]
    const result = toAverageScoreByGroup(entries, (entry) => entry.profile.designation)
    expect(result.map((r) => r.label)).toEqual(['B', 'A'])
  })
})

describe('buildLocationComparisons', () => {
  const entries = [
    makeEntry({ score: 8, profile: makeProfile({ city: 'Hyderabad', state_region: 'Telangana', country: 'India' }) }),
    makeEntry({ score: 8, profile: makeProfile({ city: 'Hyderabad', state_region: 'Telangana', country: 'India' }) }),
    makeEntry({ score: 8, profile: makeProfile({ city: 'Hyderabad', state_region: 'Telangana', country: 'India' }) }),
    makeEntry({ score: 8, profile: makeProfile({ city: 'Hyderabad', state_region: 'Telangana', country: 'India' }) }),
    makeEntry({ score: 8, profile: makeProfile({ city: 'Hyderabad', state_region: 'Telangana', country: 'India' }) }),
  ]

  it('returns city, state, country, and global rows when all filters are active and the cohort meets the minimum size', () => {
    const result = buildLocationComparisons(
      { country: 'India', stateRegion: 'Telangana', city: 'Hyderabad' },
      entries
    )
    expect(result).toEqual([
      { label: 'Hyderabad', scope: 'City', averageScore: 8, count: 5 },
      { label: 'Telangana', scope: 'State / Region', averageScore: 8, count: 5 },
      { label: 'India', scope: 'Country', averageScore: 8, count: 5 },
      { label: 'Global', scope: 'Global', averageScore: 8, count: 5 },
    ])
  })

  it('omits a filter row when its label is missing or "all"', () => {
    const result = buildLocationComparisons({ country: 'all', stateRegion: null, city: null }, entries)
    expect(result).toEqual([{ label: 'Global', scope: 'Global', averageScore: 8, count: 5 }])
  })

  it('drops rows (including Global) that fall below the minimum cohort size', () => {
    const smallGroup = entries.slice(0, 2)
    const result = buildLocationComparisons(
      { country: 'India', stateRegion: 'Telangana', city: 'Hyderabad' },
      smallGroup
    )
    expect(result).toEqual([])
  })
})

describe('buildUserProgress', () => {
  it('returns all-null/zero fields when there are no attempts', () => {
    const progress = buildUserProgress([])
    expect(progress.attemptCount).toBe(0)
    expect(progress.latestScore).toBeNull()
    expect(progress.previousScore).toBeNull()
    expect(progress.scoreChange).toBeNull()
    expect(progress.consistency.label).toBe('Need 2 attempts')
  })

  function attempt(overrides: Partial<ResultRow> = {}): ResultRow {
    return {
      user_email: 'me@test.com',
      score: 7,
      time_taken_seconds: 240,
      completed_at: '2026-01-01',
      ...overrides,
    }
  }

  it('computes latest/previous score, change, best score, and time metrics from the newest-first list', () => {
    const attempts = [
      attempt({ score: 8, time_taken_seconds: 220, completed_at: '2026-01-03' }),
      attempt({ score: 6, time_taken_seconds: 250, completed_at: '2026-01-02' }),
      attempt({ score: 7, time_taken_seconds: 240, completed_at: '2026-01-01' }),
    ]
    const progress = buildUserProgress(attempts)
    expect(progress.attemptCount).toBe(3)
    expect(progress.latestScore).toBe(8)
    expect(progress.previousScore).toBe(6)
    expect(progress.scoreChange).toBe(2)
    expect(progress.bestScore).toBe(8)
    expect(progress.latestTimeSeconds).toBe(220)
    expect(progress.averageTimePerQuestionSeconds).toBe(22)
    expect(progress.scorePerMinute).toBe(2.2)
    expect(progress.latestCompletedAt).toBe('2026-01-03')
  })

  it('labels consistency as Stable when the standard deviation is small', () => {
    const attempts = [attempt({ score: 8 }), attempt({ score: 7 }), attempt({ score: 7 })]
    expect(buildUserProgress(attempts).consistency.label).toBe('Stable')
  })

  it('labels consistency as Volatile when scores swing widely', () => {
    const attempts = [attempt({ score: 10 }), attempt({ score: 1 })]
    expect(buildUserProgress(attempts).consistency.label).toBe('Volatile')
  })

  it('returns null scorePerMinute when the latest attempt took zero seconds', () => {
    const attempts = [attempt({ score: 5, time_taken_seconds: 0 })]
    expect(buildUserProgress(attempts).scorePerMinute).toBeNull()
  })
})

describe('getLocationDimension', () => {
  it('dimensions by country when no country filter is active', () => {
    expect(getLocationDimension({ country: null, stateRegion: null, city: null }).label).toBe('Countries')
    expect(getLocationDimension({ country: 'all', stateRegion: null, city: null }).label).toBe('Countries')
  })

  it('dimensions by state/region once a country is selected', () => {
    const dimension = getLocationDimension({ country: 'India', stateRegion: null, city: null })
    expect(dimension.label).toBe('States / Regions')
    expect(dimension.getValue?.(makeEntry({ profile: makeProfile({ state_region: 'Telangana' }) }))).toBe(
      'Telangana'
    )
  })

  it('dimensions by city once country and state/region are selected', () => {
    const dimension = getLocationDimension({ country: 'India', stateRegion: 'Telangana', city: null })
    expect(dimension.label).toBe('Cities')
  })

  it('returns a null label/getValue once country, state/region, and city are all selected', () => {
    const dimension = getLocationDimension({ country: 'India', stateRegion: 'Telangana', city: 'Hyderabad' })
    expect(dimension.label).toBeNull()
    expect(dimension.getValue).toBeNull()
  })
})

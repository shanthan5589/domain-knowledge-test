import {
  averageScoreFor,
  averageTimeFor,
  buildActivityCalendar,
  buildDomainRanges,
  buildLocationComparisons,
  buildPacePoints,
  buildPeerGroupRanks,
  buildRankLadder,
  buildStreaks,
  buildTimeOfDayPerformance,
  buildUserProgress,
  getLocationDimension,
  rankWithinCohort,
  roundToOne,
  toAverageScoreByGroup,
  toDistribution,
  type DomainResultRow,
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

describe('buildActivityCalendar', () => {
  function attempt(overrides: Partial<ResultRow> = {}): ResultRow {
    return {
      user_email: 'me@test.com',
      score: 7,
      time_taken_seconds: 240,
      completed_at: '2026-01-01T10:00:00Z',
      ...overrides,
    }
  }

  it('counts attempts per calendar day and sorts oldest first', () => {
    const attempts = [
      attempt({ completed_at: '2026-01-03T09:00:00Z' }),
      attempt({ completed_at: '2026-01-01T08:00:00Z' }),
      attempt({ completed_at: '2026-01-01T20:00:00Z' }),
    ]
    expect(buildActivityCalendar(attempts)).toEqual([
      { date: '2026-01-01', count: 2 },
      { date: '2026-01-03', count: 1 },
    ])
  })

  it('returns an empty array for no attempts', () => {
    expect(buildActivityCalendar([])).toEqual([])
  })
})

describe('buildStreaks', () => {
  function attempt(completedAt: string): ResultRow {
    return {
      user_email: 'me@test.com',
      score: 7,
      time_taken_seconds: 240,
      completed_at: completedAt,
    }
  }

  it('returns zero streaks for no attempts', () => {
    expect(buildStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0 })
  })

  it('counts a current streak that runs up through today', () => {
    const today = new Date('2026-01-05T12:00:00Z')
    const attempts = [
      attempt('2026-01-03T09:00:00Z'),
      attempt('2026-01-04T09:00:00Z'),
      attempt('2026-01-05T09:00:00Z'),
    ]
    expect(buildStreaks(attempts, today)).toEqual({ currentStreak: 3, longestStreak: 3 })
  })

  it('keeps the streak alive when the latest attempt was yesterday, not today', () => {
    const today = new Date('2026-01-05T12:00:00Z')
    const attempts = [attempt('2026-01-03T09:00:00Z'), attempt('2026-01-04T09:00:00Z')]
    expect(buildStreaks(attempts, today).currentStreak).toBe(2)
  })

  it('resets the current streak to zero once a day is missed', () => {
    const today = new Date('2026-01-10T12:00:00Z')
    const attempts = [attempt('2026-01-01T09:00:00Z'), attempt('2026-01-02T09:00:00Z')]
    expect(buildStreaks(attempts, today).currentStreak).toBe(0)
  })

  it('tracks the longest streak separately from a broken current streak', () => {
    const today = new Date('2026-01-20T12:00:00Z')
    const attempts = [
      attempt('2026-01-01T09:00:00Z'),
      attempt('2026-01-02T09:00:00Z'),
      attempt('2026-01-03T09:00:00Z'),
      attempt('2026-01-04T09:00:00Z'),
      attempt('2026-01-10T09:00:00Z'),
    ]
    expect(buildStreaks(attempts, today)).toEqual({ currentStreak: 0, longestStreak: 4 })
  })

  it('treats repeated attempts on the same day as a single streak day', () => {
    const today = new Date('2026-01-01T23:00:00Z')
    const attempts = [attempt('2026-01-01T08:00:00Z'), attempt('2026-01-01T20:00:00Z')]
    expect(buildStreaks(attempts, today)).toEqual({ currentStreak: 1, longestStreak: 1 })
  })
})

describe('buildTimeOfDayPerformance', () => {
  function attempt(completedAt: string, score: number): ResultRow {
    return { user_email: 'me@test.com', score, time_taken_seconds: 240, completed_at: completedAt }
  }

  it('averages scores per day-of-week/hour bucket', () => {
    // 2026-01-04 is a Sunday (dayOfWeek 0)
    const attempts = [
      attempt('2026-01-04T09:00:00Z', 8),
      attempt('2026-01-04T09:30:00Z', 6),
      attempt('2026-01-04T14:00:00Z', 10),
    ]
    const result = buildTimeOfDayPerformance(attempts)
    expect(result).toEqual(
      expect.arrayContaining([
        { dayOfWeek: 0, hour: 9, count: 2, averageScore: 7 },
        { dayOfWeek: 0, hour: 14, count: 1, averageScore: 10 },
      ])
    )
  })

  it('returns an empty array for no attempts', () => {
    expect(buildTimeOfDayPerformance([])).toEqual([])
  })
})

describe('buildPacePoints', () => {
  it('maps attempts to time/score pairs sorted oldest first', () => {
    const attempts: ResultRow[] = [
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 200, completed_at: '2026-01-03T00:00:00Z' },
      { user_email: 'me@test.com', score: 6, time_taken_seconds: 260, completed_at: '2026-01-01T00:00:00Z' },
    ]
    expect(buildPacePoints(attempts)).toEqual([
      { timeTakenSeconds: 260, score: 6, completedAt: '2026-01-01T00:00:00Z' },
      { timeTakenSeconds: 200, score: 8, completedAt: '2026-01-03T00:00:00Z' },
    ])
  })
})

describe('buildDomainRanges', () => {
  function attempt(domain: string, score: number): DomainResultRow {
    return {
      user_email: 'me@test.com',
      score,
      time_taken_seconds: 240,
      completed_at: '2026-01-01T00:00:00Z',
      domain,
    }
  }

  it('computes min/mean/max per domain and sorts by mean descending', () => {
    const attempts = [
      attempt('AI', 6),
      attempt('AI', 8),
      attempt('Cloud', 9),
    ]
    expect(buildDomainRanges(attempts)).toEqual([
      { domain: 'Cloud', min: 9, max: 9, mean: 9, count: 1 },
      { domain: 'AI', min: 6, max: 8, mean: 7, count: 2 },
    ])
  })

  it('returns an empty array for no attempts', () => {
    expect(buildDomainRanges([])).toEqual([])
  })
})

describe('rankWithinCohort', () => {
  it('returns nulls when the user is not part of the cohort', () => {
    expect(rankWithinCohort(8, [5, 6, 7], false)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 3,
    })
  })

  it('returns nulls when the user score is null', () => {
    expect(rankWithinCohort(null, [5, 6, 7], true)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 3,
    })
  })

  it('returns nulls when the cohort is below the minimum size', () => {
    expect(rankWithinCohort(8, [8, 6], true)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 2,
    })
  })

  it('ranks with standard competition ranking and excludes self from the percentile denominator', () => {
    // cohort of 5 scores, user scores 8 -> 1 person scored higher (rank 2),
    // 3 of the 4 peers scored lower -> 75th percentile.
    expect(rankWithinCohort(8, [10, 8, 6, 5, 4], true)).toEqual({
      rank: 2,
      percentile: 75,
      cohortSize: 5,
    })
  })

  it('gives tied top scorers the same rank 1', () => {
    // no one scored higher than 9 -> rank 1; of the 4 peers, 3 scored lower -> 75th percentile
    expect(rankWithinCohort(9, [9, 9, 5, 4, 3], true)).toEqual({
      rank: 1,
      percentile: 75,
      cohortSize: 5,
    })
  })
})

describe('buildRankLadder', () => {
  const userEmail = 'me@test.com'

  function makeCrowd(): ScoreEntry[] {
    const entries: ScoreEntry[] = []
    // 5 Hyderabad/Telangana/India entries including "me" at score 8
    entries.push(makeEntry({ email: userEmail, score: 8 }))
    entries.push(makeEntry({ email: 'a@test.com', score: 9 }))
    entries.push(makeEntry({ email: 'b@test.com', score: 6 }))
    entries.push(makeEntry({ email: 'c@test.com', score: 5 }))
    entries.push(makeEntry({ email: 'd@test.com', score: 4 }))
    // 2 more Global-only entries from a different country
    entries.push(
      makeEntry({
        email: 'e@test.com',
        score: 10,
        profile: makeProfile({ city: 'Austin', state_region: 'Texas', country: 'United States' }),
      })
    )
    entries.push(
      makeEntry({
        email: 'f@test.com',
        score: 3,
        profile: makeProfile({ city: 'Austin', state_region: 'Texas', country: 'United States' }),
      })
    )
    return entries
  }

  it('ranks the user at every active scope, adding a Global rung', () => {
    const result = buildRankLadder(
      { country: 'India', stateRegion: 'Telangana', city: 'Hyderabad' },
      makeCrowd(),
      userEmail
    )
    expect(result.map((r) => r.scope)).toEqual(['City', 'State / Region', 'Country', 'Global'])
    // City/State/Country cohort is the same 5 Hyderabad entries -> rank 2 of 5
    expect(result[0]).toEqual({ scope: 'City', label: 'Hyderabad', rank: 2, percentile: 75, cohortSize: 5 })
    expect(result[2]).toEqual({ scope: 'Country', label: 'India', rank: 2, percentile: 75, cohortSize: 5 })
    // Global cohort is all 7 entries -> 2 people (scores 9 and 10) scored higher -> rank 3
    expect(result[3].scope).toBe('Global')
    expect(result[3].rank).toBe(3)
    expect(result[3].cohortSize).toBe(7)
  })

  it('omits rungs for scopes that are unset or "all"', () => {
    const result = buildRankLadder({ country: 'all', stateRegion: null, city: null }, makeCrowd(), userEmail)
    expect(result.map((r) => r.scope)).toEqual(['Global'])
  })
})

describe('buildPeerGroupRanks', () => {
  const userEmail = 'me@test.com'

  function makeCrowd(): ScoreEntry[] {
    return [
      makeEntry({ email: userEmail, score: 7, profile: makeProfile({ designation: 'Data Scientist' }) }),
      makeEntry({ email: 'a@test.com', score: 9, profile: makeProfile({ designation: 'Data Scientist' }) }),
      makeEntry({ email: 'b@test.com', score: 5, profile: makeProfile({ designation: 'Data Scientist' }) }),
      makeEntry({ email: 'c@test.com', score: 4, profile: makeProfile({ designation: 'Data Scientist' }) }),
      makeEntry({ email: 'd@test.com', score: 2, profile: makeProfile({ designation: 'Product Manager' }) }),
    ]
  }

  it('computes rank within each requested dimension', () => {
    const result = buildPeerGroupRanks(makeCrowd(), userEmail, [
      { dimension: 'Role', getLabel: (entry) => entry.profile.designation },
    ])
    expect(result).toEqual([
      { dimension: 'Role', label: 'Data Scientist', rank: 2, percentile: 67, cohortSize: 4 },
    ])
  })

  it('returns a null label/rank when the user is not present in the crowd at all', () => {
    const result = buildPeerGroupRanks(makeCrowd(), 'stranger@test.com', [
      { dimension: 'Role', getLabel: (entry) => entry.profile.designation },
    ])
    expect(result).toEqual([{ dimension: 'Role', label: null, rank: null, percentile: null, cohortSize: 0 }])
  })

  it('falls back to an "Unknown" cohort when the profile field is blank, but withholds rank below the cohort floor', () => {
    const crowd = makeCrowd()
    crowd[0] = makeEntry({ email: userEmail, score: 7, profile: makeProfile({ city: null }) })
    const result = buildPeerGroupRanks(crowd, userEmail, [
      { dimension: 'City', getLabel: (entry) => entry.profile.city },
    ])
    expect(result[0].label).toBe('Unknown')
    expect(result[0].rank).toBeNull()
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

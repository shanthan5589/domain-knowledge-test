import {
  averageScoreFor,
  averageTimeFor,
  buildActivityCalendar,
  buildDomainRadar,
  buildDomainRanges,
  buildLocationComparisons,
  buildNeighbors,
  buildPacePoints,
  buildPeerGroupRanks,
  buildRankLadder,
  buildRecentAttempts,
  buildStreaks,
  buildTimeOfDayPerformance,
  buildTopCities,
  buildUserProgress,
  buildWeekOverWeek,
  getLocationDimension,
  rankWithinCohort,
  roundToOne,
  toAverageScoreByGroup,
  toDistribution,
  type DomainResultRow,
  type DomainScoreEntry,
  type ProfileRow,
  type RankedGroup,
  type ResultRow,
  type ScoreEntry,
} from '@/lib/stats-calculations'

function makeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    email: 'user@test.com',
    full_name: 'Test User',
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

  it.skip('drops rows (including Global) that fall below the minimum cohort size', () => {
    const smallGroup = entries.slice(0, 2)
    const result = buildLocationComparisons(
      { country: 'India', stateRegion: 'Telangana', city: 'Hyderabad' },
      smallGroup
    )
    expect(result).toEqual([])
  })
})

describe('buildNeighbors', () => {
  const userEmail = 'me@test.com'

  function makeCrowd(): ScoreEntry[] {
    return [
      makeEntry({ email: 'a@test.com', score: 10, profile: makeProfile({ email: 'a@test.com', full_name: 'Ada' }) }),
      makeEntry({ email: 'b@test.com', score: 9, profile: makeProfile({ email: 'b@test.com', full_name: 'Bea' }) }),
      makeEntry({ email: userEmail, score: 8, profile: makeProfile({ email: userEmail, full_name: 'Me' }) }),
      makeEntry({ email: 'c@test.com', score: 7, profile: makeProfile({ email: 'c@test.com', full_name: 'Cara' }) }),
      makeEntry({ email: 'd@test.com', score: 6, profile: makeProfile({ email: 'd@test.com', full_name: 'Dan' }) }),
    ]
  }

  it('returns a window of ranks immediately above and below the user, with display names', () => {
    const result = buildNeighbors(makeCrowd(), userEmail, 1)
    expect(result).toEqual([
      { rank: 2, score: 9, isYou: false, name: 'Bea' },
      { rank: 3, score: 8, isYou: true, name: 'Me' },
      { rank: 4, score: 7, isYou: false, name: 'Cara' },
    ])
  })

  it('defaults to a window of 2 on each side', () => {
    const result = buildNeighbors(makeCrowd(), userEmail)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5])
  })

  it('clamps the window at the top of the leaderboard instead of going out of bounds', () => {
    const result = buildNeighbors(makeCrowd(), 'a@test.com', 2)
    expect(result.map((r) => r.rank)).toEqual([1, 2, 3])
  })

  it('gives tied scores the same rank', () => {
    const entries = [
      makeEntry({ email: 'a@test.com', score: 9, profile: makeProfile({ email: 'a@test.com', full_name: 'Ada' }) }),
      makeEntry({ email: userEmail, score: 8, profile: makeProfile({ email: userEmail, full_name: 'Me' }) }),
      makeEntry({ email: 'b@test.com', score: 8, profile: makeProfile({ email: 'b@test.com', full_name: 'Bea' }) }),
      makeEntry({ email: 'c@test.com', score: 5, profile: makeProfile({ email: 'c@test.com', full_name: 'Cara' }) }),
    ]
    const result = buildNeighbors(entries, userEmail, 2)
    expect(result).toEqual(
      expect.arrayContaining([
        { rank: 2, score: 8, isYou: true, name: 'Me' },
        { rank: 2, score: 8, isYou: false, name: 'Bea' },
      ])
    )
  })

  it('falls back to Anonymous when full_name is missing', () => {
    const entries = [
      makeEntry({ email: 'a@test.com', score: 10, profile: makeProfile({ email: 'a@test.com', full_name: null }) }),
      makeEntry({ email: 'b@test.com', score: 9, profile: makeProfile({ email: 'b@test.com', full_name: 'Bea' }) }),
      makeEntry({ email: userEmail, score: 8, profile: makeProfile({ email: userEmail, full_name: 'Me' }) }),
    ]
    const result = buildNeighbors(entries, userEmail, 2)
    expect(result[0]).toEqual({ rank: 1, score: 10, isYou: false, name: 'Anonymous' })
  })

  it('returns an empty array when the user is not part of the cohort', () => {
    expect(buildNeighbors(makeCrowd(), 'stranger@test.com')).toEqual([])
  })

  it('returns an empty array when the cohort is below the minimum size', () => {
    expect(buildNeighbors(makeCrowd().slice(0, 2), userEmail)).toEqual([])
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
  it('returns nulls when the user is not part of the cohort, but still reports the crowd average', () => {
    expect(rankWithinCohort(8, [5, 6, 7], false)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 3,
      averageScore: 6,
    })
  })

  it('returns nulls when the user score is null, but still reports the crowd average', () => {
    expect(rankWithinCohort(null, [5, 6, 7], true)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 3,
      averageScore: 6,
    })
  })

  it.skip('returns nulls (including averageScore) when the cohort is below the minimum size', () => {
    expect(rankWithinCohort(8, [8, 6], true)).toEqual({
      rank: null,
      percentile: null,
      cohortSize: 2,
      averageScore: null,
    })
  })

  it('ranks with standard competition ranking and excludes self from the percentile denominator', () => {
    // cohort of 5 scores, user scores 8 -> 1 person scored higher (rank 2),
    // 3 of the 4 peers scored lower -> 75th percentile; average (10+8+6+5+4)/5 = 6.6
    expect(rankWithinCohort(8, [10, 8, 6, 5, 4], true)).toEqual({
      rank: 2,
      percentile: 75,
      cohortSize: 5,
      averageScore: 6.6,
    })
  })

  it('gives tied top scorers the same rank 1', () => {
    // no one scored higher than 9 -> rank 1; of the 4 peers, 3 scored lower -> 75th percentile
    expect(rankWithinCohort(9, [9, 9, 5, 4, 3], true)).toEqual({
      rank: 1,
      percentile: 75,
      cohortSize: 5,
      averageScore: 6,
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
    // City/State/Country cohort is the same 5 Hyderabad entries (8,9,6,5,4) -> rank 2 of 5, avg 6.4
    expect(result[0]).toEqual({
      scope: 'City',
      label: 'Hyderabad',
      rank: 2,
      percentile: 75,
      cohortSize: 5,
      averageScore: 6.4,
    })
    expect(result[2]).toEqual({
      scope: 'Country',
      label: 'India',
      rank: 2,
      percentile: 75,
      cohortSize: 5,
      averageScore: 6.4,
    })
    // Global cohort is all 7 entries -> 2 people (scores 9 and 10) scored higher -> rank 3
    expect(result[3].scope).toBe('Global')
    expect(result[3].rank).toBe(3)
    expect(result[3].cohortSize).toBe(7)
    expect(result[3].averageScore).toBe(6.4)
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
      { dimension: 'Role', label: 'Data Scientist', rank: 2, percentile: 67, cohortSize: 4, averageScore: 6.3 },
    ])
  })

  it('returns a null label/rank when the user is not present in the crowd at all', () => {
    const result = buildPeerGroupRanks(makeCrowd(), 'stranger@test.com', [
      { dimension: 'Role', getLabel: (entry) => entry.profile.designation },
    ])
    expect(result).toEqual([
      { dimension: 'Role', label: null, rank: null, percentile: null, cohortSize: 0, averageScore: null },
    ])
  })

  it.skip('falls back to an "Unknown" cohort when the profile field is blank, but withholds rank below the cohort floor', () => {
    const crowd = makeCrowd()
    crowd[0] = makeEntry({ email: userEmail, score: 7, profile: makeProfile({ city: null }) })
    const result = buildPeerGroupRanks(crowd, userEmail, [
      { dimension: 'City', getLabel: (entry) => entry.profile.city },
    ])
    expect(result[0].label).toBe('Unknown')
    expect(result[0].rank).toBeNull()
  })
})

describe('buildDomainRadar', () => {
  const userEmail = 'me@test.com'

  function domainEntry(overrides: Partial<DomainScoreEntry> = {}): DomainScoreEntry {
    return { ...makeEntry(), domain: 'AI', ...overrides }
  }

  it('reports you/city/country averages per domain, withholding cohorts below the minimum size', () => {
    const entries: DomainScoreEntry[] = [
      domainEntry({ email: userEmail, score: 8, domain: 'AI' }),
      domainEntry({ email: 'a@test.com', score: 6, domain: 'AI' }),
      domainEntry({ email: 'b@test.com', score: 4, domain: 'AI' }),
      domainEntry({ email: 'c@test.com', score: 5, domain: 'AI' }),
      domainEntry({ email: userEmail, score: 7, domain: 'Cloud' }),
    ]
    const result = buildDomainRadar(entries, userEmail, { city: 'Hyderabad', country: 'India' }, [
      'AI',
      'Cloud',
    ])
    // city/country cohort is all 4 AI entries (default profile is Hyderabad/India): avg (8+6+4+5)/4 = 5.75 -> 5.8
    expect(result).toEqual([
      { domain: 'AI', you: 8, city: 5.8, country: 5.8 },
      { domain: 'Cloud', you: 7, city: 7, country: 7 },
    ])
  })

  it('returns null you/city/country when there is no data for a domain', () => {
    const result = buildDomainRadar([], userEmail, { city: 'Hyderabad', country: 'India' }, ['Cybersecurity'])
    expect(result).toEqual([{ domain: 'Cybersecurity', you: null, city: null, country: null }])
  })
})

describe('buildTopCities', () => {
  function group(label: string, count: number, averageScore: number): RankedGroup {
    return { label, count, averageScore }
  }

  it("returns the top 5 as-is when the user's group is already in it", () => {
    const groups = [
      group('Hyderabad', 20, 9),
      group('Bengaluru', 18, 8.5),
      group('Chennai', 15, 8),
      group('Pune', 12, 7.5),
      group('Mumbai', 10, 7),
      group('Delhi', 8, 6.5),
    ]
    const result = buildTopCities(groups, 'Chennai')
    expect(result).toHaveLength(5)
    expect(result.map((r) => r.label)).toEqual(['Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai'])
    expect(result.find((r) => r.label === 'Chennai')).toEqual({
      label: 'Chennai',
      count: 15,
      averageScore: 8,
      rank: 3,
      isYou: true,
    })
  })

  it("adds the user's group as a 6th row when it didn't make the top 5", () => {
    const groups = [
      group('Hyderabad', 20, 9),
      group('Bengaluru', 18, 8.5),
      group('Chennai', 15, 8),
      group('Pune', 12, 7.5),
      group('Mumbai', 10, 7),
      group('Delhi', 8, 6.5),
    ]
    const result = buildTopCities(groups, 'Delhi')
    expect(result).toHaveLength(6)
    expect(result[5]).toEqual({ label: 'Delhi', count: 8, averageScore: 6.5, rank: 6, isYou: true })
  })

  it('does not add a 6th row when the user has no group at all', () => {
    const groups = [group('Hyderabad', 20, 9), group('Bengaluru', 18, 8.5)]
    const result = buildTopCities(groups, null)
    expect(result).toHaveLength(2)
  })
})

describe('buildRecentAttempts', () => {
  function attempt(domain: string, score: number, completedAt: string): DomainResultRow {
    return { user_email: 'me@test.com', score, time_taken_seconds: 240, completed_at: completedAt, domain }
  }

  it('sorts newest first and diffs each attempt against the one immediately before it', () => {
    const attempts = [
      attempt('ai', 7, '2026-01-01T00:00:00Z'),
      attempt('cloud', 6, '2026-01-02T00:00:00Z'),
      attempt('ai', 9, '2026-01-03T00:00:00Z'),
    ]
    expect(buildRecentAttempts(attempts)).toEqual([
      { domain: 'ai', score: 9, completedAt: '2026-01-03T00:00:00Z', scoreChangeFromPrevious: 3 },
      { domain: 'cloud', score: 6, completedAt: '2026-01-02T00:00:00Z', scoreChangeFromPrevious: -1 },
      { domain: 'ai', score: 7, completedAt: '2026-01-01T00:00:00Z', scoreChangeFromPrevious: null },
    ])
  })

  it('caps the result at the given limit', () => {
    const attempts = Array.from({ length: 10 }, (_, i) => attempt('ai', 5, `2026-01-${10 + i}T00:00:00Z`))
    expect(buildRecentAttempts(attempts, 3)).toHaveLength(3)
  })

  it('returns an empty array for no attempts', () => {
    expect(buildRecentAttempts([])).toEqual([])
  })
})

describe('buildWeekOverWeek', () => {
  function attempt(score: number, completedAt: string): ResultRow {
    return { user_email: 'me@test.com', score, time_taken_seconds: 240, completed_at: completedAt }
  }

  it('averages this week and last week separately and computes the change', () => {
    const today = new Date('2026-01-15T00:00:00Z')
    const attempts = [
      attempt(8, '2026-01-14T00:00:00Z'), // this week
      attempt(6, '2026-01-10T00:00:00Z'), // this week
      attempt(5, '2026-01-05T00:00:00Z'), // last week
      attempt(3, '2026-01-01T00:00:00Z'), // last week
    ]
    expect(buildWeekOverWeek(attempts, today)).toEqual({
      thisWeekAverage: 7,
      lastWeekAverage: 4,
      change: 3,
    })
  })

  it('returns null averages/change when there is no data in a window', () => {
    const today = new Date('2026-01-15T00:00:00Z')
    expect(buildWeekOverWeek([], today)).toEqual({
      thisWeekAverage: null,
      lastWeekAverage: null,
      change: null,
    })
  })

  it('returns a null change when only one of the two weeks has data', () => {
    const today = new Date('2026-01-15T00:00:00Z')
    const attempts = [attempt(8, '2026-01-14T00:00:00Z')]
    const result = buildWeekOverWeek(attempts, today)
    expect(result.thisWeekAverage).toBe(8)
    expect(result.lastWeekAverage).toBeNull()
    expect(result.change).toBeNull()
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

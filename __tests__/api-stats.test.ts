/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/stats/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/supabase-server', () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}))

import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

const mockAuth = auth as jest.Mock
const mockFrom = supabaseAdmin.from as jest.Mock

function makeRequest(query: string) {
  return new NextRequest(`http://localhost/api/stats${query}`)
}

function mockResultsQuery(data: unknown, error: unknown = null) {
  const rows = Array.isArray(data)
    ? data.map((row) => ({
        time_taken_seconds: 240,
        ...row,
      }))
    : data
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        order: jest.fn().mockResolvedValue({ data: rows, error }),
      }),
    }),
  })
}

// The real profiles query chains .eq() once per active filter before being awaited,
// so the mock builder must stay chainable and thenable across any number of calls.
function makeChainableResult(data: unknown, error: unknown = null) {
  const builder: {
    eq: jest.Mock
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => void
  } = {
    eq: jest.fn(() => builder),
    then: (resolve) => resolve({ data, error }),
  }
  return builder
}

function mockProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue(makeChainableResult(data, error)),
  })
}

function mockCommunityProfilesQuery(data: unknown, error: unknown = null) {
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue({
      in: jest.fn().mockResolvedValue({ data, error }),
    }),
  })
}

function profileRows(emails: string[]) {
  return emails.map((email, i) => ({
    email,
    designation: i % 2 === 0 ? 'Software Engineer / Developer' : 'Data Scientist',
    years_of_experience: i % 2 === 0 ? '1-3 years' : '3-5 years',
    country: 'India',
    state_region: i % 2 === 0 ? 'Telangana' : 'Karnataka',
    city: i % 2 === 0 ? 'Hyderabad' : 'Bengaluru',
  }))
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when domain is missing', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const res = await GET(makeRequest(''))
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const res = await GET(makeRequest('?domain=invalid'))
    expect(res.status).toBe(400)
  })

  it('builds a histogram from each user\'s latest score, unfiltered', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 8, completed_at: '2026-01-02' },
      { user_email: 'a@test.com', score: 5, completed_at: '2026-01-01' }, // older attempt, ignored
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'b@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalUsers).toBe(3)
    expect(body.histogram[8]).toBe(2)
    expect(body.histogram[10]).toBe(1)
    expect(body.yourScore).toBe(10)
    expect(body.medianScore).toBe(8)
    expect(body.modeScore).toBe(8)
    expect(body.lowScore).toBe(8)
    expect(body.topScoreCount).toBe(1)
    expect(body.topScorePercent).toBe(33)
  })

  it('filters the crowd by designation but still reports your own score', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }])
    mockCommunityProfilesQuery(profileRows(['a@test.com']))

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.histogram[8]).toBe(1)
    expect(body.histogram[6]).toBe(0)
    expect(body.yourScore).toBe(10)
  })

  it('returns yourScore null when the current user has no attempt for the domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])
    mockCommunityProfilesQuery(profileRows(['a@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.yourScore).toBeNull()
    expect(body.yourRank).toBeNull()
    expect(body.percentile).toBeNull()
  })

  it('computes percentile as the share of your peers scored lower than you, excluding yourself', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 4, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 9, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'b@test.com', 'c@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    // 2 of your 3 peers (a, b — excluding yourself from the denominator) scored below 8 → 67th percentile
    expect(body.percentile).toBe(67)
  })

  it('reports 100th percentile for the sole top scorer among several peers', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 4, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 7, completed_at: '2026-01-02' },
      { user_email: 'd@test.com', score: 5, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'b@test.com', 'c@test.com', 'd@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.percentile).toBe(100)
  })

  it('computes yourRank with standard competition ranking, where ties share a rank', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 10, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 10, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 7, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 7, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(
      profileRows(['a@test.com', 'b@test.com', 'c@test.com', 'me@test.com'])
    )

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    // Two people (a, b) scored higher than you, so you and c both rank 3rd
    expect(body.yourRank).toBe(3)
  })

  it('returns null yourRank when you are excluded from the filtered crowd', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }])
    mockCommunityProfilesQuery(profileRows(['a@test.com']))

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.yourRank).toBeNull()
  })

  it('returns null percentile when you have no peers to compare against', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' }])
    mockCommunityProfilesQuery(profileRows(['me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.percentile).toBeNull()
  })

  it('does not exclude yourself from the denominator when the filter excludes you', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    // Only 'a' and 'b' match the designation filter — 'me' is excluded from the crowd
    mockProfilesQuery([{ email: 'a@test.com' }, { email: 'b@test.com' }])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'b@test.com']))

    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.totalUsers).toBe(2)
    // yourScore (10) beats both a (8) and b (6) — since you're not part of the
    // filtered crowd, the denominator is the full crowd size (2), not (2 - 1)
    expect(body.percentile).toBe(100)
  })

  it('combines multiple profile filters with AND semantics', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    const builder = makeChainableResult([{ email: 'a@test.com' }])
    mockFrom.mockReturnValueOnce({ select: jest.fn().mockReturnValue(builder) })
    mockCommunityProfilesQuery(profileRows(['a@test.com']))

    const res = await GET(
      makeRequest('?domain=ai&designation=Data%20Scientist&country=India&experience=3-5%20years')
    )
    expect(res.status).toBe(200)
    // one .eq() call per active filter (designation, country, experience)
    expect(builder.eq).toHaveBeenCalledTimes(3)
    expect(builder.eq).toHaveBeenCalledWith('designation', 'Data Scientist')
    expect(builder.eq).toHaveBeenCalledWith('country', 'India')
    expect(builder.eq).toHaveBeenCalledWith('years_of_experience', '3-5 years')
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.histogram[8]).toBe(1)
  })

  it('returns community summary and demographic distributions', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery([
      {
        email: 'a@test.com',
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      },
      {
        email: 'b@test.com',
        designation: 'Data Scientist',
        years_of_experience: '3-5 years',
        country: 'India',
        state_region: 'Karnataka',
        city: 'Bengaluru',
      },
      {
        email: 'me@test.com',
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.averageScore).toBe(8)
    expect(body.medianScore).toBe(8)
    expect(body.modeScore).toBe(6)
    expect(body.topScore).toBe(10)
    expect(body.lowScore).toBe(6)
    expect(body.topScoreCount).toBe(1)
    expect(body.topScorePercent).toBe(33)
    expect(body.roleDistribution[0]).toEqual({
      label: 'Software Engineer / Developer',
      count: 2,
      percent: 67,
    })
    expect(body.experienceAverageScores[0]).toEqual({
      label: '1-3 years',
      count: 2,
      averageScore: 9,
    })
    expect(body.experienceDistribution[0].label).toBe('1-3 years')
    expect(body.locationDistributionLabel).toBe('Countries')
    expect(body.locationDistribution[0]).toEqual({ label: 'India', count: 3, percent: 100 })
    expect(body.locationAverageScores[0]).toEqual({ label: 'India', count: 3, averageScore: 8 })
    expect(body.locationComparisons).toEqual([
      { label: 'Global', scope: 'Global', averageScore: 8, count: 3 },
    ])
  })

  it('returns user progress, time efficiency, and consistency for the selected domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 7, time_taken_seconds: 260, completed_at: '2026-01-04' },
      { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 6, time_taken_seconds: 250, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 7, time_taken_seconds: 240, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.averageTimeSeconds).toBe(240)
    expect(body.userProgress).toMatchObject({
      attemptCount: 3,
      latestScore: 8,
      previousScore: 6,
      scoreChange: 2,
      bestScore: 8,
      latestTimeSeconds: 220,
      averageTimePerQuestionSeconds: 22,
      scorePerMinute: 2.2,
    })
    expect(body.userProgress.consistency.label).toBe('Stable')
  })

  it('returns local, country, and global comparison averages for the selected location', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-02' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }, { email: 'me@test.com' }])
    mockCommunityProfilesQuery([
      { email: 'a@test.com', designation: 'Software Engineer / Developer', years_of_experience: '1-3 years', country: 'India', state_region: 'Telangana', city: 'Hyderabad' },
      { email: 'b@test.com', designation: 'Data Scientist', years_of_experience: '3-5 years', country: 'India', state_region: 'Karnataka', city: 'Bengaluru' },
      { email: 'me@test.com', designation: 'Software Engineer / Developer', years_of_experience: '1-3 years', country: 'India', state_region: 'Telangana', city: 'Hyderabad' },
    ])

    const res = await GET(makeRequest('?domain=ai&country=India&state_region=Telangana&city=Hyderabad'))
    const body = await res.json()
    expect(body.locationComparisons).toEqual([
      { label: 'Hyderabad', scope: 'City', averageScore: 9, count: 2 },
      { label: 'Telangana', scope: 'State / Region', averageScore: 9, count: 2 },
      { label: 'India', scope: 'Country', averageScore: 8, count: 3 },
      { label: 'Global', scope: 'Global', averageScore: 8, count: 3 },
    ])
  })

  it('computes average score per designation, sorted highest-scoring first', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery([
      { email: 'a@test.com', designation: 'Software Engineer / Developer', years_of_experience: '1-3 years', country: 'India', state_region: 'Telangana', city: 'Hyderabad' },
      { email: 'b@test.com', designation: 'Data Scientist', years_of_experience: '3-5 years', country: 'India', state_region: 'Karnataka', city: 'Bengaluru' },
      { email: 'me@test.com', designation: 'Software Engineer / Developer', years_of_experience: '1-3 years', country: 'India', state_region: 'Telangana', city: 'Hyderabad' },
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    // Software Engineer / Developer: (8 + 10) / 2 = 9, Data Scientist: 6
    expect(body.roleAverageScores).toEqual([
      { label: 'Software Engineer / Developer', count: 2, averageScore: 9 },
      { label: 'Data Scientist', count: 1, averageScore: 6 },
    ])
  })

  it('returns an empty roleAverageScores array when no one matches the filter', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])
    mockProfilesQuery([])
    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    const body = await res.json()
    expect(body.roleAverageScores).toEqual([])
  })

  it('omits location distribution when a specific city is selected', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery([{ email: 'a@test.com' }, { email: 'me@test.com' }])
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai&country=India&state_region=Telangana&city=Hyderabad'))
    const body = await res.json()
    expect(body.locationDistributionLabel).toBeNull()
    expect(body.locationDistribution).toEqual([])
  })

  it('ignores results whose profile has been deleted', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'deleted@test.com', score: 2, completed_at: '2026-01-03' },
      { user_email: 'me@test.com', score: 10, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(profileRows(['me@test.com']))

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.totalUsers).toBe(1)
    expect(body.histogram[2]).toBe(0)
    expect(body.histogram[10]).toBe(1)
  })

  it('returns 500 when the test_results fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the profiles fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])
    mockProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai&designation=Data%20Scientist'))
    expect(res.status).toBe(500)
  })

  it('returns 500 when the community profile fetch fails', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([{ user_email: 'a@test.com', score: 8, completed_at: '2026-01-03' }])
    mockCommunityProfilesQuery(null, { message: 'DB error' })
    const res = await GET(makeRequest('?domain=ai'))
    expect(res.status).toBe(500)
  })

})

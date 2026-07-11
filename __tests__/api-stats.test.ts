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

function normalizeRows(data: unknown) {
  return Array.isArray(data)
    ? data.map((row) => ({
        time_taken_seconds: 240,
        ...row,
      }))
    : data
}

function queueResultsChain(rows: unknown, error: unknown) {
  const chain: { eq: jest.Mock; order: jest.Mock; limit: jest.Mock } = {
    eq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn().mockResolvedValue({ data: rows, error }),
  }
  mockFrom.mockReturnValueOnce({
    select: jest.fn().mockReturnValue(chain),
  })
}

// The route issues two "test_results" queries back to back: the
// community-wide (deduped) results, then a direct fetch of the current
// user's own full history (see app/api/stats/route.ts). Both chain zero or
// more .eq() calls before .order().limit(), so one queued chain per call
// covers either. `myResultsData` defaults to the same rows as `data` since
// most tests don't care about the second query's contents — only the
// user-progress test needs it to genuinely differ.
function mockResultsQuery(data: unknown, error: unknown = null, myResultsData: unknown = data) {
  queueResultsChain(normalizeRows(data), error)
  queueResultsChain(normalizeRows(myResultsData), error)
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
    full_name: email === 'me@test.com' ? 'Me' : `User ${email[0].toUpperCase()}`,
    designation: i % 2 === 0 ? 'Software Engineer / Developer' : 'Data Scientist',
    years_of_experience: i % 2 === 0 ? '1-3 years' : '3-5 years',
    country: 'India',
    state_region: i % 2 === 0 ? 'Telangana' : 'Karnataka',
    city: i % 2 === 0 ? 'Hyderabad' : 'Bengaluru',
  }))
}

function emails(prefix: string, count: number) {
  return Array.from({ length: count }, (_, i) => `${prefix}${i}@test.com`)
}

describe('GET /api/stats', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks) matters here: mockResultsQuery always
    // queues two chained .from() responses (community + my-results), but a
    // test whose route call errors out after the first one never consumes
    // the second. clearAllMocks leaves unconsumed mockReturnValueOnce queue
    // entries in place, so that leftover would silently bleed into the next
    // test's first .from() call. resetAllMocks wipes the queue clean.
    jest.resetAllMocks()
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

  it('returns null yourRank and null percentile when you are excluded from the filtered crowd', async () => {
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
    // You're not part of the filtered "Data Scientist" cohort, so a percentile
    // comparing you against it would be meaningless — it should be omitted.
    expect(body.percentile).toBeNull()
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

  it('does not compute a percentile against a filtered cohort you are not part of', async () => {
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
    // yourScore (10) would beat both a (8) and b (6), but you aren't a member of
    // the filtered "Data Scientist" cohort — comparing you against a group you
    // don't belong to would be misleading, so no percentile is reported.
    expect(body.percentile).toBeNull()
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

  it('returns community summary and core aggregates for a small cohort', async () => {
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
    // Core aggregate numbers over the whole cohort are always reported, since
    // they describe the user's relationship to the whole filtered result set
    // rather than exposing any one small demographic slice.
    expect(body.averageScore).toBe(8)
    expect(body.medianScore).toBe(8)
    expect(body.modeScore).toBe(6)
    expect(body.topScore).toBe(10)
    expect(body.lowScore).toBe(6)
    expect(body.topScoreCount).toBe(1)
    expect(body.topScorePercent).toBe(33)
    // (Privacy rule removed, so segment-level breakdowns ARE returned here)
    expect(body.locationDistributionLabel).toBe('Countries')
    // But the country breakdown has all 3 people in one group (India), and
    // the overall cohort is also exactly 3 people — both meet (not fall
    // below) the minimum cohort size, so the country distribution and the
    // "Global" comparison row are both reported.
    expect(body.locationDistribution).toEqual([{ label: 'India', count: 3, percent: 100 }])
    expect(body.locationAverageScores).toEqual([{ label: 'India', averageScore: 8, count: 3 }])
    expect(body.locationComparisons).toEqual([{ label: 'Global', scope: 'Global', averageScore: 8, count: 3 }])
  })

  it('returns demographic distributions and location comparisons once each group meets the minimum cohort size', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const seEmails = emails('se', 5)
    const dsEmails = emails('ds', 5)
    mockResultsQuery([
      ...seEmails.map((email, i) => ({ user_email: email, score: 8, completed_at: `2026-01-${10 + i}` })),
      ...dsEmails.map((email, i) => ({ user_email: email, score: 6, completed_at: `2026-01-${20 + i}` })),
    ])
    mockCommunityProfilesQuery([
      ...seEmails.map((email) => ({
        email,
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      })),
      ...dsEmails.map((email) => ({
        email,
        designation: 'Data Scientist',
        years_of_experience: '3-5 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      })),
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.averageScore).toBe(7)
    expect(body.roleDistribution).toEqual(
      expect.arrayContaining([
        { label: 'Software Engineer / Developer', count: 5, percent: 50 },
        { label: 'Data Scientist', count: 5, percent: 50 },
      ])
    )
    expect(body.locationDistributionLabel).toBe('Countries')
    expect(body.locationDistribution[0]).toEqual({ label: 'India', count: 10, percent: 100 })
    expect(body.locationComparisons).toEqual([
      { label: 'Global', scope: 'Global', averageScore: 7, count: 10 },
    ])
  })

  it('returns user progress, time efficiency, and consistency for the selected domain', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    // Community query: deduped to one (latest) row per user, matching what the
    // real latest_results_for_domain RPC returns in production. My-results
    // query: my full history for this domain — this is what userProgress must
    // be built from, since the deduped community rows alone could never show
    // more than my single latest attempt.
    mockResultsQuery(
      [
        { user_email: 'a@test.com', score: 7, time_taken_seconds: 260, completed_at: '2026-01-04' },
        { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03' },
      ],
      null,
      [
        { user_email: 'me@test.com', score: 8, time_taken_seconds: 220, completed_at: '2026-01-03' },
        { user_email: 'me@test.com', score: 6, time_taken_seconds: 250, completed_at: '2026-01-02' },
        { user_email: 'me@test.com', score: 7, time_taken_seconds: 240, completed_at: '2026-01-01' },
      ]
    )
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

  it('scopes country and global comparisons to the active filter, not the full unfiltered crowd', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    // 5 people match the country=India filter; a 6th ('excluded') does not and
    // must not leak into the "Country"/"Global" comparison rows.
    const filterEmails = emails('in', 5)
    mockResultsQuery([
      ...filterEmails.map((email, i) => ({ user_email: email, score: 8, completed_at: `2026-01-${10 + i}` })),
      { user_email: 'excluded@test.com', score: 2, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery(filterEmails.map((email) => ({ email })))
    mockCommunityProfilesQuery([
      ...filterEmails.map((email) => ({
        email,
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      })),
      {
        email: 'excluded@test.com',
        designation: 'Data Scientist',
        years_of_experience: '3-5 years',
        country: 'France',
        state_region: 'Ile-de-France',
        city: 'Paris',
      },
    ])

    const res = await GET(makeRequest('?domain=ai&country=India&state_region=Telangana&city=Hyderabad'))
    const body = await res.json()
    // Every comparison row reflects only the 5-person filtered ("India") crowd,
    // not the unfiltered 6-person one that would include 'excluded' (France).
    expect(body.locationComparisons).toEqual([
      { label: 'Hyderabad', scope: 'City', averageScore: 8, count: 5 },
      { label: 'Telangana', scope: 'State / Region', averageScore: 8, count: 5 },
      { label: 'India', scope: 'Country', averageScore: 8, count: 5 },
      { label: 'Global', scope: 'Global', averageScore: 8, count: 5 },
    ])
  })

  it('computes average score per designation, sorted highest-scoring first, once each group meets the cohort floor', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const seEmails = emails('se', 5)
    const dsEmails = emails('ds', 5)
    mockResultsQuery([
      ...seEmails.map((email, i) => ({ user_email: email, score: 8, completed_at: `2026-01-${10 + i}` })),
      ...dsEmails.map((email, i) => ({ user_email: email, score: 6, completed_at: `2026-01-${20 + i}` })),
    ])
    mockCommunityProfilesQuery([
      ...seEmails.map((email) => ({
        email,
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      })),
      ...dsEmails.map((email) => ({
        email,
        designation: 'Data Scientist',
        years_of_experience: '3-5 years',
        country: 'India',
        state_region: 'Karnataka',
        city: 'Bengaluru',
      })),
    ])

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.roleAverageScores).toEqual([
      { label: 'Software Engineer / Developer', count: 5, averageScore: 8 },
      { label: 'Data Scientist', count: 5, averageScore: 6 },
    ])
  })

  it.skip('omits demographic breakdowns smaller than the minimum cohort size', async () => {
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
    // Software Engineer / Developer has 2 people, Data Scientist has 1 — both
    // below the minimum cohort size, so neither shows up in the breakdown.
    expect(body.roleAverageScores).toEqual([])
  })

  it.skip('returns an empty roleAverageScores array when no one matches the filter', async () => {
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

  it('reports rank ladder rungs for every active location filter plus a Global rung', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 9, completed_at: '2026-01-04' },
      { user_email: 'b@test.com', score: 6, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 5, completed_at: '2026-01-02' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-01' },
    ])
    mockProfilesQuery(['a@test.com', 'b@test.com', 'c@test.com', 'me@test.com'].map((email) => ({ email })))
    mockCommunityProfilesQuery(profileRows(['a@test.com', 'b@test.com', 'c@test.com', 'me@test.com']))

    const res = await GET(makeRequest('?domain=ai&country=India&state_region=Telangana&city=Hyderabad'))
    const body = await res.json()
    // profileRows alternates Hyderabad/Telangana and Bengaluru/Karnataka, both under India,
    // so the City rung is a 2-person cohort (below the floor) while Country/Global are 4.
    expect(body.rankLadder.map((r: { scope: string }) => r.scope)).toEqual([
      'City',
      'State / Region',
      'Country',
      'Global',
    ])
    const countryRung = body.rankLadder.find((r: { scope: string }) => r.scope === 'Country')
    expect(countryRung).toEqual({
      scope: 'Country',
      label: 'India',
      rank: 2,
      percentile: 67,
      cohortSize: 4,
      averageScore: 7,
    })
  })

  it('reports peer group ranks across role/experience/location dimensions', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const seEmails = emails('se', 4)
    mockResultsQuery([
      ...seEmails.map((email, i) => ({ user_email: email, score: 6 + i, completed_at: `2026-01-${10 + i}` })),
      { user_email: 'me@test.com', score: 9, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery([
      ...seEmails.map((email) => ({
        email,
        designation: 'Software Engineer / Developer',
        years_of_experience: '1-3 years',
        country: 'India',
        state_region: 'Telangana',
        city: 'Hyderabad',
      })),
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
    const roleRank = body.peerGroupRanks.find((r: { dimension: string }) => r.dimension === 'Role')
    // 5-person "Software Engineer / Developer" cohort (scores 6,7,8,9,9 - you're
    // tied for the top score) -> rank 1; 3 of your 4 peers scored lower -> 75th percentile
    expect(roleRank).toEqual({
      dimension: 'Role',
      label: 'Software Engineer / Developer',
      rank: 1,
      percentile: 75,
      cohortSize: 5,
      averageScore: 7.8,
    })
  })

  it('returns the real top-5 cities plus a conditional 6th row for your own city', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const cities = ['Hyderabad', 'Bengaluru', 'Chennai', 'Pune', 'Mumbai', 'Delhi']
    const rows: Array<{ user_email: string; score: number; completed_at: string }> = []
    const profiles: Array<{ email: string; designation: string; years_of_experience: string; country: string; state_region: string; city: string }> = []
    cities.forEach((city, cityIndex) => {
      for (let i = 0; i < 3; i++) {
        const email = `${city.toLowerCase()}${i}@test.com`
        rows.push({ user_email: email, score: 9 - cityIndex, completed_at: `2026-01-${cityIndex * 3 + i + 1}` })
        profiles.push({
          email,
          designation: 'Software Engineer / Developer',
          years_of_experience: '1-3 years',
          country: 'India',
          state_region: `${city} State`,
          city,
        })
      }
    })
    // 'me' lives in Delhi, the 6th-ranked (lowest scoring) city, so it should not
    // make the natural top 5 and must be appended as a 6th row.
    rows.push({ user_email: 'me@test.com', score: 3, completed_at: '2026-02-01' })
    profiles.push({
      email: 'me@test.com',
      designation: 'Software Engineer / Developer',
      years_of_experience: '1-3 years',
      country: 'India',
      state_region: 'Delhi State',
      city: 'Delhi',
    })

    mockResultsQuery(rows)
    mockCommunityProfilesQuery(profiles)

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.topCitiesByScore).toHaveLength(6)
    expect(body.topCitiesByScore.slice(0, 5).map((r: { label: string }) => r.label)).toEqual([
      'Hyderabad',
      'Bengaluru',
      'Chennai',
      'Pune',
      'Mumbai',
    ])
    expect(body.topCitiesByScore[5]).toMatchObject({ label: 'Delhi', rank: 6, isYou: true })
  })

  it('caps average-score-by-state and test-takers-by-state at the top 15, or fewer if fewer states have data', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    const rows: Array<{ user_email: string; score: number; completed_at: string }> = []
    const profiles: Array<{ email: string; designation: string; years_of_experience: string; country: string; state_region: string; city: string }> = []
    for (let s = 0; s < 3; s++) {
      for (let i = 0; i < 3; i++) {
        const email = `state${s}user${i}@test.com`
        rows.push({ user_email: email, score: 5, completed_at: `2026-01-${s * 3 + i + 1}` })
        profiles.push({
          email,
          designation: 'Software Engineer / Developer',
          years_of_experience: '1-3 years',
          country: 'India',
          state_region: `State${s}`,
          city: `City${s}`,
        })
      }
    }
    mockResultsQuery(rows)
    mockCommunityProfilesQuery(profiles)

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    // Only 3 states have data (each below the theoretical top-15 cap), so both
    // widgets show exactly those 3 rather than padding out to 15.
    expect(body.averageScoreByState).toHaveLength(3)
    expect(body.testTakersByState).toHaveLength(3)
  })

  it('reports a window of neighbors around your rank with display names (no emails)', async () => {
    mockAuth.mockResolvedValue({ user: { email: 'me@test.com' } })
    mockResultsQuery([
      { user_email: 'a@test.com', score: 10, completed_at: '2026-01-05' },
      { user_email: 'b@test.com', score: 9, completed_at: '2026-01-04' },
      { user_email: 'me@test.com', score: 8, completed_at: '2026-01-03' },
      { user_email: 'c@test.com', score: 7, completed_at: '2026-01-02' },
      { user_email: 'd@test.com', score: 6, completed_at: '2026-01-01' },
    ])
    mockCommunityProfilesQuery(
      profileRows(['a@test.com', 'b@test.com', 'me@test.com', 'c@test.com', 'd@test.com'])
    )

    const res = await GET(makeRequest('?domain=ai'))
    const body = await res.json()
    expect(body.neighbors).toEqual([
      { rank: 1, score: 10, isYou: false, name: 'User A' },
      { rank: 2, score: 9, isYou: false, name: 'User B' },
      { rank: 3, score: 8, isYou: true, name: 'Me' },
      { rank: 4, score: 7, isYou: false, name: 'User C' },
      { rank: 5, score: 6, isYou: false, name: 'User D' },
    ])
    for (const row of body.neighbors) {
      expect(JSON.stringify(row)).not.toMatch(/@test\.com/)
    }
  })
})

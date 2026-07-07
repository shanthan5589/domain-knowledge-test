/**
 * @jest-environment node
 *
 * Tests the NextAuth config passed to NextAuth() in auth.ts, focusing on the
 * signIn and jwt callbacks. We mock the `next-auth` package's default export
 * so we can capture the config object (including its callbacks) without
 * needing a real NextAuth runtime.
 */

type ProfilesQuery = {
  select: jest.Mock
  eq: jest.Mock
  single: jest.Mock
  insert: jest.Mock
}

function makeProfilesMock() {
  const query: Partial<ProfilesQuery> = {}
  query.single = jest.fn()
  query.eq = jest.fn().mockReturnValue({ single: query.single })
  query.select = jest.fn().mockReturnValue({ eq: query.eq })
  query.insert = jest.fn().mockResolvedValue({ error: null })
  return query as ProfilesQuery
}

type SignInArgs = { user: { email?: string | null; name?: string | null }; account: { provider: string } | null }
type JwtArgs = { token: { email?: string | null; profileCompleted?: boolean }; trigger?: string }
type AuthConfig = {
  trustHost?: boolean
  callbacks: {
    signIn: (args: SignInArgs) => Promise<boolean>
    jwt: (args: JwtArgs) => Promise<JwtArgs['token']>
  }
}

let capturedConfig: AuthConfig

jest.mock('next-auth', () => {
  const fn = jest.fn((config: AuthConfig) => {
    capturedConfig = config
    return { handlers: {}, signIn: jest.fn(), signOut: jest.fn(), auth: jest.fn() }
  })
  return { __esModule: true, default: fn }
})

jest.mock('next-auth/providers/google', () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: 'google' })),
}))

jest.mock('next-auth/providers/credentials', () => ({
  __esModule: true,
  default: jest.fn(() => ({ id: 'credentials' })),
}))

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}))

let profilesMock: ProfilesQuery

jest.mock('@/lib/supabase-server', () => ({
  get supabaseAdmin() {
    return { from: jest.fn(() => profilesMock) }
  },
}))

describe('auth.ts callbacks', () => {
  beforeEach(() => {
    jest.resetModules()
    profilesMock = makeProfilesMock()
  })

  async function loadConfig() {
    await import('@/auth')
    return capturedConfig
  }

  it('trusts the request host, so OAuth callbacks work on any Vercel preview URL', async () => {
    const config = await loadConfig()
    expect(config.trustHost).toBe(true)
  })

  describe('signIn callback (Google)', () => {
    it('lowercases the email when looking up an existing profile', async () => {
      const config = await loadConfig()
      profilesMock.single.mockResolvedValue({ data: { id: 'existing' }, error: null })

      await config.callbacks.signIn({
        user: { email: 'User@Gmail.com', name: 'User' },
        account: { provider: 'google' },
      })

      expect(profilesMock.eq).toHaveBeenCalledWith('email', 'user@gmail.com')
    })

    it('lowercases the email when inserting a new profile', async () => {
      const config = await loadConfig()
      profilesMock.single.mockResolvedValue({ data: null, error: null })

      await config.callbacks.signIn({
        user: { email: 'User@Gmail.com', name: 'User' },
        account: { provider: 'google' },
      })

      expect(profilesMock.insert).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'user@gmail.com' })
      )
    })

    it('returns true to allow sign-in', async () => {
      const config = await loadConfig()
      profilesMock.single.mockResolvedValue({ data: { id: 'existing' }, error: null })

      const result = await config.callbacks.signIn({
        user: { email: 'user@gmail.com', name: 'User' },
        account: { provider: 'google' },
      })

      expect(result).toBe(true)
    })
  })

  describe('jwt callback', () => {
    it('lowercases token.email before querying profile_completed', async () => {
      const config = await loadConfig()
      profilesMock.single.mockResolvedValue({ data: { profile_completed: true }, error: null })

      await config.callbacks.jwt({
        token: { email: 'User@Gmail.com' },
        trigger: 'signIn',
      })

      expect(profilesMock.eq).toHaveBeenCalledWith('email', 'user@gmail.com')
    })

    it('sets token.profileCompleted from the query result', async () => {
      const config = await loadConfig()
      profilesMock.single.mockResolvedValue({ data: { profile_completed: true }, error: null })

      const token = await config.callbacks.jwt({
        token: { email: 'user@gmail.com' },
        trigger: 'signIn',
      })

      expect(token.profileCompleted).toBe(true)
    })

    it('leaves token untouched when trigger is not signIn/update', async () => {
      const config = await loadConfig()

      const token = await config.callbacks.jwt({
        token: { email: 'user@gmail.com' },
        trigger: undefined,
      })

      expect(profilesMock.eq).not.toHaveBeenCalled()
      expect(token.profileCompleted).toBeUndefined()
    })
  })
})

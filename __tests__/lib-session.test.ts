/**
 * @jest-environment node
 */
jest.mock('@/auth', () => ({ auth: jest.fn() }))

import { auth } from '@/auth'
import { requireSession } from '@/lib/session'

const mockAuth = auth as jest.Mock

describe('lib/session requireSession', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns the session when authenticated with an email', async () => {
    const authedSession = { user: { email: 'test@test.com', id: 'uid-1' } }
    mockAuth.mockResolvedValue(authedSession)

    const { session, unauthorizedResponse } = await requireSession()

    expect(session).toEqual(authedSession)
    expect(unauthorizedResponse).toBeNull()
  })

  it('returns a 401 Unauthorized response when there is no session', async () => {
    mockAuth.mockResolvedValue(null)

    const { session, unauthorizedResponse } = await requireSession()

    expect(session).toBeNull()
    expect(unauthorizedResponse).not.toBeNull()
    expect(unauthorizedResponse!.status).toBe(401)
    const body = await unauthorizedResponse!.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })

  it('returns a 401 Unauthorized response when the session has no user email', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'uid-1' } })

    const { session, unauthorizedResponse } = await requireSession()

    expect(session).toBeNull()
    expect(unauthorizedResponse).not.toBeNull()
    expect(unauthorizedResponse!.status).toBe(401)
    const body = await unauthorizedResponse!.json()
    expect(body).toEqual({ error: 'Unauthorized' })
  })
})

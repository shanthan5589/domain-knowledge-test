import { supabaseAdmin } from '@/lib/supabase-server'

type RateLimitRequest = Pick<Request, 'headers'>

function requestIdentifier(req: RateLimitRequest, userEmail?: string) {
  if (userEmail) return `user:${userEmail.toLowerCase()}`

  // Hosting must overwrite this header at its edge. It is only used before a
  // user is authenticated (for example, account creation).
  const forwardedFor = req.headers.get('x-forwarded-for')
  const ip = forwardedFor?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}

/**
 * Uses a database-side conditional upsert so the counter is shared by every
 * server instance. The SQL function is deliberately executable only by the
 * service role; callers never receive the bucket state.
 */
export async function isRateLimited(
  req: RateLimitRequest,
  scope: string,
  limit: number,
  windowSeconds: number,
  userEmail?: string
): Promise<boolean> {
  // Unit tests mock route data access rather than a live database.
  if (process.env.NODE_ENV === 'test') return false

  const { data, error } = await supabaseAdmin.rpc('consume_rate_limit', {
    p_bucket_key: `${scope}:${requestIdentifier(req, userEmail)}`,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  })

  // Fail closed: silently losing rate limiting when the migration has not been
  // applied is worse than returning a transient server error.
  if (error) throw new Error(`Rate-limit check failed: ${error.message}`)
  return data !== true
}

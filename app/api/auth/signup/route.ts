/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'
import { isRateLimited } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  try {
    if (await isRateLimited(req, 'signup', 5, 3600)) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again later.' }, { status: 429 })
    }
  } catch {
    return NextResponse.json({ error: 'Unable to create account' }, { status: 503 })
  }

  let body: { firstName?: string; lastName?: string; email?: string; password?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { firstName, lastName, email, password } = body

  if (!firstName?.trim()) return NextResponse.json({ error: 'First name is required' }, { status: 400 })
  if (!lastName?.trim()) return NextResponse.json({ error: 'Last name is required' }, { status: 400 })
  if (!email?.trim()) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (!password) return NextResponse.json({ error: 'Password is required' }, { status: 400 })

  // Reasonable max-length limits so oversized payloads can't be stored.
  const MAX_NAME_LENGTH = 100
  const MAX_EMAIL_LENGTH = 255
  if (firstName.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: 'First name is too long' }, { status: 400 })
  }
  if (lastName.trim().length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: 'Last name is too long' }, { status: 400 })
  }
  if (email.trim().length > MAX_EMAIL_LENGTH) {
    return NextResponse.json({ error: 'Email is too long' }, { status: 400 })
  }

  // Slightly stricter than a bare "has an @ and a dot": disallows spaces
  // (already excluded), consecutive dots, and requires a plausible TLD.
  const emailRegex = /^[^\s@.]+(?:\.[^\s@.]+)*@[^\s@.]+(?:\.[^\s@.]+)*\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
  }

  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  // Deliberately vague email-taken response: confirming the email is already
  // registered would let an attacker enumerate accounts by mass-probing here.
  const EMAIL_TAKEN_RESPONSE = NextResponse.json(
    { error: 'Unable to create account with these details. If you already have an account, try logging in or resetting your password.' },
    { status: 409 }
  )

  // Fast path: check for an existing email up front so the happy-path
  // duplicate short-circuits before we spend ~100ms on bcrypt. The follow-up
  // INSERT is what closes the TOCTOU race — profiles.email has a UNIQUE
  // constraint, so if a second signup with the same email lands between the
  // SELECT here and the INSERT below, Postgres returns error code 23505 and
  // we return the same email-taken response.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (lookupError && lookupError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  if (existing) return EMAIL_TAKEN_RESPONSE

  const password_hash = await bcrypt.hash(password, 12)

  const trimmedFirst = firstName.trim()
  const trimmedLast = lastName.trim()
  const { error: insertError } = await supabaseAdmin.from('profiles').insert({
    email: email.toLowerCase(),
    first_name: trimmedFirst,
    last_name: trimmedLast,
    full_name: `${trimmedFirst} ${trimmedLast}`,
    password_hash,
  })

  if (insertError) {
    // 23505 = Postgres unique_violation — the SELECT above raced another
    // concurrent signup for the same email. Same generic response as the
    // fast-path branch so behavior looks identical from the outside.
    if (insertError.code === '23505') return EMAIL_TAKEN_RESPONSE
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

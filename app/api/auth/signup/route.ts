/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
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

  const { data: existing, error: lookupError } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase())
    .single()

  if (lookupError && lookupError.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  if (existing) {
    // Deliberately vague: confirming the email is already registered would let
    // an attacker enumerate valid accounts by mass-probing this endpoint.
    return NextResponse.json(
      { error: 'Unable to create account with these details. If you already have an account, try logging in or resetting your password.' },
      { status: 409 }
    )
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { error: insertError } = await supabaseAdmin.from('profiles').insert({
    email: email.toLowerCase(),
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    full_name: `${firstName.trim()} ${lastName.trim()}`,
    password_hash,
  })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}

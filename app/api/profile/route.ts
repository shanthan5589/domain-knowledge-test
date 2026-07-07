import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, country, state_region, city, years_of_experience, designation, linkedin_url, profile_completed')
    .eq('email', session.user.email)
    .single()

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    country?: string
    state_region?: string
    city?: string
    years_of_experience?: string
    designation?: string
    linkedin_url?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { country, state_region, city, years_of_experience, designation, linkedin_url } = body

  if (!country?.trim()) {
    return NextResponse.json({ error: 'Country is required' }, { status: 400 })
  }
  if (!state_region?.trim()) {
    return NextResponse.json({ error: 'State/Region is required' }, { status: 400 })
  }
  if (!city?.trim()) {
    return NextResponse.json({ error: 'City is required' }, { status: 400 })
  }
  if (!years_of_experience?.trim()) {
    return NextResponse.json({ error: 'Years of experience is required' }, { status: 400 })
  }
  if (!designation?.trim()) {
    return NextResponse.json({ error: 'Designation is required' }, { status: 400 })
  }

  // Cap text field lengths to keep the database and downstream UI safe from
  // unbounded input.
  const MAX_FIELD_LENGTH = 200
  const fieldsToCheck: Array<[string, string]> = [
    ['Country', country],
    ['State/Region', state_region],
    ['City', city],
    ['Designation', designation],
  ]
  for (const [label, value] of fieldsToCheck) {
    if (value.trim().length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: `${label} must be ${MAX_FIELD_LENGTH} characters or fewer` }, { status: 400 })
    }
  }

  const VALID_EXPERIENCE = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']
  if (!VALID_EXPERIENCE.includes(years_of_experience)) {
    return NextResponse.json({ error: 'Invalid years of experience value' }, { status: 400 })
  }

  // LinkedIn URL is optional, but when provided it must be a valid, safe
  // https:// URL — reject javascript:/data: URIs or malformed input that
  // could later be rendered as an href elsewhere in the app.
  const trimmedLinkedinUrl = linkedin_url?.trim() || ''
  if (trimmedLinkedinUrl) {
    if (trimmedLinkedinUrl.length > MAX_FIELD_LENGTH) {
      return NextResponse.json({ error: 'LinkedIn URL must be 200 characters or fewer' }, { status: 400 })
    }
    try {
      const parsed = new URL(trimmedLinkedinUrl)
      if (parsed.protocol !== 'https:') {
        return NextResponse.json({ error: 'LinkedIn URL must be a valid https:// URL' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'LinkedIn URL must be a valid https:// URL' }, { status: 400 })
    }
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .upsert({
      email: session.user.email,
      country: country.trim(),
      state_region: state_region.trim(),
      city: city.trim(),
      years_of_experience,
      designation: designation.trim(),
      linkedin_url: trimmedLinkedinUrl || null,
      profile_completed: true,
    }, {
      onConflict: 'email',
    })

  if (error) {
    // Log code/details so misconfigurations (e.g. a missing constraint on the
    // deployed DB) are diagnosable from server logs, without changing the
    // generic error returned to the client.
    console.error('[PATCH /api/profile] Supabase error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    })
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

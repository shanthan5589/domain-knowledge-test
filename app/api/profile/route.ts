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

  const VALID_EXPERIENCE = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']
  if (!VALID_EXPERIENCE.includes(years_of_experience)) {
    return NextResponse.json({ error: 'Invalid years of experience value' }, { status: 400 })
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
      linkedin_url: linkedin_url?.trim() || null,
      profile_completed: true,
    }, {
      onConflict: 'email',
    })

  if (error) {
    console.error('[PATCH /api/profile] Supabase error:', error.message)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

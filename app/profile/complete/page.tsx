'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Country, State, City } from 'country-state-city'
import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'

// Name + Email are always pre-filled from auth (2 of 5 trackable fields)
const BASE_PROGRESS = 40

const inputClass =
  'w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)] disabled:opacity-50 disabled:cursor-not-allowed'
const labelClass = 'block text-sm font-medium text-[var(--ink)] mb-1'

export default function CompleteProfilePage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [country, setCountry] = useState('')
  const [stateRegion, setStateRegion] = useState('')
  const [city, setCity] = useState('')
  const [experience, setExperience] = useState('')
  const [designation, setDesignation] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const locationFilled = country.length > 0 && stateRegion.length > 0 && city.length > 0
  const experienceFilled = experience.length > 0
  const designationFilled = designation.trim().length > 0
  const linkedinFilled = linkedin.trim().length > 0

  // Progress: name + email = 40%, each required field adds 20%
  const requiredFilled = [locationFilled, experienceFilled, designationFilled].filter(Boolean).length
  const progress = BASE_PROGRESS + requiredFilled * 20
  const allRequiredFilled = requiredFilled === 3

  const checklist = [
    { label: 'Name', done: true },
    { label: 'Email', done: true },
    { label: 'Location', done: locationFilled },
    { label: 'Experience', done: experienceFilled },
    { label: 'Designation', done: designationFilled },
    { label: 'LinkedIn', done: linkedinFilled, optional: true },
  ]

  const states = State.getStatesOfCountry(country)
  const cities = City.getCitiesOfState(country, stateRegion)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allRequiredFilled) return
    setLoading(true)
    setError('')

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        country: Country.getCountryByCode(country)?.name ?? country,
        state_region: State.getStateByCodeAndCountry(stateRegion, country)?.name ?? stateRegion,
        city,
        years_of_experience: experience,
        designation,
        linkedin_url: linkedin,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Something went wrong')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[var(--paper)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--ink)]">Complete your profile</h1>
          <p className="text-[var(--ink-soft)] text-sm mt-1">
            {session?.user?.email}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Checklist + progress */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--line)] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-[var(--ink)]">Profile</span>
                <span
                  data-testid="progress-percent"
                  className="font-mono text-sm font-bold text-[var(--action)]"
                >
                  {progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-[var(--paper)] rounded-full mb-4 overflow-hidden">
                <div
                  data-testid="progress-bar"
                  className="h-1.5 bg-[var(--signal)] rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Checklist */}
              <ul className="space-y-2">
                {checklist.map(({ label, done, optional }) => (
                  <li key={label} className="flex items-center gap-2 text-sm">
                    <span
                      data-testid={`check-${label.toLowerCase()}`}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        done
                          ? 'bg-green-100 text-green-600'
                          : optional
                          ? 'bg-[var(--paper)] text-[var(--ink-soft)]'
                          : 'bg-red-50 text-red-400'
                      }`}
                    >
                      {done ? '✓' : optional ? '○' : '✗'}
                    </span>
                    <span className={done ? 'text-[var(--ink)]' : 'text-[var(--ink-soft)]'}>
                      {label}
                      {optional && (
                        <span className="text-[var(--ink-soft)] text-xs ml-1">(opt)</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form */}
          <div className="flex-1">
            <form
              onSubmit={handleSubmit}
              className="bg-[var(--surface)] rounded-lg border border-[var(--line)] p-6 space-y-5"
            >
              {/* Country */}
              <div>
                <label className={labelClass}>Country</label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setStateRegion(''); setCity('') }}
                  aria-label="Country"
                  className={inputClass}
                >
                  <option value="">Select country</option>
                  {Country.getAllCountries().map((c) => (
                    <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* State / Region */}
              <div>
                <label className={labelClass}>State / Region</label>
                <select
                  value={stateRegion}
                  onChange={(e) => { setStateRegion(e.target.value); setCity('') }}
                  disabled={!country}
                  aria-label="State or Region"
                  className={inputClass}
                >
                  <option value="">Select state / region</option>
                  {states.map((s) => (
                    <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div>
                <label className={labelClass}>City</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!stateRegion}
                  aria-label="City"
                  className={inputClass}
                >
                  <option value="">Select city</option>
                  {cities.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Years of experience */}
              <div>
                <label className="block text-sm font-medium text-[var(--ink)] mb-2">
                  Years of Experience
                </label>
                <div className="space-y-2">
                  {EXPERIENCE_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="experience"
                        value={opt}
                        checked={experience === opt}
                        onChange={() => setExperience(opt)}
                        className="accent-[var(--action)] w-4 h-4"
                      />
                      <span className="text-sm text-[var(--ink)] group-hover:text-[var(--action)] transition-colors">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Designation */}
              <div>
                <label className={labelClass}>Designation</label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  aria-label="Designation"
                  className={inputClass}
                >
                  <option value="">Select designation</option>
                  {DESIGNATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              {/* LinkedIn */}
              <div>
                <label className={labelClass}>
                  LinkedIn Profile{' '}
                  <span className="text-[var(--ink-soft)] font-normal">(Optional)</span>
                </label>
                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  placeholder="https://linkedin.com/in/yourname"
                  className={inputClass}
                />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit"
                disabled={!allRequiredFilled || loading}
                className="w-full bg-[var(--action)] text-white rounded-md px-4 py-3 font-medium hover:bg-[var(--action-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? 'Saving...' : 'Continue →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

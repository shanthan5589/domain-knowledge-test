'use client'

import { useState } from 'react'
import { Country, State, City } from 'country-state-city'
import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'

interface Props {
  initialValues: {
    full_name: string
    email: string
    country: string
    state_region: string
    city: string
    years_of_experience: string
    designation: string
    linkedin_url: string
  }
}

// Convert stored full names back to ISO codes for dropdown pre-selection
function nameToCountryCode(name: string): string {
  if (!name) return ''
  return Country.getAllCountries().find((c) => c.name === name)?.isoCode ?? ''
}

function nameToStateCode(stateName: string, countryCode: string): string {
  if (!stateName || !countryCode) return ''
  return State.getStatesOfCountry(countryCode).find((s) => s.name === stateName)?.isoCode ?? ''
}

const inputClass =
  'w-full border border-[var(--line)] rounded-md px-3 py-2 text-sm text-[var(--ink)] bg-[var(--surface)] focus:outline-none focus:ring-1 focus:ring-[var(--action)] focus:border-[var(--action)] disabled:opacity-50 disabled:cursor-not-allowed'
const labelClass = 'block text-sm font-medium text-[var(--ink)] mb-1'

export default function ProfileEditForm({ initialValues }: Props) {
  const initialCountryCode = nameToCountryCode(initialValues.country)
  const initialStateCode = nameToStateCode(initialValues.state_region, initialCountryCode)

  const [country, setCountry] = useState(initialCountryCode)
  const [stateRegion, setStateRegion] = useState(initialStateCode)
  const [city, setCity] = useState(initialValues.city)
  const [experience, setExperience] = useState(initialValues.years_of_experience)
  const [designation, setDesignation] = useState(initialValues.designation)
  const [linkedin, setLinkedin] = useState(initialValues.linkedin_url)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const states = State.getStatesOfCountry(country)
  const cities = City.getCitiesOfState(country, stateRegion)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

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

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Something went wrong')
      return
    }

    setSaved(true)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[var(--surface)] rounded-lg border border-[var(--line)] p-6 space-y-5">
      {/* Read-only fields */}
      <div>
        <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Name</label>
        <p className="text-sm text-[var(--ink)] py-2 px-3 bg-[var(--paper)] rounded-md border border-[var(--line)]">
          {initialValues.full_name || '—'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--ink-soft)] mb-1">Email</label>
        <p className="text-sm text-[var(--ink)] py-2 px-3 bg-[var(--paper)] rounded-md border border-[var(--line)]">
          {initialValues.email}
        </p>
      </div>

      {/* Country */}
      <div>
        <label className={labelClass}>Country</label>
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); setStateRegion(''); setCity('') }}
          required
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
          required
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
          required
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
            <label key={opt} className="flex items-center gap-3 cursor-pointer group">
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
          required
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
      {saved && (
        <p className="text-green-600 text-sm font-medium">Profile saved successfully!</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--action)] text-white rounded-md px-4 py-3 font-medium hover:bg-[var(--action-hover)] transition-colors disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

'use client'

import { useState } from 'react'
import { Country, State, City } from 'country-state-city'

const EXPERIENCE_OPTIONS = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']

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
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
      {/* Read-only fields */}
      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Name</label>
        <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
          {initialValues.full_name || '—'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
        <p className="text-sm text-gray-900 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200">
          {initialValues.email}
        </p>
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); setStateRegion(''); setCity('') }}
          required
          aria-label="Country"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select country</option>
          {Country.getAllCountries().map((c) => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* State / Region */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
        <select
          value={stateRegion}
          onChange={(e) => { setStateRegion(e.target.value); setCity('') }}
          disabled={!country}
          required
          aria-label="State or Region"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select state / region</option>
          {states.map((s) => (
            <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* City */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={!stateRegion}
          required
          aria-label="City"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Years of experience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="accent-blue-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700 group-hover:text-blue-600 transition-colors">
                {opt}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Designation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Designation</label>
        <input
          type="text"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="e.g. Software Engineer"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* LinkedIn */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          LinkedIn Profile{' '}
          <span className="text-gray-400 font-normal">(Optional)</span>
        </label>
        <input
          type="url"
          value={linkedin}
          onChange={(e) => setLinkedin(e.target.value)}
          placeholder="https://linkedin.com/in/yourname"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {saved && (
        <p className="text-green-600 text-sm font-medium">Profile saved successfully!</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition disabled:opacity-50"
      >
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  )
}

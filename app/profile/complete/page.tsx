'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Country, State, City } from 'country-state-city'
import { DESIGNATION_OPTIONS, EXPERIENCE_OPTIONS } from '@/lib/profile-options'

// Name + Email are always pre-filled from auth (2 of 5 trackable fields)
const BASE_PROGRESS = 40

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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Complete your profile</h1>
          <p className="text-gray-500 text-sm mt-1">
            {session?.user?.email}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Checklist + progress */}
          <div className="lg:w-56 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Profile</span>
                <span
                  data-testid="progress-percent"
                  className="text-sm font-bold text-blue-600"
                >
                  {progress}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full mb-4 overflow-hidden">
                <div
                  data-testid="progress-bar"
                  className="h-2 bg-blue-500 rounded-full transition-all duration-300"
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
                          ? 'bg-gray-100 text-gray-400'
                          : 'bg-red-50 text-red-400'
                      }`}
                    >
                      {done ? '✓' : optional ? '○' : '✗'}
                    </span>
                    <span className={done ? 'text-gray-700' : 'text-gray-400'}>
                      {label}
                      {optional && (
                        <span className="text-gray-300 text-xs ml-1">(opt)</span>
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
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5"
            >
              {/* Country */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <select
                  value={country}
                  onChange={(e) => { setCountry(e.target.value); setStateRegion(''); setCity('') }}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State / Region
                </label>
                <select
                  value={stateRegion}
                  onChange={(e) => { setStateRegion(e.target.value); setCity('') }}
                  disabled={!country}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={!stateRegion}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Designation
                </label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  aria-label="Designation"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select designation</option>
                  {DESIGNATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
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

              <button
                type="submit"
                disabled={!allRequiredFilled || loading}
                className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 font-medium hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

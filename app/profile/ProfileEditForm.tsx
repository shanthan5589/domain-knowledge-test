'use client'

import { useState } from 'react'

const EXPERIENCE_OPTIONS = ['Fresher', '1-3 years', '3-5 years', '5-10 years', '10+ years']

interface Props {
  initialValues: {
    full_name: string
    email: string
    location: string
    years_of_experience: string
    designation: string
    linkedin_url: string
  }
}

export default function ProfileEditForm({ initialValues }: Props) {
  const [location, setLocation] = useState(initialValues.location)
  const [experience, setExperience] = useState(initialValues.years_of_experience)
  const [designation, setDesignation] = useState(initialValues.designation)
  const [linkedin, setLinkedin] = useState(initialValues.linkedin_url)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location,
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

      {/* Editable fields */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
        <input
          type="text"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Hyderabad, India"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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

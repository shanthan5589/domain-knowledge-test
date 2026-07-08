// Client-safe helper for building the crowd-filter query params shared by the
// stats page and its child components (Leaderboard, DomainOverview). Keeping
// this in one place means the 5 filter fields can't drift out of sync across
// call sites. No server-only imports here — this is used from 'use client'
// components.
export interface CrowdFilters {
  designation: string
  experience: string
  country: string
  state_region: string
  city: string
}

export function crowdFilterParams(filters: CrowdFilters): Record<string, string> {
  const { designation, experience, country, state_region, city } = filters
  return { designation, experience, country, state_region, city }
}

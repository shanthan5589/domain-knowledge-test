import type { Domain } from '@/lib/types'

// Canonical list of valid domain codes — the single source of truth used for
// server-side validation (API routes) and client-side iteration (dropdowns,
// results grids, etc). Keep in sync with the Domain union in lib/types.ts.
export const ALL_DOMAINS: Domain[] = ['ai', 'cloud', 'cybersecurity', 'devops', 'data_science']

// Full-length display names. Used wherever the domain name is the primary
// piece of copy on the page (test flow, stats page).
export const DOMAIN_LABELS: Record<Domain, string> = {
  ai: 'Artificial Intelligence & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science, Analytics & Big Data',
}

// Shorter display names used in more compact UI (dashboard cards, domain
// overview tiles) where the full-length labels would crowd the layout.
export const DOMAIN_LABELS_SHORT: Record<Domain, string> = {
  ai: 'AI & Generative AI',
  cloud: 'Cloud Computing',
  cybersecurity: 'Cybersecurity',
  devops: 'DevOps & CI/CD',
  data_science: 'Data Science & Analytics',
}

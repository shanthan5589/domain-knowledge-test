// Central analytics wrapper for the Edu quiz funnel.
//
// Every funnel event in the app goes through trackEvent() here instead of
// importing Vercel's track() directly, for two reasons:
//   1. One source of truth — the FunnelEvent type below lists every event name
//      and the props each one carries, so call sites stay consistent.
//   2. One place to change the destination — today events go to Vercel Web
//      Analytics; if we later also want to store them in Supabase we edit only
//      this file, never the call sites.
import { track } from '@vercel/analytics'

// The nine funnel events and the props each one carries. Vercel only accepts
// flat props whose values are string | number | boolean | null, so every
// payload below stays flat.
export type FunnelEvent =
  | { name: 'landing_viewed' }
  | { name: 'signup_started'; props: { method: 'google' | 'credentials'; location: string } }
  | { name: 'signup_completed' }
  | { name: 'domain_selected'; props: { domain: string } }
  | { name: 'quiz_started'; props: { domain: string } }
  | { name: 'quiz_completed'; props: { domain: string; score: number } }
  | { name: 'result_viewed'; props: { domain: string; score: number } }
  | { name: 'stats_viewed'; props: { domain: string } }
  | { name: 'cta_clicked'; props: { location: string; brand: string } }

// Allowed value types for a Vercel custom-event property.
type PropValue = string | number | boolean | null

// Fire a funnel event. `name` is constrained to the events above; `props` is
// optional so no-prop events (landing_viewed, signup_completed) can be called
// as trackEvent('landing_viewed').
export function trackEvent(
  name: FunnelEvent['name'],
  props?: Record<string, PropValue>
): void {
  // track() is a browser-only API. On the server (SSR, or an accidental import
  // from a server component) do nothing rather than throw.
  if (typeof window === 'undefined') return
  track(name, props)
}

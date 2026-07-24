import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import HomeSignupForm from '@/components/HomeSignupForm'
import PageViewTracker from '@/components/analytics/PageViewTracker'
import Logo from '@/components/Logo'
import Reveal from '@/components/home/Reveal'
import ScrollCta from '@/components/home/ScrollCta'
import HowItWorksPreview from '@/components/home/HowItWorksPreview'
import StatsShowcase from '@/components/home/StatsShowcase'
import { ALL_DOMAINS, DOMAIN_LABELS } from '@/lib/domains'
import type { Domain } from '@/lib/types'

const DOMAIN_BLURBS: Record<Domain, string> = {
  ai: 'Prompting, model APIs, and real GenAI workflows.',
  cloud: 'AWS, Azure, and GCP services and architecture.',
  cybersecurity: 'Threats, tooling, and defensive best practices.',
  devops: 'Pipelines, containers, Kubernetes, automation.',
  data_science: 'ML, data pipelines, SQL, and visualization.',
}

export default async function Home() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)]">
      <PageViewTracker event="landing_viewed" />
      {/* Nav — scrolls away as the hero card takes over, unchanged from before */}
      <header className="px-4 sm:px-8 py-4 bg-[var(--surface)] border-b border-[var(--line)] flex items-center justify-between">
        <Logo />
        {/* Shorter label on phones so it never wraps against the logo;
            full text restored from sm: up, unchanged from before. */}
        <Link
          href="/login"
          className="text-sm font-medium text-[var(--action)] hover:text-[var(--action-hover)] transition-colors whitespace-nowrap"
        >
          <span className="sm:hidden">Sign in →</span>
          <span className="hidden sm:inline">Sign in to your account →</span>
        </Link>
      </header>

      {/* From lg: up, each section below is pinned full-screen and stacks
          under the next one as you scroll — a rising z-index makes every new
          card slide up and cover the last, like a deck being dealt. Below
          lg: the page just scrolls normally, since short mobile viewports
          can't reliably fit a full "page" of content without clipping it
          while it's pinned. */}

      {/* Hero */}
      <section className="relative lg:sticky lg:top-0 z-0 lg:min-h-screen flex flex-col justify-center bg-[var(--paper)] px-8 py-12 lg:px-16 xl:px-24">
        <div className="flex flex-col lg:flex-row lg:items-center gap-16 max-w-7xl mx-auto w-full">

          {/* Left — headline + description */}
          <div className="flex-1 flex flex-col">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[var(--ink-soft)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" />
              5 domains · Free assessment
            </div>

            <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6 text-[var(--ink)]">
              How well do you actually use AI?
            </h1>
            <p className="text-lg text-[var(--ink-soft)] leading-relaxed max-w-xl">
              Most professionals have access to the same tools. The best ones use them to drive real results. Take the 10-question, 5-minute assessment to get an honest read on your AI skills.
            </p>

            {/* Quick facts — reads like the rest of the app's readouts */}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-wide text-[var(--ink-soft)]">
              <span><span className="text-[var(--ink)] font-bold">10</span> Questions</span>
              <span className="w-1 h-1 rounded-full bg-[var(--line)]" aria-hidden="true" />
              <span><span className="text-[var(--ink)] font-bold">5:00</span> Timer</span>
              <span className="w-1 h-1 rounded-full bg-[var(--line)]" aria-hidden="true" />
              <span><span className="text-[var(--ink)] font-bold">Instant</span> Results</span>
            </div>

            <ScrollCta
              targetId="preview"
              className="mt-10 inline-flex w-fit items-center gap-1.5 text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors"
            >
              See what the assessment looks like
              <span aria-hidden="true">↓</span>
            </ScrollCta>
          </div>

          {/* Right — signup card */}
          <div id="signup" className="w-full lg:w-auto lg:flex-shrink-0">
            <HomeSignupForm />
          </div>

        </div>

        {/* Scroll cue — sits at the bottom of this card and gets physically
            covered by the next one sliding up, reinforcing the stack. */}
        <ScrollCta
          targetId="preview"
          className="group absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center justify-center"
          aria-label="Scroll to see the assessment in action"
        >
          <span className="absolute -inset-5 rounded-full bg-[radial-gradient(closest-side,var(--signal-soft),transparent)] blur-xl opacity-90 motion-safe:animate-ambient pointer-events-none" />
          <span className="relative flex items-center justify-center w-11 h-11 rounded-full border border-[var(--line)] bg-[var(--surface)] shadow-md text-[var(--ink-soft)] transition-colors duration-300 group-hover:text-[var(--action)] group-hover:border-[var(--action)] motion-safe:animate-bounce-slow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </ScrollCta>
      </section>

      {/* How it works + live product preview — signature element, synced together */}
      <section
        id="preview"
        className="relative lg:sticky lg:top-0 z-10 lg:min-h-screen flex flex-col justify-center bg-[var(--surface)] px-6 sm:px-8 lg:px-16 xl:px-24 py-12 lg:py-10 overflow-hidden"
      >
        <div className="max-w-6xl mx-auto w-full">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)] mb-3">
              How it works
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-tight mb-4">
              Three steps. Five minutes.
            </h2>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              A live look at the real product — pick a domain, answer questions against the clock, and
              see your personalized results with peer comparison the second you finish.
            </p>
          </Reveal>

          <Reveal delayMs={150} className="mt-8 lg:mt-8">
            <HowItWorksPreview />
          </Reveal>
        </div>
      </section>

      {/* Statistics — a more detailed, static counterpart to the compact
          stats panel shown inside the preview above */}
      <section className="relative lg:sticky lg:top-0 z-20 lg:min-h-screen flex flex-col justify-center bg-[var(--paper)] px-6 sm:px-8 lg:px-16 xl:px-24 py-12 lg:py-10">
        <div className="max-w-6xl mx-auto w-full">
          <Reveal className="max-w-2xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)] mb-3">
              Community insights
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-tight mb-4">
              Know exactly where you stand.
            </h2>
            <p className="text-[var(--ink-soft)] leading-relaxed">
              Every attempt updates your personal analytics — score trends, domain breakdowns, and how
              you rank against peers in your city, state, and country.
            </p>
          </Reveal>

          <Reveal delayMs={150} className="mt-8">
            <StatsShowcase />
          </Reveal>
        </div>
      </section>

      {/* Domains */}
      <section className="relative lg:sticky lg:top-0 z-30 lg:min-h-screen flex flex-col justify-center bg-[var(--paper)] px-6 sm:px-8 lg:px-16 xl:px-24 py-16 lg:py-10">
        <div className="max-w-6xl mx-auto w-full">
          <Reveal>
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-[var(--signal)] mb-3">
              Choose your domain
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--ink)] tracking-tight max-w-2xl">
              Five domains. Pick where you want an honest read.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
            {ALL_DOMAINS.map((domain, i) => (
              <Reveal key={domain} delayMs={i * 60}>
                <ScrollCta
                  targetId="signup"
                  className="block bg-[var(--surface)] rounded-lg border border-[var(--line)] p-6 text-left transition-all hover:border-[var(--action)] hover:shadow-md group"
                >
                  <span className="font-mono text-xs text-[var(--signal)] mb-2 block">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-semibold text-[var(--ink)] mb-1">{DOMAIN_LABELS[domain]}</h3>
                  <p className="text-sm text-[var(--ink-soft)]">{DOMAIN_BLURBS[domain]}</p>
                </ScrollCta>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative lg:sticky lg:top-0 z-40 lg:min-h-screen flex flex-col items-center justify-center bg-[var(--action)] px-6 sm:px-8 py-16 text-center">
        <Reveal className="max-w-2xl mx-auto flex flex-col items-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Ready to see your score?
          </h2>
          <p className="text-white/70 mb-8">Free. Takes 5 minutes. No credit card.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[var(--action)] rounded-md px-6 py-3 font-semibold hover:bg-white/90 transition-colors"
          >
            Create your benchmark profile
            <span aria-hidden="true">→</span>
          </Link>
        </Reveal>
      </section>

      {/* Footer — plain flow, appears once the last card has been scrolled past */}
      <footer className="relative z-50 py-5 border-t border-[var(--line)] bg-[var(--paper)] text-center">
        <p className="text-sm text-[var(--ink-soft)]">© 2026 Castor AI. All rights reserved.</p>
      </footer>
    </div>
  )
}

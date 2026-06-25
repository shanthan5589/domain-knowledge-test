import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const DOMAINS = [
  {
    name: 'AI & Generative AI',
    description: 'LLMs, prompting, agents, and the tools reshaping how work gets done.',
  },
  {
    name: 'Cloud Computing',
    description: 'AWS, Azure, and GCP — architecture, services, and real deployment decisions.',
  },
  {
    name: 'Cybersecurity',
    description: 'Threats, defenses, and the security mindset every professional needs.',
  },
  {
    name: 'DevOps & CI/CD',
    description: 'Pipelines, containers, automation, and shipping software reliably.',
  },
  {
    name: 'Data Science & Analytics',
    description: 'Data thinking, tooling, and the decisions that turn numbers into insight.',
  },
]

const PILLARS = [
  {
    title: 'Practical knowledge',
    body: 'Questions built around real workflows and decisions — not syntax, not theory.',
  },
  {
    title: 'Timed & honest',
    body: '5 minutes. 10 questions. You either know it or you don\'t.',
  },
  {
    title: 'Five domains',
    body: 'AI, Cloud, DevOps, Cybersecurity, Data Science — pick what matters to you.',
  },
]

export default async function Home() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          Domain Knowledge Test
        </span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
          >
            Create account
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-5">
          A real-world readiness check
        </p>
        <h1 className="text-5xl sm:text-6xl font-black text-gray-900 leading-tight tracking-tight max-w-2xl">
          Not a coding test.
        </h1>
        <p className="mt-4 text-xl sm:text-2xl text-gray-400 font-light max-w-xl">
          Test your knowledge across AI, Cloud, DevOps,
          Cybersecurity, and Data Science.
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link
            href="/signup"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-gray-500 hover:text-gray-900 transition"
          >
            Sign in →
          </Link>
        </div>
      </section>

      {/* Pillars */}
      <section className="bg-gray-50 border-t border-gray-100 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div key={p.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{p.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Domains */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-8 text-center">
            Domains
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOMAINS.map((d) => (
              <div
                key={d.name}
                className="rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition"
              >
                <p className="text-sm font-semibold text-gray-900 mb-1">{d.name}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{d.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-gray-100 px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Find out where you actually stand.
        </h2>
        <p className="text-sm text-gray-400 mb-8">No account required to browse. Sign up free.</p>
        <Link
          href="/signup"
          className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Create account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 px-6 py-6 text-center">
        <p className="text-xs text-gray-300">
          © {new Date().getFullYear()} Domain Knowledge Test
        </p>
      </footer>
    </div>
  )
}

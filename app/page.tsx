import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import HomeSignupForm from '@/components/HomeSignupForm'

const PILLARS = [
  {
    title: 'Tool awareness',
    body: 'Do you know which AI tool handles which job, and when to use it over another?',
  },
  {
    title: 'Practical judgment',
    body: 'Given a real task, can you figure out the fastest, most effective way to use AI to complete it?',
  },
  {
    title: 'No fluff',
    body: 'No definitions, no trivia. Just situations you\'d actually face at work.',
  },
]

export default async function Home() {
  const session = await auth()
  if (session) redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <header className="px-6 py-4 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900 tracking-tight">
          Domain Knowledge Test
        </span>
      </header>

      {/* Split layout */}
      <div className="flex-1 flex flex-col lg:flex-row">

        {/* Left — marketing */}
        <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24 max-w-2xl">

          {/* Headline block */}
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug tracking-tight">
            AI won&apos;t replace you.
          </h1>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 leading-snug tracking-tight mb-2">
            Someone who knows how to use it will.
          </h1>
          <p className="text-base font-semibold text-gray-600 mb-6">
            Find out if that someone is you.
          </p>

          {/* Body */}
          <p className="text-sm text-gray-500 max-w-sm mb-6 leading-relaxed">
            This isn&apos;t a quiz on AI theory. It tests whether you can actually use AI tools to get real work done — the way employers and clients expect you to in 2025. Ten questions. Five minutes. A score that&apos;s honest.
          </p>

          {/* Bullets */}
          <div className="space-y-3 mb-8">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex gap-3 items-start">
                <div className="mt-2 w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                <p className="text-sm text-gray-600">
                  <span className="font-semibold text-gray-800">{p.title}</span>
                  {' — '}{p.body}
                </p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div>
            <a
              href="/signup"
              className="inline-block bg-blue-600 text-white font-semibold px-7 py-3 rounded-lg hover:bg-blue-700 transition text-sm mb-2"
            >
              Take the Test — It&apos;s Free
            </a>
            <p className="text-xs text-gray-400">
              5 minutes. Instant results. No prep needed — that&apos;s the point.
            </p>
          </div>

        </div>

        {/* Right — signup form */}
        <div className="lg:w-[640px] flex items-center justify-start pl-6 pr-16 py-12 lg:py-0">
          <HomeSignupForm />
        </div>

      </div>
    </div>
  )
}

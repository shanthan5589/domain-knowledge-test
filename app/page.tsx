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
        <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-20">

          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-2">
            AI won&apos;t replace you.
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-gray-500 leading-tight mb-5">
            Someone who knows how to use it will.
          </p>

          <p className="text-lg font-semibold text-blue-600 mb-8">
            Find out if that someone is you.
          </p>

          <p className="text-sm text-gray-500 leading-relaxed max-w-md mb-8">
            This isn&apos;t a quiz on AI theory. It tests whether you can actually use AI tools
            to get real work done — the way employers and clients expect you to in 2025.
            Ten questions. Five minutes. A score that&apos;s honest.
          </p>

          <div className="space-y-4 max-w-md">
            {PILLARS.map((p, i) => (
              <div key={p.title} className="flex gap-4 items-start">
                <span className="text-xs font-black text-blue-400 mt-0.5 w-5 flex-shrink-0">
                  0{i + 1}
                </span>
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{p.title}</span>
                  {' — '}{p.body}
                </p>
              </div>
            ))}
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

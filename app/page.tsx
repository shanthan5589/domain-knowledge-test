import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import HomeSignupForm from '@/components/HomeSignupForm'

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
        <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-24">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-4">
            A real-world readiness check
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
            Not a coding test.
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-md mb-12">
            Test your knowledge across AI, Cloud, DevOps,
            Cybersecurity, and Data Science.
          </p>

          <div className="space-y-4 max-w-sm">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex gap-4">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{p.title}</p>
                  <p className="text-sm text-gray-400 mt-0.5">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — signup form */}
        <div className="lg:w-[600px] flex items-center justify-start pl-8 pr-12 py-12 lg:py-0">
          <HomeSignupForm />
        </div>

      </div>
    </div>
  )
}

import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import HomeSignupForm from '@/components/HomeSignupForm'

const PILLARS = [
  {
    title: 'Real-world scenarios',
    body: 'Drawn from actual tools and decisions — not definitions, not syntax.',
  },
  {
    title: 'Timed. No pausing.',
    body: '5 minutes. 10 questions. You know it or you look it up.',
  },
  {
    title: 'Five core domains',
    body: 'AI & GenAI, Cloud, DevOps, Cybersecurity, Data Science — you pick.',
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
            Know where you actually stand.
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight mb-4">
            How deep does your knowledge go?
          </h1>
          <p className="text-lg text-gray-400 font-light max-w-md mb-12">
            A sharp, timed benchmark across the domains that define modern tech.
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
        <div className="lg:w-[640px] flex items-center justify-start pl-6 pr-16 py-12 lg:py-0">
          <HomeSignupForm />
        </div>

      </div>
    </div>
  )
}

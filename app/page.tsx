import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import HomeSignupForm from '@/components/HomeSignupForm'

const PILLARS = [
  {
    title: 'Tool awareness',
    body: 'The AI landscape is crowded. Knowing the tools exist is not enough. These questions check whether you know which one to reach for, for which job, and why.',
  },
  {
    title: 'Practical scenarios',
    body: 'Every question is built around a real task someone in tech actually faces. You pick the best answer. There is no partial credit for almost knowing.',
  },
  {
    title: 'Honest results',
    body: 'No inflation. You get a score that reflects what you actually know, with a clear breakdown so you can see where your gaps are.',
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
        <div className="flex-1 flex flex-col justify-center px-8 py-16 lg:px-16 xl:px-20 lg:pr-12">

          <h1 className="text-5xl sm:text-6xl font-black leading-none tracking-tight mb-6">
            <span className="text-gray-900">How well do</span><br />
            <span className="text-gray-900">you actually</span><br />
            <span className="text-gray-900">use AI?</span>
          </h1>

          <p className="text-base font-semibold text-gray-700 leading-relaxed mb-3">
            Most professionals have access to the same AI tools. What separates them is knowing
            how to use those tools to get real work done. This quiz shows you where you actually stand.
          </p>

          <p className="text-sm text-gray-400 leading-relaxed mb-10">
            The Domain Knowledge Test is a 10-question multiple choice quiz built around real work
            situations. Not theory, not definitions. Just practical scenarios where you have to pick
            the right tool, the right approach, or the right call. It takes five minutes and gives
            you an honest score at the end.
          </p>

          <div className="space-y-5">
            {PILLARS.map((p) => (
              <div key={p.title} className="flex gap-4 items-start">
                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-gray-900 mb-1">{p.title}</p>
                  <p className="text-xs text-gray-400 leading-relaxed">{p.body}</p>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Right — signup form */}
        <div className="lg:w-[520px] flex items-start justify-start px-8 pt-20 pb-12">
          <HomeSignupForm />
        </div>

      </div>
    </div>
  )
}

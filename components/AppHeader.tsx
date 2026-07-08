// Shared console chrome for every authenticated page — a slim, hairline-bordered
// bar with the wordmark on the left and a slot (usually UserMenu) on the right.
// Consistent across dashboard, profile, stats, and the quiz flow.

import type { ReactNode } from 'react'

interface AppHeaderProps {
  right?: ReactNode
  sticky?: boolean
}

export default function AppHeader({ right, sticky }: AppHeaderProps) {
  return (
    <div
      className={`${sticky ? 'sticky top-0 z-20' : ''} flex items-center justify-between px-4 sm:px-6 h-14 bg-[var(--surface)] border-b border-[var(--line)]`}
    >
      <span className="flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--signal)]" aria-hidden="true" />
        <span className="text-sm font-semibold tracking-wide text-[var(--ink)] uppercase">
          Domain Knowledge Test
        </span>
      </span>
      {right}
    </div>
  )
}

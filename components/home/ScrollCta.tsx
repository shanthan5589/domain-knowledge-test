'use client'

import type { ReactNode } from 'react'

interface ScrollCtaProps {
  targetId: string
  className?: string
  children: ReactNode
}

// A link that smooth-scrolls to an in-page section instead of the browser's
// instant anchor jump — used to point every CTA on the page at the signup card.
export default function ScrollCta({ targetId, className, children }: ScrollCtaProps) {
  return (
    <a
      href={`#${targetId}`}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }}
    >
      {children}
    </a>
  )
}

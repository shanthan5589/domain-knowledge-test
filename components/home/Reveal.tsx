'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface RevealProps {
  children: ReactNode
  className?: string
  delayMs?: number
  threshold?: number
}

// Fades and lifts content into place once it's scrolled into view. Skips
// straight to visible for visitors who've asked for reduced motion.
export default function Reveal({ children, className = '', delayMs = 0, threshold = 0.15 }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => {
    if (typeof window === 'undefined') return false
    // No IntersectionObserver support (or in a test environment) — skip
    // straight to visible instead of never animating in.
    if (typeof window.IntersectionObserver === 'undefined') return true
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (visible) return

    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, threshold])

  return (
    <div
      ref={ref}
      className={`transition-all ease-out duration-700 ${
        visible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-[0.97]'
      } ${className}`}
      style={{ transitionDelay: visible ? `${delayMs}ms` : '0ms' }}
    >
      {children}
    </div>
  )
}

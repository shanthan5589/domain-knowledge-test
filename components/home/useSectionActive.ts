'use client'

import { useEffect, useRef, useState } from 'react'

// Tracks whether the enclosing <section> is the one currently on screen —
// not via IntersectionObserver, and not via `offsetTop` either (that one's
// a trap: for a `position: sticky` element, `offsetTop` doesn't report a
// stable document position once the element is actually stuck — browsers
// recompute it to track the current scroll offset, so any "is scrollY
// within this section's range" math built on it silently breaks the moment
// the section starts sticking).
//
// Instead this reads live `getBoundingClientRect()` on every scroll frame:
//   - On desktop, where the homepage's cards are `position: sticky` and
//     pin at `top: 0`, a section is "active" when its own top is at 0 *and*
//     the next section's top is still below the viewport — i.e. it's stuck
//     and nothing has slid up to cover it yet.
//   - On mobile, where sections are in normal flow (no sticky), "active"
//     means the section spans the vertical center of the viewport.
//
// Anything that self-plays (a looping demo, a one-shot reveal) should gate
// on this so it starts fresh exactly when a visitor actually arrives at the
// section, rather than running in the background from page load.
//
// Takes an optional `onActiveChange` callback fired at the moment activity
// changes, so callers can kick off (or reset) their own animation state
// right then — kept as a callback rather than just returning `active` so
// that reset happens inside the same scroll-driven callback instead of a
// separate effect reacting to it.
export function useSectionActive<T extends HTMLElement>(onActiveChange?: (active: boolean) => void) {
  const ref = useRef<T>(null)
  const [active, setActive] = useState(false)
  const callbackRef = useRef(onActiveChange)
  useEffect(() => {
    callbackRef.current = onActiveChange
  })

  useEffect(() => {
    const section = ref.current?.closest('section')
    if (!section) return

    let isActive = false
    let ticking = false

    function measure() {
      ticking = false
      if (!section) return

      const isSticky = window.getComputedStyle(section).position === 'sticky'
      let nowActive: boolean

      if (isSticky) {
        const next = section.nextElementSibling as HTMLElement | null
        const myTop = section.getBoundingClientRect().top
        const nextTop = next ? next.getBoundingClientRect().top : Infinity
        nowActive = Math.abs(myTop) < 1 && nextTop > 1
      } else {
        const rect = section.getBoundingClientRect()
        const viewportMid = window.innerHeight / 2
        nowActive = rect.top < viewportMid && rect.bottom > viewportMid
      }

      if (nowActive !== isActive) {
        isActive = nowActive
        setActive(nowActive)
        callbackRef.current?.(nowActive)
      }
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(measure)
    }

    const rafId = requestAnimationFrame(measure)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return { ref, active }
}

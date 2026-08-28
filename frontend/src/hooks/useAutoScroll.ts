import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'

/**
 * Keeps an element pinned to its bottom while the user is already near the
 * bottom, so new content auto-scrolls without yanking the viewport.
 */
export function useAutoScroll<T extends HTMLElement>(threshold = 120): {
  ref: MutableRefObject<T | null>
  bump: () => void
} {
  const ref = useRef<T | null>(null)
  const stick = useRef(true)
  const [version, setVersion] = useState(0)

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      stick.current = dist < threshold
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [threshold])

  useEffect(() => {
    if (stick.current) {
      ref.current?.scrollTo({ top: ref.current.scrollHeight })
    }
  }, [version])

  return { ref, bump }
}
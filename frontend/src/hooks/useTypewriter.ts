import { useEffect, useRef, useState } from 'react'

/**
 * Smoothly reveals `content` as it streams in. While `active` is true the
 * buffer chases the incoming text with a natural typing cadence; once the
 * stream completes the full text is rendered immediately.
 */
export function useTypewriter(content: string, active: boolean) {
  const [pos, setPos] = useState(() => (active ? 0 : content.length))
  const posRef = useRef(pos)

  useEffect(() => {
    if (!active) return
    const tick = window.setInterval(() => {
      const target = content.length
      if (posRef.current < target) {
        const step = target - posRef.current > 500 ? 30 : 5
        posRef.current = Math.min(target, posRef.current + step)
        setPos(posRef.current)
      }
    }, 24)
    return () => window.clearInterval(tick)
  }, [content, active])

  const displayed = active ? content.slice(0, pos) : content
  return { displayed, active, done: !active && pos >= content.length }
}
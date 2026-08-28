import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

interface ChatInputProps {
  onSend: (text: string) => void
  streaming: boolean
  onStop: () => void
  disabled?: boolean
}

export function ChatInput({ onSend, streaming, onStop, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)
  const sentRef = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = '0px'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [value])

  useEffect(() => {
    if (!sentRef.current && !streaming) ref.current?.focus()
    sentRef.current = false
  }, [streaming])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled || streaming) return
    sentRef.current = true
    setValue('')
    onSend(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-4 sm:px-0">
      <div className="relative transition-shadow duration-300 focus-within:shadow-[var(--glow-accent)]">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Create or join a workspace to start' : 'Ask a question about your documents…'}
          disabled={disabled}
          aria-label="Message"
          className="max-h-[168px] w-full resize-none overflow-y-auto rounded-[var(--radius-xl)] border border-[var(--border-strong)] bg-[var(--surface-1)] py-3.5 pl-5 pr-14 text-[14.5px] leading-relaxed text-[var(--text-1)] placeholder:text-[var(--text-3)] transition-colors focus:border-[var(--accent)] focus:outline-none disabled:opacity-55"
          style={{ minHeight: 56 }}
        />
        <div className="absolute bottom-3 right-3">
          {streaming ? (
            <button
              onClick={onStop}
              aria-label="Stop generating"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--surface-3)] text-[var(--text-1)] transition-all hover:bg-[var(--danger)] hover:text-white"
            >
              <Square size={13} fill="currentColor" />
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={disabled || !value.trim()}
              aria-label="Send message"
              className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] bg-[var(--accent-grad)] text-white shadow-[var(--shadow-sm)] transition-all enabled:hover:shadow-[var(--glow-accent)] enabled:hover:translate-y-px disabled:opacity-40"
            >
              <ArrowUp size={17} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
      <p className="mt-2 text-center text-[11.5px] text-[var(--text-3)]">
        DocMind can make mistakes. Verify important claims against the source documents.
      </p>
    </div>
  )
}
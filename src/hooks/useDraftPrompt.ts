import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A prompt that survives leaving the conversation.
 *
 * Every input on this app held its text in `useState('')`, so typing a long
 * message, then clicking another task or agent, unmounted the component and
 * threw the draft away. The realistic path to that is a user who pastes from
 * another tab, goes to check something, and comes back to an empty box.
 *
 * Drafts are keyed per conversation and kept in localStorage, so the text is
 * still there after switching threads, a reload, or closing the tab.
 *
 * Deliberately not a store: this is UI scratch state, it must not sync between
 * devices or get encrypted at rest with conversation content, and a component
 * remounting is the only lifecycle that matters.
 */
const PREFIX = 'agentasia:prompt-draft:'

/** Longer than this and we stop saving rather than risk blowing the quota. */
const MAX_DRAFT_CHARS = 100_000

/** Long enough not to write on every keystroke, short enough to survive a fast click away. */
const AUTOSAVE_MS = 200

const read = (key: string | null): string => {
  if (!key) return ''
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return '' // private mode / quota: behave like the old useState
  }
}

const write = (key: string | null, value: string): void => {
  if (!key) return
  try {
    if (!value.trim()) localStorage.removeItem(key)
    else if (value.length <= MAX_DRAFT_CHARS) localStorage.setItem(key, value)
  } catch {
    // ignore: a failed draft save must never break the input
  }
}

export function useDraftPrompt(conversationId?: string | null) {
  const storageKey = conversationId ? `${PREFIX}${conversationId}` : null

  const [value, setValue] = useState(() => read(storageKey))

  const activeKey = useRef(storageKey)
  const latest = useRef(value)
  latest.current = value
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = undefined
    write(activeKey.current, latest.current)
  }, [])

  // Switching conversations: save what was typed against the thread being left,
  // then load that thread's own draft. React Router reuses this component when
  // only the param changes, so without this the text would follow the user.
  useEffect(() => {
    if (activeKey.current === storageKey) return
    flush()
    activeKey.current = storageKey
    setValue(read(storageKey))
  }, [storageKey, flush])

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => write(activeKey.current, latest.current), AUTOSAVE_MS)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [value])

  // Unmount is the common case: navigating to another page at a different route.
  useEffect(() => () => flush(), [flush])

  /** Called on send: forgets the stored draft as well as the box. */
  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    write(activeKey.current, '')
    setValue('')
  }, [])

  return [value, setValue, clear] as const
}

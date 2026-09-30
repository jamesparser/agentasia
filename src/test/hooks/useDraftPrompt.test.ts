/**
 * The bug: type a long message into a task, click another task without sending,
 * come back - the box was empty, because the text lived in `useState('')` and the
 * component had unmounted.
 */
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDraftPrompt } from '@/hooks/useDraftPrompt'

const KEY_A = 'agentasia:prompt-draft:task-a'
const KEY_B = 'agentasia:prompt-draft:task-b'

describe('useDraftPrompt', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the draft after the input unmounts', () => {
    const first = renderHook(() => useDraftPrompt('task-a'))
    act(() => first.result.current[1]('write the Q3 report for me'))
    first.unmount()

    const again = renderHook(() => useDraftPrompt('task-a'))
    expect(again.result.current[0]).toBe('write the Q3 report for me')
  })

  it('does not leak one conversation’s draft into another', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id: string }) => useDraftPrompt(id),
      { initialProps: { id: 'task-a' } },
    )

    act(() => result.current[1]('notes for task A'))
    vi.advanceTimersByTime(300)

    // Same component instance, new route param - React Router reuses it, so a
    // plain useState would keep showing task A's text inside task B.
    rerender({ id: 'task-b' })
    expect(result.current[0]).toBe('')

    rerender({ id: 'task-a' })
    expect(result.current[0]).toBe('notes for task A')
  })

  it('forgets the draft once the message is sent', () => {
    const { result } = renderHook(() => useDraftPrompt('task-a'))
    act(() => result.current[1]('about to send'))
    vi.advanceTimersByTime(300)
    expect(localStorage.getItem(KEY_A)).toBe('about to send')

    act(() => result.current[1](''))
    vi.advanceTimersByTime(300)
    expect(localStorage.getItem(KEY_A)).toBeNull()
  })

  it('flushes the last keystrokes when navigating away quickly', () => {
    const first = renderHook(() => useDraftPrompt('task-a'))
    act(() => first.result.current[1]('typed but never autosaved'))
    // unmount before the debounce would have fired
    first.unmount()

    expect(localStorage.getItem(KEY_A)).toBe('typed but never autosaved')
    // ...and the next time the user opens this task, it is in the box.
    expect(renderHook(() => useDraftPrompt('task-a')).result.current[0]).toBe(
      'typed but never autosaved',
    )
  })

  it('keeps each conversation’s text separate', () => {
    const a = renderHook(() => useDraftPrompt('task-a'))
    act(() => a.result.current[1]('alpha draft'))
    a.unmount()

    const b = renderHook(() => useDraftPrompt('task-b'))
    act(() => b.result.current[1]('beta draft'))
    b.unmount()

    expect(localStorage.getItem(KEY_A)).toBe('alpha draft')
    expect(localStorage.getItem(KEY_B)).toBe('beta draft')
  })

  it('does not store whitespace-only drafts', () => {
    const { result } = renderHook(() => useDraftPrompt('task-a'))
    act(() => result.current[1]('   '))
    vi.advanceTimersByTime(300)
    expect(localStorage.getItem(KEY_A)).toBeNull()
  })

  it('behaves like plain state when there is no conversation id', () => {
    const { result } = renderHook(() => useDraftPrompt(null))
    act(() => result.current[1]('no key'))
    vi.advanceTimersByTime(300)
    expect(result.current[0]).toBe('no key')
    expect(localStorage.length).toBe(0)
  })

  it('survives localStorage being unavailable', () => {
    const original = Storage.prototype.getItem
    Storage.prototype.getItem = () => {
      throw new Error('SecurityError: private mode')
    }
    const { result } = renderHook(() => useDraftPrompt('task-a'))
    expect(result.current[0]).toBe('')
    act(() => result.current[1]('still typing'))
    vi.advanceTimersByTime(300)
    expect(result.current[0]).toBe('still typing')
    Storage.prototype.getItem = original
  })
})

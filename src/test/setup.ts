import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { webcrypto } from 'node:crypto'

// Polyfill Web Crypto API for jsdom (provides crypto.subtle + randomUUID)
Object.defineProperty(global, 'crypto', {
  value: webcrypto,
  writable: true,
})

// Mock browser APIs
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// jsdom ships no ResizeObserver/IntersectionObserver, but HeroUI's Switch,
// Tooltip and overlay components require them, which made any component test that
// renders a real HeroUI control die with "ResizeObserver is not defined". Stubbed
// as no-ops: layout measurement is irrelevant to assertions about content.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: NoopObserver,
    writable: true,
  })
}
if (!('IntersectionObserver' in globalThis)) {
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    value: NoopObserver,
    writable: true,
  })
}

/**
 * A working `localStorage` for tests.
 *
 * jsdom does implement Storage, and a bare `new JSDOM(...).window.localStorage`
 * is an object. Under Vitest it is not: the jsdom environment hands the test a
 * proxy `window` whose prototype is not the jsdom window (verified:
 * `getPrototypeOf(testWindow) !== getPrototypeOf(freshJSDOMWindow)`), and
 * jsdom's `localStorage` is an accessor that needs the real window as its
 * `this`. Invoked through the proxy it silently returns `undefined` rather than
 * throwing, so `'localStorage' in window` is true while `window.localStorage`
 * is undefined.
 *
 * That is the whole explanation for the long-standing failures in
 * useDraftPrompt.test.ts (`localStorage.clear()` on undefined) and for
 * crypto.test.ts. It also means every app module that touches storage inside a
 * `try` was silently no-oping, so those tests were passing for the wrong reason
 * rather than failing loudly.
 *
 * Installed only when the native one is unusable, so a future Vitest or jsdom
 * that fixes the proxy case takes over automatically.
 */
class MemoryStorage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  getItem(k: string): string | null {
    const key = String(k)
    return this.map.has(key) ? this.map.get(key)! : null
  }

  setItem(k: string, v: string): void {
    this.map.set(String(k), String(v))
  }

  removeItem(k: string): void {
    this.map.delete(String(k))
  }

  clear(): void {
    this.map.clear()
  }
}

function storageUsable(scope: unknown): boolean {
  try {
    const ls = (scope as { localStorage?: Storage })?.localStorage
    return typeof ls?.setItem === 'function'
  } catch {
    // jsdom throws SecurityError for opaque origins; unusable either way.
    return false
  }
}

if (!storageUsable(globalThis)) {
  const store = new MemoryStorage() as unknown as Storage
  for (const scope of [globalThis, typeof window !== 'undefined' ? window : null]) {
    if (!scope) continue
    Object.defineProperty(scope, 'localStorage', {
      value: store,
      writable: true,
      configurable: true,
    })
  }
}

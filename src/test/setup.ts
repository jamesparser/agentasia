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

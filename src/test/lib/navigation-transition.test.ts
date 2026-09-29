import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { navigateWithTransition } from "@/lib/navigation-transition"

type Doc = Document & { startViewTransition?: (cb: () => void) => { finished?: Promise<void> } }

const setTransition = (impl: ((cb: () => void) => { finished?: Promise<void> }) | undefined) => {
  Object.defineProperty(document, "startViewTransition", {
    value: impl,
    writable: true,
    configurable: true,
  })
}

describe("navigateWithTransition", () => {
  const original = (document as Doc).startViewTransition
  let navigate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    navigate = vi.fn()
  })
  afterEach(() => {
    setTransition(original)
  })

  it("navigates directly when the API is unavailable", () => {
    setTransition(undefined)
    navigateWithTransition(navigate)
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it("navigates once when the transition completes normally", async () => {
    setTransition((cb) => {
      cb()
      return { finished: Promise.resolve() }
    })
    navigateWithTransition(navigate)
    await Promise.resolve()
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it("still navigates when the callback never ran and the transition aborts", async () => {
    // This is the deployed-build failure mode: "Transition was aborted because of
    // invalid state". Without the fallback the route change is lost and a
    // submitted task looks like it is hanging.
    setTransition(() => ({ finished: Promise.reject(new Error("aborted")) }))
    navigateWithTransition(navigate)
    await expect(Promise.resolve()).resolves.toBeUndefined()
    await Promise.resolve()
    expect(navigate).toHaveBeenCalledTimes(1)
  })

  it("does not leak an unhandled rejection when the transition aborts", async () => {
    const seen: unknown[] = []
    const onRejection = (e: PromiseRejectionEvent) => seen.push(e.reason)
    window.addEventListener("unhandledrejection", onRejection)
    try {
      setTransition((cb) => {
        cb()
        return { finished: Promise.reject(new Error("aborted")) }
      })
      navigateWithTransition(navigate)
      await new Promise((r) => setTimeout(r, 10))
      expect(navigate).toHaveBeenCalled() // callback ran, then fallback re-asserted the route
      expect(seen).toEqual([])
    } finally {
      window.removeEventListener("unhandledrejection", onRejection)
    }
  })

  it("navigates when startViewTransition itself throws", () => {
    setTransition(() => {
      throw new Error("not supported")
    })
    navigateWithTransition(navigate)
    expect(navigate).toHaveBeenCalledTimes(1)
  })
})

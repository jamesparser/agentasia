/**
 * View-transition-safe navigation.
 *
 * `document.startViewTransition()` rejects with
 * "Transition was aborted because of invalid state" whenever the document cannot
 * animate - observed on the deployed build on every first message, where it came
 * through as an unhandled promise rejection. Two problems with the previous
 * inline pattern:
 *
 *   1. the returned transition's rejection was never consumed, and
 *   2. when a transition aborts the callback may never run, so the navigation is
 *      silently lost - which is how a submitted task can appear to hang.
 *
 * So: run the navigation through the transition when available, and consume the
 * rejection by navigating plainly if it aborts.
 */
type ViewTransitionLike = { finished?: Promise<void> }
type DocWithTransition = Document & {
  startViewTransition?: (cb: () => void) => ViewTransitionLike
}

export function navigateWithTransition(navigateTo: () => void): void {
  const doc = document as DocWithTransition
  if (typeof doc.startViewTransition !== "function") {
    navigateTo()
    return
  }
  let transition: ViewTransitionLike
  try {
    transition = doc.startViewTransition(navigateTo)
  } catch {
    navigateTo()
    return
  }
  transition?.finished?.catch(() => {
    navigateTo()
  })
}

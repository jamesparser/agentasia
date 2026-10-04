import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import Router from '@/app/Router'
import { Providers } from '@/app/Providers'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import '@/styles/globals.css'
import '@/styles/view-transitions.css'
import 'katex/dist/katex.min.css'
import { AuthGate } from '@/components/auth/AuthGate'
import { InfoDialog } from '@/components/InfoDialog'
import { initAuth } from '@/lib/auth'

// Resolves the auth provider before the first render settles. Inert unless
// VITE_FIREBASE_API_KEY is set - see src/lib/auth/authProvider.ts for why the
// deployment currently has no credentials.
void initAuth()

// A deploy replaces the hashed chunk files. A tab opened before it still points
// at the old names, so the next lazy import fails with "Failed to fetch
// dynamically imported module". Reload once to pick up the new build; the
// session flag stops a genuine outage from looping.
globalThis.addEventListener?.('vite:preloadError', (event) => {
  try {
    if (globalThis.sessionStorage?.getItem('agentasia:chunk-reload')) return
    globalThis.sessionStorage?.setItem('agentasia:chunk-reload', '1')
  } catch {
    return
  }
  event.preventDefault()
  globalThis.location.reload()
})

// The page loaded fine: clear the guard so a later deploy can reload again.
globalThis.setTimeout?.(() => {
  try {
    globalThis.sessionStorage?.removeItem('agentasia:chunk-reload')
  } catch {
    /* storage unavailable */
  }
}, 15_000)

const container = globalThis.document.getElementById('root')

if (container) {
  const app = (
    <React.StrictMode>
      <ErrorBoundary>
        <BrowserRouter>
          <Providers>
            <AuthGate>
              <Router />
              <InfoDialog />
            </AuthGate>
          </Providers>
        </BrowserRouter>
      </ErrorBoundary>
    </React.StrictMode>
  )

  // Check if the page has been prerendered (has content inside #root)
  if (container.hasChildNodes()) {
    // Hydrate the prerendered HTML
    ReactDOM.hydrateRoot(container, app)
  } else {
    // Fresh render for non-prerendered pages
    ReactDOM.createRoot(container).render(app)
  }
}

/**
 * Bridge server URL for API proxying (OAuth, external APIs)
 * - Development: Vite dev server handles proxying
 * - Production: Dedicated bridge server
 *
 * Note: We check for both import.meta.env existence and MODE to handle
 * config loading time (before Vite runtime is available)
 */
export const BRIDGE_URL =
  typeof import.meta !== 'undefined' &&
  typeof import.meta.env !== 'undefined' &&
  import.meta.env.DEV
    ? ''
    : '' // was https://bridge.devs.new - somebody else's host, and pointing the
         // shipped bundle at it advertised the fork and routed user OAuth
         // traffic through their infrastructure. Nothing in AgentAsia needs it.

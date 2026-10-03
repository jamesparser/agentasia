import { gatewayBase } from '@/lib/llm/managed-lane'

/**
 * Where encrypted sync traffic goes, and which room an account maps to.
 *
 * Upstream's public relay is not ours to send users through. AgentAsia runs its
 * own: the gateway serves it at /v1/sync, so by default it is the gateway's
 * address over wss. It only ever sees ciphertext (see server/src/sync-relay.mjs).
 * VITE_AGENTASIA_RELAY_URL overrides it, for example to point at a self-hosted one.
 */
export function relayUrl(): string {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  const explicit = (env.VITE_AGENTASIA_RELAY_URL || '').trim()
  if (explicit) return explicit
  const base = gatewayBase()
  return base ? `${base.replace(/\/+$/, '').replace(/^http/, 'ws')}/v1/sync` : ''
}

export function isRelayConfigured(): boolean {
  return relayUrl() !== ''
}

/**
 * One room per account. Every device signed in as the same uid lands in the same
 * room, so the only thing a second device needs is the sync password. The room
 * name the relay actually sees is still derived from this id plus that password
 * (see deriveRoomName), so the relay learns neither the uid nor the password.
 */
export function accountRoomId(uid: string): string {
  return `acct-${uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)}`
}

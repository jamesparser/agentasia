/**
 * Where encrypted sync traffic goes, and which room an account maps to.
 *
 * The relay is deliberately not hard-coded: upstream's public relay is not ours
 * to send users through, and the owner has not stood one up yet. Sync therefore
 * stays unavailable (and says so) until VITE_AGENTASIA_RELAY_URL is set.
 */
export function relayUrl(): string {
  const env = (import.meta.env ?? {}) as Record<string, string | undefined>
  return (env.VITE_AGENTASIA_RELAY_URL || '').trim()
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

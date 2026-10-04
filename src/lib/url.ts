/**
 * Fetch a URL via our CORS proxy.
 *
 * Always same-origin `/api/proxy`: the Vite plugin serves it in dev and
 * `api/proxy.ts` (this repo) serves it on Vercel. It previously pointed at
 * `https://proxy.devs.new` outside dev, i.e. somebody else's service, which
 * allow-lists the `devs.new` origin and therefore answered
 * `403 Forbidden: Invalid origin` for every request from our deployed app -
 * skill search was dead in production - and would have received each user's
 * search queries either way.
 */
export const fetchViaCorsProxy = async (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`

  const response = await fetch(proxyUrl, {
    ...options,
    headers: {
      ...options?.headers,
      // Origin header is automatically set by the browser
    },
  })

  if (!response.ok) {
    throw new Error(`CORS proxy error: ${response.status}`)
  }

  return response
}

export const uuidToBase64url = (uuid: string): string => {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(
    hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export const base64urlToUuid = (base64url: string): string => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const paddedBase64 = base64.padEnd(
    base64.length + ((4 - (base64.length % 4)) % 4),
    '=',
  )
  const binary = atob(paddedBase64)
  const hex = Array.from(binary)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

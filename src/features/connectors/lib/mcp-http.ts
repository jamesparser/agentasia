import type { McpResource, McpTool } from '../types'

export interface McpDiscoveryResult {
  tools: McpTool[]
  resources: McpResource[]
}

export interface McpAuth {
  /** Bearer token the user supplied for their own account on that server. */
  token?: string
  /** Header scheme, default Bearer. */
  scheme?: 'Bearer' | 'Token'
}

/** Streamable HTTP servers may answer with a JSON body or a text/event-stream. */
async function readRpcPayload(response: Response) {
  const type = response.headers.get('content-type') || ''
  if (!type.includes('text/event-stream')) return response.json()
  const text = await response.text()
  for (const line of text.split('\n')) {
    if (!line.startsWith('data:')) continue
    try {
      const msg = JSON.parse(line.slice(5).trim())
      if (msg && (msg.result !== undefined || msg.error)) return msg
    } catch {
      // keep scanning for the next data line
    }
  }
  throw new Error('MCP server sent no readable response')
}

export interface McpSessionOptions {
  /**
   * Send each call through the AgentAsia gateway relay instead of straight from
   * the browser. Needed for servers that refuse requests from web pages. The
   * user's own key for the server then passes through the gateway in memory for
   * the length of one request; it is never stored or logged there. Requires a
   * signed in account.
   */
  viaRelay?: boolean
}

/**
 * A small browser-side MCP client over streamable HTTP. By default it talks
 * straight from the user's browser to the MCP server with the user's own token.
 * Servers that do not allow this site through CORS can only be reached with
 * `viaRelay`.
 */
export function createMcpSession(
  serverUrl: string,
  auth: McpAuth = {},
  options: McpSessionOptions = {},
) {
  let sessionId: string | null = null
  let initialized = false

  const request = async (
    method: string,
    params: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) => {
    const headers: Record<string, string> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `${auth.scheme ?? 'Bearer'} ${auth.token}` } : {}),
      ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
    }
    const rpc = JSON.stringify({
      jsonrpc: '2.0',
      id: crypto.randomUUID(),
      method,
      params,
    })
    const response = options.viaRelay
      ? await fetchViaRelay(serverUrl, headers, rpc, signal)
      : await fetch(serverUrl, { method: 'POST', signal, headers, body: rpc })

    if (options.viaRelay && response.status === 401) {
      throw new Error('Sign in to use this connection. It goes through the AgentAsia relay.')
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `The server refused the credentials (${response.status}). Check the token.`,
      )
    }
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    sessionId =
      response.headers.get('Mcp-Session-Id') ??
      response.headers.get('X-Mcp-Session-Id') ??
      sessionId
    const payload = await readRpcPayload(response)
    if (payload.error)
      throw new Error(payload.error.message || 'MCP server error')
    return payload.result || {}
  }

  // Streamable HTTP servers may require initialize before tools/list. Older
  // HTTP-compatible servers accept tools/list directly, so a failed initialize
  // is tolerated and the following call is the definitive check.
  const ensureInitialized = async (signal?: AbortSignal) => {
    if (initialized) return
    try {
      await request(
        'initialize',
        {
          protocolVersion: '2025-03-26',
          capabilities: {},
          clientInfo: { name: 'AgentAsia', version: '0.1.0' },
        },
        signal,
      )
    } catch (error) {
      if (error instanceof Error && /refused the credentials/.test(error.message))
        throw error
    }
    initialized = true
  }

  return {
    async discover(): Promise<McpDiscoveryResult> {
      await ensureInitialized()
      const [toolsResult, resourcesResult] = await Promise.allSettled([
        request('tools/list'),
        request('resources/list'),
      ])
      if (toolsResult.status === 'rejected') throw toolsResult.reason
      return {
        tools: Array.isArray(toolsResult.value.tools)
          ? toolsResult.value.tools
          : [],
        resources:
          resourcesResult.status === 'fulfilled' &&
          Array.isArray(resourcesResult.value.resources)
            ? resourcesResult.value.resources
            : [],
      }
    },

    /** Call one tool and return its text content joined, or the raw result. */
    async callTool(
      name: string,
      args: Record<string, unknown>,
      signal?: AbortSignal,
    ): Promise<{ text: string; isError: boolean }> {
      await ensureInitialized(signal)
      const result = await request('tools/call', { name, arguments: args }, signal)
      const parts = Array.isArray(result.content) ? result.content : []
      const text = parts
        .map((p: { type?: string; text?: string }) =>
          p?.type === 'text' && typeof p.text === 'string'
            ? p.text
            : JSON.stringify(p),
        )
        .join('\n')
      return {
        text: text || JSON.stringify(result),
        isError: Boolean(result.isError),
      }
    },
  }
}

async function fetchViaRelay(
  serverUrl: string,
  headers: Record<string, string>,
  body: string,
  signal?: AbortSignal,
): Promise<Response> {
  const { gatewayFetch } = await import('@/lib/auth/gatewayFetch')
  const { gatewayBase } = await import('@/lib/llm/managed-lane')
  const base = gatewayBase()
  if (!base) throw new Error('The AgentAsia gateway is not configured.')
  return gatewayFetch(`${base}/v1/mcp/relay`, {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: serverUrl, headers, body }),
  })
}

export async function discoverHttpMcp(
  serverUrl: string,
  auth: McpAuth = {},
  options: McpSessionOptions = {},
): Promise<McpDiscoveryResult> {
  return createMcpSession(serverUrl, auth, options).discover()
}

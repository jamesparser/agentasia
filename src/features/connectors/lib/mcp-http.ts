import type { McpResource, McpTool } from '../types'

export interface McpDiscoveryResult {
  tools: McpTool[]
  resources: McpResource[]
}

export interface McpAuth {
  /** Bearer token the user supplied for their own account on that server. */
  token?: string
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

/**
 * A small browser-side MCP client over streamable HTTP. It talks straight from
 * the user's browser to the MCP server with the user's own token: AgentAsia
 * operates no relay in the middle. The server must therefore allow this site
 * through CORS; servers that do not cannot be reached from a browser.
 */
export function createMcpSession(serverUrl: string, auth: McpAuth = {}) {
  let sessionId: string | null = null
  let initialized = false

  const request = async (
    method: string,
    params: Record<string, unknown> = {},
    signal?: AbortSignal,
  ) => {
    const response = await fetch(serverUrl, {
      method: 'POST',
      signal,
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        ...(sessionId ? { 'Mcp-Session-Id': sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      }),
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `The server refused the credentials (${response.status}). Check the token.`,
      )
    }
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    sessionId = response.headers.get('Mcp-Session-Id') ?? sessionId
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

export async function discoverHttpMcp(
  serverUrl: string,
  auth: McpAuth = {},
): Promise<McpDiscoveryResult> {
  return createMcpSession(serverUrl, auth).discover()
}

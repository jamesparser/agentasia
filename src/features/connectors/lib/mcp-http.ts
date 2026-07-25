import type { McpResource, McpTool } from '../types'

export interface McpDiscoveryResult {
  tools: McpTool[]
  resources: McpResource[]
}

/**
 * Performs a small, browser-safe discovery request against a remote HTTP MCP
 * endpoint. The server must support CORS for the AgentAsia origin. Authenticated
 * and localhost-only MCP servers need a future trusted gateway instead.
 */
export async function discoverHttpMcp(
  serverUrl: string,
): Promise<McpDiscoveryResult> {
  const request = async (
    method: string,
    params: Record<string, unknown> = {},
  ) => {
    const response = await fetch(serverUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: crypto.randomUUID(),
        method,
        params,
      }),
    })

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`)
    }

    const payload = await response.json()
    if (payload.error)
      throw new Error(payload.error.message || 'MCP server error')
    return payload.result || {}
  }

  // Streamable HTTP servers may require initialize before tools/list. Older
  // HTTP-compatible servers commonly accept tools/list directly, so retain a
  // graceful fallback for both implementations.
  try {
    await request('initialize', {
      protocolVersion: '2025-03-26',
      capabilities: {},
      clientInfo: { name: 'AgentAsia', version: '0.1.0' },
    })
  } catch {
    // Discovery below is the definitive connectivity check.
  }

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
}

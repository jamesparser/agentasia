/**
 * Turns the tools of every connected MCP server into agent tools.
 *
 * Discovery already stores each server's tool list on its connector. Until now
 * nothing exposed those tools to the model, so a connected server did nothing in
 * chat. This registers one tool per discovered MCP tool, named
 * `mcp_<server>_<tool>`, and routes calls straight from the browser to the
 * server with the user's own token (decrypted on this device only).
 */
import type { ToolDefinition } from '@/lib/llm/types'
import { connectors as connectorsMap } from '@/lib/yjs/maps'
import { SecureStorage } from '@/lib/crypto'
import type { Connector, McpTool } from '../types'
import { createMcpSession } from './mcp-http'
import { MCP_PRESETS, resolveMcpUrl } from './mcp-presets'

const sessions = new Map<string, ReturnType<typeof createMcpSession>>()
let registered = new Set<string>()

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20) || 'server'

/** Tool names must be unique and at most 64 characters of [a-z0-9_-]. */
function toolName(connector: Connector, tool: McpTool): string {
  const base = `mcp_${slug(connector.name)}_${tool.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`
  return base.slice(0, 64)
}

function activeMcpConnectors(): Connector[] {
  return (Array.from(connectorsMap.values()) as Connector[]).filter(
    (c) =>
      c.category === 'mcp' &&
      c.status === 'connected' &&
      c.mcpConfig?.discoveredTools?.length,
  )
}

async function tokenFor(connector: Connector): Promise<string | undefined> {
  if (!connector.encryptedToken || !connector.tokenIv) return undefined
  return SecureStorage.decryptCredential(
    connector.encryptedToken,
    connector.tokenIv,
    '',
  )
}

async function sessionFor(connector: Connector) {
  const cached = sessions.get(connector.id)
  if (cached) return cached
  const cfg = connector.mcpConfig!
  const token = await tokenFor(connector)
  const url = resolveMcpUrl(cfg.urlTemplate ?? cfg.serverUrl, token)
  const viaRelay = MCP_PRESETS.find((p) => p.id === cfg.presetId)?.noBrowser === true
  const session = createMcpSession(
    url,
    cfg.urlTemplate ? {} : { token, scheme: cfg.authScheme },
    { viaRelay },
  )
  sessions.set(connector.id, session)
  return session
}

export function getMcpToolDefinitions(): ToolDefinition[] {
  const defs: ToolDefinition[] = []
  for (const connector of activeMcpConnectors()) {
    for (const tool of connector.mcpConfig!.discoveredTools!) {
      defs.push({
        type: 'function',
        function: {
          name: toolName(connector, tool),
          description: `[${connector.name}] ${tool.description ?? tool.name}`.slice(0, 1000),
          parameters: (tool.inputSchema as unknown as ToolDefinition['function']['parameters']) ?? {
            type: 'object',
            properties: {},
          },
        },
      })
    }
  }
  return defs
}

/** Register (and prune) one executor tool per discovered MCP tool. */
export async function registerMcpTools(): Promise<void> {
  const { defaultRegistry } = await import('@/lib/tool-executor/executor')
  const next = new Set<string>()

  for (const connector of activeMcpConnectors()) {
    for (const tool of connector.mcpConfig!.discoveredTools!) {
      const name = toolName(connector, tool)
      next.add(name)
      const definition = getMcpToolDefinitions().find(
        (d) => d.function.name === name,
      )!
      defaultRegistry.register(
        definition,
        async (args: Record<string, unknown>, context) => {
          // Look the connector up again so a removed or edited one is honoured.
          const live = connectorsMap.get(connector.id) as Connector | undefined
          if (!live || live.status !== 'connected') {
            throw new Error(`The ${connector.name} connection is no longer available.`)
          }
          const session = await sessionFor(live)
          const out = await session.callTool(
            tool.name,
            args ?? {},
            context?.abortSignal,
          )
          if (out.isError) throw new Error(out.text.slice(0, 2000))
          return out.text.slice(0, 20_000)
        },
        {
          replace: true,
          tags: ['mcp', slug(connector.name)],
          requiresConfirmation: tool.annotations?.readOnlyHint !== true,
        },
      )
    }
  }

  for (const stale of registered) {
    if (!next.has(stale)) defaultRegistry.unregister(stale)
  }
  registered = next
}

/** Forget a cached session when its connector changes or is removed. */
export function dropMcpSession(connectorId: string): void {
  sessions.delete(connectorId)
}

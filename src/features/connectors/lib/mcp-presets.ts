/**
 * Catalog of MCP servers a user can connect with one click.
 *
 * Every connection is the user's own: they paste their own key or token for
 * their own account, it is encrypted on their device, and the browser talks to
 * the server directly. AgentAsia holds no shared vendor account and runs no
 * relay, so a server that does not allow browser (CORS) requests cannot be
 * reached from here. The wizard reports that plainly instead of failing quietly.
 *
 * URLs are the vendors' published remote MCP endpoints. A vendor can change
 * one without notice, which is why each entry links to the page where the user
 * gets their key, and why the wizard always tests the connection before saving.
 */

export type McpPresetAuth =
  /** Paste a key; sent as an Authorization header. */
  | 'token'
  /** Paste a key; it goes inside the URL (`{token}`). */
  | 'url-token'
  /** Paste the full MCP URL the vendor gives you. */
  | 'custom-url'
  /** No credentials needed. */
  | 'none'
  /** Included in every account already; nothing to connect. */
  | 'builtin'
  /** Signs in with a Google account in the Apps tab. */
  | 'apps-tab'

export interface McpPreset {
  id: string
  name: string
  description:
    | 'Live web search. Included in every account, nothing to connect.'
    | 'Your own long-term memory. Paste your own Mem0 key.'
    | 'Repositories, issues and pull requests. Paste a GitHub token.'
    | 'Scrape and crawl websites. Paste your Firecrawl key.'
    | 'Projects and deployments on Vercel.'
    | 'Search the Cloudflare documentation. No key needed.'
    | 'Thousands of apps through one connection. Paste your Zapier key.'
    | 'Hundreds of apps through one connection. Paste your Composio MCP URL.'
    | 'Gmail, Drive, Calendar, Tasks and more. Sign in with Google in the Apps tab.'
  auth: McpPresetAuth
  /** Endpoint, or a template containing `{token}`. */
  url?: string
  scheme?: 'Bearer' | 'Token'
  /** Where the user creates their key. */
  helpUrl?: string
  /** True when the vendor only offers browser sign-in (OAuth) for this server. */
  oauthOnly?: boolean
  /**
   * True when the server rejects requests from web pages (no CORS for our
   * origin, or an explicit origin check). Checked against the live servers on
   * 3 Oct 2026. It cannot be used from the browser until a relay exists.
   */
  noBrowser?: boolean
}

export const MCP_PRESETS: McpPreset[] = [
  {
    id: 'tavily',
    name: 'Tavily',
    description: 'Live web search. Included in every account, nothing to connect.',
    auth: 'builtin',
  },
  {
    id: 'google',
    name: 'Google Workspace',
    description:
      'Gmail, Drive, Calendar, Tasks and more. Sign in with Google in the Apps tab.',
    auth: 'apps-tab',
  },
  {
    id: 'mem0',
    name: 'Mem0',
    description: 'Your own long-term memory. Paste your own Mem0 key.',
    auth: 'token',
    url: 'https://mcp.mem0.ai/mcp',
    scheme: 'Token',
    helpUrl: 'https://app.mem0.ai/dashboard/api-keys',
    noBrowser: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Repositories, issues and pull requests. Paste a GitHub token.',
    auth: 'token',
    url: 'https://api.githubcopilot.com/mcp/',
    helpUrl: 'https://github.com/settings/personal-access-tokens/new',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    description: 'Scrape and crawl websites. Paste your Firecrawl key.',
    auth: 'url-token',
    url: 'https://mcp.firecrawl.dev/{token}/v2/mcp',
    helpUrl: 'https://www.firecrawl.dev/app/api-keys',
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Projects and deployments on Vercel.',
    auth: 'token',
    url: 'https://mcp.vercel.com',
    helpUrl: 'https://vercel.com/account/settings/tokens',
    oauthOnly: true,
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    description: 'Search the Cloudflare documentation. No key needed.',
    auth: 'none',
    url: 'https://docs.mcp.cloudflare.com/mcp',
    noBrowser: true,
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description:
      'Thousands of apps through one connection. Paste your Zapier key.',
    auth: 'token',
    url: 'https://mcp.zapier.com/api/mcp/mcp',
    helpUrl: 'https://mcp.zapier.com',
    noBrowser: true,
  },
  {
    id: 'composio',
    name: 'Composio',
    description:
      'Hundreds of apps through one connection. Paste your Composio MCP URL.',
    auth: 'custom-url',
    helpUrl: 'https://platform.composio.dev',
  },
]

/** Build the URL to call. The token is only ever inserted at call time. */
export function resolveMcpUrl(urlOrTemplate: string, token?: string): string {
  return urlOrTemplate.includes('{token}')
    ? urlOrTemplate.replace('{token}', encodeURIComponent(token ?? ''))
    : urlOrTemplate
}

/**
 * A failed `fetch` in a browser gives no reason. When it throws a TypeError the
 * usual cause is that the server does not allow requests from this site.
 */
export function explainMcpFailure(error: unknown): string {
  if (error instanceof TypeError) {
    return 'The server did not answer a browser request. Most often it does not allow connections from web pages (CORS), or the address is wrong.'
  }
  return error instanceof Error ? error.message : 'Could not connect.'
}

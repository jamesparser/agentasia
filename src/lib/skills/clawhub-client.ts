/**
 * ClawHub API client - the OpenClaw skill registry.
 *
 * Shapes taken from the `clawhub` client bundled in the locally installed
 * openclaw CLI (`dist/clawhub-*.js` + `dist/schema-*.js`), i.e. the same API the
 * official tool uses, and confirmed against the live service:
 *
 *   GET  /api/v1/search?q=&limit=            -> { results: [{ slug, displayName,
 *                                                        summary, version, score,
 *                                                        sourceIdentity:{owner},
 *                                                        trust:{installability,...} }] }
 *   GET  /api/v1/skills/:slug?ownerHandle=   -> { skill, metadata, latestVersion, moderation }
 *   GET  /api/v1/download?slug=&ownerHandle= -> zip archive
 *   POST /api/v1/skills/-/security-verdicts  -> { items:[{ decision, reasons }] }
 *
 * Requests go through our same-origin `/api/proxy` (see `lib/url.ts`): the
 * registry does not send browser CORS headers, and the allow-list there is what
 * keeps that relay from becoming an open proxy.
 *
 * Install takes the archive, not the GitHub path, because many ClawHub skills
 * publish no `sourceUrl` (verified on a live search result: `sourceUrl: null`).
 *
 * @module lib/skills/clawhub-client
 */
import { fetchViaCorsProxy } from '@/lib/url'
import { readZip, type ZipEntry } from './zip-reader'
import type { SkillSearchResult } from './skillsmp-client'
import type { SkillFile, SkillScript } from '@/types'

const CLAWHUB_BASE = 'https://clawhub.ai'
const TIMEOUT_MS = 20_000

export interface ClawHubTrust {
  installability?: string
  clawHubVerdict?: string | null
  visibility?: string
  upstreamScanners?: unknown
  sourceFreshness?: string
}

/** A search hit, compatible with the shared result shape plus registry fields. */
export interface ClawHubSkillSearchResult extends SkillSearchResult {
  registry: 'clawhub'
  slug: string
  ownerHandle: string
  trust: ClawHubTrust
}

interface RawClawHubResult {
  slug?: string
  displayName?: string
  summary?: string
  version?: string | null
  score?: number
  downloads?: number
  source?: string
  install?: { kind?: string; reference?: string; sourceUrl?: string | null }
  links?: { source?: string | null }
  sourceIdentity?: { owner?: string; host?: string | null; repo?: string | null }
  trust?: ClawHubTrust
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetchViaCorsProxy(`${CLAWHUB_BASE}${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`ClawHub ${path} failed: ${res.status}`)
  return (await res.json()) as T
}

/** Narrow a merged search result back to a ClawHub row. */
export function isClawHubResult(
  r: SkillSearchResult,
): r is ClawHubSkillSearchResult {
  const x = r as Partial<ClawHubSkillSearchResult>
  return x.registry === 'clawhub' && typeof x.slug === 'string' && x.slug.length > 0
}

const toNumber = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/** Map one raw registry row into the shared result shape. */
export function mapClawHubResult(r: RawClawHubResult): ClawHubSkillSearchResult | null {
  const slug = typeof r.slug === 'string' && r.slug.trim() ? r.slug.trim() : ''
  if (!slug) return null
  const owner = r.sourceIdentity?.owner ?? r.install?.reference?.split('/')[0] ?? ''
  const sourceUrl = r.links?.source ?? r.install?.sourceUrl ?? ''
  const trust = (r.trust ?? {}) as ClawHubTrust
  return {
    registry: 'clawhub',
    slug,
    ownerHandle: owner || '',
    id: `clawhub:${owner ? `${owner}/` : ''}${slug}`,
    name: r.displayName || slug,
    author: owner || 'clawhub',
    description: (r.summary || '').trim().slice(0, 500),
    githubUrl: typeof sourceUrl === 'string' ? sourceUrl : '',
    skillUrl: `https://clawhub.ai/skills/${encodeURIComponent(slug)}`,
    // ClawHub reports installs rather than stars; reuse the field the UI sorts on
    stars: toNumber(r.downloads),
    updatedAt: 0,
    trust,
  }
}

/** Search ClawHub. Never throws: an unavailable registry must not break search. */
export async function searchClawHubSkills(
  query: string,
  limit = 20,
): Promise<ClawHubSkillSearchResult[]> {
  const q = query.trim()
  if (!q) return []
  try {
    const data = await getJson<{ results?: RawClawHubResult[] }>(
      `/api/v1/search?q=${encodeURIComponent(q)}&limit=${Math.max(1, Math.min(50, limit))}`,
    )
    return (data.results ?? [])
      .map(mapClawHubResult)
      .filter((x): x is ClawHubSkillSearchResult => x !== null)
  } catch (error) {
    console.warn('[clawhub] search failed:', error)
    return []
  }
}

const EXT_LANG: Record<string, SkillScript['language']> = {
  py: 'python',
  sh: 'bash',
  bash: 'bash',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'javascript',
}

export interface ClawHubSkillFiles {
  rawSkillMd: string
  scripts: SkillScript[]
  references: SkillFile[]
  assets: SkillFile[]
}

/** Classify archive entries the way `fetchSkillFromGitHub` classifies repo files. */
export function classifyZipEntries(entries: ZipEntry[]): ClawHubSkillFiles {
  let rawSkillMd = ''
  const scripts: SkillScript[] = []
  const references: SkillFile[] = []
  const assets: SkillFile[] = []

  for (const e of entries) {
    const rel = e.path.replace(/^[^/]+\//, '') // drop the top-level skill folder
    const lower = rel.toLowerCase()
    if (lower === 'skill.md') {
      rawSkillMd = e.text()
      continue
    }
    const ext = lower.includes('.') ? lower.slice(lower.lastIndexOf('.') + 1) : ''
    if (lower.startsWith('scripts/')) {
      scripts.push({
        path: rel,
        content: e.text(),
        language: EXT_LANG[ext] ?? 'other',
      })
    } else if (lower.startsWith('references/') || lower.endsWith('.md')) {
      references.push({ path: rel, content: e.text(), mimeType: 'text/markdown' })
    } else {
      assets.push({ path: rel, content: '', mimeType: `application/${ext || 'octet-stream'}` })
    }
  }
  return { rawSkillMd, scripts, references, assets }
}

/** Download and unpack a skill archive from ClawHub. */
export async function fetchClawHubSkillFiles(
  slug: string,
  ownerHandle?: string,
  version?: string,
): Promise<ClawHubSkillFiles> {
  const params = new URLSearchParams({ slug })
  if (ownerHandle) params.set('ownerHandle', ownerHandle)
  if (version) params.set('version', version)
  else params.set('tag', 'latest')

  const res = await fetchViaCorsProxy(
    `${CLAWHUB_BASE}/api/v1/download?${params.toString()}`,
    { signal: AbortSignal.timeout(60_000), headers: { accept: '*/*' } },
  )
  if (!res.ok) throw new Error(`ClawHub download failed: ${res.status}`)
  const bytes = new Uint8Array(await res.arrayBuffer())
  if (bytes.byteLength < 22) throw new Error('ClawHub download was empty')
  const entries = await readZip(bytes)
  const files = classifyZipEntries(entries)
  if (!files.rawSkillMd.trim()) {
    throw new Error('ClawHub archive contained no SKILL.md')
  }
  return files
}

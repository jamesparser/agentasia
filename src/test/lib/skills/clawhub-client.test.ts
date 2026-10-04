import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CLAWHUB_ZIP_B64 } from '@/test/fixtures/clawhubArchive'
import {
  classifyZipEntries,
  isClawHubResult,
  mapClawHubResult,
} from '@/lib/skills/clawhub-client'
import { readZip } from '@/lib/skills/zip-reader'
import { validateProxyTarget } from '@/lib/skills/proxy-target'

const zipBytes = (): Uint8Array => {
  const bin = atob(CLAWHUB_ZIP_B64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('zip-reader', () => {
  it('reads every entry of a real deflate archive', async () => {
    const entries = await readZip(zipBytes())
    expect(entries.map((e) => e.path).sort()).toEqual([
      'csv-clean/SKILL.md',
      'csv-clean/assets/sample.csv',
      'csv-clean/references/NOTES.md',
      'csv-clean/scripts/run.py',
    ])
    expect(entries.find((e) => e.path.endsWith('SKILL.md'))!.text()).toContain(
      '# CSV Clean',
    )
    expect(entries.find((e) => e.path.endsWith('run.py'))!.text()).toContain(
      'csv.DictReader',
    )
  })

  it('rejects a truncated archive instead of returning partial data', async () => {
    const bytes = zipBytes().subarray(0, 40)
    await expect(readZip(bytes)).rejects.toThrow(/zip/i)
  })

  it('refuses an archive entry whose declared size is over the limit', async () => {
    await expect(
      readZip(zipBytes(), { maxEntryBytes: 10 }),
    ).rejects.toThrow(/too large/i)
  })
})

describe('clawhub file classification', () => {
  it('maps archive entries onto the same shape the GitHub fetcher returns', async () => {
    const files = classifyZipEntries(await readZip(zipBytes()))
    expect(files.rawSkillMd).toContain('name: csv-clean')
    expect(files.scripts).toHaveLength(1)
    expect(files.scripts[0]).toMatchObject({
      path: 'scripts/run.py',
      language: 'python',
    })
    expect(files.references.map((r) => r.path)).toContain('references/NOTES.md')
    expect(files.assets.map((a) => a.path)).toContain('assets/sample.csv')
  })
})

describe('clawhub search mapping', () => {
  it('maps a live-shaped row, using downloads for the popularity sort', () => {
    const r = mapClawHubResult({
      slug: 'alibabacloud-quickbi-smartq',
      displayName: 'Quick BI-SmartQ',
      summary: 'data analysis',
      downloads: 1034,
      sourceIdentity: { owner: 'sdk-team', host: null },
      links: { source: null },
      install: { kind: 'clawhub', reference: 'sdk-team/x', sourceUrl: null },
      trust: { installability: 'installable', clawHubVerdict: null, visibility: 'public' },
    })
    expect(r).toMatchObject({
      registry: 'clawhub',
      slug: 'alibabacloud-quickbi-smartq',
      ownerHandle: 'sdk-team',
      author: 'sdk-team',
      githubUrl: '',
      stars: 1034,
    })
    expect(r!.id).toBe('clawhub:sdk-team/alibabacloud-quickbi-smartq')
  })

  it('drops rows with no usable slug', () => {
    expect(mapClawHubResult({ displayName: 'x' })).toBeNull()
  })
})

describe('proxy target allow-list', () => {
  it('permits the registries and rejects the rest', () => {
    expect(validateProxyTarget('https://clawhub.ai/api/v1/search?q=a').ok).toBe(true)
    expect(validateProxyTarget('https://skillsmp.com/api/x').ok).toBe(true)
    expect(validateProxyTarget('https://evil.test/x').ok).toBe(false)
    expect(validateProxyTarget('http://clawhub.ai/x').ok).toBe(false)
    expect(validateProxyTarget('https://169.254.169.254/latest/meta-data').ok).toBe(false)
    expect(validateProxyTarget('https://100.116.149.122:4000/v1/models').ok).toBe(false)
    expect(validateProxyTarget('https://localhost:5173/').ok).toBe(false)
    expect(validateProxyTarget(null)).toMatchObject({ status: 400 })
    // subdomains of an allowed host are allowed; lookalikes are not
    expect(validateProxyTarget('https://api.clawhub.ai/x').ok).toBe(true)
    expect(validateProxyTarget('https://notclawhub.ai/x').ok).toBe(false)
  })
})

describe('registry discrimination', () => {
  const row = mapClawHubResult({ slug: 'a', sourceIdentity: { owner: 'o' } })!
  it('recognises a ClawHub row so install uses the archive endpoint', () => {
    expect(isClawHubResult(row)).toBe(true)
  })
  it('does not claim a GitHub-sourced row', () => {
    expect(
      isClawHubResult({
        id: 'x', name: 'n', author: 'a', description: 'd',
        githubUrl: 'https://github.com/o/r', skillUrl: '', stars: 0, updatedAt: 0,
      }),
    ).toBe(false)
    expect(isClawHubResult({ ...row, slug: '' } as never)).toBe(false)
  })
})

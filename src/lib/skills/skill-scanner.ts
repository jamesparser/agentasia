/**
 * Skill security scanner — the "skill checker" that gates every install.
 *
 * Why this exists: a skill is *third-party content that becomes agent
 * instructions*. `SKILL.md` is injected into the model's context and its
 * `scripts/*` are fetched from GitHub. Before this module, `installSkill()`
 * stored whatever it was given with `enabled: true` and inspected nothing, so
 * any skill from a public registry could (a) rewrite the agent's behaviour via
 * prompt injection and (b) ship code that exfiltrates credentials.
 *
 * Design notes:
 *  - Rules are **deny-by-default with evidence**: every finding names the rule,
 *    the file, a line number and the matched text, so a human can overrule it.
 *  - Prompt-injection rules look at the *markdown*, because that is the attack
 *    surface the model actually consumes. Code rules look at the scripts.
 *  - `blocked` means: do not auto-enable. The skill is still written to the
 *    store (disabled) with its report attached — silently dropping a user's
 *    install would be worse than showing them why.
 *  - This is a real defence, not a guarantee: it catches the common shapes
 *    (instruction override, credential/env/SSH/browser-store reads, `eval` of
 *    remote content, `curl | sh`, outbound POST of collected data). It cannot
 *    catch a payload that is obfuscated, or injected via an *allowed* channel
 *    such as a reference doc quoted at runtime. Treat "no findings" as
 *    "reviewed, not proven safe".
 */
import type { InstalledSkill, SkillFile, SkillScript } from '@/types'

export type ScanSeverity = 'blocked' | 'warning' | 'info'

export interface ScanFinding {
  rule: string
  severity: ScanSeverity
  /** Which part of the skill: 'SKILL.md' | script/reference/asset path */
  file: string
  line: number
  excerpt: string
  message: string
}

export interface ScanReport {
  verdict: 'safe' | 'caution' | 'blocked'
  findings: ScanFinding[]
  scannedAt: string
  /** sha256-ish digest of what was scanned, so a later edit is detectable */
  fingerprint: string
}

interface Rule {
  id: string
  severity: ScanSeverity
  message: string
  re: RegExp
}

/**
 * Instruction-override / prompt-injection shapes in natural language.
 * Case-insensitive; anchored on imperative phrasing so ordinary documentation
 * ("you can configure the API key in settings") does not match.
 */
const INJECTION_RULES: Rule[] = [
  {
    id: 'override-instructions',
    severity: 'blocked',
    message: 'Instructs the agent to ignore or replace its own system prompt or safety rules.',
    re: /\b(ignore|disregard|forget|bypass|override)\b[^\n]{0,40}\b(system prompt|previous instructions|instructions above|safety (rules|guidelines)|rules|policy|guardrails)\b/i,
  },
  {
    id: 'new-system-instruction',
    severity: 'blocked',
    message: 'Attempts to install a new system-level instruction or "you are now" persona.',
    re: /\b(you are now|act as if you have no|from now on you (must|will|always)|new system prompt|system prompt:)\b/i,
  },
  {
    id: 'exfiltrate-conversation',
    severity: 'blocked',
    message: 'Asks to send the user’s conversation, memory or other skills elsewhere.',
    re: /\b(send|post|upload|transmit|forward|leak|share)\b[^\n]{0,40}\b(entire |full |whole )?(conversation|chat history|memories?|other skills?|system prompt)\b/i,
  },
  {
    id: 'hide-from-user',
    severity: 'blocked',
    message: 'Instructs the agent to conceal its behaviour from the user.',
    re: /\b(do not (tell|inform|mention|reveal)[^\n]{0,30}user|hide this from the user|without (telling|informing) the user|never mention this instruction)\b/i,
  },
  {
    id: 'approve-without-asking',
    severity: 'blocked',
    message: 'Tells the agent to skip human approval or auto-accept confirmations.',
    re: /\b(always (approve|accept|confirm|say yes)|auto-?approve|skip (the )?confirmation|do not ask (the )?user for permission)\b/i,
  },
  {
    id: 'invisible-text',
    severity: 'blocked',
    message: 'Contains zero-width or bidi control characters — the classic hidden-payload carrier.',
    // zero-width chars, BOM, bidi overrides, word joiner
    re: /[\u200B\u200C\u200D\uFEFF\u202A\u202B\u202C\u2060]/,

  },
  {
    id: 'role-forgery',
    severity: 'warning',
    message: 'Uses chat-style role markers, which can confuse the prompt boundary.',
    re: /^\s*(system|assistant|developer)\s*:/im,
  },
  {
    id: 'external-instruction-fetch',
    severity: 'blocked',
    message: 'Tells the agent to fetch and follow instructions from a URL at runtime.',
    re: /\b(fetch|download|visit|open|read)\b[^\n]{0,50}\b(URL|link|endpoint|https?:\/\/)[^\n]{0,60}\b(instructions|follow|then do|and obey)\b/i,
  },
]

/** Credential and secrets access in shipped scripts. */
const CODE_RULES: Rule[] = [
  {
    id: 'remote-code-exec',
    severity: 'blocked',
    message: 'Executes code fetched or decoded at runtime (eval/exec/os.system on dynamic input).',
    re: /\b(eval|exec)\s*\(|\bos\.system\s*\(|\bsubprocess\.(run|call|Popen|check_output)\s*\(|child_process|Function\s*\(\s*['"`]/,
  },
  {
    id: 'pipe-to-shell',
    severity: 'blocked',
    message: 'Pipes a remote download straight into a shell.',
    re: /\b(curl|wget)\b[^\n]*\|\s*(sudo\s+)?(ba|z|f)?sh\b/,
  },
  {
    id: 'env-dump',
    severity: 'blocked',
    message: 'Reads the whole process environment, which is where API keys live.',
    re: /\b(process\.env(?!=[^=])|os\.environ\b|getenv\(\s*\))/,
  },
  {
    id: 'ssh-aws-keyfile',
    severity: 'blocked',
    message: 'Reads private keys or cloud credentials from disk.',
    re: /(?:~|\$HOME|\/root|\/home\/[^\s'"]*)\/\.ssh\/|id_rsa|id_ed25519|\.aws\/credentials|\.kube\/config|\.npmrc\b|\.netrc\b/,
  },
  {
    id: 'browser-credential-store',
    severity: 'blocked',
    message: 'Reads browser or wallet credential stores / keychain.',
    re: /Login Data|keychain\s+dump|security\s+find-generic-password|\/Login\ Data|cookies\.sqlite|MetaMask|seed\.phrase|private[_-]?key\b/i,
  },
  {
    id: 'clipboard-screenshot',
    severity: 'warning',
    message: 'Captures the clipboard or screen, which may contain secrets.',
    re: /\bpyperclip|xclip|xsel|wl-paste|screencapture|mss\.|PIL\.ImageGrab|screenshot\b/i,
  },
  {
    id: 'outbound-post',
    severity: 'warning',
    message: 'Sends data to a network endpoint (review where, and what).',
    re: /\b(requests\.(post|put)|fetch\s*\([^)]{0,80}\bmethod['"]?\s*:\s*['"]post|urllib\.request\.urlopen|axios\.post|http\.post)\b/i,
  },
  {
    id: 'filesystem-wide-read',
    severity: 'warning',
    message: 'Walks the filesystem broadly rather than a project directory.',
    re: /\b(os\.walk|glob\.glob\s*\(\s*['"][^'"]*\*|find\s+\/(?![^\s]*(proc|sys))|ripgrep[^\n]*\/\s)/,
  },
  {
    id: 'base64-blob',
    severity: 'warning',
    message: 'Contains a long base64 blob, often an encoded payload.',
    re: /[A-Za-z0-9+/]{240,}={0,2}/,
  },
  {
    id: 'destructive-command',
    severity: 'blocked',
    message: 'Destructive filesystem or service command.',
    re: /\brm\s+-rf\s+\/|\bmkfs\b|:\(\)\s*\{\s*:\|:&\s*\}\s*:|dd\s+if=[^\n]*of=\/dev\/sd|--no-preserve-root/,
  },
]

const SECRET_LIKE =
  /\b(sk-[A-Za-z0-9_-]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)\b/

function fingerprint(parts: string[]): string {
  // Small non-cryptographic hash (FNV-1a) — good enough to notice an edit.
  let h = 0x811c9dc5
  for (const s of parts) {
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
  }
  return h.toString(16).padStart(8, '0')
}

function scanText(text: string, file: string, rules: Rule[], out: ScanFinding[]): void {
  const lines = text.split('\n')
  for (const rule of rules) {
    for (let i = 0; i < lines.length; i++) {
      const m = rule.re.exec(lines[i])
      if (!m) continue
      out.push({
        rule: rule.id,
        severity: rule.severity,
        file,
        line: i + 1,
        excerpt: lines[i].trim().slice(0, 160),
        message: rule.message,
      })
      break // one hit per rule per file is enough for a verdict
    }
  }
}

export interface ScanInput {
  skillMdContent: string
  scripts?: SkillScript[]
  references?: SkillFile[]
  assets?: SkillFile[]
  name?: string
  author?: string
  githubUrl?: string
}

export function scanSkill(input: ScanInput): ScanReport {
  const findings: ScanFinding[] = []
  const md = String(input.skillMdContent ?? '')

  scanText(md, 'SKILL.md', INJECTION_RULES, findings)
  if (SECRET_LIKE.test(md)) {
    findings.push({
      rule: 'embedded-secret',
      severity: 'blocked',
      file: 'SKILL.md',
      line: md.split('\n').findIndex((l) => SECRET_LIKE.test(l)) + 1,
      excerpt: md.split('\n').find((l) => SECRET_LIKE.test(l))!.trim().slice(0, 120),
      message: 'Contains what looks like a live API key or private key material.',
    })
  }

  for (const s of input.scripts ?? []) {
    scanText(String(s.content ?? ''), s.path || 'script', CODE_RULES, findings)
  }
  // Reference docs are also injected into context, so they get the injection
  // rules too — not just the executable scripts.
  for (const f of input.references ?? []) {
    scanText(String((f as SkillFile).content ?? ''), f.path || 'reference', INJECTION_RULES, findings)
  }

  const blocked = findings.filter((f) => f.severity === 'blocked')
  const warn = findings.filter((f) => f.severity === 'warning')
  const verdict: ScanReport['verdict'] = blocked.length
    ? 'blocked'
    : warn.length
      ? 'caution'
      : 'safe'

  return {
    verdict,
    findings,
    scannedAt: new Date().toISOString(),
    fingerprint: fingerprint([
      md,
      ...(input.scripts ?? []).map((s) => s.path + s.content),
      ...(input.references ?? []).map((f) => f.path + String((f as SkillFile).content ?? '')),
    ]),
  }
}

/** True only for a clean 'safe' report — the gate used by the installer. */
export function isAutoEnableAllowed(report: ScanReport): boolean {
  return report.verdict !== 'blocked'
}

export function summarizeReport(report: ScanReport): string {
  if (!report.findings.length) return 'No findings.'
  const by = new Map<string, ScanFinding[]>()
  for (const f of report.findings) {
    by.set(f.rule, [...(by.get(f.rule) ?? []), f])
  }
  return [...by.values()]
    .flat()
    .map(
      (f) =>
        `[${f.severity.toUpperCase()}] ${f.rule} — ${f.file}:${f.line} — ${f.message}` +
        (f.excerpt ? `\n      ${f.excerpt}` : ''),
    )
    .join('\n')
}

/** Kept exported so tests and the UI can build the same fixture shape. */
export type { InstalledSkill }

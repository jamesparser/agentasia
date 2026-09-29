/**
 * Skill Store — Agent Skills management via Yjs
 *
 * Provides CRUD operations and reactive hooks for installed Agent Skills.
 * Skills are persisted in the `skills` Yjs map and sync across devices via P2P.
 *
 * @module stores/skillStore
 */

import { nanoid } from 'nanoid'
import {
  scanSkill,
  isAutoEnableAllowed,
  type ScanReport,
} from '@/lib/skills/skill-scanner'
import { skills, transact, useLiveMap, useLiveValue } from '@/lib/yjs'
import type { InstalledSkill, SkillScript, SkillFile } from '@/types'
import { getActiveSpaceId, getCreationSpaceId, entityBelongsToSpace, useActiveSpaceId } from '@/stores/spaceStore'

// ============================================================================
// Types
// ============================================================================

/**
 * Data required to install a new skill (everything except auto-generated fields).
 */
export interface InstallSkillData {
  /** Unique identifier (from SkillsMP or generated) */
  id?: string
  name: string
  description: string
  author: string
  license?: string
  metadata?: Record<string, string>
  skillMdContent: string
  scripts: SkillScript[]
  references: SkillFile[]
  assets: SkillFile[]
  githubUrl: string
  stars: number
}

// ============================================================================
// CRUD operations (non-React, callable from anywhere)
// ============================================================================

/**
 * Data required to create a custom skill from scratch.
 */
export interface CreateCustomSkillData {
  name: string
  description: string
  /** Markdown prompt / instructions */
  skillMdContent: string
}

/**
 * Create a custom skill from a name and markdown prompt.
 * Returns the created InstalledSkill.
 */
export function createCustomSkill(data: CreateCustomSkillData): InstalledSkill {
  const now = new Date()
  const skill: InstalledSkill = {
    id: nanoid(),
    name: data.name,
    description: data.description,
    author: 'custom',
    skillMdContent: data.skillMdContent,
    scripts: [],
    references: [],
    assets: [],
    githubUrl: '',
    stars: 0,
    installedAt: now,
    updatedAt: now,
    enabled: true,
    assignedAgentIds: [],
    autoActivate: false,
    spaceId: getCreationSpaceId(),
  }

  transact(() => {
    skills.set(skill.id, skill)
  })

  return skill
}

/**
 * Install a new skill into the store.
 * Returns the created InstalledSkill.
 */
export function installSkill(data: InstallSkillData): InstalledSkill {
  const now = new Date()
  // SECURITY GATE. A skill's SKILL.md becomes agent instructions and its scripts
  // come from a public registry, so installing one is a privilege grant. Scan
  // first: a `blocked` verdict is still recorded (silently discarding the user's
  // install would be worse) but lands DISABLED with the report attached, so they
  // can read which rule fired and overrule it deliberately.
  const report: ScanReport = scanSkill(data)
  const skill: InstalledSkill = {
    id: data.id || nanoid(),
    name: data.name,
    description: data.description,
    author: data.author,
    license: data.license,
    metadata: data.metadata,
    skillMdContent: data.skillMdContent,
    scripts: data.scripts,
    references: data.references,
    assets: data.assets,
    githubUrl: data.githubUrl,
    stars: data.stars,
    installedAt: now,
    updatedAt: now,
    enabled: isAutoEnableAllowed(report),
    security: {
      verdict: report.verdict,
      findings: report.findings,
      scannedAt: report.scannedAt,
      fingerprint: report.fingerprint,
    },
    assignedAgentIds: [],
    autoActivate: false,
    spaceId: getCreationSpaceId(),
  }

  transact(() => {
    skills.set(skill.id, skill)
  })

  return skill
}

/**
 * Re-scan an installed skill. Registry content can change under a fixed id, and
 * skills installed before the scanner existed carry no report at all, so this is
 * the only way to tell "reviewed and clean" from "never looked at".
 *
 * A blocked verdict on re-scan DISABLES the skill even if the user had enabled
 * it: a package that was clean at install and ships a payload later must not
 * keep running.
 */
export function rescanSkill(id: string): InstalledSkill | null {
  const existing = skills.get(id) as InstalledSkill | undefined
  if (!existing) return null
  const report = scanSkill(existing)
  const updated: InstalledSkill = {
    ...existing,
    enabled: existing.enabled && isAutoEnableAllowed(report),
    security: {
      verdict: report.verdict,
      findings: report.findings,
      scannedAt: report.scannedAt,
      fingerprint: report.fingerprint,
    },
  }
  transact(() => {
    skills.set(id, updated)
  })
  return updated
}

/** False for pre-scanner installs, which must not be presented as "safe". */
export function isSkillReviewed(skill: InstalledSkill): boolean {
  return Boolean(skill.security?.scannedAt)
}

/**
 * Uninstall a skill by removing it from the store.
 * Returns true if the skill was found and removed.
 */
export function uninstallSkill(id: string): boolean {
  if (!skills.has(id)) return false
  transact(() => {
    skills.delete(id)
  })
  return true
}

/**
 * Update an existing installed skill.
 * Merges the provided fields with the existing skill data.
 */
/**
 * The scanner is only a real gate if enabling is gated too. Without this,
 * `installSkill()` refusing to auto-enable a blocked skill is cosmetic: flipping
 * the toggle (or `updateSkill({ enabled: true })`) would enable it anyway, so a
 * registry package that is clean at install and ships a payload later - or one
 * that simply tripped a rule - could be switched on without a second thought.
 *
 * Re-scan on enable, because content can change after install. A blocked verdict
 * therefore refuses, unless the caller passes an explicit acknowledgement: a
 * pattern scanner produces false positives, and a silently bricked skill is worse
 * than an overridable one. The acknowledgement is an argument, not a UI default,
 * so a human has to decide deliberately.
 */
export type EnableGuard = {
  ok: boolean
  verdict: 'safe' | 'caution' | 'blocked'
  reason?: string
}

function guardEnable(skill: InstalledSkill, acknowledgeBlocked = false): EnableGuard {
  const report = scanSkill(skill)
  const verdict = report.verdict
  if (verdict === 'blocked' && !acknowledgeBlocked) {
    const first = report.findings.find((f) => f.severity === 'blocked')
    return {
      ok: false,
      verdict,
      reason: first
        ? `${first.rule} in ${first.file}:${first.line} - ${first.message}`
        : 'blocked by the skill scanner',
    }
  }
  return { ok: true, verdict }
}

export function updateSkill(
  id: string,
  updates: Partial<Omit<InstalledSkill, 'id' | 'installedAt'>>,
): InstalledSkill | undefined {
  const existing = skills.get(id)
  if (!existing) return undefined

  const contentChanged =
    'skillMdContent' in updates ||
    'scripts' in updates ||
    'references' in updates

  const updated: InstalledSkill = {
    ...existing,
    ...updates,
    id: existing.id, // Never overwrite id
    installedAt: existing.installedAt, // Never overwrite installedAt
    updatedAt: new Date(),
  }

  if (contentChanged) {
    // The previous verdict described the old bytes; restate it for the new ones.
    const report = scanSkill(updated)
    updated.security = {
      verdict: report.verdict,
      findings: report.findings,
      scannedAt: report.scannedAt,
      fingerprint: report.fingerprint,
    }
  }

  // Enabling through an edit is still an enable, so it goes through the same
  // gate. No acknowledgement flag here on purpose: `updateSkill` is an editing
  // entry point, and overriding a blocked verdict belongs on the explicit
  // toggle (`setSkillEnabled(id, true, true)`), where the intent is unambiguous.
  if (updates.enabled === true && !guardEnable(updated).ok) {
    updated.enabled = false
  }

  transact(() => {
    skills.set(id, updated)
  })

  return updated
}

/**
 * Enable or disable a skill.
 */
export function setSkillEnabled(
  id: string,
  enabled: boolean,
  acknowledgeBlocked = false,
): boolean {
  const existing = skills.get(id) as InstalledSkill | undefined
  if (!existing) return false

  if (enabled) {
    const guard = guardEnable(existing, acknowledgeBlocked)
    if (!guard.ok) return false
  }

  transact(() => {
    skills.set(id, { ...existing, enabled, updatedAt: new Date() })
  })

  return true
}

/**
 * Assign a skill to specific agents.
 * Pass an empty array to make the skill available to all agents.
 */
export function assignSkillToAgents(id: string, agentIds: string[]): boolean {
  const existing = skills.get(id)
  if (!existing) return false

  transact(() => {
    skills.set(id, {
      ...existing,
      assignedAgentIds: agentIds,
      updatedAt: new Date(),
    })
  })

  return true
}

// ============================================================================
// Read operations
// ============================================================================

/**
 * Get all installed skills for the active space.
 */
export function getInstalledSkills(): InstalledSkill[] {
  const spaceId = getActiveSpaceId()
  return Array.from(skills.values()).filter((s) =>
    entityBelongsToSpace(s.spaceId, spaceId),
  )
}

/**
 * Get only enabled installed skills for the active space.
 */
export function getEnabledSkills(): InstalledSkill[] {
  const spaceId = getActiveSpaceId()
  return Array.from(skills.values()).filter(
    (s) => s.enabled && entityBelongsToSpace(s.spaceId, spaceId),
  )
}

/**
 * Get a skill by its ID.
 */
export function getSkillById(id: string): InstalledSkill | undefined {
  return skills.get(id)
}

/**
 * Get a skill by its name (case-insensitive match).
 */
export function getSkillByName(name: string): InstalledSkill | undefined {
  const lower = name.toLowerCase()
  for (const skill of skills.values()) {
    if (skill.name.toLowerCase() === lower) return skill
  }
  return undefined
}

/**
 * Get enabled skills available to a specific agent in the active space.
 * Returns skills that are either globally available (empty assignedAgentIds)
 * or explicitly assigned to the given agent.
 */
export function getSkillsForAgent(agentId: string): InstalledSkill[] {
  const spaceId = getActiveSpaceId()
  return Array.from(skills.values()).filter(
    (skill) =>
      skill.enabled &&
      entityBelongsToSpace(skill.spaceId, spaceId) &&
      (skill.assignedAgentIds.length === 0 ||
        skill.assignedAgentIds.includes(agentId)),
  )
}

/**
 * Check if a skill with the given GitHub URL is already installed in the active space.
 */
export function isSkillInstalled(githubUrl: string): boolean {
  const spaceId = getActiveSpaceId()
  for (const skill of skills.values()) {
    if (
      skill.githubUrl === githubUrl &&
      entityBelongsToSpace(skill.spaceId, spaceId)
    )
      return true
  }
  return false
}

/**
 * Find an installed skill by its GitHub URL in the active space.
 */
export function getSkillByGitHubUrl(
  githubUrl: string,
): InstalledSkill | undefined {
  const spaceId = getActiveSpaceId()
  for (const skill of skills.values()) {
    if (
      skill.githubUrl === githubUrl &&
      entityBelongsToSpace(skill.spaceId, spaceId)
    )
      return skill
  }
  return undefined
}

// ============================================================================
// React hooks (for components)
// ============================================================================

/**
 * Reactive hook: returns all installed skills for the active space.
 */
export function useSkills(): InstalledSkill[] {
  const all = useLiveMap(skills)
  const spaceId = useActiveSpaceId()
  return all.filter((s) => entityBelongsToSpace(s.spaceId, spaceId))
}

/**
 * Reactive hook: returns a specific skill by ID, updating when it changes.
 */
export function useSkill(id: string): InstalledSkill | undefined {
  return useLiveValue(skills, id)
}

/**
 * Reactive hook: returns enabled skills for a specific agent in the active space.
 */
export function useSkillsForAgent(agentId: string): InstalledSkill[] {
  const allSkills = useLiveMap(skills)
  const spaceId = useActiveSpaceId()
  return allSkills.filter(
    (skill) =>
      skill.enabled &&
      entityBelongsToSpace(skill.spaceId, spaceId) &&
      (skill.assignedAgentIds.length === 0 ||
        skill.assignedAgentIds.includes(agentId)),
  )
}

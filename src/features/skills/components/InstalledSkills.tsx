/**
 * InstalledSkills — List of installed skills with management controls.
 */

import { useState } from 'react'
import { Card, CardBody, Chip, Switch, Button } from '@heroui/react'
import { Icon } from '@/components'
import { useSkills } from '@/stores/skillStore'
import {
  setSkillEnabled,
  uninstallSkill,
} from '@/stores/skillStore'
import type { InstalledSkill } from '@/types'
import { getSkillCompatibility } from '@/lib/skills/skill-prompt'

interface InstalledSkillsProps {
  /** Translate function */
  t: (key: string) => string
  /** Called when a skill is selected for detail view */
  onSelect?: (skill: InstalledSkill) => void
}

export function InstalledSkills({ t, onSelect }: InstalledSkillsProps) {
  const skills = useSkills()
  // Why a skill could not be switched on. The store re-scans on enable and
  // refuses a `blocked` verdict, so the toggle must say so instead of silently
  // snapping back - a refusal that looks like a broken switch teaches the user
  // nothing about the risk, and a disabled chip teaches nothing either.
  const [refused, setRefused] = useState<Record<string, string>>({})

  const verdictOf = (skill: InstalledSkill) =>
    skill.security?.verdict ?? ('unreviewed' as const)

  const verdictChip = (skill: InstalledSkill) => {
    const verdict = verdictOf(skill)
    if (verdict === 'blocked')
      return (
        <Chip size="sm" variant="flat" color="danger" startContent={<Icon name="ShieldAlert" width={12} height={12} />}>
          {t('Blocked')}
        </Chip>
      )
    if (verdict === 'caution')
      return (
        <Chip size="sm" variant="flat" color="warning" startContent={<Icon name="ShieldAlert" width={12} height={12} />}>
          {t('Needs review')}
        </Chip>
      )
    if (verdict === 'unreviewed')
      return (
        <Chip size="sm" variant="flat" color="default">
          {t('Not checked')}
        </Chip>
      )
    return (
      <Chip size="sm" variant="flat" color="success" startContent={<Icon name="ShieldCheck" width={12} height={12} />}>
        {t('Checked')}
      </Chip>
    )
  }

  const handleToggle = (skill: InstalledSkill, enabled: boolean) => {
    const ok = setSkillEnabled(skill.id, enabled)
    if (ok) {
      if (refused[skill.id]) {
        const next = { ...refused }
        delete next[skill.id]
        setRefused(next)
      }
      return
    }
    const first =
      skill.security?.findings?.find((f) => f.severity === 'blocked') ??
      skill.security?.findings?.[0]
    setRefused((prev) => ({
      ...prev,
      [skill.id]: first
        ? `${first.file}:${first.line} - ${first.message}`
        : t('The skill checker refused to enable this skill'),
    }))
  }

  if (skills.length === 0) {
    return (
      <div className="text-center py-12 text-default-400">
        <Icon name="OpenBook" width={40} height={40} className="mx-auto mb-3" />
        <p className="text-sm font-medium">{t('No skills installed')}</p>
        <p className="text-xs mt-1">
          {t('Search the SkillsMP registry to discover and install skills')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {skills.map((skill) => {
        const compat = getSkillCompatibility(skill)
        return (
          <Card
            key={skill.id}
            isPressable
            onPress={() => onSelect?.(skill)}
            shadow="sm"
          >
            <CardBody className="flex flex-row items-center gap-4 p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold">{skill.name}</h3>
                  {compat.canExecute ? (
                    <Chip size="sm" variant="dot" color="success">
                      {t('Compatible')}
                    </Chip>
                  ) : (
                    <Chip size="sm" variant="dot" color="warning">
                      {t('Partial')}
                    </Chip>
                  )}
                </div>
                <p className="text-xs text-default-500 truncate mt-0.5">
                  {skill.description}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs text-default-400">
                  <span>
                    {t('by {author}').replace('{author}', skill.author)}
                  <span>·</span>
                  {verdictChip(skill)}
                  </span>
                  {skill.scripts.length > 0 && (
                    <>
                      <span>·</span>
                      <span>
                        {skill.scripts.length} {t('Scripts')}
                      </span>
                    </>
                  )}
                </div>
                {refused[skill.id] && (
                  <p className="text-xs text-danger mt-1" role="alert">
                    {t('Not enabled')}: {refused[skill.id]}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Switch
                  size="sm"
                  isSelected={skill.enabled}
                  onValueChange={(enabled) => handleToggle(skill, enabled)}
                  aria-label={skill.enabled ? t('Disable') : t('Enable')}
                />
                <Button
                  size="sm"
                  variant="flat"
                  color="danger"
                  isIconOnly
                  onPress={() => uninstallSkill(skill.id)}
                  aria-label={t('Uninstall')}
                >
                  <Icon name="Trash" width={14} height={14} />
                </Button>
              </div>
            </CardBody>
          </Card>
        )
      })}
    </div>
  )
}

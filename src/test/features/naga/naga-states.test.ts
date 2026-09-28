import { describe, expect, it } from 'vitest'
import { headCount, poseFor, stateFromEvent, ORGANS, type NagaState } from '@/features/naga/naga-states'

const STATES: NagaState[] = ['idle', 'listening', 'reading', 'thinking', 'searching',
  'remembering', 'tool', 'speaking', 'jobDone', 'refusing', 'error']

describe('naga state machine', () => {
  it('every state has a pose, an aria label and at least one organ', () => {
    for (const s of STATES) {
      const p = poseFor(s)
      expect(p.active.length, s).toBeGreaterThan(0)
      expect(p.aria, s).toMatch(/^Naga /)
      for (const organ of p.active) expect(ORGANS[organ], `${s}:${organ}`).toBeTruthy()
    }
  })

  it('colour never carries state alone: every organ has a distinct shape verb', () => {
    const shapes = Object.values(ORGANS).map((o) => o.shape)
    expect(new Set(shapes).size).toBe(shapes.length)
    const colors = Object.values(ORGANS).map((o) => o.color)
    expect(new Set(colors).size).toBe(colors.length)
  })

  it('search lights the hood (Tavily) and memory lights the gem (Mem0)', () => {
    expect(poseFor('searching').active).toContain('hood')
    expect(poseFor('remembering').active).toContain('gem')
    expect(poseFor('tool').active).toEqual(['claws'])
    expect(poseFor('idle').active).toEqual(['heart'])
  })

  it('amplitude only drives the jaw, never a resting face', () => {
    expect(poseFor('speaking', 0.62).amplitude).toBeCloseTo(0.62)
    expect(poseFor('speaking', 9).amplitude).toBe(1)
    expect(poseFor('speaking', -3).amplitude).toBe(0)
    expect(poseFor('speaking', NaN).amplitude).toBe(0)
    expect(poseFor('idle', 0.9).amplitude).toBe(0)
  })

  it('maps gateway events, including web_search specifically', () => {
    expect(stateFromEvent({ type: 'tool.start', toolName: 'web_search' })).toBe('searching')
    expect(stateFromEvent({ type: 'tool.start', toolName: 'run_command' })).toBe('tool')
    expect(stateFromEvent({ type: 'tool.end', ok: false })).toBe('refusing')
    expect(stateFromEvent({ type: 'schedule.completed' })).toBe('jobDone')
    expect(stateFromEvent({ type: 'mic.open' })).toBe('listening')
    expect(stateFromEvent({ type: 'nonsense' })).toBe('idle')
  })

  it('drops heads before it drops legibility', () => {
    expect(headCount(600)).toBe(5)
    expect(headCount(420)).toBe(5)
    expect(headCount(300)).toBe(3)
    expect(headCount(179)).toBe(1)
    expect(headCount(-5)).toBe(1)
  })

  it('unknown state degrades to idle instead of throwing', () => {
    expect(poseFor('nope' as NagaState).active).toEqual(['heart'])
  })
})

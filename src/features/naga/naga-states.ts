/**
 * Naga state machine — the face is the architecture readout.
 *
 * Five heads, always front-facing, always looking at the viewer; each organ owns a
 * lane and changes SHAPE as well as colour, so state survives colour-blindness and
 * a washed-out TV panel. Art is supplied by a layered raster puppet (one PNG per
 * organ) — deliberately not SVG, and nothing here depends on the artwork existing
 * yet, so the UI and the tests can be built before the keyframes land.
 */
export type NagaState =
  | 'idle'        // heart pulse only
  | 'listening'   // eyes wide, heads lean in, mic live
  | 'reading'     // eyes saccade down the input, then back to camera
  | 'thinking'    // slow blink, hold gaze, hood half-open
  | 'searching'   // hood flares (Tavily), citation card slides in
  | 'remembering' // crest gem brightens (Mem0)
  | 'tool'        // claws close (MCP/skills), release on result
  | 'speaking'    // jaw moves, amplitude-synced to TTS
  | 'jobDone'     // heart burst on scheduled-task completion
  | 'refusing'    // gentle shake: declined, or could not verify
  | 'error'       // dim + settle, never a red alarm flash

/** Lane -> organ -> colour. Colours are garnish; the shape change is the signal. */
export const ORGANS = {
  mouth: { lane: 'chat+voice', color: '#f5c46a', shape: 'jaw' },
  eyes: { lane: 'vision+reading', color: '#5ad1e6', shape: 'track' },
  claws: { lane: 'code+mcp+skills', color: '#e8963f', shape: 'close' },
  hood: { lane: 'tavily search', color: '#c86ae6', shape: 'flare' },
  gem: { lane: 'mem0 memory', color: '#6a9bf0', shape: 'brighten' },
  heart: { lane: 'scheduled tasks', color: '#5fd39a', shape: 'pulse' },
} as const

export type Organ = keyof typeof ORGANS

export interface NagaPose {
  /** Organs to animate this frame, in z-order. */
  active: Organ[]
  /** 0..1 loudness for jaw sync; 0 unless speaking. */
  amplitude: number
  /** Loop timing hint so CSS can share one clock. */
  tempo: 'slow' | 'mid' | 'fast'
  /** Accessible label — always set; never colour alone. */
  aria: string
}

const POSES: Record<NagaState, Omit<NagaPose, 'amplitude'>> = {
  idle: { active: ['heart'], tempo: 'slow', aria: 'Naga is waiting' },
  listening: { active: ['eyes', 'heart'], tempo: 'mid', aria: 'Naga is listening' },
  reading: { active: ['eyes'], tempo: 'mid', aria: 'Naga is reading your message' },
  thinking: { active: ['eyes', 'mouth'], tempo: 'slow', aria: 'Naga is thinking' },
  searching: { active: ['hood', 'eyes'], tempo: 'mid', aria: 'Naga is searching the web' },
  remembering: { active: ['gem', 'eyes'], tempo: 'mid', aria: 'Naga is recalling what it knows about you' },
  tool: { active: ['claws'], tempo: 'fast', aria: 'Naga is using a tool' },
  speaking: { active: ['mouth', 'eyes'], tempo: 'fast', aria: 'Naga is speaking' },
  jobDone: { active: ['heart', 'gem'], tempo: 'mid', aria: 'Naga finished a scheduled task' },
  refusing: { active: ['mouth', 'eyes'], tempo: 'mid', aria: 'Naga declined or could not verify' },
  error: { active: ['heart'], tempo: 'slow', aria: 'Naga hit a problem' },
}

export function poseFor(state: NagaState, amplitude = 0): NagaPose {
  const base = POSES[state] ?? POSES.idle
  return { ...base, amplitude: state === 'speaking' ? clamp01(amplitude) : 0 }
}

/**
 * Responsive mark ladder: five heads only where there is room for them.
 * Never ask five heads to survive at 48px.
 */
export function headCount(width: number): 1 | 3 | 5 {
  if (width >= 420) return 5
  if (width >= 180) return 3
  return 1
}

function clamp01(n: number) {
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0
}

/** Gateway/telemetry event -> state, so the face is driven by facts not vibes. */
export function stateFromEvent(e: {
  type: string
  toolName?: string
  ok?: boolean
}): NagaState {
  switch (e.type) {
    case 'mic.open':
    case 'stt.partial':
      return 'listening'
    case 'input.submit':
      return 'reading'
    case 'chat.start':
      return 'thinking'
    case 'tool.start':
      return e.toolName === 'web_search' ? 'searching' : 'tool'
    case 'tool.end':
      return e.ok === false ? 'refusing' : 'speaking'
    case 'memory.search':
      return 'remembering'
    case 'tts.speaking':
      return 'speaking'
    case 'tts.end':
      return 'idle'
    case 'schedule.completed':
      return 'jobDone'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}

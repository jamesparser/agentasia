import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { poseFor, type NagaState } from './naga-states'

/**
 * The talking naga: an original, front facing serpent head drawn as SVG so it
 * stays sharp at any size, weighs nothing and needs no outside service.
 *
 * The jaw follows `amplitude` (0..1), the eyes follow the state, the crest gem
 * brightens when it is remembering and the hood flares when it is searching.
 * State is carried by shape as well as colour (see naga-states.ts).
 */
export interface NagaFaceProps {
  state: NagaState
  /** 0..1 loudness for the jaw. Ignored unless speaking. */
  amplitude?: number
  className?: string
}

export function NagaFace({ state, amplitude = 0, className }: NagaFaceProps) {
  const pose = poseFor(state, amplitude)
  const open = pose.amplitude // 0..1
  const jaw = open * 20 // degrees
  const flare = state === 'searching' ? 1.08 : state === 'thinking' ? 1.03 : 1
  const gemGlow = state === 'remembering' ? 1 : state === 'speaking' ? 0.7 : 0.35
  const squint = state === 'thinking' ? 0.45 : state === 'listening' ? 1.15 : 1
  const lookY = state === 'reading' ? 3 : 0

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={pose.aria}
      className={cn('naga-face select-none', className)}
    >
      <defs>
        <radialGradient id="naga-skin" cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#5fd39a" />
          <stop offset="60%" stopColor="#2f9d6b" />
          <stop offset="100%" stopColor="#1b6b48" />
        </radialGradient>
        <linearGradient id="naga-hood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8b04a" />
          <stop offset="100%" stopColor="#a8651f" />
        </linearGradient>
        <radialGradient id="naga-gem" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#bcd6ff" />
          <stop offset="100%" stopColor="#4a7fe0" />
        </radialGradient>
        <style>{`
          @keyframes naga-blink { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(0.08) } }
          @keyframes naga-breathe { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(1.5px) } }
          .naga-eye { transform-box: fill-box; transform-origin: center; animation: naga-blink 5s infinite; }
          .naga-body { animation: naga-breathe 4s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) { .naga-eye, .naga-body { animation: none; } }
        `}</style>
      </defs>

      <g className="naga-body">
        {/* Hood */}
        <g
          style={{
            transformOrigin: '100px 120px',
            transform: `scale(${flare})`,
            transition: 'transform 300ms ease',
          }}
        >
          <path
            d="M100 18 C 40 22, 6 70, 14 128 C 20 170, 62 190, 100 190 C 138 190, 180 170, 186 128 C 194 70, 160 22, 100 18 Z"
            fill="url(#naga-hood)"
          />
          <path
            d="M100 30 C 54 34, 24 74, 30 124 C 36 160, 68 178, 100 178 C 132 178, 164 160, 170 124 C 176 74, 146 34, 100 30 Z"
            fill="none"
            stroke="#7a4310"
            strokeWidth="2"
            opacity="0.45"
          />
        </g>

        {/* Head */}
        <path
          d="M100 40 C 66 40, 48 70, 50 100 C 52 126, 70 142, 100 142 C 130 142, 148 126, 150 100 C 152 70, 134 40, 100 40 Z"
          fill="url(#naga-skin)"
        />

        {/* Crest gem */}
        <g style={{ transition: 'opacity 300ms ease' }} opacity={gemGlow + 0.3}>
          <circle cx="100" cy="56" r="10" fill="url(#naga-gem)" />
          <circle cx="100" cy="56" r={10 + gemGlow * 5} fill="#6a9bf0" opacity={0.18 * gemGlow} />
        </g>

        {/* Brow ridges */}
        <path d="M62 84 Q 76 76 90 84" stroke="#1b6b48" strokeWidth="4" fill="none" strokeLinecap="round" />
        <path d="M110 84 Q 124 76 138 84" stroke="#1b6b48" strokeWidth="4" fill="none" strokeLinecap="round" />

        {/* Eyes */}
        <g>
          {[76, 124].map((cx) => (
            <g key={cx} className="naga-eye">
              <ellipse cx={cx} cy={96} rx={11} ry={9 * squint} fill="#fff6d8" />
              <ellipse cx={cx} cy={96 + lookY} rx={3.4} ry={8 * squint} fill="#1a1a1a" />
              <circle cx={cx - 2} cy={93 + lookY} r={1.4} fill="#fff" />
            </g>
          ))}
        </g>

        {/* Nostrils */}
        <circle cx="93" cy="116" r="1.8" fill="#14502f" />
        <circle cx="107" cy="116" r="1.8" fill="#14502f" />

        {/* Lower jaw: hinges at the back of the mouth and swings with the voice */}
        <g
          style={{
            transformOrigin: '100px 128px',
            transform: `rotate(${jaw}deg)`,
            transition: 'transform 70ms linear',
          }}
        >
          <path
            d="M62 128 C 68 150, 84 160, 100 160 C 116 160, 132 150, 138 128 C 124 134, 112 136, 100 136 C 88 136, 76 134, 62 128 Z"
            fill="#2a8a5e"
            stroke="#14502f"
            strokeWidth="1.5"
          />
          {open > 0.15 && (
            <path d="M100 138 L 100 150 M100 150 L 94 156 M100 150 L 106 156" stroke="#d6425a" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}
        </g>

        {/* Mouth line and fangs sit over the jaw so a closed mouth reads cleanly */}
        <path d="M62 128 C 76 134, 88 136, 100 136 C 112 136, 124 134, 138 128" stroke="#14502f" strokeWidth="2" fill="none" />
        <path d="M80 133 L 83 142 L 86 134 Z" fill="#fff6d8" />
        <path d="M114 134 L 117 142 L 120 133 Z" fill="#fff6d8" />
      </g>
    </svg>
  )
}

/**
 * Loudness for the jaw. Uses the real analyser when the voice engine gives one
 * (in browser neural voices); the device's own voices expose no audio, so while
 * speaking they get a natural looking syllable rhythm instead.
 */
export function useSpeechAmplitude(
  speaking: boolean,
  analyserRef?: { current: AnalyserNode | null },
): number {
  const [amp, setAmp] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (!speaking) {
      setAmp(0)
      return
    }
    let t = 0
    const buf = new Uint8Array(256)
    const tick = () => {
      t += 1
      const analyser = analyserRef?.current
      let next: number
      if (analyser) {
        analyser.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128
          sum += v * v
        }
        next = Math.min(1, Math.sqrt(sum / buf.length) * 5)
      } else {
        // Roughly four to five syllables a second with a little irregularity.
        next = 0.35 + 0.35 * Math.abs(Math.sin(t / 5.5)) + 0.15 * Math.abs(Math.sin(t / 2.3))
      }
      setAmp(next)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [speaking, analyserRef])

  return amp
}

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
  const speaking = state === 'speaking'
  const scale = speaking ? 1 + Math.min(0.035, pose.amplitude * 0.035) : 1
  const glow = state === 'remembering' ? '0 0 28px rgba(106,155,240,.85)' : '0 0 18px rgba(47,157,107,.35)'

  return (
    <div
      role="img"
      aria-label={pose.aria}
      className={cn('naga-face relative select-none overflow-hidden rounded-full', className)}
      style={{
        transform: `scale(${scale})`,
        transition: 'transform 120ms ease, box-shadow 300ms ease',
        boxShadow: glow,
      }}
    >
      <img
        src="/brand/facemode-naga.jpg"
        alt="Naga"
        className={cn(
          'h-full w-full object-cover',
          state === 'thinking' && 'saturate-75',
          state === 'listening' && 'brightness-110',
          state === 'searching' && 'hue-rotate-15',
        )}
        draggable={false}
      />
      {speaking && (
        <span
          aria-hidden="true"
          className="absolute inset-0 rounded-full border-2 border-primary-300/60"
          style={{ transform: `scale(${1 + pose.amplitude * 0.08})`, transition: 'transform 70ms linear' }}
        />
      )}
    </div>
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

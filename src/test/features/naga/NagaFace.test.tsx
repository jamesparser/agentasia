import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NagaFace } from '@/features/naga'

describe('NagaFace', () => {
  it('labels itself and opens the jaw only while speaking', () => {
    const speaking = renderToStaticMarkup(<NagaFace state="speaking" amplitude={1} />)
    expect(speaking).toContain('Naga is speaking')
    expect(speaking).toContain('rotate(20deg)')
    const idle = renderToStaticMarkup(<NagaFace state="idle" amplitude={1} />)
    expect(idle).toContain('Naga is waiting')
    expect(idle).toContain('rotate(0deg)')
  })
})

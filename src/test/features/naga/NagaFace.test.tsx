import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NagaFace } from '@/features/naga'

describe('NagaFace', () => {
  it('uses the uploaded FaceMode artwork and keeps the speaking state accessible', () => {
    const speaking = renderToStaticMarkup(<NagaFace state="speaking" amplitude={1} />)
    expect(speaking).toContain('Naga is speaking')
    expect(speaking).toContain('/brand/facemode-naga.jpg')
    expect(speaking).toContain('border-primary-300/60')
    const idle = renderToStaticMarkup(<NagaFace state="idle" amplitude={1} />)
    expect(idle).toContain('Naga is waiting')
    expect(idle).toContain('/brand/facemode-naga.jpg')
  })
})

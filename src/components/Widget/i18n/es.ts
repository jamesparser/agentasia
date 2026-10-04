import { en } from './en'

type I18n = Record<(typeof en)[number], string>

export const es: I18n = {
  Render: 'Renderizar',
  Code: 'Código',
  'Loading…': 'Cargando…',
  Download: 'Descargar',
} as const

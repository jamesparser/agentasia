import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pt. Needs native review. */
export const pt: I18n = {
  'Expand artifacts panel': 'Expandir painel de artefatos',
  'Minimize artifacts panel': 'Painel Minimizar artefatos',
  'Previous artifact': 'Artefato anterior',
  'Next artifact': 'Próximo artefato',
  'Dependencies': 'Dependências',
  'Validates Requirements': 'Valida Requisitos',
  'No artifact selected': 'Nenhum artefato selecionado',
} as const

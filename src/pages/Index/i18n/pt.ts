import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pt. Needs native review. */
export const pt: I18n = {
  'Hey {productName}': 'Olá, {productName}',
  'Your AI team is ready': 'Sua equipe de IA está pronta',
  'Failed to get response from LLM. Please try again later.': 'Falha ao obter resposta do LLM. Por favor, tente novamente mais tarde.',
  'Writing': 'Escrita',
  'Learn': 'Aprenda',
  'Life': 'Vida',
  'Art': 'Arte',
  'Coding': 'Codificação',
  'Live': 'Ao vivo',
  'Studio': 'Estúdio',
  'Install {productName}': 'Instale {productName}',
  'Install this app on your device for a better experience and offline access.': 'Instale este aplicativo no seu dispositivo para uma melhor experiência e acesso offline.',
  'Recent conversations': 'Conversas recentes',
  'View all': 'Ver tudo',
  'Untitled conversation': 'Conversa sem título',
} as const

import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pt. Needs native review. */
export const pt: I18n = {
  'DEVS Tours': 'Passeios DEVS',
  'Explore the platform in 30-second videos': 'Explore a plataforma em vídeos de 30 segundos',
  'Product Tour': 'Tour do produto',
  'Agent Studio': 'Estúdio de Agente',
  'Task Delegation': 'Delegação de Tarefas',
  'Privacy First': 'Privacidade em primeiro lugar',
  'Inbox Workflow': 'Fluxo de trabalho da caixa de entrada',
  'The full DEVS story in 30 seconds': 'A história completa do DEVS em 30 segundos',
  'Build your own AI team': 'Construa sua própria equipe de IA',
  'Delegate, don’t chat': 'Delegue, não converse',
  'Your keys. Your data. Your browser.': 'Suas chaves. Seus dados. Seu navegador.',
  'Your AI tasks': 'Suas tarefas de IA',
  '← All tours': '← Todos os passeios',
} as const

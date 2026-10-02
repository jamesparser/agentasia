import { en } from './en'

type I18n = Record<(typeof en)[number], string>

/** Unreviewed machine-translation draft: pt. Needs native review. */
export const pt: I18n = {
  'All': 'Todos',
  'Running': 'Correndo',
  'Completed': 'Concluído',
  'Pending': 'Pendente',
  'Failed': 'Falha',
  'No tasks found': 'Nenhuma tarefa encontrada',
  'No {status} tasks found': 'Nenhuma tarefa {status} encontrada',
  'Due': 'Devido',
  'simple': 'simples',
  'complex': 'complexo',
  'requirements': 'requisitos',
  'Filter by status': 'Filtrar por status',
  'In Progress': 'Em andamento',
  'Sub-Tasks': 'Subtarefas',
  'Tasks & Sub-Tasks': 'Tarefas e subtarefas',
  'Scope': 'Escopo',
  'Status': 'Estado',
  'Filters': 'Filtros',
} as const

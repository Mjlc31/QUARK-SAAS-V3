/**
 * Motor de agregação de performance, produtividade e auditoria da equipe comercial (QUARK OS).
 * Cruza dados de tarefas, atividades de CRM, leads, propostas e eventos de gamificação (XP).
 */

export type Period = 'hoje' | '7d' | '30d';

export const PERIOD_LABEL: Record<Period, string> = {
  hoje: 'Hoje',
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarInitials: string;
  phone?: string;
  isOnline?: boolean;
  lastActive?: string;
}

export interface MemberPerformanceStats {
  userId: string;
  userName: string;
  role: string;
  actionsCount: number;
  tasksDone: number;
  tasksLate: number;
  tasksToday: number;
  completionRate: number; // 0 a 100%
  leadsCreated: number;
  openLeads: number;
  pipelineValue: number; // R$ total no funil
  proposalsCount: number;
  salesCount: number;
  xpPoints: number;
  lastActive: string | null;
  isOnline: boolean;
}

export interface TeamFeedItem {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  type: 'lead' | 'tarefa' | 'etapa' | 'proposta' | 'venda' | 'atividade';
  title: string;
  details?: string;
  leadName?: string;
}

export function periodStart(p: Period, now = new Date()): Date {
  const d = new Date(now);
  if (p === 'hoje') {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  d.setDate(d.getDate() - (p === '7d' ? 7 : 30));
  return d;
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** Formata tempo relativo amigável (ex: 'Há 5 min', 'Há 2h', 'Ontem') */
export function timeAgo(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Ainda não ativo';
  const diff = Date.now() - new Date(isoDate).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Agora mesmo';
  if (min < 60) return `Há ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `Há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Ontem';
  return `Há ${days} dias`;
}

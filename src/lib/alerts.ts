/**
 * Motor de Inteligência Preditiva: Alertas "Precisa de Atenção"
 * Identifica oportunidades de venda que podem esfriar, propostas não abertas,
 * propostas vencendo e pendências críticas de pós-venda.
 */

const DAY = 86400000;
const daysSince = (iso: string | null | undefined, now: number) =>
  iso ? Math.floor((now - new Date(iso).getTime()) / DAY) : 0;
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export type AlertKind =
  | 'viewed'
  | 'unopened'
  | 'expiring'
  | 'no-contact'
  | 'no-next-step'
  | 'overdue'
  | 'signature'
  | 'procuracao';

export interface SmartAlert {
  id: string;
  kind: AlertKind;
  href: string;
  title: string;
  text: string;
  weight: number;
  leadId?: string;
  clientName?: string;
  clientPhone?: string;
  /** Tarefa sugerida para resolver com um clique (com mensagem pronta para WhatsApp) */
  suggest?: { title: string; type: string; copy: string };
  /** Atalho de navegação (ex.: gerar procuração ou contrato) */
  cta?: { label: string; href: string };
}

export interface AlertInputData {
  leads?: any[];
  proposals?: any[];
  tasks?: any[];
  documents?: any[];
}

const OPEN_STATUSES = ['Lead', 'Qualificacao', 'novo', 'contato', 'visita', 'proposta', 'negociacao'];

export function computeAlerts(
  { leads = [], proposals = [], tasks = [], documents = [] }: AlertInputData,
  now = Date.now()
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  // 1. Propostas em risco
  for (const p of proposals) {
    const lead = leads.find((l) => l.id === p.lead_id || l.id === p.leadId);
    const name = lead?.name || p.lead_name || p.client_name || 'Cliente';
    const phone = lead?.phone || p.phone || '';
    const propNumber = p.number || (p.id ? String(p.id).slice(0, 4) : '—');

    // Visualizada há mais de 2 dias sem fechamento
    const viewedAt = p.viewed_at || p.viewedAt;
    if (p.status === 'visualizada' && viewedAt && daysSince(viewedAt, now) >= 2) {
      const d = daysSince(viewedAt, now);
      alerts.push({
        id: `v-${p.id}`,
        kind: 'viewed',
        href: `/propostas`,
        leadId: p.lead_id || p.leadId,
        clientName: name,
        clientPhone: phone,
        title: `${name} abriu a proposta #${propNumber}`,
        text: `Visualizada há ${plural(d, 'dia', 'dias')}, sem resposta. Momento ideal para follow-up.`,
        weight: 3 + d,
        suggest: {
          title: `Follow-up da proposta #${propNumber}`,
          type: 'whatsapp',
          copy: `Olá, ${name.split(' ')[0]}! Vi que você conseguiu abrir a proposta da Quark Energia ☀️ Ficou alguma dúvida técnica ou sobre as opções de pagamento? Posso te ligar 5 minutinhos para te explicar tudo?`,
        },
      });
    }

    // Enviada há mais de 3 dias e ainda não visualizada
    const sentAt = p.sent_at || p.sentAt || p.created_at;
    if (p.status === 'enviada' && sentAt && daysSince(sentAt, now) >= 3) {
      const d = daysSince(sentAt, now);
      alerts.push({
        id: `e-${p.id}`,
        kind: 'unopened',
        href: `/propostas`,
        leadId: p.lead_id || p.leadId,
        clientName: name,
        clientPhone: phone,
        title: `Proposta #${propNumber} não foi aberta`,
        text: `Enviada para ${name} há ${plural(d, 'dia', 'dias')}. Confirme se o link chegou via WhatsApp/E-mail.`,
        weight: 2 + d / 2,
        suggest: {
          title: `Confirmar recebimento da proposta #${propNumber}`,
          type: 'whatsapp',
          copy: `Olá, ${name.split(' ')[0]}! Tudo bem? Passando para checar se você recebeu o link da proposta solar que te enviei. Quer que eu te reenvie por aqui?`,
        },
      });
    }

    // Validade da proposta expirando (<= 2 dias)
    const validUntil = p.valid_until || p.validUntil;
    if ((p.status === 'enviada' || p.status === 'visualizada') && validUntil) {
      const left = Math.ceil((new Date(`${validUntil}T23:59:59`).getTime() - now) / DAY);
      if (left >= 0 && left <= 2) {
        alerts.push({
          id: `x-${p.id}`,
          kind: 'expiring',
          href: `/propostas`,
          leadId: p.lead_id || p.leadId,
          clientName: name,
          clientPhone: phone,
          title: `Proposta #${propNumber} vence ${left === 0 ? 'hoje' : `em ${plural(left, 'dia', 'dias')}`}`,
          text: `${name} · Use a validade do kit como gatilho de fechamento imediato.`,
          weight: 6 - left,
          suggest: {
            title: `Gatilho de validade #${propNumber}`,
            type: 'whatsapp',
            copy: `Olá, ${name.split(' ')[0]}! Passando para te avisar que as condições especiais e garantia da sua proposta da Quark encerram ${left === 0 ? 'hoje' : 'amanhã'}. Quer que eu reserve esses módulos para o seu telhado?`,
          },
        });
      }
    }
  }

  // 2. Leads novos sem primeiro contato ou parados
  const taskLeadIds = new Set(
    tasks
      .filter((t) => !(t.completed || t.done) && (t.leadId || t.lead_id))
      .map((t) => t.leadId || t.lead_id)
  );

  for (const l of leads) {
    const lCreatedAt = l.created_at || l.createdAt;
    const lUpdatedAt = l.updated_at || l.updatedAt || lCreatedAt;
    const lStatus = l.status || 'Lead';

    // Lead novo sem contato há 1+ dia
    if ((lStatus === 'Lead' || lStatus === 'novo') && daysSince(lCreatedAt, now) >= 1) {
      const d = daysSince(lCreatedAt, now);
      alerts.push({
        id: `l-${l.id}`,
        kind: 'no-contact',
        href: `/crm`,
        leadId: l.id,
        clientName: l.name,
        clientPhone: l.phone,
        title: `${l.name} ainda sem primeiro contato`,
        text: `Lead cadastrado há ${plural(d, 'dia', 'dias')}. Quem atende nos primeiros 10 minutos tem 7x mais chances de converter.`,
        weight: 4 + d,
        suggest: {
          title: `Primeiro contato com ${l.name}`,
          type: 'whatsapp',
          copy: `Olá, ${l.name.split(' ')[0]}! Aqui é da equipe técnica da Quark Energia ☀️ Recebemos o seu pedido de estudo solar. Posso te fazer 2 perguntinhas rápidas sobre a sua conta de luz para calcular sua economia?`,
        },
      });
    } else if (
      OPEN_STATUSES.includes(lStatus) &&
      !taskLeadIds.has(l.id) &&
      daysSince(lUpdatedAt, now) >= 3
    ) {
      const d = daysSince(lUpdatedAt, now);
      alerts.push({
        id: `n-${l.id}`,
        kind: 'no-next-step',
        href: `/crm`,
        leadId: l.id,
        clientName: l.name,
        clientPhone: l.phone,
        title: `${l.name} sem próximo passo definido`,
        text: `Parado há ${plural(d, 'dia', 'dias')} no funil sem nenhuma tarefa ou visita agendada.`,
        weight: 2.5 + d / 3,
        suggest: {
          title: `Retomar contato com ${l.name}`,
          type: 'whatsapp',
          copy: `Oi, ${l.name.split(' ')[0]}! Tudo bem? Passando para saber como ficou sua decisão sobre a energia solar. Temos novas opções de financiamento sem entrada neste mês! 😉`,
        },
      });
    }
  }

  // 3. Documentos e assinaturas pendentes
  for (const d of documents) {
    if (d.status === 'enviado' || d.status === 'pendente') {
      const age = daysSince(d.updated_at || d.created_at, now);
      if (age >= 2) {
        alerts.push({
          id: `s-${d.id}`,
          kind: 'signature',
          href: `/contratos`,
          leadId: d.lead_id,
          title: `Assinatura pendente: ${d.title || 'Contrato Solar'}`,
          text: `Enviado para assinatura há ${plural(age, 'dia', 'dias')}.`,
          weight: 3 + age / 2,
          cta: { label: 'Acessar contratos', href: `/contratos` },
        });
      }
    }
  }

  // 4. Tarefas atrasadas no CRM
  const overdueTasks = tasks.filter((t) => {
    const isDone = t.completed || t.done;
    const due = t.deadline || t.due_at || t.dueDate;
    return !isDone && due && new Date(due).getTime() < now;
  });

  if (overdueTasks.length > 0) {
    alerts.push({
      id: 'tasks-overdue',
      kind: 'overdue',
      href: '/tasks',
      title: plural(overdueTasks.length, 'tarefa atrasada', 'tarefas atrasadas'),
      text: 'Existem prazos estourados no CRM. Organize a agenda para evitar gargalos na operação.',
      weight: 5 + overdueTasks.length,
      cta: { label: 'Ver tarefas atrasadas', href: '/tasks' },
    });
  }

  return alerts.sort((a, b) => b.weight - a.weight);
}

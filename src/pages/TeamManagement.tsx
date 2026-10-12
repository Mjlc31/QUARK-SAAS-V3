import React, { useState, useMemo } from 'react';
import {
  Users,
  Crown,
  Flame,
  CheckCircle2,
  AlarmClock,
  Zap,
  TrendingUp,
  Calendar,
  Filter,
  DollarSign,
  ChevronRight,
  UserCheck,
  Check,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Shield,
  FileText,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCrm } from '../contexts/CrmContext';
import { useApp } from '../contexts/AppContext';
import {
  Period,
  PERIOD_LABEL,
  periodStart,
  timeAgo,
  MemberPerformanceStats,
  TeamFeedItem
} from '../lib/team';
import { brl, fmtNum } from '../lib/quick-quote';
import { getStoredXpEvents, XpEvent } from '../lib/gamification';

type DetailTab = 'timeline' | 'tarefas' | 'leads';

const TeamManagement: React.FC = () => {
  const { user } = useAuth();
  const { leads, pipelines } = useCrm();
  const { tasks, users: directoryUsers } = useApp();

  const isAdmin = user?.role === 'Admin' || user?.email?.includes('admin');
  const [period, setPeriod] = useState<Period>('7d');
  const [selectedUserId, setSelectedUserId] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<DetailTab>('timeline');

  const fromDate = useMemo(() => periodStart(period), [period]);

  // Lista consolidada de membros da equipe
  const teamMembers = useMemo(() => {
    if (directoryUsers && directoryUsers.length > 0) {
      return directoryUsers;
    }
    // Fallback caso diretório esteja vazio
    return [
      { id: user?.id || '1', name: user?.name || 'Administrador', email: user?.email || 'admin@quark.com', role: 'Admin' as const, avatarInitials: 'AD' },
      { id: '2', name: 'Arthur Moraes', email: 'arthur@quark.com', role: 'Sales' as const, avatarInitials: 'AM' },
      { id: '3', name: 'Lucas Santana', email: 'lucas@quark.com', role: 'Sales' as const, avatarInitials: 'LS' },
      { id: '4', name: 'Engenharia Solar', email: 'engenharia@quark.com', role: 'Engineering' as const, avatarInitials: 'ES' },
    ];
  }, [directoryUsers, user]);

  // Histórico de XP armazenado
  const xpEvents: XpEvent[] = useMemo(() => getStoredXpEvents(), []);

  // Calcula métricas de cada membro no período
  const memberStatsList: MemberPerformanceStats[] = useMemo(() => {
    const now = new Date();
    const endToday = new Date(now);
    endToday.setHours(23, 59, 59, 999);

    return teamMembers.map((member) => {
      // Tarefas atribuídas a este membro
      const memberTasks = tasks.filter(
        (t) => t.assignee?.toLowerCase() === member.name.toLowerCase() || t.assignee === member.id
      );

      const tasksDone = memberTasks.filter((t) => t.completed).length;
      const tasksLate = memberTasks.filter((t) => {
        if (t.completed || !t.deadline) return false;
        return new Date(t.deadline).getTime() < now.getTime();
      }).length;

      const tasksToday = memberTasks.filter((t) => {
        if (t.completed || !t.deadline) return false;
        const d = new Date(t.deadline).getTime();
        return d >= now.getTime() && d <= endToday.getTime();
      }).length;

      const totalTasksTracked = tasksDone + tasksLate;
      const completionRate = totalTasksTracked > 0 ? Math.round((tasksDone / totalTasksTracked) * 100) : 100;

      // Leads atribuídos ao membro
      const memberLeads = leads.filter(
        (l) => l.assignee?.toLowerCase() === member.name.toLowerCase() || l.assignee === member.id
      );

      const leadsCreated = memberLeads.filter((l) => {
        if (!l.createdAt) return false;
        return new Date(l.createdAt).getTime() >= fromDate.getTime();
      }).length;

      const openLeadsList = memberLeads.filter((l) => l.status !== 'Fechado' && l.status !== 'Perdido');
      const openLeads = openLeadsList.length;
      const pipelineValue = openLeadsList.reduce((sum, l) => sum + (l.value || 0), 0);

      // Eventos de XP
      const memberXp = xpEvents.filter((x) => {
        const isUser = x.userId === member.id || x.userId === member.name;
        const inPeriod = new Date(x.createdAt).getTime() >= fromDate.getTime();
        return isUser && inPeriod;
      });
      const xpPoints = memberXp.reduce((acc, ev) => acc + ev.points, 0);
      const salesCount = memberXp.filter((x) => x.type === 'venda').length;

      // Atividades / Ações
      const actionsCount = tasksDone + leadsCreated + memberXp.length;

      return {
        userId: member.id,
        userName: member.name,
        role: member.role,
        actionsCount,
        tasksDone,
        tasksLate,
        tasksToday,
        completionRate,
        leadsCreated,
        openLeads,
        pipelineValue,
        proposalsCount: memberXp.filter((x) => x.type === 'proposta').length,
        salesCount,
        xpPoints,
        lastActive: memberXp[0]?.createdAt || (member.id === user?.id ? new Date().toISOString() : null),
        isOnline: member.id === user?.id,
      };
    }).sort((a, b) => b.xpPoints - a.xpPoints || b.actionsCount - a.actionsCount);
  }, [teamMembers, tasks, leads, xpEvents, fromDate, user]);

  // Totais consolidados
  const totals = useMemo(() => {
    return {
      online: memberStatsList.filter((m) => m.isOnline).length,
      totalActions: memberStatsList.reduce((acc, m) => acc + m.actionsCount, 0),
      totalDone: memberStatsList.reduce((acc, m) => acc + m.tasksDone, 0),
      totalLate: memberStatsList.reduce((acc, m) => acc + m.tasksLate, 0),
      totalPipeline: memberStatsList.reduce((acc, m) => acc + m.pipelineValue, 0),
    };
  }, [memberStatsList]);

  // Feed unificado de atividades
  const feedItems: TeamFeedItem[] = useMemo(() => {
    const list: TeamFeedItem[] = [];

    // Inclui XP events
    xpEvents.forEach((ev) => {
      if (new Date(ev.createdAt).getTime() >= fromDate.getTime()) {
        const member = teamMembers.find((m) => m.id === ev.userId || m.name === ev.userId);
        list.push({
          id: `xp-${ev.id}`,
          timestamp: ev.createdAt,
          userId: ev.userId,
          userName: member?.name || ev.userId,
          type: ev.type === 'venda' ? 'venda' : ev.type === 'proposta' ? 'proposta' : 'atividade',
          title: ev.description,
          details: `+${ev.points} XP concedidos`,
        });
      }
    });

    // Inclui tarefas concluídas recentemente
    tasks.forEach((t) => {
      if (t.completed && t.assignee) {
        list.push({
          id: `task-${t.id}`,
          timestamp: t.deadline || new Date().toISOString(),
          userId: t.assignee,
          userName: t.assignee,
          type: 'tarefa',
          title: `Concluiu a tarefa: ${t.title}`,
          details: `Prioridade ${t.priority}`,
        });
      }
    });

    // Inclui histórico de leads
    leads.forEach((l) => {
      if (l.history && l.history.length > 0) {
        l.history.forEach((h) => {
          if (new Date(h.timestamp).getTime() >= fromDate.getTime()) {
            list.push({
              id: `lead-hist-${h.id}`,
              timestamp: h.timestamp,
              userId: h.author,
              userName: h.author,
              type: 'etapa',
              title: `${h.action}: ${l.name}`,
              details: h.details,
              leadName: l.name,
            });
          }
        });
      }
    });

    // Filtra pelo usuário selecionado se não for 'todos'
    const filtered = selectedUserId === 'todos'
      ? list
      : list.filter((item) => {
          const selectedMember = teamMembers.find((m) => m.id === selectedUserId);
          return (
            item.userId === selectedUserId ||
            (Boolean(item.userName && selectedMember?.name) &&
              item.userName.toLowerCase() === selectedMember?.name?.toLowerCase())
          );
        });

    return filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [xpEvents, tasks, leads, fromDate, selectedUserId, teamMembers]);

  // Membro atualmente inspecionado
  const activeMember = teamMembers.find((m) => m.id === selectedUserId);
  const activeMemberStats = memberStatsList.find((m) => m.userId === selectedUserId);

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans">
      {/* ── Banner Superior ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-zinc-800/80 p-6 sm:p-8 shadow-2xl">
        <div className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-lime-500/10 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-28 left-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/80 border border-zinc-700/80 px-3 py-1 text-xs font-bold tracking-wider text-lime-400 uppercase">
              {isAdmin ? <Crown className="w-3.5 h-3.5 text-yellow-400" /> : <Flame className="w-3.5 h-3.5 text-lime-400" />}
              {isAdmin ? 'Visão Executiva Master' : 'Meu Painel de Performance'}
            </div>
            <h1 className="mt-3 text-3xl sm:text-4xl font-black text-white tracking-tight">
              {isAdmin ? 'Gestão da Equipe & Performance' : 'Minhas Atividades & Metas'}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              {isAdmin
                ? 'Monitore em tempo real o ritmo de fechamentos, tarefas no prazo e gargalos do funil.'
                : 'Acompanhe seu ritmo de atividades diárias, conversão e tarefas no prazo.'}
            </p>
          </div>

          {/* Seletor de Período */}
          <div className="flex items-center rounded-2xl bg-zinc-900/90 border border-zinc-800 p-1">
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`h-9 rounded-xl px-3.5 text-xs font-bold transition ${
                  period === p
                    ? 'bg-lime-500 text-zinc-950 shadow-[0_0_15px_rgba(132,204,22,0.3)]'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {PERIOD_LABEL[p]}
              </button>
            ))}
          </div>
        </div>

        {/* Métricas Principais (KPIs) */}
        <div className="relative mt-7 grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            {
              label: 'Online Agora',
              value: `${totals.online}/${memberStatsList.length}`,
              icon: (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
              ),
            },
            {
              label: 'Ações no Período',
              value: fmtNum(totals.totalActions),
              icon: <Zap className="w-4 h-4 text-yellow-400" />,
            },
            {
              label: 'Tarefas Concluídas',
              value: fmtNum(totals.totalDone),
              icon: <CheckCircle2 className="w-4 h-4 text-lime-400" />,
            },
            {
              label: 'Tarefas Atrasadas',
              value: fmtNum(totals.totalLate),
              icon: <AlarmClock className={`w-4 h-4 ${totals.totalLate > 0 ? 'text-rose-400' : 'text-zinc-500'}`} />,
              alert: totals.totalLate > 0,
            },
            {
              label: 'Funil Ativo (R$)',
              value: brl(totals.totalPipeline, 0),
              icon: <TrendingUp className="w-4 h-4 text-lime-400" />,
            },
          ].map((kpi, idx) => (
            <div
              key={idx}
              className={`rounded-2xl p-3.5 border transition ${
                kpi.alert
                  ? 'bg-rose-500/10 border-rose-500/30'
                  : 'bg-zinc-900/60 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                  {kpi.label}
                </span>
                {kpi.icon}
              </div>
              <p className="mt-1 text-xl sm:text-2xl font-black text-white font-mono tracking-tight">
                {kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabela de Membros & Painel de Auditoria ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DA EQUIPE (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-lime-400" /> Tabela de Desempenho
            </h2>
            <button
              onClick={() => setSelectedUserId('todos')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
                selectedUserId === 'todos'
                  ? 'bg-lime-500/15 border-lime-500/50 text-lime-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Ver Toda Equipe
            </button>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Membro</th>
                    <th className="py-3 px-3 text-center">XP</th>
                    <th className="py-3 px-3 text-center">Tarefas (Feitas/Atrasadas)</th>
                    <th className="py-3 px-3 text-center">Taxa</th>
                    <th className="py-3 px-3 text-right">Pipeline</th>
                    <th className="py-3 px-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {memberStatsList.map((st, idx) => {
                    const isSelected = selectedUserId === st.userId;
                    return (
                      <tr
                        key={st.userId}
                        onClick={() => setSelectedUserId(st.userId)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? 'bg-lime-500/10 border-l-2 border-lime-500'
                            : 'hover:bg-zinc-800/40'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-black text-white text-xs">
                                {st.userName.slice(0, 2).toUpperCase()}
                              </div>
                              {st.isOnline && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-white">
                                {idx === 0 && <Crown className="w-3.5 h-3.5 text-yellow-400" />}
                                {st.userName}
                              </div>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {st.role} · {timeAgo(st.lastActive)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-bold text-lime-400">
                          {fmtNum(st.xpPoints)}
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono">
                          <span className="text-emerald-400 font-bold">{st.tasksDone}</span>
                          <span className="text-zinc-600 mx-1">/</span>
                          <span className={`font-bold ${st.tasksLate > 0 ? 'text-rose-400' : 'text-zinc-500'}`}>
                            {st.tasksLate}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-center font-mono font-semibold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              st.completionRate >= 80
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : st.completionRate >= 50
                                ? 'bg-yellow-500/10 text-yellow-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {st.completionRate}%
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                          {brl(st.pipelineValue, 0)}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <ChevronRight
                            className={`w-4 h-4 mx-auto transition ${
                              isSelected ? 'text-lime-400 translate-x-1' : 'text-zinc-600'
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: DETALHE DO MEMBRO & LINHA DO TEMPO (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-lime-400" />
              {activeMember ? activeMember.name : 'Linha do Tempo Unificada'}
            </h2>
            <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-0.5">
              {(['timeline', 'tarefas', 'leads'] as DetailTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition capitalize ${
                    activeTab === tab
                      ? 'bg-lime-500 text-zinc-950 font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900/50 border border-zinc-800 p-5 shadow-xl min-h-[480px] flex flex-col">
            {/* Se aba for TIMELINE */}
            {activeTab === 'timeline' && (
              <div className="space-y-3.5 flex-1 overflow-y-auto max-h-[560px] pr-1">
                {feedItems.length === 0 ? (
                  <div className="text-center py-12 text-zinc-500 text-xs">
                    Nenhuma atividade registrada neste período.
                  </div>
                ) : (
                  feedItems.slice(0, 30).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-white text-xs">{item.userName}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{timeAgo(item.timestamp)}</span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium">{item.title}</p>
                      {item.details && (
                        <p className="text-[11px] text-lime-400/90 font-mono mt-0.5">{item.details}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Se aba for TAREFAS */}
            {activeTab === 'tarefas' && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[560px] pr-1">
                {tasks
                  .filter((t) =>
                    selectedUserId === 'todos'
                      ? true
                      : t.assignee?.toLowerCase() === activeMember?.name.toLowerCase() || t.assignee === selectedUserId
                  )
                  .map((t) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border transition ${
                        t.completed
                          ? 'bg-zinc-950/40 border-zinc-800/60 opacity-60'
                          : 'bg-zinc-950/80 border-zinc-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-semibold ${
                            t.completed ? 'line-through text-zinc-500' : 'text-white'
                          }`}
                        >
                          {t.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            t.completed
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {t.completed ? 'Concluída' : t.priority}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-zinc-500">
                        <span>Resp: {t.assignee || 'Não atribuído'}</span>
                        {t.deadline && <span>Prazo: {new Date(t.deadline).toLocaleDateString('pt-BR')}</span>}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Se aba for LEADS */}
            {activeTab === 'leads' && (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[560px] pr-1">
                {leads
                  .filter((l) =>
                    selectedUserId === 'todos'
                      ? true
                      : l.assignee?.toLowerCase() === activeMember?.name.toLowerCase() || l.assignee === selectedUserId
                  )
                  .map((l) => (
                    <div
                      key={l.id}
                      className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="text-xs font-bold text-white">{l.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">
                          {l.city || 'Sem cidade'} · Status: {l.status}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-lime-400">
                          {brl(l.value || 0, 0)}
                        </p>
                        <span className="text-[10px] text-zinc-500">
                          {l.monthlyConsumption ? `${l.monthlyConsumption} kWh` : ''}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;

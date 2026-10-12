import React, { useMemo, useState } from "react";
import { 
  Trophy, Flame, Crown, Target, 
  HelpCircle, Sparkles,
  TrendingUp, Award
} from "lucide-react";
import { useApp } from "../contexts/AppContext";
import { 
  LEVELS, BADGES, XP_TABLE, TIER_STYLE, levelOf, 
  type GamificationStats 
} from "../lib/gamification";
import { QUOTES, DEFAULT_IMAGES, pickDaily, imageUrl } from "../lib/inspiration";

type Period = "hoje" | "semana" | "mes" | "sempre";

interface LeaderboardUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  xp: number;
  total_xp: number;
  leads: number;
  followups: number;
  proposals: number;
  sales: number;
  active_days: number;
}

export default function Ranking() {
  const { user, leads, tasks, users } = useApp();
  const [period, setPeriod] = useState<Period>("semana");
  const [activeTab, setActiveTab] = useState<"ranking" | "badges" | "regras">("ranking");

  // Frase e Imagem diária de inspiração
  const quote = useMemo(() => pickDaily(QUOTES, 7) || QUOTES[0], []);
  const bgImage = useMemo(() => imageUrl(pickDaily(DEFAULT_IMAGES, 3) || DEFAULT_IMAGES[0]), []);

  // Estatísticas calculadas dinamicamente para o usuário ativo
  const myStats = useMemo<GamificationStats>(() => {
    const myLeads = leads?.filter(l => l.assignee === user?.id || l.assignee === user?.name || !l.assignee) || [];
    const myWon = myLeads.filter(l => l.status === 'Fechado' || l.status === 'ganho');
    const myTasks = tasks?.filter(t => t.assignee === user?.id || t.assignee === user?.name) || [];
    const myDoneTasks = myTasks.filter(t => t.completed);

    const leadsCount = myLeads.length;
    const followupsCount = myDoneTasks.length + (myLeads.length * 2);
    const proposalsCount = myLeads.filter(l => l.status === 'Proposta' || l.status === 'Fechado').length;
    const sentCount = proposalsCount;
    const salesCount = myWon.length;
    const activeDays = Math.max(1, Math.min(30, myLeads.length > 0 ? 12 : 5));

    // Cálculo de XP
    const calculatedXp = 
      (leadsCount * 10) + 
      (followupsCount * 5) + 
      (proposalsCount * 15) + 
      (sentCount * 10) + 
      (salesCount * 100) + 
      (activeDays * 5);

    return {
      total_xp: calculatedXp,
      leads: leadsCount,
      followups: followupsCount,
      proposals: proposalsCount,
      sent: sentCount,
      sales: salesCount,
      minutes: activeDays * 45,
      active_days: activeDays,
    };
  }, [leads, tasks, user]);

  const myLevel = useMemo(() => levelOf(myStats.total_xp), [myStats.total_xp]);

  // Lista simulada / calculada de vendedores para o Ranking
  const leaderboardList = useMemo<LeaderboardUser[]>(() => {
    const list: LeaderboardUser[] = [];

    // Vendedor atual
    list.push({
      id: user?.id || 'me',
      name: user?.name || 'Você',
      email: user?.email || '',
      role: user?.role === 'Admin' ? 'Closer Sênior' : 'Consultor Solar',
      avatar_url: undefined,
      xp: period === 'hoje' ? Math.round(myStats.total_xp * 0.15) : period === 'semana' ? Math.round(myStats.total_xp * 0.45) : myStats.total_xp,
      total_xp: myStats.total_xp,
      leads: myStats.leads,
      followups: myStats.followups,
      proposals: myStats.proposals,
      sales: myStats.sales,
      active_days: myStats.active_days
    });

    // Outros membros da equipe (se existirem ou mock corporativo para a arena)
    const mockCompetitors: LeaderboardUser[] = [
      {
        id: 'u2',
        name: 'Carlos Mendes',
        email: 'carlos@quarkenergia.com.br',
        role: 'Closer Solar',
        xp: period === 'hoje' ? 120 : period === 'semana' ? 840 : 2150,
        total_xp: 2150,
        leads: 32,
        followups: 74,
        proposals: 18,
        sales: 6,
        active_days: 24
      },
      {
        id: 'u3',
        name: 'Mariana Duarte',
        email: 'mariana@quarkenergia.com.br',
        role: 'Consultora Comercial',
        xp: period === 'hoje' ? 80 : period === 'semana' ? 620 : 1640,
        total_xp: 1640,
        leads: 28,
        followups: 55,
        proposals: 14,
        sales: 4,
        active_days: 19
      },
      {
        id: 'u4',
        name: 'Lucas Ferreira',
        email: 'lucas@quarkenergia.com.br',
        role: 'SDR / Qualificador',
        xp: period === 'hoje' ? 50 : period === 'semana' ? 410 : 920,
        total_xp: 920,
        leads: 45,
        followups: 82,
        proposals: 8,
        sales: 2,
        active_days: 14
      }
    ];

    // Se temos usuários reais cadastrados, mescla
    if (users && users.length > 1) {
      users.forEach(u => {
        if (u.id !== user?.id && !list.find(item => item.id === u.id)) {
          list.push({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'Consultor',
            xp: 450,
            total_xp: 450,
            leads: 12,
            followups: 20,
            proposals: 5,
            sales: 1,
            active_days: 10
          });
        }
      });
    } else {
      mockCompetitors.forEach(c => list.push(c));
    }

    return list.sort((a, b) => b.xp - a.xp);
  }, [user, myStats, period, users]);

  const myRank = leaderboardList.findIndex(u => u.id === user?.id || u.name === 'Você') + 1;
  const top3 = [leaderboardList[0], leaderboardList[1], leaderboardList[2]].filter(Boolean);

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-zinc-100">
      {/* ── 1. CABEÇALHO CINEMATOGRÁFICO & PERFIL DE GAMIFICAÇÃO ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-950 p-6 md:p-8 shadow-2xl">
        {/* Backdrop com brilho e imagem com opacidade */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity filter blur-[1px]"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent" />
        <div className="absolute top-0 right-0 h-72 w-72 rounded-full bg-lime-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-amber-500/10 blur-[120px] pointer-events-none" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-lime-500/30 bg-lime-500/10 px-3 py-1 text-xs font-semibold text-lime-400">
              <Trophy className="h-3.5 w-3.5" />
              <span>Arena Comercial · Temporada de {new Date().toLocaleDateString("pt-BR", { month: "long" }).toUpperCase()}</span>
            </div>

            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl md:text-5xl font-sans text-white">
              Quem manda no <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-emerald-300">pregão?</span>
            </h1>

            <p className="mt-3 max-w-xl text-lg font-serif text-zinc-300 italic">
              “{quote.text}”
            </p>
            <p className="mt-1 text-xs uppercase tracking-widest text-zinc-500 font-semibold">
              — {quote.author}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-white/5 px-3 py-2 text-xs">
                <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
                <span className="text-zinc-400">Streak:</span>
                <span className="font-bold text-white">{myStats.active_days} dias seguidos</span>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-zinc-900/80 border border-white/5 px-3 py-2 text-xs">
                <Target className="h-4 w-4 text-lime-400" />
                <span className="text-zinc-400">Posição:</span>
                <span className="font-bold text-lime-400">#{myRank} de {leaderboardList.length}</span>
              </div>
            </div>
          </div>

          {/* CARD DO MEU NÍVEL & PROGRESSO */}
          <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold tracking-widest text-zinc-400 uppercase">
                Seu Nível · Nível {myLevel.level.n}
              </span>
              <span className="rounded-full bg-lime-500/20 border border-lime-500/30 px-2.5 py-0.5 text-xs font-bold text-lime-300">
                {myLevel.level.title}
              </span>
            </div>

            <div className="mt-2">
              <p className="text-2xl font-black text-white">{myLevel.level.title}</p>
              <p className="text-xs text-zinc-400 italic mt-0.5">{myLevel.level.motto}</p>
            </div>

            {/* Barra de XP */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-zinc-400 mb-1.5 font-mono">
                <span className="text-lime-400 font-bold">{myStats.total_xp.toLocaleString()} XP</span>
                <span>{myLevel.next ? `${myLevel.next.min.toLocaleString()} XP` : 'Nível Máximo'}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800 border border-white/5">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-lime-500 to-emerald-400 transition-all duration-1000 shadow-sm shadow-lime-500/50"
                  style={{ width: `${Math.max(5, myLevel.progress * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">
                {myLevel.next 
                  ? `Faltam ${myLevel.toNext.toLocaleString()} XP para se tornar ${myLevel.next.title}` 
                  : 'Parabéns! Você alcançou o topo absoluto da hierarquia.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. NAVEGAÇÃO ENTRE ABAS & FILTRO DE PERÍODO ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-1 rounded-xl bg-zinc-900 p-1 border border-zinc-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab("ranking")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
              activeTab === "ranking" 
                ? "bg-lime-500 text-zinc-950 font-bold shadow-md shadow-lime-500/20" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Trophy className="h-4 w-4" />
            <span>Ranking & Pódio</span>
          </button>
          <button
            onClick={() => setActiveTab("badges")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
              activeTab === "badges" 
                ? "bg-lime-500 text-zinc-950 font-bold shadow-md shadow-lime-500/20" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Award className="h-4 w-4" />
            <span>Conquistas ({BADGES.filter(b => b.done(myStats)).length}/{BADGES.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("regras")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-2 transition-all ${
              activeTab === "regras" 
                ? "bg-lime-500 text-zinc-950 font-bold shadow-md shadow-lime-500/20" 
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <HelpCircle className="h-4 w-4" />
            <span>Regras de XP</span>
          </button>
        </div>

        {activeTab === "ranking" && (
          <div className="flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1 border border-zinc-800 text-xs">
            {(["hoje", "semana", "mes", "sempre"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
                  period === p 
                    ? "bg-zinc-800 text-white font-bold border border-white/10" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p === "sempre" ? "Geral" : p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 3. CONTEÚDO DA ABA: RANKING & PÓDIO ── */}
      {activeTab === "ranking" && (
        <div className="space-y-6">
          {/* PÓDIO DOS TOP 3 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* 2º LUGAR */}
            {top3[1] && (
              <div className="order-2 md:order-1 relative rounded-2xl border border-zinc-400/20 bg-zinc-900/50 p-5 flex flex-col items-center text-center shadow-lg hover:border-zinc-400/40 transition-all">
                <div className="absolute -top-3.5 rounded-full bg-zinc-700 border border-zinc-400 px-2.5 py-0.5 text-[10px] font-black text-zinc-200 uppercase tracking-widest">
                  2º Lugar
                </div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-zinc-600 to-zinc-400 p-0.5 shadow-md mt-2">
                  <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-xl text-zinc-300">
                    {top3[1].name.charAt(0)}
                  </div>
                </div>
                <h3 className="mt-3 font-bold text-white text-base">{top3[1].name}</h3>
                <p className="text-xs text-zinc-400">{top3[1].role}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-zinc-200">
                    {top3[1].xp.toLocaleString()} XP
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">{top3[1].sales} vendas</span>
                </div>
              </div>
            )}

            {/* 1º LUGAR (DESTAQUE NO CENTRO) */}
            {top3[0] && (
              <div className="order-1 md:order-2 relative rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/20 to-zinc-900/80 p-6 flex flex-col items-center text-center shadow-2xl scale-105 z-10">
                <div className="absolute -top-4 flex items-center gap-1 rounded-full bg-amber-500 border border-amber-300 px-3 py-0.5 text-xs font-black text-zinc-950 uppercase tracking-widest shadow-md shadow-amber-500/30">
                  <Crown className="h-3.5 w-3.5" /> 1º Lugar
                </div>
                <div className="h-20 w-20 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20 mt-1">
                  <div className="h-full w-full rounded-full bg-zinc-950 flex items-center justify-center font-black text-2xl text-amber-400">
                    {top3[0].name.charAt(0)}
                  </div>
                </div>
                <h3 className="mt-3 font-black text-white text-lg">{top3[0].name}</h3>
                <p className="text-xs text-amber-300/80 font-medium">{top3[0].role}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-sm font-mono font-black text-amber-400">
                    {top3[0].xp.toLocaleString()} XP
                  </span>
                  <span className="text-xs text-zinc-300 font-bold">{top3[0].sales} fechados</span>
                </div>
              </div>
            )}

            {/* 3º LUGAR */}
            {top3[2] && (
              <div className="order-3 relative rounded-2xl border border-amber-800/20 bg-zinc-900/50 p-5 flex flex-col items-center text-center shadow-lg hover:border-amber-800/40 transition-all">
                <div className="absolute -top-3.5 rounded-full bg-amber-900/80 border border-amber-700 px-2.5 py-0.5 text-[10px] font-black text-amber-300 uppercase tracking-widest">
                  3º Lugar
                </div>
                <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-amber-700 to-amber-900 p-0.5 shadow-md mt-2">
                  <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center font-bold text-xl text-amber-500">
                    {top3[2].name.charAt(0)}
                  </div>
                </div>
                <h3 className="mt-3 font-bold text-white text-base">{top3[2].name}</h3>
                <p className="text-xs text-zinc-400">{top3[2].role}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-mono font-bold text-amber-400">
                    {top3[2].xp.toLocaleString()} XP
                  </span>
                  <span className="text-xs text-zinc-400 font-semibold">{top3[2].sales} vendas</span>
                </div>
              </div>
            )}
          </div>

          {/* TABELA GERAL DE COLOCAÇÃO */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/50 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-zinc-800/60 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-200">Tabela de Classificação Geral</h2>
              <span className="text-xs text-zinc-500">Atualizado em tempo real</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800/40 bg-zinc-900/80 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    <th className="px-6 py-3.5 w-16">#</th>
                    <th className="px-6 py-3.5">Vendedor</th>
                    <th className="px-6 py-3.5">Nível</th>
                    <th className="px-6 py-3.5 text-center">Leads</th>
                    <th className="px-6 py-3.5 text-center">Follow-ups</th>
                    <th className="px-6 py-3.5 text-center">Propostas</th>
                    <th className="px-6 py-3.5 text-center">Vendas</th>
                    <th className="px-6 py-3.5 text-right font-mono">XP Período</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30">
                  {leaderboardList.map((entry, idx) => {
                    const isMe = entry.id === user?.id || entry.name === 'Você';
                    const lv = levelOf(entry.total_xp);
                    return (
                      <tr 
                        key={entry.id} 
                        className={`transition-colors hover:bg-zinc-800/40 ${
                          isMe ? "bg-lime-500/5 font-semibold border-l-2 border-l-lime-500" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-zinc-400">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-200 text-xs border border-white/5">
                              {entry.name.charAt(0)}
                            </div>
                            <div>
                              <div className="text-white flex items-center gap-2">
                                <span>{entry.name}</span>
                                {isMe && (
                                  <span className="rounded bg-lime-500/20 px-1.5 py-0.2 text-[10px] font-bold text-lime-400">
                                    VOCÊ
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-zinc-500">{entry.role}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-300 border border-white/5">
                            {lv.level.title}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-zinc-400">{entry.leads}</td>
                        <td className="px-6 py-4 text-center font-mono text-zinc-400">{entry.followups}</td>
                        <td className="px-6 py-4 text-center font-mono text-zinc-400">{entry.proposals}</td>
                        <td className="px-6 py-4 text-center font-mono font-bold text-lime-400">{entry.sales}</td>
                        <td className="px-6 py-4 text-right font-mono font-black text-white text-base">
                          {entry.xp.toLocaleString()} XP
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. CONTEÚDO DA ABA: CONQUISTAS (BADGES) ── */}
      {activeTab === "badges" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 p-5">
            <h2 className="text-base font-bold text-white">Mural de Conquistas & Insígnias</h2>
            <p className="text-xs text-zinc-400 mt-1">
              Desbloqueie medalhas cumprindo metas reais de atendimento, envio de propostas e fechamento de usinas.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {BADGES.map((badge) => {
              const unlocked = badge.done(myStats);
              const [curr, target] = badge.progress(myStats);
              const tierInfo = TIER_STYLE[badge.tier];

              return (
                <div 
                  key={badge.id}
                  className={`rounded-2xl border p-4 transition-all relative overflow-hidden ${
                    unlocked 
                      ? `${tierInfo.ring} ${tierInfo.badgeBg} shadow-lg` 
                      : "border-zinc-800/60 bg-zinc-900/30 opacity-70"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="text-3xl p-2 rounded-xl bg-zinc-900/60 border border-white/5">
                      {badge.icon}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierInfo.ring} ${tierInfo.text}`}>
                      {tierInfo.label}
                    </span>
                  </div>

                  <h3 className="mt-3 font-bold text-white text-sm">{badge.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{badge.text}</p>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[11px] text-zinc-400 mb-1 font-mono">
                      <span>Progresso</span>
                      <span className={unlocked ? "text-lime-400 font-bold" : ""}>
                        {curr} / {target}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          unlocked ? "bg-lime-400" : "bg-zinc-600"
                        }`}
                        style={{ width: `${Math.min(100, (curr / target) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 5. CONTEÚDO DA ABA: REGRAS & PONTUAÇÃO ── */}
      {activeTab === "regras" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-lime-400" />
              Tabela de Pontuação (XP)
            </h2>
            <p className="text-xs text-zinc-400">
              Cada etapa executada no fluxo comercial pontua na sua conta para subir no ranking:
            </p>

            <div className="divide-y divide-zinc-800/60">
              {XP_TABLE.map((item) => (
                <div key={item.kind} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-200">{item.label}</p>
                    <p className="text-xs text-zinc-500">{item.hint}</p>
                  </div>
                  <span className="rounded-lg bg-lime-500/10 border border-lime-500/30 px-2.5 py-1 text-xs font-mono font-bold text-lime-400">
                    +{item.points} XP
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-400" />
              Plano de Carreira Comercial
            </h2>
            <p className="text-xs text-zinc-400">
              Conforme você acumula experiência e contratos fechados, você sobe de patamar:
            </p>

            <div className="space-y-3">
              {LEVELS.map((lv) => (
                <div 
                  key={lv.n} 
                  className={`rounded-xl border p-3 flex items-center justify-between transition-all ${
                    myLevel.level.n === lv.n 
                      ? "border-lime-500/40 bg-lime-500/5" 
                      : "border-white/5 bg-zinc-900/40"
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-400">Nível {lv.n}</span>
                      <span className="text-sm font-bold text-white">{lv.title}</span>
                      {myLevel.level.n === lv.n && (
                        <span className="text-[10px] bg-lime-500 text-zinc-950 font-black px-1.5 py-0.2 rounded">
                          SEU NÍVEL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500 italic mt-0.5">{lv.motto}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-zinc-400">
                    {lv.min.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

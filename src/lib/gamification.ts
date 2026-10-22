/**
 * Gamificação: níveis, pontos e conquistas para a equipe comercial Quark.
 */

export type XpKind = "lead" | "followup" | "tarefa" | "proposta" | "envio" | "venda" | "aceite";

export const XP_TABLE: { kind: XpKind; points: number; label: string; hint: string }[] = [
  { kind: "lead", points: 10, label: "Lead cadastrado", hint: "Cada cliente novo no funil de vendas" },
  { kind: "followup", points: 5, label: "Follow-up registrado", hint: "Ligação, WhatsApp, visita ou e-mail no histórico" },
  { kind: "tarefa", points: 5, label: "Tarefa concluída", hint: "Tarefas comerciais cumpridas" },
  { kind: "proposta", points: 15, label: "Orçamento criado", hint: "Estudo solar ou proposta formulada" },
  { kind: "envio", points: 10, label: "Proposta enviada", hint: "Ao compartilhar o link ou PDF com o cliente" },
  { kind: "venda", points: 100, label: "Venda fechada", hint: "Lead movido para 'Fechado/Ganho'" },
  { kind: "aceite", points: 150, label: "Proposta aceita online", hint: "Quando o cliente clica em Aceitar no link" },
];

export interface Level {
  n: number;
  title: string;
  min: number;
  motto: string;
}

/** 7 Níveis de carreira do estagiário ao topo do mundo */
export const LEVELS: Level[] = [
  { n: 1, title: "Estagiário", min: 0, motto: "Todo império começa com a primeira ligação." },
  { n: 2, title: "Corretor", min: 100, motto: "Você aprendeu a falar. Agora aprenda a fechar." },
  { n: 3, title: "Closer", min: 300, motto: "Café é para quem fecha." },
  { n: 4, title: "Tubarão", min: 700, motto: "Sente o cheiro de oportunidade de longe." },
  { n: 5, title: "Lobo", min: 1500, motto: "O pregão é seu território." },
  { n: 6, title: "Chefão", min: 3000, motto: "Faz ofertas que ninguém consegue recusar." },
  { n: 7, title: "Dono do Mundo", min: 6000, motto: "O mundo é seu." },
];

export function levelOf(xp: number) {
  let i = 0;
  while (i < LEVELS.length - 1 && xp >= LEVELS[i + 1].min) i++;
  const level = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const progress = next ? (xp - level.min) / (next.min - level.min) : 1;
  return { 
    level, 
    next, 
    progress: Math.max(0, Math.min(1, progress)), 
    toNext: next ? next.min - xp : 0 
  };
}

export interface GamificationStats {
  total_xp: number;
  leads: number;
  followups: number;
  proposals: number;
  sent: number;
  sales: number;
  minutes: number;
  active_days: number;
}

export type BadgeTier = "bronze" | "prata" | "ouro" | "lenda";

export interface Badge {
  id: string;
  title: string;
  text: string;
  icon: string;
  tier: BadgeTier;
  done: (s: GamificationStats) => boolean;
  progress: (s: GamificationStats) => [number, number];
}

const goal = (
  id: string, 
  title: string, 
  text: string, 
  icon: string, 
  tier: BadgeTier, 
  key: keyof GamificationStats, 
  n: number
): Badge => ({
  id,
  title,
  text,
  icon,
  tier,
  done: (s) => (s[key] ?? 0) >= n,
  progress: (s) => [Math.min(s[key] ?? 0, n), n],
});

export const BADGES: Badge[] = [
  goal("primeiro-lead", "Primeira ficha", "Cadastre o seu primeiro lead", "🎯", "bronze", "leads", 1),
  goal("dez-leads", "Rede aberta", "10 leads cadastrados", "🕸️", "bronze", "leads", 10),
  goal("maquina", "Máquina de leads", "50 leads cadastrados", "🧲", "prata", "leads", 50),
  goal("cacador", "Caçador de oportunidades", "150 leads cadastrados", "🏹", "ouro", "leads", 150),
  goal("aquecendo", "Aquecendo", "10 follow-ups registrados", "🔥", "bronze", "followups", 10),
  goal("implacavel", "Follow-up implacável", "100 follow-ups", "📞", "prata", "followups", 100),
  goal("metralhadora", "Metralhadora", "500 follow-ups", "💬", "ouro", "followups", 500),
  goal("primeira-proposta", "Primeira proposta", "Crie a sua primeira proposta", "📨", "bronze", "proposals", 1),
  goal("caneta", "Me venda esta caneta", "Envie 10 propostas", "🖊️", "prata", "sent", 10),
  goal("fabrica", "Fábrica de propostas", "Envie 50 propostas", "🏭", "ouro", "sent", 50),
  goal("primeiro-sangue", "Primeiro contrato", "Feche a sua primeira venda", "🥂", "bronze", "sales", 1),
  goal("mao-de-ouro", "Mão de ouro", "5 vendas fechadas", "🤝", "prata", "sales", 5),
  goal("cafe", "Café é para quem fecha", "10 vendas fechadas", "☕", "ouro", "sales", 10),
  goal("lenda", "Lenda do solar", "30 vendas fechadas", "🏆", "lenda", "sales", 30),
  goal("presenca", "Presença", "5 dias ativos no sistema", "📅", "bronze", "active_days", 5),
  goal("pregao", "Dono do pregão", "20 dias ativos no sistema", "📈", "prata", "active_days", 20),
  goal("inabalavel", "Inabalável", "60 dias ativos no sistema", "🗿", "ouro", "active_days", 60),
  goal("tubarao", "Tubarão", "Chegue a 700 XP", "🦈", "prata", "total_xp", 700),
  goal("lobo", "Lobo", "Chegue a 1.500 XP", "🐺", "ouro", "total_xp", 1500),
  goal("imperio", "Império", "Chegue a 6.000 XP", "👑", "lenda", "total_xp", 6000),
];

export const TIER_STYLE: Record<BadgeTier, { label: string; ring: string; badgeBg: string; text: string }> = {
  bronze: { label: "Bronze", ring: "ring-amber-700/40 border-amber-600/30", badgeBg: "bg-amber-950/40", text: "text-amber-400" },
  prata: { label: "Prata", ring: "ring-zinc-400/40 border-zinc-400/30", badgeBg: "bg-zinc-800/40", text: "text-zinc-200" },
  ouro: { label: "Ouro", ring: "ring-yellow-500/50 border-yellow-500/40", badgeBg: "bg-yellow-950/40", text: "text-yellow-400" },
  lenda: { label: "Lenda", ring: "ring-lime-500/60 border-lime-500/50", badgeBg: "bg-lime-950/40", text: "text-lime-400" },
};

export interface XpEvent {
  id: string;
  userId: string;
  type: XpKind;
  points: number;
  description: string;
  createdAt: string;
}

export function getStoredXpEvents(): XpEvent[] {
  try {
    const raw = localStorage.getItem('quark_xp_events');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Registra um evento de pontuação para o vendedor */
export async function recordXpEvent(userId: string, kind: XpKind, metadata: any = {}) {
  const item = XP_TABLE.find((x) => x.kind === kind);
  const points = item ? item.points : 10;
  
  // Salva no cache local para persistência imediata
  try {
    const existing = getStoredXpEvents();
    const newEvent: XpEvent = {
      id: crypto.randomUUID(),
      userId,
      type: kind,
      points,
      description: item?.label || 'Ação comercial',
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('quark_xp_events', JSON.stringify([newEvent, ...existing].slice(0, 500)));
  } catch {
    /* ignore */
  }

  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId);
    if (isUUID) {
      const { supabase } = await import("./supabaseClient");
      const insertPayload: any = {
        user_id: userId,
        kind,
        points,
      };
      if (metadata?.ref_id) insertPayload.ref_id = String(metadata.ref_id);
      if (metadata?.lead_id) insertPayload.lead_id = String(metadata.lead_id);

      await supabase.from("xp_events").insert(insertPayload);
    }
  } catch (err) {
    console.warn("[Gamification] Falha ao registrar evento de XP no Supabase:", err);
  }
}


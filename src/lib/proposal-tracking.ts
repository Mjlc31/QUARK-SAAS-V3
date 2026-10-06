import { supabase } from "./supabaseClient";

export interface ProposalView {
  id: string;
  proposal_id: string;
  session_id: string | null;
  viewed_at: string;
  last_seen_at: string;
  duration_seconds: number;
  device: string | null;
  internal: boolean;
}

function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/iPhone|Android|Mobile/i.test(ua)) return /iPhone/i.test(ua) ? "iPhone" : "Celular Android";
  if (/Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Computador Windows";
  return "Computador";
}

function sessionId() {
  const key = "quark-view-session";
  try {
    let id = sessionStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(key, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/**
 * Registra a abertura da proposta pública e mede o tempo de leitura (aba visível).
 * Aberturas pela própria equipe (logada) ou para gerar PDF ficam marcadas como internas
 * e não entram na contagem do cliente. Retorna a função de limpeza do efeito.
 */
export function trackProposalView(token: string): () => void {
  let viewId: string | null = null;
  let seconds = 0;
  let stopped = false;
  let lastSent = 0;

  const send = () => {
    if (!viewId || seconds === lastSent) return;
    lastSent = seconds;
    supabase.rpc("ping_proposal_view", { p_view: viewId, p_seconds: seconds }).then(() => {}, () => {});
  };

  (async () => {
    const { data: auth } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const internal = !!auth?.session || new URLSearchParams(window.location.search).has("print");
    const { data } = await supabase.rpc("register_proposal_view", {
      p_token: token,
      p_session: sessionId(),
      p_device: deviceLabel(),
      p_user_agent: navigator.userAgent,
      p_referrer: document.referrer || null,
      p_internal: internal,
    });
    if (!stopped && typeof data === "string") viewId = data;
  })().catch(() => {});

  const tick = setInterval(() => {
    if (document.visibilityState === "visible") seconds += 1;
    if (seconds > 0 && seconds % 15 === 0) send();
  }, 1000);
  const onHide = () => document.visibilityState === "hidden" && send();
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", send);

  return () => {
    stopped = true;
    send();
    clearInterval(tick);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", send);
  };
}

export async function fetchProposalViews(proposalIds: string[]): Promise<ProposalView[]> {
  if (!proposalIds.length) return [];
  const { data, error } = await supabase
    .from("proposal_views")
    .select("*")
    .in("proposal_id", proposalIds)
    .eq("internal", false)
    .order("viewed_at", { ascending: false })
    .limit(500);
  if (error) return [];
  return (data ?? []) as unknown as ProposalView[];
}

export function formatDuration(s: number) {
  if (!s) return "menos de 1 min";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min${s % 60 && m < 10 ? ` ${s % 60}s` : ""}`;
  return `${Math.floor(m / 60)}h ${m % 60}min`;
}

"use client";

import { Check, Clock, Eye, Laptop, MousePointerClick, Radar, Smartphone } from "lucide-react";
import { relativeTime } from "@/lib/format";
import { useLive } from "@/lib/live";
import { supabase } from "@/lib/supabaseClient";

type Ev = {
  kind: "open" | "section" | "time" | "click";
  detail: string | null;
  value: number;
  device: string | null;
  created_at: string;
};

const fmtDur = (s: number) => {
  if (s < 60) return `${s} s`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
};

export const DEFAULT_PROPOSAL_SECTIONS = [
  { id: "capa", label: "Capa" },
  { id: "resumo", label: "Resumo da solução" },
  { id: "etapas", label: "4 Etapas da instalação" },
  { id: "fatura", label: "Comparativo de fatura" },
  { id: "equipamentos", label: "Equipamentos e garantias" },
  { id: "cronograma", label: "Cronograma de instalação" },
  { id: "investimento", label: "Condições comerciais" },
  { id: "fluxo-caixa", label: "Fluxo de caixa e Payback" },
  { id: "sobre", label: "Sobre a Quark Energia" },
];

export const DEFAULT_TRACK_CLICKS: Record<string, string> = {
  aceitar: "Abriu o formulário de aceite",
  aceite: "Aceitou a proposta comercial",
  whatsapp: "Clicou para falar no WhatsApp",
  pdf: "Baixou o PDF da proposta",
};

/**
 * Rastreamento da proposta: quantas vezes abriu, quanto tempo leu, em que seções
 * parou mais e o que clicou. Atualiza em tempo real.
 */
export function TrackingCard({
  proposalId,
  sections = DEFAULT_PROPOSAL_SECTIONS,
  clicks = DEFAULT_TRACK_CLICKS,
  className,
}: {
  proposalId: string;
  sections?: { id: string; label: string }[];
  clicks?: Record<string, string>;
  className?: string;
}) {
  const { data } = useLive<Ev[] | null>(
    async () => {
      const { data, error } = await supabase
        .from("proposal_events")
        .select("kind, detail, value, device, created_at")
        .eq("proposal_id", proposalId)
        .order("created_at", { ascending: true })
        .limit(3000);
      return error ? null : ((data ?? []) as Ev[]);
    },
    [proposalId],
    ["proposal_events"],
  );

  const evs = data ?? [];
  const opens = evs.filter((e) => e.kind === "open");
  const totalTime = evs.filter((e) => e.kind === "time").reduce((t, e) => t + e.value, 0);
  const timeBy = new Map<string, number>();
  for (const e of evs) {
    if (e.kind === "time" && e.detail) {
      timeBy.set(e.detail, (timeBy.get(e.detail) ?? 0) + e.value);
    }
  }
  const seen = new Set(evs.filter((e) => e.kind === "section" || e.kind === "time").map((e) => e.detail ?? ""));
  const maxTime = Math.max(1, ...timeBy.values());
  const last = evs.length ? evs[evs.length - 1].created_at : null;
  const live = last ? Date.now() - new Date(last).getTime() < 60_000 : false;
  const devices = new Set(opens.map((e) => e.device).filter(Boolean));
  const recent = evs
    .filter((e) => e.kind === "open" || e.kind === "click")
    .slice(-6)
    .reverse();
  const top = [...timeBy.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className={`overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-zinc-800/80 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-950/60 text-violet-400 border border-violet-800/40">
            <Radar className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">Rastreamento em tempo real</p>
            <p className="text-xs text-zinc-400">
              {opens.length ? `Última atividade ${relativeTime(last)}` : "Aguardando o cliente abrir o link"}
            </p>
          </div>
        </div>
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Lendo agora
          </span>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 divide-x divide-zinc-800 border-b border-zinc-800 bg-zinc-950/40">
        <Kpi icon={<Eye className="h-3.5 w-3.5" />} label="Aberturas" value={String(opens.length)} />
        <Kpi icon={<Clock className="h-3.5 w-3.5" />} label="Tempo de leitura" value={totalTime ? fmtDur(totalTime) : "—"} />
        <Kpi
          icon={<Check className="h-3.5 w-3.5" />}
          label="Seções lidas"
          value={`${sections.filter((s) => seen.has(s.id)).length}/${sections.length}`}
        />
      </div>

      {/* Heatmap / Tempo por seção */}
      <div className="px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          Onde o cliente passou mais tempo
        </p>
        <ul className="grid gap-2.5">
          {sections.map((s) => {
            const t = timeBy.get(s.id) ?? 0;
            const ok = seen.has(s.id);
            return (
              <li key={s.id} className="grid grid-cols-[18px_minmax(0,1fr)_50px] items-center gap-2.5 text-xs">
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                    ok ? "bg-emerald-500 text-black font-bold" : "bg-zinc-800 text-zinc-600"
                  }`}
                >
                  {ok && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                </span>
                <div className="min-w-0">
                  <p className={`truncate font-medium ${ok ? "text-zinc-200" : "text-zinc-500"}`}>{s.label}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-lime-400 transition-all duration-700"
                      style={{ width: `${(t / maxTime) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-right font-mono text-[11px] text-zinc-400">{t ? fmtDur(t) : ""}</span>
              </li>
            );
          })}
        </ul>

        {top && top[1] >= 30 && (
          <div className="mt-4 rounded-xl bg-violet-950/40 border border-violet-800/40 px-3.5 py-2.5 text-xs text-violet-200 flex items-start gap-2">
            <span className="text-base">💡</span>
            <div>
              <span className="font-semibold text-violet-300">Dica comercial:</span> Maior interesse em{" "}
              <b>{sections.find((s) => s.id === top[0])?.label ?? top[0]}</b>. Destaque esse ponto no próximo contato!
            </div>
          </div>
        )}
      </div>

      {/* Atividade recente */}
      {recent.length > 0 && (
        <div className="border-t border-zinc-800 px-5 py-4 bg-zinc-950/20">
          <p className="mb-2.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">Atividade recente</p>
          <ul className="grid gap-2">
            {recent.map((e, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-zinc-300">
                {e.kind === "open" ? (
                  e.device === "celular" ? (
                    <Smartphone className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  ) : (
                    <Laptop className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                  )
                ) : (
                  <MousePointerClick className="h-3.5 w-3.5 text-lime-400 shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate">
                  {e.kind === "open"
                    ? `Abriu no ${e.device || "navegador"}`
                    : (clicks[e.detail ?? ""] ?? e.detail)}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-zinc-500">{relativeTime(e.created_at)}</span>
              </li>
            ))}
          </ul>
          {devices.size > 1 && (
            <p className="mt-2.5 text-[11px] text-zinc-400 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
              👥 <b>Múltiplos dispositivos:</b> O cliente abriu em mais de um aparelho (pode estar mostrando para um sócio ou familiar).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="flex items-center justify-center gap-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
        {icon} {label}
      </p>
      <p className="font-mono mt-1 text-base font-bold text-white">{value}</p>
    </div>
  );
}

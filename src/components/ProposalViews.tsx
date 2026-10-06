import { Clock, Eye, EyeOff, Monitor, Smartphone, Tablet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cx } from "@/components/ui";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useLive } from "@/lib/live";
import { fetchProposalViews, formatDuration, type ProposalView } from "@/lib/proposal-tracking";

/** Visualizações (do cliente) de uma ou mais propostas, atualizadas em tempo real. */
export function useProposalViews(proposalIds: string[]) {
  const key = [...proposalIds].sort().join(",");
  const { data, loading } = useLive(() => fetchProposalViews(key ? key.split(",") : []), [key], ["proposal_views"]);
  return { views: data ?? [], loading };
}

export function summarize(views: ProposalView[]) {
  const total = views.length;
  const seconds = views.reduce((s, v) => s + (v.duration_seconds || 0), 0);
  const last = views[0]?.viewed_at ?? null;
  const first = views[views.length - 1]?.viewed_at ?? null;
  return { total, seconds, last, first };
}

function DeviceIcon({ device, className }: { device: string | null; className?: string }) {
  const d = (device ?? "").toLowerCase();
  if (d.includes("tablet")) return <Tablet className={className} />;
  if (d.includes("iphone") || d.includes("celular")) return <Smartphone className={className} />;
  return <Monitor className={className} />;
}

/** Linha do tempo das visualizações. */
export function ViewsTimeline({ views, compact }: { views: ProposalView[]; compact?: boolean }) {
  if (!views.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] px-4 py-3.5 ring-1 ring-white/5">
        <EyeOff className="h-4 w-4 shrink-0 text-zinc-500" />
        <p className="text-[13px] text-zinc-400">O cliente ainda não abriu o link. Você é avisado aqui assim que ele abrir.</p>
      </div>
    );
  }
  const s = summarize(views);
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Visualizações" value={`${s.total}×`} />
        <Stat label="Tempo de leitura" value={formatDuration(s.seconds)} />
        <Stat label="Última vez" value={relativeTime(s.last)} />
      </div>
      <ol className={cx("relative grid gap-1.5 overflow-y-auto pr-1", compact ? "max-h-56" : "max-h-80")}>
        {views.map((v, i) => (
          <li key={v.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.03]">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-violet-400/10 text-violet-300 ring-1 ring-violet-400/20">
              <DeviceIcon device={v.device} className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-zinc-100">
                {i === views.length - 1 ? "Primeira abertura" : `${views.length - i}ª visualização`}
                <span className="ml-1.5 font-normal text-zinc-500">· {v.device || "Dispositivo"}</span>
              </p>
              <p className="tnum text-xs text-zinc-400">{formatDateTime(v.viewed_at)}</p>
            </div>
            <span className="tnum inline-flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
              <Clock className="h-3 w-3" /> {formatDuration(v.duration_seconds)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.03] px-3 py-2.5 ring-1 ring-white/5">
      <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">{label}</p>
      <p className="tnum mt-0.5 truncate text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

/** Pílula "👁 3× · há 2 h" com popover do histórico — usada no editor e na lista. */
export function ViewsPill({ proposalId, views: given, align = "right" }: { proposalId?: string; views?: ProposalView[]; align?: "left" | "right" }) {
  const own = useProposalViews(given || !proposalId ? [] : [proposalId]);
  const views = given ?? own.views;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const s = summarize(views);
  const seen = s.total > 0;
  return (
    <div ref={ref} className="relative z-10 inline-flex">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cx(
          "inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ring-1 transition",
          seen ? "bg-violet-400/10 text-violet-200 ring-violet-400/25 hover:bg-violet-400/15" : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200",
        )}
        title="Histórico de visualizações do cliente"
      >
        {seen ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
        {seen ? `${s.total}× · ${relativeTime(s.last)}` : "Não visualizada"}
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={cx(
            "animate-fade-up absolute top-full z-30 mt-2 w-[min(92vw,380px)] rounded-2xl bg-zinc-900/95 p-4 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display text-sm font-semibold text-white">Visualizações do cliente</p>
            <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 hover:bg-white/5 hover:text-white" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
          </div>
          <ViewsTimeline views={views} compact />
          <p className="mt-3 text-[11px] text-zinc-500">Aberturas da equipe (logada) e exportações em PDF não entram na contagem.</p>
        </div>
      )}
    </div>
  );
}

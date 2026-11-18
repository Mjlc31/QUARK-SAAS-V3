"use client";

import { Eye, EyeOff, Send } from "lucide-react";
import { formatDateTime, relativeTime } from "@/lib/format";
import { useLive } from "@/lib/live";
import { supabase } from "@/lib/supabaseClient";

type Row = {
  status: string;
  sent_at: string | null;
  viewed_at: string | null;
  last_viewed_at?: string | null;
  view_count: number;
};

/** Minutos desde a última abertura (para mostrar "vendo agora"). */
export const minutesSinceView = (r: Pick<Row, "viewed_at" | "last_viewed_at">, now = Date.now()) => {
  const at = r.last_viewed_at ?? r.viewed_at;
  return at ? (now - new Date(at).getTime()) / 60000 : Infinity;
};

/**
 * Situação do link da proposta (solar ou S.A.V.E): quantas vezes o cliente abriu,
 * quando foi a última vez e se está vendo agora. Atualiza em tempo real.
 */
export function ViewStatus({ id, className }: { id: string; className?: string }) {
  const { data: r } = useLive<Row | null>(
    async () => {
      const { data } = await supabase.from("proposals").select("status, sent_at, viewed_at, last_viewed_at, view_count").eq("id", id).maybeSingle();
      return (data as Row | null) ?? null;
    },
    [id],
    ["proposals"],
  );

  if (!r) return null;

  const hasViewed = (r.view_count && r.view_count > 0) || !!r.last_viewed_at || !!r.viewed_at;
  if (hasViewed) {
    const live = minutesSinceView(r) <= 10;
    const last = r.last_viewed_at ?? r.viewed_at;
    const count = Math.max(1, r.view_count || 1);
    return (
      <span
        title={`Primeira abertura: ${formatDateTime(r.viewed_at)}${last && last !== r.viewed_at ? ` · última: ${formatDateTime(last)}` : ""}`}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-all ${
          live
            ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm shadow-emerald-500/20"
            : "bg-violet-950/50 text-violet-300 border-violet-500/30"
        } ${className ?? ""}`}
      >
        {live ? (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        ) : (
          <Eye className="h-3.5 w-3.5 text-violet-400" />
        )}
        {live ? "Cliente vendo agora" : `Cliente abriu ${count}×`}
        <span className="font-normal opacity-70">· última {relativeTime(last)}</span>
      </span>
    );
  }

  if (r.sent_at || r.status === "enviada") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 text-[11px] font-semibold text-amber-300 ${
          className ?? ""
        }`}
      >
        <EyeOff className="h-3.5 w-3.5 text-amber-400" />
        Ainda não abriu
        <span className="font-normal opacity-70">· enviada {relativeTime(r.sent_at)}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-zinc-800/80 border border-zinc-700/50 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 ${
        className ?? ""
      }`}
    >
      <Send className="h-3 w-3 text-zinc-400" />
      Envie o link para acompanhar a visualização
    </span>
  );
}

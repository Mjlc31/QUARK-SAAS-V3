import React, { useMemo, useState } from "react";
import { Copy, Eye, EyeOff, FileText, Flame, LayoutGrid, Link2, List, MapPin, MessageCircle, Plus, Receipt, Search, Snowflake, X, Zap } from "lucide-react";
import { toast } from "react-hot-toast";
import { OpportunityDetailsPanel } from "../components/OpportunityDetailsPanel";
import { NewOpportunityModal, friendly } from "../components/crm/NewOpportunityModal";
import { ServiceBadges } from "../components/crm/ServiceBadges";
import { cx } from "../components/ui";
import { LOSS_REASONS, OPPORTUNITY_STAGES, convertToClient, formatCurrencyShort, isCold, leadScore, type OppProposal, type Opportunity } from "../lib/crm";
import { formatPhone, relativeTime, whatsappUrl } from "../lib/format";
import { useLive } from "../lib/live";
import { brl, fmtNum } from "../lib/pricing";
import { fetchProposalViews, type ProposalView } from "../lib/proposal-tracking";
import { SERVICES, servicesOf, type ServiceId } from "../lib/services";
import { supabase } from "../lib/supabaseClient";

const PROPOSAL_LABEL: Record<string, string> = { rascunho: "Rascunho", enviada: "Enviada", visualizada: "Visualizada", aceita: "Aceita", recusada: "Recusada" };

interface CrmData {
  opps: Opportunity[];
  proposals: OppProposal[];
  views: ProposalView[];
}

async function loadCrm(): Promise<CrmData> {
  const [oppRes, propRes] = await Promise.all([
    supabase.from("opportunities").select("*").order("created_at", { ascending: false }),
    supabase.from("proposals").select("id, number, lead_id, status, final_price, power_kwp, public_token, created_at, product:inputs->>product").order("created_at", { ascending: false }).limit(400),
  ]);
  const proposals = ((propRes.data ?? []) as any[]).map((p) => ({ ...p, inputs: { product: p.product } })) as OppProposal[];
  const views = await fetchProposalViews(proposals.filter((p) => p.status !== "rascunho").map((p) => String(p.id)));
  return { opps: (oppRes.data ?? []) as Opportunity[], proposals, views };
}

const CRM: React.FC = () => {
  const { data, setData, loading, reload } = useLive(loadCrm, [], ["opportunities", "proposals", "proposal_views"]);
  const opportunities = data?.opps ?? [];
  const [searchTerm, setSearchTerm] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceId | "todos">("todos");
  const [showOnlyHot, setShowOnlyHot] = useState(false);
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggedOpp, setDraggedOpp] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [lossModal, setLossModal] = useState<string | null>(null);
  const [lossReason, setLossReason] = useState("");
  const [linksOpen, setLinksOpen] = useState(false);

  const setOpps = (fn: (o: Opportunity[]) => Opportunity[]) => setData((d) => (d ? { ...d, opps: fn(d.opps) } : d));

  // Proposta mais recente + visualizações por cliente.
  const byLead = useMemo(() => {
    const map = new Map<string, { proposal: OppProposal; count: number; views: ProposalView[] }>();
    for (const p of data?.proposals ?? []) {
      if (!p.lead_id) continue;
      const cur = map.get(String(p.lead_id));
      const views = (data?.views ?? []).filter((v) => v.proposal_id === String(p.id));
      if (!cur) map.set(String(p.lead_id), { proposal: p, count: 1, views });
      else {
        cur.count += 1;
        cur.views = [...cur.views, ...views].sort((a, b) => b.viewed_at.localeCompare(a.viewed_at));
      }
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return opportunities.filter((opp) => {
      const matchesSearch =
        !q ||
        opp.title?.toLowerCase().includes(q) ||
        (opp.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, "") || "§") ||
        (opp.city ?? "").toLowerCase().includes(q) ||
        (opp.source ?? "").toLowerCase().includes(q);
      const matchesService = serviceFilter === "todos" || servicesOf(opp).some((s) => s.id === serviceFilter);
      const matchesHot = !showOnlyHot || leadScore(opp, byLead.get(opp.id)?.views.length ?? 0) >= 75;
      return matchesSearch && matchesService && matchesHot;
    });
  }, [opportunities, searchTerm, serviceFilter, showOnlyHot, byLead]);

  const serviceStats = useMemo(
    () =>
      SERVICES.map((s) => {
        const list = opportunities.filter((o) => o.status !== "Perdido" && servicesOf(o).some((x) => x.id === s.id));
        return { ...s, count: list.length, value: list.reduce((acc, o) => acc + (o.amount || 0), 0) };
      }),
    [opportunities],
  );

  const metrics = useMemo(() => {
    const open = opportunities.filter((o) => o.status !== "Ganho" && o.status !== "Perdido");
    const weighted = open.reduce((acc, o) => acc + (o.amount || 0) * (OPPORTUNITY_STAGES.find((s) => s.id === o.status)?.weight ?? 0.1), 0);
    const won = opportunities.filter((o) => o.status === "Ganho");
    const closed = won.length + opportunities.filter((o) => o.status === "Perdido").length;
    const viewedNotClosed = open.filter((o) => (byLead.get(o.id)?.views.length ?? 0) > 0).length;
    return {
      weighted,
      winRate: closed ? Math.round((won.length / closed) * 100) : 0,
      wonValue: won.reduce((a, o) => a + (o.amount || 0), 0),
      open: open.length,
      viewedNotClosed,
    };
  }, [opportunities, byLead]);

  const executeStatusChange = async (opp: Opportunity, status: string, reason?: string) => {
    if (opp.status === status) return;
    setOpps((prev) => prev.map((o) => (o.id === opp.id ? { ...o, status, loss_reason: reason || o.loss_reason } : o)));
    if (status === "Ganho") await convertToClient(opp);

    const updatePayload: Partial<Opportunity> = { status };
    if (reason) updatePayload.loss_reason = reason;
    const { error } = await supabase.from("opportunities").update(updatePayload).eq("id", opp.id);
    if (error) {
      toast.error(friendly(error.message));
      return reload();
    }
    await supabase.from("agent_notes").insert({
      entity_type: "opportunity",
      entity_id: opp.id,
      note: `Fase alterada de '${opp.status || "Lead"}' para '${status}'.${reason ? " Motivo: " + reason : ""}`,
      created_by_ai: false,
    });
    if (status === "Ganho") toast.success(`🎉 ${opp.title} virou cliente!`);

    let text = "";
    if (status === "Qualificado") text = `Olá ${opp.title}! Um dos nossos engenheiros da Quark Energia vai analisar o seu perfil de consumo.`;
    if (status === "Ganho") text = `Parabéns ${opp.title}! Bem-vindo(a) à família Quark Energia. Estamos felizes em ter você conosco!`;
    if (text && opp.phone) {
      fetch("/api/evolution/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: opp.phone, text }) }).catch(() => {});
      supabase.from("agent_notes").insert([{ entity_type: "opportunity", entity_id: opp.id, note: `Automação disparada (WhatsApp): "${text}"`, created_by_ai: true }]).then(() => {});
    }
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    e.preventDefault();
    setDragOver(null);
    const opp = opportunities.find((o) => o.id === draggedOpp);
    setDraggedOpp(null);
    if (!opp || opp.status === status) return;
    if (status === "Perdido") return setLossModal(opp.id);
    await executeStatusChange(opp, status);
  };

  const confirmLoss = async () => {
    const opp = opportunities.find((o) => o.id === lossModal);
    if (opp) await executeStatusChange(opp, "Perdido", lossReason);
    setLossModal(null);
    setLossReason("");
  };

  const handleSaveEdit = async (id: string, updates: Partial<Opportunity>) => {
    const before = opportunities.find((o) => o.id === id);
    if (!before) return;
    if (updates.status === "Perdido" && before.status !== "Perdido" && !updates.loss_reason) return setLossModal(id);
    if (updates.status && updates.status !== before.status) return executeStatusChange(before, updates.status);
    setOpps((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    const { error } = await supabase.from("opportunities").update(updates).eq("id", id);
    if (error) {
      toast.error(friendly(error.message));
      reload();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir esta oportunidade? Esta ação não pode ser desfeita.")) return;
    setOpps((prev) => prev.filter((o) => o.id !== id));
    setSelectedId(null);
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      reload();
    }
  };

  const selected = opportunities.find((o) => o.id === selectedId) ?? null;

  return (
    <div className="animate-enter relative flex min-h-[calc(100dvh-8rem)] flex-col lg:h-[calc(100dvh-5rem)]">
      {/* Cabeçalho */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Leads & CRM</h1>
          <p className="mt-1 text-sm text-zinc-400">Cada negócio com o serviço vendido, a conta de luz e o engajamento com a proposta.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setLinksOpen((o) => !o)}
              className="flex h-10 items-center gap-2 rounded-xl bg-zinc-900/70 px-3.5 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:text-white"
            >
              <Link2 className="h-4 w-4" /> Links de captura
            </button>
            {linksOpen && <CaptureLinks onClose={() => setLinksOpen(false)} />}
          </div>
          <button onClick={() => setIsFormOpen(true)} className="btn-primary flex h-10 items-center gap-2 rounded-xl px-4 text-sm active:scale-95">
            <Plus size={18} strokeWidth={2.5} /> Nova oportunidade
          </button>
        </div>
      </div>

      {/* Métricas */}
      <div className="mb-4 grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Pipeline ponderado" value={brl(metrics.weighted, 0)} sub={`${metrics.open} negócios abertos`} />
        <Metric label="Taxa de conversão" value={`${metrics.winRate}%`} sub="ganhos ÷ fechados" accent />
        <Metric label="Receita ganha" value={formatCurrencyShort(metrics.wonValue)} sub="negócios na etapa Ganho" />
        <Metric label="Viram a proposta" value={String(metrics.viewedNotClosed)} sub="abertos e já visualizaram — ligue!" icon={<Eye className="h-3.5 w-3.5 text-violet-300" />} />
      </div>

      {/* Serviços (filtro) */}
      <div className="scrollbar-none -mx-4 mb-4 flex shrink-0 gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <ServiceChip active={serviceFilter === "todos"} onClick={() => setServiceFilter("todos")} label="Todos" count={opportunities.length} />
        {serviceStats.map((s) => (
          <ServiceChip
            key={s.id}
            active={serviceFilter === s.id}
            onClick={() => setServiceFilter(serviceFilter === s.id ? "todos" : s.id)}
            label={s.short}
            count={s.count}
            value={s.value}
            icon={<s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />}
          />
        ))}
      </div>

      {/* Busca e visualização */}
      <div className="mb-4 flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            placeholder="Buscar por nome, telefone, cidade ou origem…"
            className="h-10 w-full rounded-xl bg-zinc-900/60 pr-4 pl-10 text-sm text-zinc-100 ring-1 ring-white/10 transition outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-lime-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOnlyHot(!showOnlyHot)}
            className={cx(
              "flex h-10 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 transition sm:flex-none",
              showOnlyHot ? "bg-orange-500/15 text-orange-300 ring-orange-500/30" : "bg-zinc-900/60 text-zinc-400 ring-white/10 hover:text-white",
            )}
          >
            <Flame size={15} /> Quentes
          </button>
          <div className="flex rounded-xl bg-zinc-900/60 p-1 ring-1 ring-white/10">
            <button onClick={() => setViewMode("board")} className={cx("grid h-8 w-9 place-items-center rounded-lg transition", viewMode === "board" ? "bg-zinc-800 text-lime-300" : "text-zinc-500 hover:text-zinc-300")} title="Quadro" aria-label="Quadro">
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode("list")} className={cx("grid h-8 w-9 place-items-center rounded-lg transition", viewMode === "list" ? "bg-zinc-800 text-lime-300" : "text-zinc-500 hover:text-zinc-300")} title="Lista" aria-label="Lista">
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="grid flex-1 place-items-center text-sm text-zinc-500">Carregando oportunidades…</div>
      ) : viewMode === "board" ? (
        <div className="custom-scrollbar -mx-4 flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4 lg:mx-0 lg:px-0">
          <div className="flex h-full min-w-max flex-row items-start gap-4">
            {OPPORTUNITY_STAGES.map((column) => {
              const columnOpps = filtered.filter((o) => (o.status || "Lead") === column.id);
              const total = columnOpps.reduce((acc, o) => acc + (o.amount || 0), 0);
              return (
                <div
                  key={column.id}
                  className={cx(
                    "flex h-full max-h-[75dvh] w-[85vw] shrink-0 flex-col overflow-hidden rounded-2xl bg-zinc-950/70 ring-1 transition sm:w-[300px] lg:max-h-none",
                    dragOver === column.id ? "ring-2 ring-lime-400/50" : "ring-white/5",
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(column.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => handleDrop(e, column.id)}
                >
                  <div className="shrink-0 border-b border-white/5 px-4 pt-3.5 pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ background: column.color, boxShadow: `0 0 10px ${column.color}` }} />
                        <h3 className="font-display text-sm font-semibold text-zinc-100">{column.name}</h3>
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-bold text-zinc-400">{columnOpps.length}</span>
                      </div>
                      <span className="tnum text-xs font-semibold text-zinc-400">{formatCurrencyShort(total)}</span>
                    </div>
                  </div>
                  <div className="custom-scrollbar flex-1 space-y-2.5 overflow-y-auto p-2.5">
                    {columnOpps.length === 0 && (
                      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-white/10 text-[11px] font-semibold tracking-wider text-zinc-600 uppercase">
                        Arraste para cá
                      </div>
                    )}
                    {columnOpps.map((opp) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        info={byLead.get(opp.id)}
                        dragging={draggedOpp === opp.id}
                        onDragStart={(e) => {
                          setDraggedOpp(opp.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={() => setSelectedId(opp.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <OppTable opps={filtered} byLead={byLead} onOpen={setSelectedId} />
      )}

      {selected && (
        <OpportunityDetailsPanel
          opportunity={selected}
          stages={OPPORTUNITY_STAGES as unknown as { id: string; name: string }[]}
          proposals={(data?.proposals ?? []).filter((p) => String(p.lead_id) === selected.id)}
          views={data?.views ?? []}
          onClose={() => setSelectedId(null)}
          onSave={(u) => handleSaveEdit(selected.id, u)}
          onDelete={handleDelete}
        />
      )}

      {isFormOpen && (
        <NewOpportunityModal
          onClose={() => setIsFormOpen(false)}
          onSaved={(o, merged) => {
            setOpps((prev) => (merged ? prev.map((x) => (x.id === o.id ? o : x)) : [o, ...prev]));
            setSelectedId(o.id);
          }}
        />
      )}

      {lossModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="animate-enter w-full max-w-md rounded-3xl bg-zinc-950 p-7 shadow-[0_0_50px_rgba(239,68,68,0.15)] ring-1 ring-red-500/30">
            <h2 className="font-display text-xl font-semibold text-white">Motivo da perda</h2>
            <p className="mt-1 mb-5 text-sm text-zinc-400">Isso ajuda a entender onde o funil está vazando.</p>
            <div className="mb-6 space-y-2">
              {LOSS_REASONS.map((reason) => (
                <button
                  key={reason}
                  onClick={() => setLossReason(reason)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium ring-1 transition",
                    lossReason === reason ? "bg-red-500/10 text-white ring-red-500/50" : "bg-zinc-900/60 text-zinc-400 ring-white/5 hover:ring-white/10",
                  )}
                >
                  <span className={cx("grid h-4 w-4 place-items-center rounded-full ring-1", lossReason === reason ? "ring-red-500" : "ring-zinc-600")}>
                    {lossReason === reason && <span className="h-2 w-2 rounded-full bg-red-500" />}
                  </span>
                  {reason}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setLossModal(null); setLossReason(""); }} className="flex-1 py-3 font-medium text-zinc-400 transition hover:text-white">
                Cancelar
              </button>
              <button onClick={confirmLoss} disabled={!lossReason} className="flex-1 rounded-xl bg-red-500 py-3 font-bold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-50">
                Confirmar perda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;

/* ------------------------------------------------------------------ peças */

function Metric({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/50 p-4 ring-1 ring-white/5 backdrop-blur-sm">
      <p className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-zinc-500 uppercase">
        {icon}
        {label}
      </p>
      <p className={cx("tnum mt-1 truncate font-display text-xl font-bold sm:text-2xl", accent ? "text-lime-300" : "text-white")}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{sub}</p>
    </div>
  );
}

function ServiceChip({ active, onClick, label, count, value, icon }: { active: boolean; onClick: () => void; label: string; count: number; value?: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left ring-1 transition",
        active ? "bg-white text-zinc-950 ring-white" : "bg-zinc-900/60 text-zinc-300 ring-white/10 hover:ring-white/20",
      )}
    >
      {icon}
      <span className="text-[13px] font-semibold">{label}</span>
      <span className={cx("rounded-full px-1.5 text-[11px] font-bold", active ? "bg-zinc-950/10" : "bg-white/5 text-zinc-400")}>{count}</span>
      {!!value && <span className={cx("tnum hidden text-[11px] sm:inline", active ? "text-zinc-600" : "text-zinc-500")}>{formatCurrencyShort(value)}</span>}
    </button>
  );
}

function ProposalLine({ info }: { info?: { proposal: OppProposal; count: number; views: ProposalView[] } }) {
  if (!info) return null;
  const { proposal: p, views } = info;
  const draft = p.status === "rascunho";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-black/25 px-2.5 py-1.5 ring-1 ring-white/5">
      <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-zinc-400">
        <FileText className="h-3 w-3 shrink-0" />
        <span className="truncate">
          #{p.number} · {PROPOSAL_LABEL[p.status] ?? p.status}
          {info.count > 1 && ` · ${info.count} propostas`}
        </span>
      </span>
      {!draft &&
        (views.length ? (
          <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-violet-300" title={`Última visualização ${relativeTime(views[0].viewed_at)}`}>
            <Eye className="h-3 w-3" /> {views.length}× · {relativeTime(views[0].viewed_at)}
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-zinc-500">
            <EyeOff className="h-3 w-3" /> não abriu
          </span>
        ))}
    </div>
  );
}

function OppCard({
  opp,
  info,
  dragging,
  onDragStart,
  onClick,
}: {
  opp: Opportunity;
  info?: { proposal: OppProposal; count: number; views: ProposalView[] };
  dragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const score = leadScore(opp, info?.views.length ?? 0);
  const lost = opp.status === "Perdido";
  const facts = [
    opp.avg_bill ? { icon: <Receipt className="h-3 w-3" />, text: `Conta ${brl(opp.avg_bill, 0)}` } : null,
    opp.system_power ? { icon: <Zap className="h-3 w-3" />, text: `${fmtNum(opp.system_power, 2)} kWp` } : info?.proposal.power_kwp ? { icon: <Zap className="h-3 w-3" />, text: `${fmtNum(info.proposal.power_kwp, 2)} kWp` } : null,
  ].filter(Boolean) as { icon: React.ReactNode; text: string }[];

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={cx(
        "group relative cursor-pointer touch-manipulation rounded-xl bg-zinc-900/90 p-3.5 ring-1 transition hover:-translate-y-0.5 hover:ring-white/15",
        lost ? "opacity-55 ring-red-900/40" : "ring-white/5",
        dragging && "opacity-40",
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-semibold text-zinc-100">{opp.title}</h4>
            {score >= 75 && <Flame size={13} className="shrink-0 text-orange-400" aria-label="Lead quente" />}
            {isCold(opp) && <Snowflake size={13} className="shrink-0 text-sky-400" aria-label="Parado há mais de 7 dias" />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-zinc-500">
            <MapPin size={11} /> {opp.city || "Cidade não informada"}
            {opp.source && <span className="truncate"> · {opp.source}</span>}
          </p>
        </div>
        <p className="tnum shrink-0 text-sm font-bold text-lime-300">{opp.amount ? formatCurrencyShort(opp.amount) : "—"}</p>
      </div>

      <ServiceBadges opp={opp} max={3} size="xs" className="mb-2" />

      {facts.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
          {facts.map((f) => (
            <span key={f.text} className="tnum flex items-center gap-1">
              {f.icon} {f.text}
            </span>
          ))}
        </div>
      )}

      <ProposalLine info={info} />

      <div className="mt-2.5 flex items-center justify-between border-t border-white/5 pt-2.5">
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-white/5" title={`Score ${score}`}>
            <div className="h-full rounded-full" style={{ width: `${score}%`, background: score >= 75 ? "#fb923c" : score >= 50 ? "#facc15" : "#60a5fa" }} />
          </div>
          <span className="text-[10px] font-semibold text-zinc-500">{score}</span>
        </div>
        {opp.phone && (
          <a
            href={whatsappUrl(opp.phone, `Olá ${opp.title.split(" ")[0]}! Aqui é da Quark Energia.`)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500 hover:text-white"
            title={`WhatsApp ${formatPhone(opp.phone)}`}
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}

function OppTable({ opps, byLead, onOpen }: { opps: Opportunity[]; byLead: Map<string, { proposal: OppProposal; count: number; views: ProposalView[] }>; onOpen: (id: string) => void }) {
  if (!opps.length) return <div className="rounded-2xl py-16 text-center text-sm text-zinc-500 ring-1 ring-white/5">Nenhuma oportunidade encontrada.</div>;
  return (
    <div className="custom-scrollbar flex-1 overflow-auto rounded-2xl bg-zinc-900/40 ring-1 ring-white/5">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-zinc-950/95 text-[10px] font-bold tracking-wider text-zinc-500 uppercase backdrop-blur">
          <tr>
            <th className="px-4 py-3">Cliente</th>
            <th className="px-3 py-3">Serviços</th>
            <th className="px-3 py-3">Etapa</th>
            <th className="px-3 py-3">Conta / sistema</th>
            <th className="px-3 py-3">Proposta</th>
            <th className="px-4 py-3 text-right">Valor</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {opps.map((o) => {
            const stage = OPPORTUNITY_STAGES.find((s) => s.id === o.status) ?? OPPORTUNITY_STAGES[0];
            const info = byLead.get(o.id);
            return (
              <tr key={o.id} onClick={() => onOpen(o.id)} className="cursor-pointer transition hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{o.title}</p>
                  <p className="text-xs text-zinc-500">{[o.city, formatPhone(o.phone), o.source].filter(Boolean).join(" · ") || "—"}</p>
                </td>
                <td className="px-3 py-3">
                  <ServiceBadges opp={o} max={2} size="xs" />
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: stage.color }} /> {stage.name}
                  </span>
                </td>
                <td className="tnum px-3 py-3 text-xs text-zinc-400">
                  {[o.avg_bill ? `${brl(o.avg_bill, 0)}/mês` : null, o.system_power ? `${fmtNum(o.system_power, 2)} kWp` : null].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-3 py-3 text-xs">
                  {info ? (
                    <span className="flex items-center gap-2 text-zinc-300">
                      #{info.proposal.number} · {PROPOSAL_LABEL[info.proposal.status] ?? info.proposal.status}
                      {info.views.length > 0 && (
                        <span className="flex items-center gap-1 font-semibold text-violet-300">
                          <Eye className="h-3 w-3" /> {info.views.length}×
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
                <td className="tnum px-4 py-3 text-right font-semibold text-lime-300">{o.amount ? brl(o.amount, 0) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CaptureLinks({ onClose }: { onClose: () => void }) {
  const origin = window.location.origin;
  const links = [
    { label: "Link da bio (Instagram)", sub: "Landing page com todos os serviços", url: `${origin}/bio` },
    { label: "Anamnese do cliente", sub: "Questionário completo, já cadastra no CRM", url: `${origin}/anamnese` },
    { label: "Simulador de economia", sub: "Funil de captura com simulação", url: `${origin}/captura` },
  ];
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="animate-fade-up absolute top-full right-0 z-40 mt-2 w-[min(92vw,360px)] rounded-2xl bg-zinc-900/95 p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10 backdrop-blur-xl lg:left-0 lg:right-auto">
        <div className="flex items-center justify-between px-2 py-1.5">
          <p className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Leads entram direto no CRM</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>
        {links.map((l) => (
          <div key={l.url} className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-white/5">
            <a href={l.url} target="_blank" rel="noreferrer" className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">{l.label}</p>
              <p className="truncate text-xs text-zinc-500">{l.sub}</p>
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText(l.url).then(() => toast.success("Link copiado"), () => toast.error("Não foi possível copiar"));
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-zinc-300 hover:bg-lime-400 hover:text-zinc-950"
              aria-label={`Copiar ${l.label}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

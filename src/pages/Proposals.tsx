"use client";

import { Calculator, Download, PlugZap, Copy, Eye, FileText, MoreHorizontal, Search, Trash2, Building2, TrendingUp, Wallet, Trophy, ArrowUpRight } from "lucide-react";
import { SettingsModal } from "../components/proposal/SettingsModal";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Badge, Button, Card, Empty, Input, PageHeader, Segmented, Skeleton, cx } from "@/components/ui";
import { PRODUCTS, PROPOSAL_STATUS, productOf } from "@/lib/constants";
import { proposalSummary } from "@/lib/proposal-summary";
import { formatDate, relativeTime } from "@/lib/format";
import { must, useLive } from "@/lib/live";
import { brl, fmtNum } from "@/lib/pricing";
import { downloadCsv, today } from "@/lib/csv";
import { Mantra } from "@/components/app/mantra";
import { supabase } from "@/lib/supabase/client";
import type { Product, Proposal, ProposalStatus } from "@/lib/types";

type Filter = "todas" | ProposalStatus;

export default function ProposalsPage() {
  return (
    <Suspense>
      <Proposals />
    </Suspense>
  );
}

function Proposals() {
  
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [params] = useSearchParams();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todas");
  const [product, setProduct] = useState<"todos" | Product>(params.get("tipo") === "save" ? "save" : params.get("tipo") === "solar" ? "solar" : "todos");
  useEffect(() => {
    const t = params.get("tipo");
    setProduct(t === "save" ? "save" : t === "solar" ? "solar" : "todos");
  }, [params]);
  const { data: rawData, loading } = useLive(
    async () => {
      const res = await supabase().from("proposals").select("*").order("created_at", { ascending: false }).limit(100);
      if (res.error) throw res.error;
      return (res.data || []).map((p: any) => ({
        ...p,
        lead: p.lead || { name: p.client_name || p.data?.clientName || 'Sem nome', city: p.city || p.data?.city, phone: p.phone }
      })) as Proposal[];
    },
    [],
    ["proposals"],
  );
  const data = rawData;
  const scoped = useMemo(() => (data ?? []).filter((p) => product === "todos" || productOf(p.inputs) === product), [data, product]);

  const rows = useMemo(
    () =>
      scoped.filter(
        (p) =>
          (filter === "todas" || p.status === filter) &&
          `${p.number} ${p.lead?.name ?? ""} ${p.title ?? ""} ${p.lead?.city ?? ""}`.toLowerCase().includes(q.toLowerCase()),
      ),
    [scoped, q, filter],
  );

  const totals = useMemo(() => {
    const all = scoped;
    const open = all.filter((p) => ["enviada", "visualizada"].includes(p.status));
    const won = all.filter((p) => p.status === "aceita");
    return {
      open: open.reduce((s, p) => s + Number(p.final_price), 0),
      openCount: open.length,
      won: won.reduce((s, p) => s + Number(p.final_price), 0),
      wonCount: won.length,
      profit: won.reduce((s, p) => s + Number(p.profit_value), 0),
    };
  }, [scoped]);

  const duplicate = async (p: Proposal) => {
    const { id, number, public_token, created_at, updated_at, lead, sent_at, viewed_at, view_count, accepted_at, accepted_by, status, ...rest } = p;
    void id; void number; void public_token; void created_at; void updated_at; void lead; void sent_at; void viewed_at; void view_count; void accepted_at; void accepted_by; void status;
    const { data: copy, error } = await supabase().from("proposals").insert({ ...rest, status: "rascunho" }).select("id").single();
    if (error) return toast.error(error.message);
    toast.success("Orçamento duplicado");
    navigate(`/propostas/${copy.id}`);
  };

  const remove = async (p: Proposal) => {
    if (!confirm(`Excluir o orçamento #${p.number}? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase().from("proposals").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Orçamento excluído");
  };

  return (
    <div className="animate-enter">
      <PageHeader
        title={product === "save" ? "Propostas S.A.V.E" : product === "solar" ? "Propostas solares" : "Propostas"}
        subtitle={product === "save" ? "Sistemas de abastecimento de veículo elétrico" : "Todos os orçamentos gerados, com status de envio e visualização"}
        actions={
          <>
            
            <Button variant="secondary" onClick={() => setShowSettings(true)}>
              <Building2 className="h-4 w-4" /> Configurações
            </Button>
            {product !== "save" && (
              <Link to="/propostas/nova">

                <Button variant="sun">
                  <Calculator className="h-4 w-4" /> Orçamento solar
                </Button>
              </Link>
            )}
            {product !== "solar" && (
              <Link to="/propostas/nova?tipo=save">
                <Button>
                  <PlugZap className="h-4 w-4" /> Orçamento S.A.V.E
                </Button>
              </Link>
            )}
            <Button
              variant="secondary"
              title="Baixar planilha (Excel) com as propostas filtradas"
              onClick={() =>
                downloadCsv(
                  `propostas-${today()}.csv`,
                  ["Nº", "Tipo", "Cliente", "Resumo", "Status", "Valor final (R$)", "Custo direto (R$)", "Lucro (R$)", "Comissão (R$)", "Visualizações", "Criada em", "Aceita em"],
                  rows.map((p) => [
                    p.number,
                    PRODUCTS[productOf(p.inputs)].short,
                    p.lead?.name,
                    proposalSummary(p),
                    PROPOSAL_STATUS[p.status]?.label,
                    Number(p.final_price),
                    Number(p.direct_cost),
                    Number(p.profit_value),
                    Number(p.commission_value),
                    p.view_count,
                    new Date(p.created_at).toLocaleDateString("pt-BR"),
                    p.accepted_at ? new Date(p.accepted_at).toLocaleDateString("pt-BR") : "",
                  ]),
                )
              }
            >
              <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
            </Button>
          </>
        }
      />
      <Mantra seed={17} />

      <Segmented<"todos" | Product>
        className="mb-4"
        value={product}
        onChange={(v) => {
          setProduct(v);
          navigate(v === "todos" ? "/propostas" : `/propostas?tipo=${v}`, { replace: true });
        }}
        options={[
          { value: "todos", label: "Todas" },
          { value: "solar", label: "☀️ Solar" },
          { value: "save", label: "⚡ S.A.V.E" },
        ]}
      />

      {/* ─── Stats Cards ─── */}
      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" />}
          label="Em aberto"
          value={brl(totals.open, 0)}
          sub={`${totals.openCount} proposta${totals.openCount !== 1 ? 's' : ''} enviada${totals.openCount !== 1 ? 's' : ''}`}
          gradient="from-amber-500/10 to-orange-500/10"
          iconColor="text-amber-500"
          borderColor="border-amber-500/20"
        />
        <StatCard
          icon={<Trophy className="h-5 w-5" />}
          label="Aceitas"
          value={brl(totals.won, 0)}
          sub={`${totals.wonCount} proposta${totals.wonCount !== 1 ? 's' : ''}`}
          gradient="from-emerald-500/10 to-green-500/10"
          iconColor="text-emerald-500"
          borderColor="border-emerald-500/20"
          accent
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="Lucro nas aceitas"
          value={brl(totals.profit, 0)}
          sub="Soma do lucro previsto"
          gradient="from-violet-500/10 to-purple-500/10"
          iconColor="text-violet-500"
          borderColor="border-violet-500/20"
        />
      </div>

      {/* ─── Search + Filter ─── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por cliente, número ou cidade" className="pl-10" />
        </div>
        <div className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <Segmented<Filter>
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todas", label: "Todas" },
              { value: "rascunho", label: "Rascunhos" },
              { value: "enviada", label: "Enviadas" },
              { value: "visualizada", label: "Vistas" },
              { value: "aceita", label: "Aceitas" },
            ]}
          />
        </div>
      </div>

      {/* ─── Proposals List ─── */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="grid gap-3 p-5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : !rows.length ? (
          <Empty
            icon={<FileText className="h-6 w-6" />}
            title={data?.length ? "Nada encontrado" : "Nenhum orçamento ainda"}
            text={data?.length ? "Ajuste a busca ou o filtro." : "Crie o primeiro orçamento e envie uma proposta impecável ao seu cliente."}
            action={
              !data?.length && (
                <Link to="/propostas/nova">
                  <Button variant="sun">Criar orçamento</Button>
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-zinc-800">
            {rows.map((p, idx) => (
              <ProposalRow key={p.id} p={p} idx={idx} onDuplicate={() => duplicate(p)} onDelete={() => remove(p)} />
            ))}
          </ul>
        )}
      
      </Card>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}

/* ─── Stat Card ─── */
function StatCard({
  icon,
  label,
  value,
  sub,
  gradient,
  iconColor,
  borderColor,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  gradient: string;
  iconColor: string;
  borderColor: string;
  accent?: boolean;
}) {
  return (
    <Card className={cx("group relative overflow-hidden border p-5 transition-all duration-300 hover:shadow-lg", borderColor)}>
      {/* Gradient background */}
      <div className={cx("absolute inset-0 bg-gradient-to-br opacity-50 transition-opacity duration-300 group-hover:opacity-80", gradient)} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={cx("grid h-9 w-9 place-items-center rounded-xl bg-zinc-800/50", iconColor)}>
            {icon}
          </div>
          {accent && (
            <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
              <ArrowUpRight className="h-3 w-3" />
              Receita
            </div>
          )}
        </div>
        <p className="mt-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">{label}</p>
        <p className={cx("tnum mt-1 font-display text-2xl font-bold tracking-tight", accent && "text-sun-gradient")}>{value}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>
      </div>
    </Card>
  );
}

/* ─── Proposal Row ─── */
function ProposalRow({ p, idx, onDuplicate, onDelete }: { p: Proposal; idx: number; onDuplicate: () => void; onDelete: () => void }) {
  const statusColors: Record<string, string> = {
    rascunho: "bg-zinc-500",
    enviada: "bg-blue-500",
    visualizada: "bg-violet-500",
    aceita: "bg-emerald-500",
    recusada: "bg-rose-500",
  };

  const initials = (p.lead?.name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <li
      className="group relative flex items-center gap-4 px-5 py-4 transition-all duration-200 hover:bg-zinc-800/60"
      style={{ animationDelay: `${Math.min(idx * 40, 300)}ms` }}
    >
      <Link to={`/propostas/${p.id}`} className="absolute inset-0" aria-label={`Abrir orçamento ${p.number}`} />
      {/* Avatar com iniciais */}
      <div className="relative hidden h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 font-display text-xs font-bold text-white sm:grid">
        {initials}
        <span className={cx("absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full ring-2 ring-zinc-900", statusColors[p.status || "rascunho"])} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="tnum mr-1 text-[11px] font-bold text-zinc-500 sm:hidden">#{p.number}</span>
          <p className="truncate font-semibold text-white">{p.lead?.name ?? "—"}</p>
          <Badge className={PROPOSAL_STATUS[p.status || "rascunho"]?.cls}>{PROPOSAL_STATUS[p.status || "rascunho"]?.label}</Badge>
          {productOf(p.inputs) === "save" && <Badge className={PRODUCTS.save?.cls}>⚡ S.A.V.E</Badge>}
        </div>
        <p className="mt-0.5 truncate text-[13px] text-zinc-400">
          <span className="hidden sm:inline tnum text-zinc-500 font-medium">#{p.number} · </span>
          {proposalSummary(p)} · {formatDate(p.created_at)}
          {p.view_count > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-violet-600">
              <Eye className="h-3 w-3" /> {p.view_count}× · {relativeTime(p.viewed_at)}
            </span>
          )}
        </p>
      </div>
      <div className="text-right">
        <p className="tnum font-display text-base font-bold tracking-tight">{brl(p.final_price)}</p>
        <p className={cx("tnum text-xs font-medium", Number(p.profit_value) < 0 ? "text-rose-500" : "text-emerald-500")}>
          {Number(p.profit_value) >= 0 ? "+" : ""}{brl(p.profit_value, 0)} lucro
        </p>
      </div>
      <RowMenu onDuplicate={onDuplicate} onDelete={onDelete} />
    </li>
  );
}

/* ─── Row Context Menu ─── */
function RowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative z-10">
      <button onClick={() => setOpen((o) => !o)} onBlur={() => setTimeout(() => setOpen(false), 150)} className="grid h-8 w-8 place-items-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-700 hover:text-zinc-200" aria-label="Ações">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="animate-fade-scale absolute top-full right-0 z-20 mt-1 w-44 rounded-xl bg-zinc-900 p-1 shadow-2xl shadow-black/40 ring-1 ring-white/10">
          <button onMouseDown={onDuplicate} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-zinc-800">
            <Copy className="h-4 w-4 text-zinc-400" /> Duplicar
          </button>
          <button onMouseDown={onDelete} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-rose-500/10">
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

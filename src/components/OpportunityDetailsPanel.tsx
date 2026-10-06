import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bot,
  Calendar,
  ClipboardList,
  Clock,
  Copy,
  ExternalLink,
  FileText,
  Flame,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { supabase } from "../lib/supabaseClient";
import { ANAMNESE_LABELS, leadScore, type OppProposal, type Opportunity } from "../lib/crm";
import { formatDate, formatDateTime, formatPhone, whatsappUrl } from "../lib/format";
import { brl, fmtNum } from "../lib/pricing";
import { type ProposalView } from "../lib/proposal-tracking";
import { LEAD_SOURCES, SERVICES, servicesOf, type ServiceId } from "../lib/services";
import { ROOF_TYPES } from "../lib/constants";
import { MACEIO_TARIFF } from "../lib/defaults";
import { ViewsTimeline } from "./ProposalViews";
import { ServiceBadges } from "./crm/ServiceBadges";
import { cx } from "./ui";

export type { Opportunity } from "../lib/crm";

interface AgentNote {
  id: string;
  note: string;
  created_by_ai: boolean;
  created_at: string;
}

type Tab = "geral" | "propostas" | "anamnese" | "timeline";

interface Props {
  opportunity: Opportunity;
  stages: { id: string; name: string }[];
  proposals: OppProposal[];
  views: ProposalView[];
  onClose: () => void;
  onSave: (opp: Partial<Opportunity>) => void;
  onDelete: (id: string) => void;
}

const PROPOSAL_LABEL: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-white/5 text-zinc-300 ring-white/10" },
  enviada: { label: "Enviada", cls: "bg-sky-400/10 text-sky-300 ring-sky-400/25" },
  visualizada: { label: "Visualizada", cls: "bg-violet-400/10 text-violet-300 ring-violet-400/25" },
  aceita: { label: "Aceita", cls: "bg-emerald-400/10 text-emerald-300 ring-emerald-400/25" },
  recusada: { label: "Recusada", cls: "bg-rose-400/10 text-rose-300 ring-rose-400/25" },
};

export const OpportunityDetailsPanel: React.FC<Props> = ({ opportunity: o, stages, proposals, views, onClose, onSave, onDelete }) => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("geral");
  const [notes, setNotes] = useState<AgentNote[]>([]);
  const [newNote, setNewNote] = useState("");

  const myViews = useMemo(() => views.filter((v) => proposals.some((p) => String(p.id) === v.proposal_id)), [views, proposals]);
  const score = leadScore(o, myViews.length);
  const anamnese = Object.entries(o.anamnese ?? {}).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length));
  const services = servicesOf(o);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const fetchNotes = async () => {
    const { data } = await supabase.from("agent_notes").select("*").eq("entity_type", "opportunity").eq("entity_id", o.id).order("created_at", { ascending: false });
    if (data) setNotes(data as AgentNote[]);
  };
  useEffect(() => {
    fetchNotes();
    const ch = supabase
      .channel(`notes-${o.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_notes", filter: `entity_id=eq.${o.id}` }, fetchNotes)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.id]);

  const addNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const { data, error } = await supabase.from("agent_notes").insert([{ entity_type: "opportunity", entity_id: o.id, note: newNote.trim(), created_by_ai: false }]).select();
    if (error) return toast.error(error.message);
    if (data) setNotes((prev) => [data[0] as AgentNote, ...prev.filter((n) => n.id !== data[0].id)]);
    setNewNote("");
  };

  const toggleService = (id: ServiceId) => {
    const cur = services.map((s) => s.id);
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    onSave({ services: next, segment: next[0] ?? null });
  };

  const newQuote = (tipo: "solar" | "save") => navigate(`/propostas/nova?lead=${o.id}${tipo === "save" ? "&tipo=save" : ""}`);
  const currentIndex = stages.findIndex((s) => s.id === o.status);

  return (
    <>
      <div className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="animate-slide-in-right fixed inset-y-0 right-0 z-[60] flex w-full flex-col border-l border-white/10 bg-zinc-950/95 shadow-2xl backdrop-blur-2xl md:w-[680px] xl:w-[760px]">
        {/* Cabeçalho */}
        <header className="relative shrink-0 overflow-hidden border-b border-white/5 px-5 pt-5 pb-4 sm:px-7">
          <div className="pointer-events-none absolute -top-40 -right-32 h-80 w-80 rounded-full bg-lime-500/10 blur-[90px]" />
          <div className="relative flex items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-lg bg-zinc-900/60 ring-1 ring-white/5">
              {stages.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => onSave({ status: s.id })}
                  className={cx(
                    "flex-1 truncate px-1 py-2 text-[10px] font-bold tracking-wider uppercase transition sm:text-[11px]",
                    i === currentIndex
                      ? s.id === "Perdido"
                        ? "bg-red-500 text-white"
                        : "bg-lime-400 text-zinc-950"
                      : i < currentIndex && o.status !== "Perdido"
                        ? "bg-lime-400/15 text-lime-300 hover:bg-lime-400/25"
                        : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300",
                  )}
                >
                  {s.name}
                </button>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1 rounded-xl bg-black/40 p-1 ring-1 ring-white/5">
              <button onClick={() => onDelete(o.id)} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400" title="Excluir" aria-label="Excluir">
                <Trash2 size={16} />
              </button>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Fechar (Esc)" aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
          </div>

          <div className="relative mt-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={cx(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1",
                  score >= 75 ? "bg-orange-500/10 text-orange-300 ring-orange-500/25" : "bg-sky-500/10 text-sky-300 ring-sky-500/25",
                )}
              >
                {score >= 75 ? <Flame size={12} /> : <Bot size={12} />} Score {score}
              </span>
              <ServiceBadges opp={o} max={6} />
              {o.source && <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-400 ring-1 ring-white/10">via {o.source}</span>}
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              <InlineText value={o.title} onSave={(v) => v.trim() && onSave({ title: v.trim() })} />
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {[o.city, formatPhone(o.phone), o.created_at && `no CRM desde ${formatDate(o.created_at)}`].filter(Boolean).join(" · ")}
            </p>
          </div>

          <div className="relative mt-4 flex flex-wrap gap-2">
            {o.phone && (
              <a href={whatsappUrl(o.phone, `Olá ${o.title.split(" ")[0]}! Aqui é da Quark Energia.`)} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-2 rounded-xl bg-emerald-500/15 px-3.5 text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/25 transition hover:bg-emerald-500 hover:text-white">
                <MessageCircle size={15} /> WhatsApp
              </a>
            )}
            {o.phone && (
              <a href={`tel:${o.phone}`} className="flex h-9 items-center gap-2 rounded-xl bg-white/5 px-3.5 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:text-white">
                <Phone size={15} /> Ligar
              </a>
            )}
            <button onClick={() => newQuote("solar")} className="flex h-9 items-center gap-2 rounded-xl bg-lime-400 px-3.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300">
              <Plus size={15} /> Orçamento solar
            </button>
            <button onClick={() => newQuote("save")} className="flex h-9 items-center gap-2 rounded-xl bg-white/5 px-3.5 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 transition hover:text-white">
              <Plus size={15} /> Orçamento S.A.V.E
            </button>
          </div>
        </header>

        {/* Abas */}
        <nav className="flex shrink-0 gap-1 border-b border-white/5 px-5 sm:px-7" role="tablist">
          {(
            [
              ["geral", "Visão geral", null],
              ["propostas", "Propostas", proposals.length || null],
              ["anamnese", "Anamnese", anamnese.length || null],
              ["timeline", "Timeline", notes.length || null],
            ] as [Tab, string, number | null][]
          ).map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cx(
                "relative flex items-center gap-1.5 px-3 py-3 text-sm font-semibold transition",
                tab === id ? "text-white" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {label}
              {count != null && <span className="rounded-full bg-white/10 px-1.5 text-[10px] font-bold text-zinc-300">{count}</span>}
              {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-lime-400" />}
            </button>
          ))}
        </nav>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {tab === "geral" && (
            <div className="grid gap-6">
              {o.status === "Perdido" && o.loss_reason && (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 ring-1 ring-red-500/20">
                  <p className="text-[10px] font-bold tracking-wider text-red-300/70 uppercase">Motivo da perda</p>
                  <p className="text-sm font-semibold text-red-100">{o.loss_reason}</p>
                </div>
              )}

              <div className="grid gap-3 rounded-2xl bg-sky-500/[0.07] p-4 ring-1 ring-sky-500/15 sm:grid-cols-[180px_1fr]">
                <EditField label="Follow-up" icon={<Calendar size={12} />} type="date" value={o.next_action_date} placeholder="Definir data" onSave={(v) => onSave({ next_action_date: v || null })} />
                <EditField label="Próximo passo" value={o.next_action_text} placeholder="Ex.: ligar para apresentar a proposta" onSave={(v) => onSave({ next_action_text: v || null })} />
              </div>

              <Group title="Serviços vendidos" hint="Toque para marcar">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {SERVICES.map((s) => {
                    const on = services.some((x) => x.id === s.id);
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleService(s.id)}
                        aria-pressed={on}
                        className={cx(
                          "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left ring-1 transition",
                          on ? "bg-white/[0.07] ring-white/20" : "bg-black/20 ring-white/5 hover:ring-white/15",
                        )}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: on ? s.gradient : "rgba(255,255,255,0.04)" }}>
                          <s.icon className="h-3.5 w-3.5" style={{ color: on ? "#fff" : s.color }} />
                        </span>
                        <span className={cx("text-[13px] leading-tight font-semibold", on ? "text-white" : "text-zinc-500")}>{s.label}</span>
                      </button>
                    );
                  })}
                </div>
              </Group>

              <Group title="Negócio">
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
                  <EditField label="Valor estimado" type="money" value={o.amount} onSave={(v) => onSave({ amount: Number(v) || 0 })} big />
                  <EditField label="Origem" type="select" options={LEAD_SOURCES} value={o.source} onSave={(v) => onSave({ source: v || null })} />
                  <EditField
                    label="Temperatura"
                    type="select"
                    options={["frio", "morno", "quente"]}
                    optionLabel={(v) => ({ frio: "🧊 Frio", morno: "🌤️ Morno", quente: "🔥 Quente" })[v] ?? v}
                    value={o.temperature}
                    onSave={(v) => onSave({ temperature: (v || null) as Opportunity["temperature"] })}
                  />
                </div>
              </Group>

              <Group title="Energia" hint={o.avg_bill ? `≈ ${fmtNum(Math.max(0, (o.avg_bill - 25) / MACEIO_TARIFF))} kWh/mês a ${brl(MACEIO_TARIFF)}/kWh` : undefined}>
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-3">
                  <EditField label="Conta de luz média" type="money" value={o.avg_bill} onSave={(v) => onSave({ avg_bill: Number(v) || null })} />
                  <EditField label="Consumo (kWh/mês)" type="number" value={o.consumption_kwh} onSave={(v) => onSave({ consumption_kwh: Number(v) || null })} />
                  <EditField label="Potência (kWp)" type="number" value={o.system_power} onSave={(v) => onSave({ system_power: Number(v) || null })} />
                  <EditField label="Telhado" type="select" options={ROOF_TYPES} value={o.roof_type} onSave={(v) => onSave({ roof_type: v || null })} />
                  <EditField
                    label="Ligação"
                    type="select"
                    options={["mono", "bi", "tri"]}
                    optionLabel={(v) => ({ mono: "Monofásica", bi: "Bifásica", tri: "Trifásica" })[v] ?? v}
                    value={o.connection_type}
                    onSave={(v) => onSave({ connection_type: v || null })}
                  />
                  <EditField label="Data de instalação" type="date" value={o.installation_date} onSave={(v) => onSave({ installation_date: v || null })} />
                </div>
              </Group>

              <Group title="Contato e cadastro">
                <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
                  <EditField label="WhatsApp" value={o.phone} onSave={(v) => onSave({ phone: v || null })} />
                  <EditField label="E-mail" value={o.email} onSave={(v) => onSave({ email: v || null })} />
                  <EditField label="CPF / CNPJ" value={o.cpf_cnpj} onSave={(v) => onSave({ cpf_cnpj: v || null })} />
                  <EditField label="Nascimento / fundação" type="date" value={o.birth_date} onSave={(v) => onSave({ birth_date: v || null })} />
                  <EditField label="Cidade" value={o.city} onSave={(v) => onSave({ city: v || null })} />
                  <EditField label="Endereço" value={o.address} onSave={(v) => onSave({ address: v || null })} />
                  <EditField label="Latitude" type="number" value={o.latitude} onSave={(v) => onSave({ latitude: v === "" ? null : Number(v) })} />
                  <EditField label="Longitude" type="number" value={o.longitude} onSave={(v) => onSave({ longitude: v === "" ? null : Number(v) })} />
                </div>
              </Group>

              <Group title="Observações">
                <NotesBox value={o.notes ?? ""} onSave={(v) => onSave({ notes: v || null })} />
              </Group>
            </div>
          )}

          {tab === "propostas" && (
            <div className="grid gap-4">
              {!proposals.length && (
                <EmptyBox icon={<FileText className="h-5 w-5" />} title="Nenhuma proposta ainda" text="Crie um orçamento: ele já vem com os dados de consumo deste cliente." />
              )}
              {proposals.map((p) => {
                const pv = views.filter((v) => v.proposal_id === String(p.id));
                const st = PROPOSAL_LABEL[p.status] ?? PROPOSAL_LABEL.rascunho;
                const url = `${window.location.origin}/p/${p.public_token}`;
                return (
                  <div key={p.id} className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-white/5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 font-semibold text-white">
                          {p.inputs?.product === "save" ? "S.A.V.E" : "Solar"} #{p.number}
                          <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1", st.cls)}>{st.label}</span>
                        </p>
                        <p className="tnum mt-0.5 text-xs text-zinc-400">
                          {brl(p.final_price)}
                          {p.power_kwp ? ` · ${fmtNum(p.power_kwp, 2)} kWp` : ""} · criada em {formatDate(p.created_at)}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => navigator.clipboard.writeText(url).then(() => toast.success("Link copiado"))}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-zinc-300 hover:text-white"
                          title="Copiar link do cliente"
                          aria-label="Copiar link"
                        >
                          <Copy size={14} />
                        </button>
                        <Link to={`/propostas/${p.id}`} className="flex h-8 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-xs font-semibold text-zinc-200 hover:text-white">
                          <ExternalLink size={13} /> Abrir
                        </Link>
                      </div>
                    </div>
                    {p.status === "rascunho" ? (
                      <p className="rounded-xl bg-white/[0.03] px-4 py-3 text-[13px] text-zinc-400 ring-1 ring-white/5">Rascunho — envie o link para começar a acompanhar as visualizações.</p>
                    ) : (
                      <ViewsTimeline views={pv} compact />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {tab === "anamnese" && (
            <div className="grid gap-4">
              {!anamnese.length ? (
                <EmptyBox
                  icon={<ClipboardList className="h-5 w-5" />}
                  title="Anamnese não respondida"
                  text="Envie o link: as respostas aparecem aqui e o cadastro é completado automaticamente (pelo telefone)."
                  action={
                    <button
                      onClick={() => {
                        const msg = `Olá ${o.title.split(" ")[0]}! Para prepararmos sua proposta, responda este questionário rápido (2 min): ${window.location.origin}/anamnese`;
                        window.open(whatsappUrl(o.phone, msg), "_blank");
                      }}
                      className="mt-4 inline-flex h-9 items-center gap-2 rounded-xl bg-lime-400 px-4 text-sm font-semibold text-zinc-950 hover:bg-lime-300"
                    >
                      <Send size={14} /> Enviar pelo WhatsApp
                    </button>
                  }
                />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {anamnese.map(([k, v]) => (
                    <div key={k} className={cx("rounded-xl bg-zinc-900/60 px-4 py-3 ring-1 ring-white/5", String(v).length > 60 && "sm:col-span-2")}>
                      <p className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase">{ANAMNESE_LABELS[k] ?? k.replace(/_/g, " ")}</p>
                      <p className="mt-0.5 text-sm text-zinc-100">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "timeline" && (
            <div>
              <form onSubmit={addNote} className="mb-6 flex gap-2">
                <input
                  type="text"
                  placeholder="Registrar uma nota ou ocorrência…"
                  className="h-11 flex-1 rounded-xl bg-black/40 px-4 text-sm text-white ring-1 ring-white/10 transition outline-none focus:ring-2 focus:ring-lime-400"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button type="submit" className="grid h-11 w-11 place-items-center rounded-xl bg-lime-400 text-zinc-950 transition hover:bg-lime-300" aria-label="Adicionar nota">
                  <Send size={16} />
                </button>
              </form>
              {!notes.length && <EmptyBox icon={<Clock className="h-5 w-5" />} title="Nenhum registro ainda" text="Mudanças de etapa, propostas e visualizações aparecem aqui automaticamente." />}
              <ol className="relative ml-3 space-y-4 border-l border-white/10">
                {notes.map((n) => (
                  <li key={n.id} className="relative ml-6">
                    <span
                      className={cx(
                        "absolute top-3 -left-[31px] h-2.5 w-2.5 rounded-full ring-4 ring-zinc-950",
                        n.created_by_ai ? "bg-violet-400" : "bg-lime-400",
                      )}
                    />
                    <div className={cx("rounded-xl px-4 py-3 ring-1", n.created_by_ai ? "bg-violet-500/[0.07] ring-violet-500/15" : "bg-zinc-900/70 ring-white/5")}>
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={cx("flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase", n.created_by_ai ? "text-violet-300" : "text-zinc-500")}>
                          {n.created_by_ai && <Sparkles size={11} />}
                          {n.created_by_ai ? "Automático" : "Nota"}
                        </span>
                        <span className="tnum text-[11px] text-zinc-500">{formatDateTime(n.created_at)}</span>
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-line text-zinc-200">{n.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

/* ------------------------------------------------------------------ campos */

function Group({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase">{title}</h3>
        {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function EmptyBox({ icon, title, text, action }: { icon: React.ReactNode; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-zinc-400">{icon}</div>
      <p className="font-semibold text-zinc-100">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{text}</p>
      {action}
    </div>
  );
}

function InlineText({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  if (editing)
    return (
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (val !== value) onSave(val);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setVal(value);
            setEditing(false);
          }
        }}
        className="w-full rounded-lg bg-black/50 px-2 py-0.5 text-white ring-2 ring-lime-400 outline-none"
      />
    );
  return (
    <button onClick={() => setEditing(true)} className="group -mx-1 flex items-center gap-2 rounded-lg px-1 text-left hover:bg-white/5" title="Clique para editar">
      {value}
      <Pencil className="h-4 w-4 text-zinc-600 opacity-0 transition group-hover:opacity-100" />
    </button>
  );
}

function EditField({
  label,
  value,
  onSave,
  type = "text",
  placeholder = "—",
  options,
  optionLabel,
  icon,
  big,
}: {
  label: string;
  value: string | number | null | undefined;
  onSave: (v: string) => void;
  type?: "text" | "number" | "date" | "money" | "select";
  placeholder?: string;
  options?: string[];
  optionLabel?: (v: string) => string;
  icon?: React.ReactNode;
  big?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const raw = value == null ? "" : String(value);
  const [val, setVal] = useState(raw);
  useEffect(() => setVal(raw), [raw]);

  const commit = () => {
    setEditing(false);
    if (val !== raw) onSave(val);
  };

  const display =
    raw === ""
      ? placeholder
      : type === "money"
        ? brl(Number(raw), 0)
        : type === "date"
          ? formatDate(raw)
          : type === "number"
            ? fmtNum(Number(raw), Number(raw) % 1 ? 2 : 0)
            : optionLabel
              ? optionLabel(raw)
              : raw;

  return (
    <div className="min-w-0">
      <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500">
        {icon}
        {label}
      </p>
      {editing && type === "select" ? (
        <select
          autoFocus
          value={val}
          onChange={(e) => {
            setEditing(false);
            if (e.target.value !== raw) onSave(e.target.value);
          }}
          onBlur={() => setEditing(false)}
          className="h-9 w-full rounded-lg bg-zinc-900 px-2 text-sm text-white ring-2 ring-lime-400 outline-none"
        >
          <option value="">—</option>
          {(options ?? []).map((op) => (
            <option key={op} value={op}>
              {optionLabel ? optionLabel(op) : op}
            </option>
          ))}
        </select>
      ) : editing ? (
        <input
          autoFocus
          type={type === "money" || type === "number" ? "number" : type}
          step="any"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setVal(raw);
              setEditing(false);
            }
          }}
          className="h-9 w-full rounded-lg bg-zinc-900 px-2.5 text-sm text-white ring-2 ring-lime-400 outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className={cx(
            "group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 text-left ring-1 ring-transparent transition hover:bg-white/[0.04] hover:ring-white/10",
            big ? "-mx-2.5 h-10 font-display text-xl font-bold" : "-mx-2.5 h-9 text-sm",
            raw === "" ? "text-zinc-600 italic" : big ? "text-lime-300" : "text-zinc-100",
          )}
          title="Clique para editar"
        >
          <span className="tnum truncate">{display}</span>
          <Pencil className="h-3 w-3 shrink-0 text-zinc-600 opacity-0 transition group-hover:opacity-100" />
        </button>
      )}
    </div>
  );
}

function NotesBox({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [val, setVal] = useState(value);
  useEffect(() => setVal(value), [value]);
  return (
    <textarea
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => val !== value && onSave(val)}
      placeholder="Anotações livres sobre o cliente (salva ao sair do campo)"
      className="min-h-[96px] w-full rounded-xl bg-zinc-900/60 px-4 py-3 text-sm leading-relaxed text-zinc-100 ring-1 ring-white/5 outline-none placeholder:text-zinc-600 focus:ring-2 focus:ring-lime-400"
    />
  );
}

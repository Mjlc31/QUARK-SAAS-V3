import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, FilePlus2, History, Loader2, Printer, Save, Search, Trash2, UserRound } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Card, Field, Input, cx } from "@/components/ui";
import { useCrmLeads, type CrmLead } from "@/lib/crm-leads";
import type { CompanySettings } from "@/lib/defaults";
import { formatDateTime, formatPhone } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";

export type ToolKind = "procuracao" | "aluguel" | "recibo" | "nota_servico";

export interface ToolDoc<T> {
  id: string;
  kind: ToolKind;
  title: string;
  number: number | null;
  opportunity_id: string | null;
  data: T;
  created_at: string;
  updated_at?: string;
}

/** Dados da empresa usados como outorgado / emitente. */
export function companyOf(s: CompanySettings) {
  return {
    name: s.legal_name || s.company_name || "Quark Energia",
    fantasy: s.company_name || "Quark Energia",
    cnpj: s.cnpj,
    address: [s.address, s.city].filter(Boolean).join(" – "),
    city: (s.city || "Maceió/AL").split(/[-–,]/)[0].trim() || "Maceió",
    phone: s.whatsapp || s.phone,
    email: s.email,
    logo: s.logo_url,
    tech: s.tech_name,
    techRegistry: s.tech_registry,
  };
}
export type Company = ReturnType<typeof companyOf>;

/* ---------------------------------------------------------------- storage */

const LOCAL_KEY = (k: ToolKind) => `quark-tools-${k}`;

function readLocal<T>(kind: ToolKind): ToolDoc<T>[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY(kind)) || "[]");
  } catch {
    return [];
  }
}
function writeLocal<T>(kind: ToolKind, docs: ToolDoc<T>[]) {
  try {
    localStorage.setItem(LOCAL_KEY(kind), JSON.stringify(docs.slice(0, 100)));
  } catch {
    // armazenamento cheio/bloqueado: o documento continua na tela
  }
}

/**
 * Histórico dos documentos de uma ferramenta. Usa a tabela `tool_documents`;
 * se ela ainda não existir no banco, guarda no navegador.
 */
export function useToolDocs<T>(kind: ToolKind) {
  const [docs, setDocs] = useState<ToolDoc<T>[]>([]);
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.from("tool_documents").select("*").eq("kind", kind).order("created_at", { ascending: false }).limit(100);
    if (error) {
      setLocal(true);
      setDocs(readLocal<T>(kind));
    } else setDocs((data ?? []) as ToolDoc<T>[]);
    setLoading(false);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const nextNumber = useMemo(() => Math.max(0, ...docs.map((d) => d.number ?? 0)) + 1, [docs]);

  async function save(doc: { id?: string | null; title: string; number: number; opportunity_id: string | null; data: T }): Promise<ToolDoc<T> | null> {
    const now = new Date().toISOString();
    if (!local) {
      const row = { kind, title: doc.title, number: doc.number, opportunity_id: doc.opportunity_id, data: doc.data, updated_at: now };
      const res = doc.id ? await supabase.from("tool_documents").update(row).eq("id", doc.id).select().single() : await supabase.from("tool_documents").insert(row).select().single();
      if (!res.error && res.data) {
        const saved = res.data as ToolDoc<T>;
        setDocs((cur) => [saved, ...cur.filter((d) => d.id !== saved.id)]);
        return saved;
      }
      if (res.error && !/relation|does not exist|schema cache/i.test(res.error.message)) {
        toast.error(res.error.message);
        return null;
      }
      setLocal(true);
    }
    const saved: ToolDoc<T> = { id: doc.id || crypto.randomUUID(), kind, title: doc.title, number: doc.number, opportunity_id: doc.opportunity_id, data: doc.data, created_at: now };
    const next = [saved, ...readLocal<T>(kind).filter((d) => d.id !== saved.id)];
    writeLocal(kind, next);
    setDocs(next);
    return saved;
  }

  async function remove(id: string) {
    if (!local) await supabase.from("tool_documents").delete().eq("id", id);
    const next = docs.filter((d) => d.id !== id);
    if (local) writeLocal(kind, next);
    setDocs(next);
  }

  return { docs, loading, local, nextNumber, save, remove };
}

/* --------------------------------------------------------------- impressão */

/** Imprime só a folha do documento (o navegador oferece "Salvar como PDF"). */
export function printDocument(title: string) {
  const source = document.getElementById("tool-print-area");
  if (!source) return;
  const root = document.createElement("div");
  root.id = "tool-print-root";
  root.innerHTML = source.innerHTML;
  document.body.appendChild(root);
  const prev = document.title;
  document.title = title;
  document.body.classList.add("printing-tool");
  const done = () => {
    document.body.classList.remove("printing-tool");
    root.remove();
    document.title = prev;
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 80);
}

/* ---------------------------------------------------------------- workspace */

export function ToolWorkspace<T>({
  kind,
  docTitle,
  data,
  setData,
  defaults,
  fromLead,
  number,
  setNumber,
  form,
  paper,
  leadId,
  setLeadId,
  issues,
}: {
  kind: ToolKind;
  docTitle: string;
  data: T;
  setData: (d: T) => void;
  defaults: () => T;
  fromLead: (l: CrmLead, d: T) => T;
  number: number;
  setNumber: (n: number) => void;
  form: ReactNode;
  paper: ReactNode;
  leadId: string | null;
  setLeadId: (id: string | null) => void;
  /** Campos importantes ainda vazios: aparecem como alerta antes de imprimir. */
  issues: string[];
}) {
  const store = useToolDocs<T>(kind);
  const [docId, setDocId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const firstNumber = useRef(false);

  useEffect(() => {
    if (!firstNumber.current && !store.loading) {
      firstNumber.current = true;
      if (!docId) setNumber(store.nextNumber);
    }
  }, [store.loading, store.nextNumber, docId, setNumber]);

  async function save() {
    setSaving(true);
    const saved = await store.save({ id: docId, title: docTitle, number, opportunity_id: leadId, data });
    setSaving(false);
    if (saved) {
      setDocId(saved.id);
      toast.success(store.local ? "Salvo neste navegador" : "Documento salvo");
    }
    return saved;
  }

  async function print() {
    if (issues.length) toast(`Atenção: ${issues.slice(0, 3).join(", ")}${issues.length > 3 ? "…" : ""} em branco`, { icon: "⚠️" });
    await save();
    printDocument(docTitle);
  }

  function reset() {
    setDocId(null);
    setLeadId(null);
    setData(defaults());
    setNumber(store.nextNumber);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
      <div className="grid content-start gap-4">
        <Card className="relative z-20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <ClientPicker
              value={leadId}
              onPick={(l) => {
                setLeadId(l.id);
                setData(fromLead(l, data));
                toast.success(`Dados de ${l.name} preenchidos`);
              }}
            />
            <Button variant="secondary" size="sm" onClick={reset}>
              <FilePlus2 className="h-3.5 w-3.5" /> Novo
            </Button>
            <div className="relative">
              <Button variant="secondary" size="sm" onClick={() => setHistoryOpen((o) => !o)}>
                <History className="h-3.5 w-3.5" /> Histórico {store.docs.length > 0 && <span className="text-zinc-500">{store.docs.length}</span>}
              </Button>
              {historyOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setHistoryOpen(false)} />
                  <div className="animate-fade-up absolute top-full right-0 z-40 mt-2 max-h-80 w-[min(88vw,340px)] overflow-y-auto rounded-2xl bg-zinc-900 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:left-0 sm:right-auto">
                    {!store.docs.length && <p className="px-3 py-6 text-center text-sm text-zinc-500">Nenhum documento salvo ainda.</p>}
                    {store.docs.map((d) => (
                      <div key={d.id} className={cx("group flex items-center gap-2 rounded-xl px-3 py-2 hover:bg-white/5", d.id === docId && "bg-lime-400/10")}>
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setDocId(d.id);
                            setData({ ...defaults(), ...d.data });
                            setNumber(d.number ?? store.nextNumber);
                            setLeadId(d.opportunity_id);
                            setHistoryOpen(false);
                          }}
                        >
                          <p className="truncate text-sm font-medium text-zinc-100">{d.title}</p>
                          <p className="text-xs text-zinc-500">
                            Nº {String(d.number ?? "—").padStart(4, "0")} · {formatDateTime(d.updated_at || d.created_at)}
                          </p>
                        </button>
                        <button
                          onClick={() => confirm("Excluir este documento do histórico?") && store.remove(d.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-400"
                          aria-label="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
          {store.local && <p className="mt-3 text-[11px] text-amber-300/80">Histórico salvo neste navegador — rode a migração 20261007 para guardar no banco.</p>}
        </Card>
        {form}
      </div>

      <div className="min-w-0">
        <div className="sticky top-4 grid grid-cols-[minmax(0,1fr)] gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-lime-400" /> Pré-visualização A4
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={save} loading={saving}>
                <Save className="h-3.5 w-3.5" /> Salvar
              </Button>
              <Button size="sm" onClick={print}>
                <Printer className="h-3.5 w-3.5" /> Imprimir / PDF
              </Button>
            </div>
          </div>
          {issues.length > 0 && (
            <p className="rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs text-amber-200 ring-1 ring-amber-500/20">
              Faltam preencher: {issues.join(" · ")}
            </p>
          )}
          <div className="rounded-2xl bg-zinc-800/40 p-3 ring-1 ring-white/5 sm:p-5">
            <FitPaper>{paper}</FitPaper>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Escala a folha A4 para caber na coluna; a impressão usa o tamanho real. */
function FitPaper({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);
  useEffect(() => {
    const update = () => {
      if (!outer.current || !inner.current) return;
      const s = Math.min(1, outer.current.clientWidth / 794);
      setScale(s);
      setHeight(inner.current.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={outer} className="relative w-full min-w-0 overflow-hidden" style={{ height: height ?? 600 }}>
      <div ref={inner} id="tool-print-area" className="absolute top-0 left-0 w-[794px] origin-top-left" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- cliente */

function ClientPicker({ value, onPick }: { value: string | null; onPick: (l: CrmLead) => void }) {
  const { data: leads } = useCrmLeads();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = leads?.find((l) => l.id === value);
  const list = (leads ?? []).filter((l) => `${l.name} ${l.phone ?? ""} ${l.city ?? ""}`.toLowerCase().includes(q.toLowerCase())).slice(0, 40);
  return (
    <div className="relative min-w-[180px] flex-1 basis-full sm:basis-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-full items-center gap-2 rounded-lg bg-lime-400/10 px-3 text-left text-[13px] font-semibold text-lime-200 ring-1 ring-lime-400/25 transition hover:bg-lime-400/15"
      >
        <UserRound className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{selected ? selected.name : "Preencher com cliente do CRM"}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="animate-fade-up absolute top-full left-0 z-40 mt-2 w-[min(88vw,360px)] overflow-hidden rounded-2xl bg-zinc-900 shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <div className="flex items-center gap-2 border-b border-white/5 px-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente…" className="h-11 w-full bg-transparent text-sm text-white outline-none" />
            </div>
            <div className="max-h-72 overflow-y-auto p-1.5">
              {list.map((l) => (
                <button
                  key={l.id}
                  onClick={() => {
                    onPick(l);
                    setOpen(false);
                    setQ("");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-100">{l.name}</p>
                    <p className="truncate text-xs text-zinc-500">{[l.document, formatPhone(l.phone), l.city].filter(Boolean).join(" · ") || "Sem dados"}</p>
                  </div>
                  {l.id === value && <Check className="h-4 w-4 text-lime-400" />}
                </button>
              ))}
              {!list.length && <p className="px-3 py-6 text-center text-sm text-zinc-500">{leads ? "Nenhum cliente encontrado" : <Loader2 className="mx-auto h-4 w-4 animate-spin" />}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- formulário */

export function FormCard({ title, icon, children, action }: { title: string; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-white">
          {icon && <span className="text-lime-300">{icon}</span>}
          {title}
        </h3>
        {action}
      </div>
      <div className="grid gap-3.5 sm:grid-cols-2">{children}</div>
    </Card>
  );
}

export function TF({ label, value, onChange, placeholder, full, type = "text", hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; full?: boolean; type?: string; hint?: string }) {
  return (
    <Field label={label} hint={hint} className={full ? "sm:col-span-2" : undefined}>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </Field>
  );
}

/* ------------------------------------------------------------------- papel */

/** Folha A4 (794 × 1123 px a 96 dpi) com cabeçalho da empresa. */
export function Paper({ company, children, docLabel, number }: { company: Company; children: ReactNode; docLabel: string; number?: number }) {
  return (
    <article className="tool-paper relative flex min-h-[1123px] flex-col bg-white px-[64px] pt-[56px] pb-[48px] font-serif text-[13.5px] leading-[1.65] text-[#1d1b26] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)]">
      <header className="mb-8 flex items-start justify-between gap-6 border-b-2 border-[#1d1b26] pb-4 font-sans">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#14121c]">
            <img 
              src={company.logo || "/LOGOQUARK.png"} 
              onError={(e) => { e.currentTarget.src = "/LOGOQUARK.png"; e.currentTarget.onerror = null; }}
              alt="" 
              className="h-9 w-9 object-contain" 
            />
          </div>
          <div>
            <p className="text-[15px] font-bold tracking-tight">{company.fantasy}</p>
            <p className="text-[10.5px] leading-tight text-[#5b5868]">
              {[company.cnpj && `CNPJ ${company.cnpj}`, company.phone, company.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.18em] text-[#5b5868] uppercase">{docLabel}</p>
          {number != null && <p className="text-[18px] font-bold tabular-nums">Nº {String(number).padStart(4, "0")}</p>}
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="mt-8 border-t border-[#e4e2ea] pt-3 text-center font-sans text-[9.5px] text-[#8a8796]">
        {company.name}
        {company.address ? ` · ${company.address}` : ""}
      </footer>
    </article>
  );
}

export function DocTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6 text-center">
      <h1 className="font-sans text-[19px] font-bold tracking-[0.06em] uppercase">{children}</h1>
      {sub && <p className="mt-1 font-sans text-[11.5px] text-[#5b5868]">{sub}</p>}
    </div>
  );
}

export function Clause({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-3.5 text-justify">
      {title && <p className="mb-1 font-sans text-[11.5px] font-bold tracking-wide uppercase">{title}</p>}
      {children}
    </section>
  );
}

/** Valor preenchido ou uma linha para completar à mão. */
export function B({ v, w = 160 }: { v?: string | number | null; w?: number }) {
  const s = v == null ? "" : String(v).trim();
  if (s) return <b className="font-semibold">{s}</b>;
  return <span className="inline-block border-b border-[#1d1b26]/60 align-bottom" style={{ width: w }} />;
}

export function Signature({ name, role, doc }: { name?: string; role: string; doc?: string }) {
  return (
    <div className="pt-12 text-center font-sans">
      <div className="mx-auto mb-1.5 w-[85%] border-t border-[#1d1b26]" />
      <p className="text-[12.5px] font-semibold">{name || " "}</p>
      <p className="text-[10.5px] text-[#5b5868]">
        {role}
        {doc ? ` · ${doc}` : ""}
      </p>
    </div>
  );
}

export function todayLong(iso?: string) {
  const d = iso ? new Date(`${iso}T12:00:00`) : new Date();
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

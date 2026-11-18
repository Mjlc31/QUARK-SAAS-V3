import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, Copy, Download, FileSignature, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { Badge, Button, Field, Input, Modal, MoneyInput, NumberInput, Segmented, Select, Skeleton, Switch, Textarea, cx } from "@/components/ui";
import { digits, formatCep, formatDoc, isValidDoc } from "@/lib/br";

const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

/* ------------------------------------------------------------------ tipos (espelham backend/contratos/README.md) */

type PaymentType = "pix" | "transferencia" | "cartao" | "boleto" | "financiamento" | "texto";
interface Payment { tipo: PaymentType; valor?: number; parcelas?: number; juros?: boolean; banco?: string; texto?: string }
interface Address { logradouro: string; numero: string; complemento: string; cep: string; bairro: string; cidade: string; uf: string }
export interface ContractInput {
  cliente: { nome: string; documento: string; genero: "" | "f" | "m"; endereco: Address };
  sistema: { qtd_modulos?: number; potencia_modulo_wp?: number; qtd_inversores?: number; inversor_marca: string; inversor_potencia_kw?: number; potencia_kwp?: number };
  tipo_estrutura: string;
  valor_total: number;
  pagamentos: Payment[];
  fornecedora: string;
  garantia_modulo_anos: number;
  garantia_linear_anos: number;
  garantia_eficiencia: number;
  garantia_inversor_anos: number;
  data_assinatura: string;
}
type ContractStatus = "rascunho" | "gerado" | "enviado_assinatura" | "assinado";
interface Version { id: string; version: number; status: ContractStatus; warnings: string[]; pdf_path: string | null; docx_path: string | null; created_at: string }
interface Preview { campos: Record<string, string> | null; avisos: string[]; erro?: string }

const STATUS: Record<ContractStatus, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-zinc-800 text-zinc-300 ring-white/10" },
  gerado: { label: "Gerado", cls: "bg-sky-500/10 text-sky-300 ring-sky-400/20" },
  enviado_assinatura: { label: "Aguardando assinatura", cls: "bg-amber-500/10 text-amber-300 ring-amber-400/20" },
  assinado: { label: "Assinado", cls: "bg-emerald-500/10 text-emerald-300 ring-emerald-400/20" },
};
const PAYMENT_LABEL: Record<PaymentType, string> = {
  pix: "PIX", transferencia: "Transferência", cartao: "Cartão de crédito", boleto: "Boleto", financiamento: "Financiamento", texto: "Texto livre",
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}/api/contratos${path}`, { ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body.error || `Erro ${res.status}`), { status: res.status });
  return body as T;
}

async function download(id: string, formato: "docx" | "pdf") {
  try {
    const { url } = await api<{ url: string }>(`/${id}/download?formato=${formato}`);
    const a = document.createElement("a");
    a.href = url;
    a.click();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Falha no download");
  }
}

/* ------------------------------------------------------------------ modal */

export function GenerateContractModal({ proposalId, open, onClose }: { proposalId: string; open: boolean; onClose: () => void }) {
  const [dados, setDados] = useState<ContractInput | null>(null);
  const [versoes, setVersoes] = useState<Version[]>([]);
  const [loadError, setLoadError] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastWarnings, setLastWarnings] = useState<string[]>([]);
  const [signLink, setSignLink] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoadError("");
    setSignLink("");
    api<{ dados: ContractInput; versoes: Version[] }>(`/${proposalId}/preview-dados`)
      .then((r) => { setDados(r.dados); setVersoes(r.versoes); })
      .catch((e) => setLoadError(e.message));
  }, [open, proposalId]);

  // Prévia da cláusula 3.1 e validação completa pelo próprio gerador (sem duplicar regra no frontend)
  useEffect(() => {
    if (!dados) return;
    const t = setTimeout(() => {
      api<Preview>(`/${proposalId}/previa`, { method: "POST", body: JSON.stringify({ dados }) })
        .then((r) => setPreview({ campos: r.campos, avisos: r.avisos }))
        .catch((e) => setPreview({ campos: null, avisos: [], erro: e.message }));
    }, 400);
    return () => clearTimeout(t);
  }, [dados, proposalId]);

  const set = useCallback(<K extends keyof ContractInput>(k: K, v: ContractInput[K]) => setDados((d) => (d ? { ...d, [k]: v } : d)), []);
  const setCliente = (patch: Partial<ContractInput["cliente"]>) => dados && set("cliente", { ...dados.cliente, ...patch });
  const setEndereco = (patch: Partial<Address>) => dados && setCliente({ endereco: { ...dados.cliente.endereco, ...patch } });
  const setSistema = (patch: Partial<ContractInput["sistema"]>) => dados && set("sistema", { ...dados.sistema, ...patch });
  const setPagamento = (i: number, patch: Partial<Payment>) => dados && set("pagamentos", dados.pagamentos.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const docDigits = digits(dados?.cliente.documento);
  const isPf = docDigits.length <= 11;
  const docInvalid = docDigits.length > 0 && !isValidDoc(dados?.cliente.documento);
  const kwp = ((dados?.sistema.qtd_modulos || 0) * (dados?.sistema.potencia_modulo_wp || 0)) / 1000;
  const hasFreeText = dados?.pagamentos.some((p) => p.tipo === "texto") ?? false;
  const soma = useMemo(() => (dados?.pagamentos ?? []).filter((p) => p.tipo !== "texto").reduce((a, p) => a + (p.valor || 0), 0), [dados?.pagamentos]);
  const somaOk = hasFreeText || Math.abs(soma - (dados?.valor_total || 0)) < 0.01;
  const canGenerate = Boolean(dados && somaOk && !docInvalid && (!isPf || dados.cliente.genero) && preview?.campos && !preview.erro);

  async function gerar() {
    if (!dados) return;
    setGenerating(true);
    try {
      const r = await api<{ contrato: Version; avisos: string[] }>(`/${proposalId}/gerar`, { method: "POST", body: JSON.stringify({ dados }) });
      setVersoes((v) => [r.contrato, ...v]);
      setLastWarnings(r.avisos);
      toast.success(`Contrato v${r.contrato.version} gerado`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível gerar o contrato");
    } finally {
      setGenerating(false);
    }
  }

  async function enviarAssinatura(v: Version) {
    try {
      const r = await api<{ sign_token: string }>(`/${v.id}/enviar-assinatura`, { method: "POST" });
      setVersoes((list) => list.map((x) => (x.id === v.id ? { ...x, status: "enviado_assinatura" } : x)));
      setSignLink(`${window.location.origin}/assinar/${r.sign_token}`);
      toast.success("Enviado para assinatura");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao enviar para assinatura");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Gerar contrato"
      subtitle="Dados puxados da proposta aprovada. Confira, ajuste se precisar e gere."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button onClick={gerar} loading={generating} disabled={!canGenerate} data-testid="gerar-contrato">
            <FileSignature className="h-4 w-4" /> {versoes.length ? `Gerar versão ${versoes[0].version + 1}` : "Gerar contrato"}
          </Button>
        </>
      }
    >
      {loadError && <Alert>{loadError}</Alert>}
      {!dados && !loadError && <div className="space-y-3"><Skeleton className="h-10" /><Skeleton className="h-40" /><Skeleton className="h-24" /></div>}
      {dados && (
        <div className="space-y-6">
          <Section title="Cliente">
            <Field label="Nome completo / razão social" htmlFor="gc-nome-completo-razao-social" className="sm:col-span-2">
              <Input id="gc-nome-completo-razao-social" value={dados.cliente.nome} onChange={(e) => setCliente({ nome: e.target.value })} />
            </Field>
            <Field label={isPf ? "CPF" : "CNPJ"} htmlFor="gc-documento" hint={docInvalid ? <span className="text-rose-400">Documento inválido</span> : undefined}>
              <Input
                id="gc-documento"
                inputMode="numeric"
                value={formatDoc(dados.cliente.documento)}
                onChange={(e) => setCliente({ documento: digits(e.target.value).slice(0, 14) })}
                aria-invalid={docInvalid}
                className={cx(docInvalid && "ring-rose-500/60")}
                placeholder="000.000.000-00"
              />
            </Field>
            {isPf && (
              <Field label="Gênero (concordância do texto)">
                <Segmented value={dados.cliente.genero as "f" | "m"} onChange={(g) => setCliente({ genero: g })} options={[{ value: "f", label: "Feminino" }, { value: "m", label: "Masculino" }]} />
              </Field>
            )}
            <Field label="Logradouro" htmlFor="gc-logradouro" className="sm:col-span-2">
              <Input id="gc-logradouro" value={dados.cliente.endereco.logradouro} onChange={(e) => setEndereco({ logradouro: e.target.value })} />
            </Field>
            <Field label="Número" htmlFor="gc-numero"><Input id="gc-numero" value={dados.cliente.endereco.numero} onChange={(e) => setEndereco({ numero: e.target.value })} /></Field>
            <Field label="Complemento" htmlFor="gc-complemento"><Input id="gc-complemento" value={dados.cliente.endereco.complemento} onChange={(e) => setEndereco({ complemento: e.target.value })} /></Field>
            <Field label="CEP" htmlFor="gc-cep"><Input id="gc-cep" inputMode="numeric" value={formatCep(dados.cliente.endereco.cep)} onChange={(e) => setEndereco({ cep: digits(e.target.value).slice(0, 8) })} /></Field>
            <Field label="Bairro" htmlFor="gc-bairro"><Input id="gc-bairro" value={dados.cliente.endereco.bairro} onChange={(e) => setEndereco({ bairro: e.target.value })} /></Field>
            <Field label="Cidade" htmlFor="gc-cidade"><Input id="gc-cidade" value={dados.cliente.endereco.cidade} onChange={(e) => setEndereco({ cidade: e.target.value })} /></Field>
            <Field label="UF" htmlFor="gc-uf"><Input id="gc-uf" maxLength={2} value={dados.cliente.endereco.uf} onChange={(e) => setEndereco({ uf: e.target.value.toUpperCase() })} /></Field>
          </Section>

          <Section title="Sistema" aside={<span className="tnum text-sm text-lime-300">{kwp.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp</span>}>
            <Field label="Módulos (qtd.)" htmlFor="gc-modulos-qtd"><NumberInput id="gc-modulos-qtd" digits={0} value={dados.sistema.qtd_modulos} onChange={(v) => setSistema({ qtd_modulos: v })} /></Field>
            <Field label="Potência do módulo" htmlFor="gc-potencia-do-modulo"><NumberInput id="gc-potencia-do-modulo" digits={0} suffix="Wp" value={dados.sistema.potencia_modulo_wp} onChange={(v) => setSistema({ potencia_modulo_wp: v })} /></Field>
            <Field label="Inversores (qtd.)" htmlFor="gc-inversores-qtd"><NumberInput id="gc-inversores-qtd" digits={0} value={dados.sistema.qtd_inversores} onChange={(v) => setSistema({ qtd_inversores: v })} /></Field>
            <Field label="Marca do inversor" htmlFor="gc-marca-do-inversor"><Input id="gc-marca-do-inversor" value={dados.sistema.inversor_marca} onChange={(e) => setSistema({ inversor_marca: e.target.value })} /></Field>
            <Field label="Potência do inversor" htmlFor="gc-potencia-do-inversor"><NumberInput id="gc-potencia-do-inversor" digits={1} suffix="kW" value={dados.sistema.inversor_potencia_kw} onChange={(v) => setSistema({ inversor_potencia_kw: v })} /></Field>
            <Field label="Estrutura" htmlFor="gc-estrutura" hint="Ex.: telhado, solo, laje"><Input id="gc-estrutura" value={dados.tipo_estrutura} onChange={(e) => set("tipo_estrutura", e.target.value)} /></Field>
          </Section>

          <Section title="Pagamento" aside={
            <span className={cx("tnum text-sm", somaOk ? "text-emerald-300" : "text-rose-400")} data-testid="soma-pagamentos">
              {brl(soma)} de {brl(dados.valor_total)}
            </span>
          }>
            <Field label="Valor total do contrato" htmlFor="gc-valor-total-do-contrato" className="sm:col-span-2"><MoneyInput id="gc-valor-total-do-contrato" value={dados.valor_total} onChange={(v) => set("valor_total", v)} /></Field>
            <div className="space-y-3 sm:col-span-2">
              {dados.pagamentos.map((p, i) => (
                <div key={i} className="grid gap-3 rounded-2xl bg-black/20 p-3 ring-1 ring-white/5 sm:grid-cols-[200px_1fr_auto]" data-testid="parcela">
                  <Select aria-label="Forma de pagamento" value={p.tipo} onChange={(e) => setPagamento(i, { tipo: e.target.value as PaymentType })}>
                    {Object.entries(PAYMENT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </Select>
                  {p.tipo === "texto" ? (
                    <Textarea aria-label="Condição escrita" value={p.texto || ""} onChange={(e) => setPagamento(i, { texto: e.target.value })} placeholder="Condição especial, como deve aparecer no contrato" />
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <MoneyInput className="min-w-[150px] flex-1" value={p.valor} onChange={(v) => setPagamento(i, { valor: v })} />
                      {(p.tipo === "cartao" || p.tipo === "boleto") && (
                        <NumberInput className="w-28" digits={0} suffix="x" value={p.parcelas ?? 1} onChange={(v) => setPagamento(i, { parcelas: Math.max(1, Math.round(v)) })} />
                      )}
                      {p.tipo === "cartao" && (p.parcelas ?? 1) > 1 && <Switch checked={p.juros !== false} onChange={(v) => setPagamento(i, { juros: v })} label="com juros" />}
                      {p.tipo === "financiamento" && <Input className="min-w-[160px] flex-1" placeholder="Banco" value={p.banco || ""} onChange={(e) => setPagamento(i, { banco: e.target.value })} />}
                    </div>
                  )}
                  <Button variant="ghost" size="icon" aria-label="Remover pagamento" disabled={dados.pagamentos.length === 1} onClick={() => set("pagamentos", dados.pagamentos.filter((_, j) => j !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => set("pagamentos", [...dados.pagamentos, { tipo: "pix", valor: Math.max(0, Math.round((dados.valor_total - soma) * 100) / 100) }])}>
                <Plus className="h-4 w-4" /> Adicionar pagamento
              </Button>
              {!somaOk && <Alert>A soma dos pagamentos ({brl(soma)}) precisa bater com o total ({brl(dados.valor_total)}). Diferença: {brl(dados.valor_total - soma)}.</Alert>}
            </div>
          </Section>

          <details className="group rounded-2xl ring-1 ring-white/5">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-zinc-300">
              Avançado: fornecedora, garantias e data <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
            </summary>
            <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
              <Field label="Fornecedora do kit" htmlFor="gc-fornecedora-do-kit"><Input id="gc-fornecedora-do-kit" value={dados.fornecedora} onChange={(e) => set("fornecedora", e.target.value)} /></Field>
              <Field label="Data de assinatura" htmlFor="gc-data-de-assinatura"><Input id="gc-data-de-assinatura" type="date" value={dados.data_assinatura} onChange={(e) => set("data_assinatura", e.target.value)} /></Field>
              <Field label="Garantia do módulo" htmlFor="gc-garantia-do-modulo"><NumberInput id="gc-garantia-do-modulo" digits={0} suffix="anos" value={dados.garantia_modulo_anos} onChange={(v) => set("garantia_modulo_anos", v)} /></Field>
              <Field label="Garantia linear" htmlFor="gc-garantia-linear"><NumberInput id="gc-garantia-linear" digits={0} suffix="anos" value={dados.garantia_linear_anos} onChange={(v) => set("garantia_linear_anos", v)} /></Field>
              <Field label="Eficiência ao fim da linear" htmlFor="gc-eficiencia-ao-fim-da-linear"><NumberInput id="gc-eficiencia-ao-fim-da-linear" digits={0} suffix="%" value={dados.garantia_eficiencia} onChange={(v) => set("garantia_eficiencia", v)} /></Field>
              <Field label="Garantia do inversor" htmlFor="gc-garantia-do-inversor"><NumberInput id="gc-garantia-do-inversor" digits={0} suffix="anos" value={dados.garantia_inversor_anos} onChange={(v) => set("garantia_inversor_anos", v)} /></Field>
            </div>
          </details>

          <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/5">
            <p className="mb-2 text-xs font-semibold tracking-wider text-zinc-500 uppercase">Prévia da cláusula 3.1</p>
            {preview?.erro ? (
              <p className="text-sm whitespace-pre-line text-rose-300" data-testid="previa-erro">{preview.erro}</p>
            ) : preview?.campos ? (
              <p className="text-sm leading-relaxed text-zinc-200" data-testid="previa-31">3.1. O CONTRATANTE pagará {preview.campos.condicao_pagamento}</p>
            ) : (
              <Skeleton className="h-10" />
            )}
            {preview?.avisos.map((a) => <p key={a} className="mt-2 flex gap-1.5 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{a}</p>)}
          </div>

          {(versoes.length > 0 || signLink) && (
            <div className="space-y-3">
              <p className="text-xs font-semibold tracking-wider text-zinc-500 uppercase">Versões geradas</p>
              {lastWarnings.map((a) => <p key={a} className="flex gap-1.5 text-xs text-amber-300"><AlertTriangle className="h-3.5 w-3.5 shrink-0" />{a}</p>)}
              {signLink && (
                <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-lime-400/[0.06] p-3 ring-1 ring-lime-400/20" data-testid="link-assinatura">
                  <span className="min-w-0 flex-1 truncate text-sm text-lime-200">{signLink}</span>
                  <Button size="sm" variant="secondary" onClick={() => navigator.clipboard.writeText(signLink).then(() => toast.success("Link copiado"))}><Copy className="h-4 w-4" /> Copiar</Button>
                  <Button size="sm" variant="secondary" className="text-emerald-300" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Olá! Segue o contrato para assinatura digital: ${signLink}`)}`, "_blank")}>
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </div>
              )}
              {versoes.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-zinc-900/60 px-4 py-3 ring-1 ring-white/5" data-testid="versao">
                  <span className="font-semibold text-white">v{v.version}</span>
                  <Badge className={STATUS[v.status].cls}>{STATUS[v.status].label}</Badge>
                  <span className="flex-1 text-xs text-zinc-500">{new Date(v.created_at).toLocaleString("pt-BR")}</span>
                  <Button size="sm" variant="secondary" disabled={!v.docx_path} onClick={() => download(v.id, "docx")}><Download className="h-4 w-4" /> DOCX</Button>
                  <Button size="sm" variant="secondary" disabled={!v.pdf_path} title={v.pdf_path ? undefined : "PDF indisponível nesta versão"} onClick={() => download(v.id, "pdf")}><Download className="h-4 w-4" /> PDF</Button>
                  {v.status === "gerado" && <Button size="sm" onClick={() => enviarAssinatura(v)}><Send className="h-4 w-4" /> Enviar para assinatura</Button>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold tracking-tight text-white">{title}</h3>
        {aside}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return <p className="flex gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300 ring-1 ring-rose-500/20"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{children}</p>;
}

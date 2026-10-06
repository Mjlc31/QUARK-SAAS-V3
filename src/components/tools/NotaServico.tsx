import { useState } from "react";
import { ClipboardCheck, Package, Plus, Trash2, UserRound, Wallet, Wrench } from "lucide-react";
import { Button, Field, Input, MoneyInput, NumberInput, Segmented, Select, Textarea, cx } from "@/components/ui";
import type { CrmLead } from "@/lib/crm-leads";
import { brl, fmtNum } from "@/lib/pricing";
import { SERVICES } from "@/lib/services";
import { formatDate } from "@/lib/format";
import { B, FormCard, Paper, Signature, TF, ToolWorkspace, todayIso, todayLong, type Company } from "./common";

interface Task {
  id: string;
  text: string;
  done: boolean;
}
interface Item {
  id: string;
  desc: string;
  qty: number;
  unit: string;
  price: number;
}

export interface NotaData {
  cliente: string;
  clienteDoc: string;
  clienteTel: string;
  endereco: string;
  servico: string;
  data: string;
  inicio: string;
  fim: string;
  tarefas: Task[];
  temItens: boolean;
  itens: Item[];
  maoDeObra: number;
  deslocamento: number;
  desconto: number;
  pagamento: "pago" | "a_pagar" | "parcial";
  valorPago: number;
  forma: string;
  garantiaDias: number;
  observacoes: string;
  tecnico: string;
  tecnicoRegistro: string;
}

const uid = () => crypto.randomUUID();

/** Checklists sugeridos por serviço — o técnico só desmarca o que não fez. */
const TEMPLATES: Record<string, string[]> = {
  "Manutenção do sistema solar": [
    "Limpeza dos módulos fotovoltaicos com água desmineralizada",
    "Inspeção visual de módulos, estrutura e fixações",
    "Reaperto de conexões CC e CA",
    "Verificação do inversor (alarmes, ventilação e firmware)",
    "Medição de tensão e corrente das strings",
    "Teste dos dispositivos de proteção (DPS, disjuntores)",
    "Conferência da geração no monitoramento",
  ],
  "Energia solar": [
    "Montagem da estrutura de fixação",
    "Instalação dos módulos fotovoltaicos",
    "Instalação e configuração do inversor",
    "Montagem do quadro de proteção CC/CA",
    "Aterramento e equipotencialização",
    "Comissionamento e testes de funcionamento",
    "Configuração do monitoramento e orientação ao cliente",
  ],
  "Carregador veicular (S.A.V.E)": [
    "Instalação do carregador (wallbox)",
    "Passagem de infraestrutura (eletroduto e cabos)",
    "Instalação de disjuntor e DR dedicados",
    "Aterramento",
    "Configuração do app e teste de recarga",
  ],
  "Instalação de eletroposto": ["Instalação dos carregadores", "Adequação do quadro e proteção", "Sinalização das vagas", "Configuração da plataforma de cobrança", "Testes de recarga"],
  "Projeto fotovoltaico": ["Levantamento técnico em campo", "Elaboração do projeto elétrico", "Emissão de ART/TRT", "Protocolo na Equatorial", "Acompanhamento da vistoria"],
  "Gestão de fatura, créditos e rateio": ["Análise das faturas", "Cadastro/ajuste de rateio de créditos", "Protocolo na distribuidora", "Relatório de economia"],
};

export function notaDefaults(c: Company): NotaData {
  return {
    cliente: "",
    clienteDoc: "",
    clienteTel: "",
    endereco: "",
    servico: "Manutenção do sistema solar",
    data: todayIso(),
    inicio: "",
    fim: "",
    tarefas: TEMPLATES["Manutenção do sistema solar"].map((text) => ({ id: uid(), text, done: true })),
    temItens: false,
    itens: [],
    maoDeObra: 0,
    deslocamento: 0,
    desconto: 0,
    pagamento: "a_pagar",
    valorPago: 0,
    forma: "PIX",
    garantiaDias: 90,
    observacoes: "",
    tecnico: c.tech,
    tecnicoRegistro: c.techRegistry,
  };
}

const fromLead = (l: CrmLead, d: NotaData): NotaData => ({
  ...d,
  cliente: l.name,
  clienteDoc: l.document ?? d.clienteDoc,
  clienteTel: l.phone ?? d.clienteTel,
  endereco: [l.address, l.city].filter(Boolean).join(", ") || d.endereco,
});

export function NotaServicoTool({ company }: { company: Company }) {
  const [d, setD] = useState<NotaData>(() => notaDefaults(company));
  const [number, setNumber] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [newTask, setNewTask] = useState("");
  const set = <K extends keyof NotaData>(k: K, v: NotaData[K]) => setD((x) => ({ ...x, [k]: v }));
  const setItem = (id: string, patch: Partial<Item>) => set("itens", d.itens.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const itensTotal = d.temItens ? d.itens.reduce((s, i) => s + i.qty * i.price, 0) : 0;
  const subtotal = itensTotal + d.maoDeObra + d.deslocamento;
  const total = Math.max(0, subtotal - d.desconto);
  const restante = d.pagamento === "pago" ? 0 : d.pagamento === "parcial" ? Math.max(0, total - d.valorPago) : total;
  const done = d.tarefas.filter((t) => t.done);

  const issues = [!d.cliente && "cliente", !done.length && "serviços executados", !d.tecnico && "técnico"].filter(Boolean) as string[];

  const form = (
    <>
      <FormCard title="Cliente e atendimento" icon={<UserRound className="h-4 w-4" />}>
        <TF full label="Cliente" value={d.cliente} onChange={(v) => set("cliente", v)} />
        <TF label="CPF / CNPJ" value={d.clienteDoc} onChange={(v) => set("clienteDoc", v)} />
        <TF label="Telefone" value={d.clienteTel} onChange={(v) => set("clienteTel", v)} />
        <TF full label="Local do serviço" value={d.endereco} onChange={(v) => set("endereco", v)} />
        <Field label="Tipo de serviço" className="sm:col-span-2">
          <Select
            value={d.servico}
            onChange={(e) => {
              const servico = e.target.value;
              const keepCustom = d.tarefas.filter((t) => !Object.values(TEMPLATES).flat().includes(t.text));
              setD((x) => ({ ...x, servico, tarefas: [...(TEMPLATES[servico] ?? []).map((text) => ({ id: uid(), text, done: true })), ...keepCustom] }));
            }}
          >
            {SERVICES.map((s) => (
              <option key={s.id}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <TF label="Data" type="date" value={d.data} onChange={(v) => set("data", v)} />
        <div className="grid grid-cols-2 gap-2">
          <TF label="Início" type="time" value={d.inicio} onChange={(v) => set("inicio", v)} />
          <TF label="Fim" type="time" value={d.fim} onChange={(v) => set("fim", v)} />
        </div>
      </FormCard>

      <FormCard title="O que foi executado" icon={<ClipboardCheck className="h-4 w-4" />}>
        <div className="grid gap-1.5 sm:col-span-2">
          {d.tarefas.map((t) => (
            <div key={t.id} className="group flex items-center gap-2.5 rounded-xl bg-black/20 px-3 py-2 ring-1 ring-white/5">
              <input type="checkbox" checked={t.done} onChange={() => set("tarefas", d.tarefas.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))} className="h-4 w-4 shrink-0 accent-lime-400" />
              <input value={t.text} onChange={(e) => set("tarefas", d.tarefas.map((x) => (x.id === t.id ? { ...x, text: e.target.value } : x)))} className={cx("min-w-0 flex-1 bg-transparent text-[13px] outline-none", t.done ? "text-zinc-100" : "text-zinc-500 line-through")} />
              <button onClick={() => set("tarefas", d.tarefas.filter((x) => x.id !== t.id))} className="text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:text-rose-400" aria-label="Remover">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newTask.trim()) return;
              set("tarefas", [...d.tarefas, { id: uid(), text: newTask.trim(), done: true }]);
              setNewTask("");
            }}
            className="flex gap-2"
          >
            <Input value={newTask} onChange={(e) => setNewTask(e.target.value)} placeholder="Adicionar outro serviço executado…" />
            <Button type="submit" variant="secondary" size="icon" aria-label="Adicionar">
              <Plus className="h-4 w-4" />
            </Button>
          </form>
        </div>
        <Field label="Observações técnicas" className="sm:col-span-2">
          <Textarea value={d.observacoes} onChange={(e) => set("observacoes", e.target.value)} placeholder="Ex.: geração antes 28 kWh/dia → depois 33 kWh/dia; recomendada nova limpeza em 6 meses." />
        </Field>
      </FormCard>

      <FormCard
        title="Itens e materiais"
        icon={<Package className="h-4 w-4" />}
        action={
          <Segmented
            size="sm"
            value={d.temItens ? "sim" : "nao"}
            onChange={(v) => setD((x) => ({ ...x, temItens: v === "sim", itens: v === "sim" && !x.itens.length ? [{ id: uid(), desc: "", qty: 1, unit: "un", price: 0 }] : x.itens }))}
            options={[
              { value: "nao", label: "Sem itens" },
              { value: "sim", label: "Com itens" },
            ]}
          />
        }
      >
        {!d.temItens ? (
          <p className="text-[13px] text-zinc-500 sm:col-span-2">Nenhum material ou peça utilizado — a nota informa “Não houve utilização de materiais”.</p>
        ) : (
          <div className="grid gap-2 sm:col-span-2">
            {d.itens.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_auto] gap-2 rounded-xl bg-black/20 p-2.5 ring-1 ring-white/5">
                <Input value={i.desc} onChange={(e) => setItem(i.id, { desc: e.target.value })} placeholder="Descrição (ex.: conector MC4 par)" />
                <Button variant="ghost" size="icon" onClick={() => set("itens", d.itens.filter((x) => x.id !== i.id))} aria-label="Remover item">
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="col-span-2 grid grid-cols-[80px_70px_1fr] gap-2">
                  <NumberInput value={i.qty} onChange={(v) => setItem(i.id, { qty: v })} digits={0} />
                  <Input value={i.unit} onChange={(e) => setItem(i.id, { unit: e.target.value })} placeholder="un" />
                  <MoneyInput value={i.price || null} onChange={(v) => setItem(i.id, { price: v })} placeholder="Valor unit." />
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => set("itens", [...d.itens, { id: uid(), desc: "", qty: 1, unit: "un", price: 0 }])} className="justify-self-start">
              <Plus className="h-3.5 w-3.5" /> Adicionar item
            </Button>
          </div>
        )}
      </FormCard>

      <FormCard title="Valores e pagamento" icon={<Wallet className="h-4 w-4" />}>
        <Field label="Mão de obra">
          <MoneyInput value={d.maoDeObra || null} onChange={(v) => set("maoDeObra", v)} />
        </Field>
        <Field label="Deslocamento">
          <MoneyInput value={d.deslocamento || null} onChange={(v) => set("deslocamento", v)} />
        </Field>
        <Field label="Desconto">
          <MoneyInput value={d.desconto || null} onChange={(v) => set("desconto", v)} />
        </Field>
        <Field label="Garantia do serviço">
          <NumberInput value={d.garantiaDias} onChange={(v) => set("garantiaDias", Math.round(v))} suffix="dias" digits={0} />
        </Field>
        <Field label="Situação" className="sm:col-span-2">
          <Segmented
            className="w-full [&>button]:flex-1"
            value={d.pagamento}
            onChange={(v) => set("pagamento", v)}
            options={[
              { value: "pago", label: "Pago" },
              { value: "parcial", label: "Parcial" },
              { value: "a_pagar", label: "A pagar" },
            ]}
          />
        </Field>
        {d.pagamento === "parcial" && (
          <Field label="Valor já pago">
            <MoneyInput value={d.valorPago || null} onChange={(v) => set("valorPago", v)} />
          </Field>
        )}
        {d.pagamento !== "a_pagar" && <TF label="Forma de pagamento" value={d.forma} onChange={(v) => set("forma", v)} />}
        <div className="flex items-center justify-between rounded-xl bg-lime-400/10 px-4 py-3 ring-1 ring-lime-400/20 sm:col-span-2">
          <span className="text-sm text-lime-100/80">Total do serviço</span>
          <span className="tnum font-display text-xl font-bold text-white">{brl(total)}</span>
        </div>
      </FormCard>

      <FormCard title="Responsável técnico" icon={<Wrench className="h-4 w-4" />}>
        <TF label="Técnico" value={d.tecnico} onChange={(v) => set("tecnico", v)} />
        <TF label="Registro (CREA/CFT)" value={d.tecnicoRegistro} onChange={(v) => set("tecnicoRegistro", v)} />
      </FormCard>
    </>
  );

  const row = "grid grid-cols-[1fr_60px_60px_100px_110px] gap-2 px-3 py-1.5";
  const paper = (
    <Paper company={company} docLabel="Nota de serviço" number={number}>
      <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg bg-[#f5f4f8] px-5 py-4 font-sans text-[12px]">
        <p>
          <span className="text-[#6b6878]">Cliente: </span>
          <B v={d.cliente} w={200} />
        </p>
        <p>
          <span className="text-[#6b6878]">CPF/CNPJ: </span>
          <B v={d.clienteDoc} w={130} />
        </p>
        <p>
          <span className="text-[#6b6878]">Local: </span>
          <B v={d.endereco} w={210} />
        </p>
        <p>
          <span className="text-[#6b6878]">Telefone: </span>
          <B v={d.clienteTel} w={120} />
        </p>
        <p>
          <span className="text-[#6b6878]">Serviço: </span>
          <b>{d.servico}</b>
        </p>
        <p>
          <span className="text-[#6b6878]">Data: </span>
          <b>{formatDate(d.data, { day: "2-digit", month: "2-digit", year: "numeric" })}</b>
          {d.inicio && (
            <>
              {" "}
              · {d.inicio}
              {d.fim && `–${d.fim}`}
            </>
          )}
        </p>
      </div>

      <h2 className="mb-2 font-sans text-[12px] font-bold tracking-[0.12em] uppercase">Serviços executados</h2>
      <ul className="mb-5 grid gap-1">
        {done.map((t) => (
          <li key={t.id} className="flex items-start gap-2">
            <span className="mt-[5px] grid h-3.5 w-3.5 shrink-0 place-items-center rounded-[3px] bg-[#14121c] font-sans text-[9px] leading-none font-bold text-white">✓</span>
            {t.text}
          </li>
        ))}
        {!done.length && <li className="text-[#8a8796]">—</li>}
      </ul>

      <h2 className="mb-2 font-sans text-[12px] font-bold tracking-[0.12em] uppercase">Itens e materiais</h2>
      {d.temItens && d.itens.some((i) => i.desc) ? (
        <div className="mb-5 overflow-hidden rounded-lg border border-[#e4e2ea] font-sans text-[11.5px]">
          <div className={cx(row, "bg-[#14121c] font-semibold text-white")}>
            <span>Descrição</span>
            <span className="text-right">Qtd</span>
            <span>Un</span>
            <span className="text-right">Unitário</span>
            <span className="text-right">Total</span>
          </div>
          {d.itens
            .filter((i) => i.desc)
            .map((i, k) => (
              <div key={i.id} className={cx(row, k % 2 && "bg-[#f8f7fb]")}>
                <span>{i.desc}</span>
                <span className="text-right tabular-nums">{fmtNum(i.qty)}</span>
                <span>{i.unit}</span>
                <span className="text-right tabular-nums">{brl(i.price)}</span>
                <span className="text-right tabular-nums">{brl(i.qty * i.price)}</span>
              </div>
            ))}
        </div>
      ) : (
        <p className="mb-5 text-[#5b5868]">Não houve utilização de materiais ou substituição de peças.</p>
      )}

      {d.observacoes && (
        <>
          <h2 className="mb-2 font-sans text-[12px] font-bold tracking-[0.12em] uppercase">Observações técnicas</h2>
          <p className="mb-5 whitespace-pre-line">{d.observacoes}</p>
        </>
      )}

      <div className="tool-avoid-break ml-auto w-[320px] font-sans text-[12.5px]">
        {[
          ["Itens e materiais", itensTotal],
          ["Mão de obra", d.maoDeObra],
          ["Deslocamento", d.deslocamento],
        ]
          .filter(([, v]) => (v as number) > 0)
          .map(([l, v]) => (
            <div key={l as string} className="flex justify-between border-b border-[#eeedf2] py-1">
              <span className="text-[#5b5868]">{l}</span>
              <span className="tabular-nums">{brl(v as number)}</span>
            </div>
          ))}
        {d.desconto > 0 && (
          <div className="flex justify-between border-b border-[#eeedf2] py-1">
            <span className="text-[#5b5868]">Desconto</span>
            <span className="tabular-nums">− {brl(d.desconto)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between rounded-md bg-[#14121c] px-3 py-2 text-white">
          <span className="font-semibold">Total</span>
          <span className="font-bold tabular-nums">{brl(total)}</span>
        </div>
        <p className="mt-2 text-right text-[11.5px]">
          {d.pagamento === "pago" && <span className="font-semibold text-[#15803d]">Pago via {d.forma}</span>}
          {d.pagamento === "parcial" && (
            <>
              Pago {brl(d.valorPago)} via {d.forma} · <b>restante {brl(restante)}</b>
            </>
          )}
          {d.pagamento === "a_pagar" && <b>Valor a pagar: {brl(restante)}</b>}
        </p>
      </div>

      <p className="mt-6 text-[12px] text-[#5b5868]">
        Garantia do serviço executado: <b className="text-[#1d1b26]">{d.garantiaDias} dias</b> a partir desta data, não cobrindo danos por mau uso, intempéries ou intervenção de terceiros. Este documento
        registra o serviço prestado e não substitui a nota fiscal.
      </p>
      <p className="mt-4 text-right">
        {company.city || "Maceió"}/AL, {todayLong(d.data)}.
      </p>
      <div className="tool-avoid-break grid grid-cols-2 gap-x-10">
        <Signature name={d.tecnico} role="Responsável técnico" doc={d.tecnicoRegistro} />
        <Signature name={d.cliente} role="Cliente — serviço recebido e conferido" doc={d.clienteDoc} />
      </div>
    </Paper>
  );

  return (
    <ToolWorkspace
      kind="nota_servico"
      docTitle={`Nota de serviço ${String(number).padStart(4, "0")} — ${d.cliente || "cliente"}`}
      data={d}
      setData={setD}
      defaults={() => notaDefaults(company)}
      fromLead={fromLead}
      number={number}
      setNumber={setNumber}
      leadId={leadId}
      setLeadId={setLeadId}
      issues={issues}
      form={form}
      paper={paper}
    />
  );
}

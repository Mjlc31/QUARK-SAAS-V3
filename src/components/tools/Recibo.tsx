import { useState } from "react";
import { Banknote, Receipt, UserRound } from "lucide-react";
import { Field, MoneyInput, NumberInput, Select, Switch, Textarea, cx } from "@/components/ui";
import type { CrmLead } from "@/lib/crm-leads";
import { brl } from "@/lib/pricing";
import { SERVICES } from "@/lib/services";
import { reaisPorExtenso } from "./extenso";
import { FormCard, Paper, Signature, TF, ToolWorkspace, todayIso, todayLong, type Company } from "./common";

export interface ReciboData {
  valor: number;
  pagador: string;
  pagadorDoc: string;
  referente: string;
  servico: string;
  forma: string;
  parcela: number;
  parcelas: number;
  recebedor: string;
  recebedorDoc: string;
  cidade: string;
  data: string;
  duasVias: boolean;
}

const FORMAS = ["PIX", "Transferência bancária", "Dinheiro", "Cartão de crédito", "Cartão de débito", "Boleto", "Cheque"];

export function reciboDefaults(c: Company): ReciboData {
  return {
    valor: 0,
    pagador: "",
    pagadorDoc: "",
    referente: "",
    servico: "",
    forma: "PIX",
    parcela: 0,
    parcelas: 0,
    recebedor: c.name,
    recebedorDoc: c.cnpj,
    cidade: c.city || "Maceió",
    data: todayIso(),
    duasVias: false,
  };
}

const fromLead = (l: CrmLead, d: ReciboData): ReciboData => ({
  ...d,
  pagador: l.name,
  pagadorDoc: l.document ?? d.pagadorDoc,
  servico: d.servico || (SERVICES.find((s) => s.id === (l.segment === "ambos" ? "solar" : l.segment))?.label ?? ""),
});

export function ReciboTool({ company }: { company: Company }) {
  const [d, setD] = useState<ReciboData>(() => reciboDefaults(company));
  const [number, setNumber] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const set = <K extends keyof ReciboData>(k: K, v: ReciboData[K]) => setD((x) => ({ ...x, [k]: v }));
  const issues = [!d.valor && "valor", !d.pagador && "pagador", !d.referente && !d.servico && "referente a"].filter(Boolean) as string[];

  const referente = [d.servico, d.referente].filter(Boolean).join(" — ");
  const parcelaTxt = d.parcelas > 1 && d.parcela > 0 ? `, correspondente à parcela ${d.parcela} de ${d.parcelas}` : "";

  const form = (
    <>
      <FormCard title="Valor e pagamento" icon={<Banknote className="h-4 w-4" />}>
        <Field label="Valor recebido" className="sm:col-span-2" hint={d.valor ? reaisPorExtenso(d.valor) : "O valor por extenso é gerado automaticamente"}>
          <MoneyInput value={d.valor || null} onChange={(v) => set("valor", v)} className="[&_input]:h-12 [&_input]:text-lg [&_input]:font-semibold" />
        </Field>
        <Field label="Forma de pagamento">
          <Select value={d.forma} onChange={(e) => set("forma", e.target.value)}>
            {FORMAS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </Field>
        <TF label="Data" type="date" value={d.data} onChange={(v) => set("data", v)} />
        <Field label="Parcela (opcional)">
          <div className="flex items-center gap-2">
            <NumberInput value={d.parcela || null} onChange={(v) => set("parcela", Math.round(v))} digits={0} placeholder="1" />
            <span className="text-sm text-zinc-500">de</span>
            <NumberInput value={d.parcelas || null} onChange={(v) => set("parcelas", Math.round(v))} digits={0} placeholder="1" />
          </div>
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={d.duasVias} onChange={(v) => set("duasVias", v)} label={<span className="text-[13px] text-zinc-300">Imprimir 2 vias</span>} />
        </div>
      </FormCard>
      <FormCard title="Pagador" icon={<UserRound className="h-4 w-4" />}>
        <TF full label="Nome / razão social" value={d.pagador} onChange={(v) => set("pagador", v)} />
        <TF label="CPF / CNPJ" value={d.pagadorDoc} onChange={(v) => set("pagadorDoc", v)} />
        <Field label="Serviço">
          <Select value={d.servico} onChange={(e) => set("servico", e.target.value)}>
            <option value="">—</option>
            {SERVICES.map((s) => (
              <option key={s.id}>{s.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Referente a" className="sm:col-span-2">
          <Textarea value={d.referente} onChange={(e) => set("referente", e.target.value)} placeholder="Ex.: entrada de 50% do sistema fotovoltaico de 6,6 kWp conforme proposta nº 0123" className="min-h-[72px]" />
        </Field>
      </FormCard>
      <FormCard title="Recebedor" icon={<Receipt className="h-4 w-4" />}>
        <TF full label="Nome / razão social" value={d.recebedor} onChange={(v) => set("recebedor", v)} />
        <TF label="CPF / CNPJ" value={d.recebedorDoc} onChange={(v) => set("recebedorDoc", v)} />
        <TF label="Cidade" value={d.cidade} onChange={(v) => set("cidade", v)} />
      </FormCard>
    </>
  );

  const via = (label?: string) => (
    <div className={cx("tool-avoid-break rounded-xl border-2 border-[#1d1b26] p-7", label && "mb-6")}>
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-[#c9c6d3] pb-4">
        <div>
          <p className="font-sans text-[22px] font-bold tracking-[0.08em]">RECIBO</p>
          <p className="font-sans text-[11px] text-[#5b5868]">
            Nº {String(number).padStart(4, "0")}
            {label ? ` · ${label}` : ""}
          </p>
        </div>
        <div className="rounded-lg bg-[#14121c] px-5 py-3 text-right font-sans text-white">
          <p className="text-[10px] tracking-[0.16em] text-white/60 uppercase">Valor</p>
          <p className="text-[22px] font-bold tabular-nums">{d.valor ? brl(d.valor) : "R$ ______"}</p>
        </div>
      </div>
      <p className="mt-5 text-[14.5px] leading-[1.9] text-justify">
        Recebi(emos) de <b>{d.pagador || "______________________________"}</b>
        {d.pagadorDoc && <>, inscrito(a) sob o nº {d.pagadorDoc}</>}, a importância de <b>{d.valor ? brl(d.valor) : "R$ ______"}</b>{" "}
        <span className="italic">({d.valor ? reaisPorExtenso(d.valor) : "_______________________________________"})</span>, referente a <b>{referente || "______________________________________"}</b>
        {parcelaTxt}, paga via <b>{d.forma}</b>, pelo que firmo(amos) o presente recibo dando plena e geral quitação do valor recebido.
      </p>
      <p className="mt-6 text-right">
        {d.cidade}/AL, {todayLong(d.data)}.
      </p>
      <div className="mx-auto max-w-[380px]">
        <Signature name={d.recebedor} role="Recebedor" doc={d.recebedorDoc} />
      </div>
    </div>
  );

  const paper = (
    <Paper company={company} docLabel="Recibo de pagamento" number={number}>
      {d.duasVias ? (
        <>
          {via("1ª via — cliente")}
          {via("2ª via — empresa")}
        </>
      ) : (
        via()
      )}
    </Paper>
  );

  return (
    <ToolWorkspace
      kind="recibo"
      docTitle={`Recibo ${String(number).padStart(4, "0")} — ${d.pagador || "cliente"}${d.valor ? ` — ${brl(d.valor)}` : ""}`}
      data={d}
      setData={setD}
      defaults={() => reciboDefaults(company)}
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

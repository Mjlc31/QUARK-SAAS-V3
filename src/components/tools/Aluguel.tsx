import { useState } from "react";
import { Home, KeyRound, ScrollText, UserRound, Users } from "lucide-react";
import { Field, MoneyInput, NumberInput, Segmented, Select } from "@/components/ui";
import type { CrmLead } from "@/lib/crm-leads";
import { brl } from "@/lib/pricing";
import { reaisPorExtenso } from "./extenso";
import { B, Clause, DocTitle, FormCard, Paper, Signature, TF, ToolWorkspace, todayIso, todayLong, type Company } from "./common";

interface Party {
  nome: string;
  cpf: string;
  rg: string;
  estadoCivil: string;
  profissao: string;
  endereco: string;
}
const emptyParty = (): Party => ({ nome: "", cpf: "", rg: "", estadoCivil: "", profissao: "", endereco: "" });

export interface AluguelData {
  modalidade: "locacao" | "comodato";
  locador: Party;
  locatario: Party;
  imovel: string;
  uc: string;
  uso: "residencial" | "comercial" | "rural";
  valor: number;
  vencimento: number;
  prazoMeses: number;
  inicio: string;
  autorizaSolar: boolean;
  testemunha1: string;
  testemunha1Cpf: string;
  testemunha2: string;
  testemunha2Cpf: string;
  foro: string;
  cidade: string;
  data: string;
}

export function aluguelDefaults(c: Company): AluguelData {
  return {
    modalidade: "locacao",
    locador: emptyParty(),
    locatario: emptyParty(),
    imovel: "",
    uc: "",
    uso: "residencial",
    valor: 0,
    vencimento: 10,
    prazoMeses: 12,
    inicio: todayIso(),
    autorizaSolar: true,
    testemunha1: "",
    testemunha1Cpf: "",
    testemunha2: "",
    testemunha2Cpf: "",
    foro: c.city || "Maceió",
    cidade: c.city || "Maceió",
    data: todayIso(),
  };
}

// O cliente do CRM é quem vai assumir a conta (locatário/comodatário).
const fromLead = (l: CrmLead, d: AluguelData): AluguelData => ({
  ...d,
  locatario: { ...d.locatario, nome: l.name, cpf: l.document ?? d.locatario.cpf, endereco: [l.address, l.city].filter(Boolean).join(", ") || d.locatario.endereco },
  imovel: d.imovel || [l.address, l.city].filter(Boolean).join(", "),
});

function qualifica(p: Party) {
  return (
    <>
      <B v={p.nome} w={240} />, <B v={p.estadoCivil} w={80} />, <B v={p.profissao} w={100} />, RG nº <B v={p.rg} w={110} />, CPF nº <B v={p.cpf} w={130} />, residente em <B v={p.endereco} w={280} />
    </>
  );
}

export function AluguelTool({ company }: { company: Company }) {
  const [d, setD] = useState<AluguelData>(() => aluguelDefaults(company));
  const [number, setNumber] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const set = <K extends keyof AluguelData>(k: K, v: AluguelData[K]) => setD((x) => ({ ...x, [k]: v }));
  const setP = (who: "locador" | "locatario", k: keyof Party, v: string) => setD((x) => ({ ...x, [who]: { ...x[who], [k]: v } }));
  const loc = d.modalidade === "locacao";
  const A = loc ? { de: "LOCADOR", para: "LOCATÁRIO", contrato: "Contrato de locação de imóvel", ato: "locação" } : { de: "COMODANTE", para: "COMODATÁRIO", contrato: "Contrato de comodato de imóvel", ato: "comodato" };
  const fim = (() => {
    const dt = new Date(`${d.inicio || todayIso()}T12:00:00`);
    dt.setMonth(dt.getMonth() + (d.prazoMeses || 0));
    return dt.toISOString().slice(0, 10);
  })();

  const issues = [!d.locador.nome && A.de.toLowerCase(), !d.locatario.nome && A.para.toLowerCase(), !d.imovel && "endereço do imóvel", !d.uc && "nº da UC", loc && !d.valor && "valor do aluguel"].filter(Boolean) as string[];

  const partyForm = (who: "locador" | "locatario", title: string, icon: React.ReactNode) => (
    <FormCard title={title} icon={icon}>
      <TF full label="Nome completo" value={d[who].nome} onChange={(v) => setP(who, "nome", v)} />
      <TF label="CPF" value={d[who].cpf} onChange={(v) => setP(who, "cpf", v)} />
      <TF label="RG" value={d[who].rg} onChange={(v) => setP(who, "rg", v)} />
      <Field label="Estado civil">
        <Select value={d[who].estadoCivil} onChange={(e) => setP(who, "estadoCivil", e.target.value)}>
          <option value="">Selecione…</option>
          {["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "em união estável"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </Select>
      </Field>
      <TF label="Profissão" value={d[who].profissao} onChange={(v) => setP(who, "profissao", v)} />
      <TF full label="Endereço" value={d[who].endereco} onChange={(v) => setP(who, "endereco", v)} />
    </FormCard>
  );

  const form = (
    <>
      <div className="rounded-2xl bg-sky-500/[0.07] px-4 py-3 text-[13px] leading-relaxed text-sky-100/90 ring-1 ring-sky-500/20">
        Modelo para a <b>transferência de titularidade</b> da conta de luz na Equatorial: o ocupante do imóvel comprova a posse e assume a UC. Os dados devem ser reais e o contrato,
        assinado pelas partes. Sem cobrança de aluguel (ex.: imóvel de familiar), use <b>comodato</b>.
      </div>
      <FormCard
        title="Modalidade"
        icon={<ScrollText className="h-4 w-4" />}
        action={
          <Segmented
            size="sm"
            value={d.modalidade}
            onChange={(v) => set("modalidade", v)}
            options={[
              { value: "locacao", label: "Locação" },
              { value: "comodato", label: "Comodato" },
            ]}
          />
        }
      >
        {loc && (
          <Field label="Aluguel mensal">
            <MoneyInput value={d.valor || null} onChange={(v) => set("valor", v)} />
          </Field>
        )}
        {loc && (
          <Field label="Dia do vencimento">
            <NumberInput value={d.vencimento} onChange={(v) => set("vencimento", Math.min(31, Math.max(1, Math.round(v))))} digits={0} />
          </Field>
        )}
        <Field label="Prazo">
          <NumberInput value={d.prazoMeses} onChange={(v) => set("prazoMeses", Math.round(v))} suffix="meses" digits={0} />
        </Field>
        <TF label="Início" type="date" value={d.inicio} onChange={(v) => set("inicio", v)} />
      </FormCard>
      {partyForm("locador", loc ? "Locador (proprietário)" : "Comodante (proprietário)", <KeyRound className="h-4 w-4" />)}
      {partyForm("locatario", loc ? "Locatário (novo titular da conta)" : "Comodatário (novo titular da conta)", <UserRound className="h-4 w-4" />)}
      <FormCard title="Imóvel" icon={<Home className="h-4 w-4" />}>
        <TF full label="Endereço completo do imóvel" value={d.imovel} onChange={(v) => set("imovel", v)} placeholder="Rua, nº, bairro, cidade/UF, CEP" />
        <TF label="Nº da UC (Equatorial)" value={d.uc} onChange={(v) => set("uc", v)} />
        <Field label="Uso">
          <Select value={d.uso} onChange={(e) => set("uso", e.target.value as AluguelData["uso"])}>
            <option value="residencial">Residencial</option>
            <option value="comercial">Comercial</option>
            <option value="rural">Rural</option>
          </Select>
        </Field>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/20 px-3 py-2.5 ring-1 ring-white/5 sm:col-span-2">
          <input type="checkbox" checked={d.autorizaSolar} onChange={(e) => set("autorizaSolar", e.target.checked)} className="mt-1 h-4 w-4 accent-lime-400" />
          <span className="text-[13px] text-zinc-300">Autorizar instalação de sistema fotovoltaico / carregador veicular no imóvel</span>
        </label>
      </FormCard>
      <FormCard title="Testemunhas e foro" icon={<Users className="h-4 w-4" />}>
        <TF label="Testemunha 1" value={d.testemunha1} onChange={(v) => set("testemunha1", v)} />
        <TF label="CPF" value={d.testemunha1Cpf} onChange={(v) => set("testemunha1Cpf", v)} />
        <TF label="Testemunha 2" value={d.testemunha2} onChange={(v) => set("testemunha2", v)} />
        <TF label="CPF" value={d.testemunha2Cpf} onChange={(v) => set("testemunha2Cpf", v)} />
        <TF label="Foro (comarca)" value={d.foro} onChange={(v) => set("foro", v)} />
        <TF label="Data da assinatura" type="date" value={d.data} onChange={(v) => set("data", v)} />
      </FormCard>
    </>
  );

  let n = 0;
  const c = () => `Cláusula ${++n}ª`;
  const paper = (
    <Paper company={company} docLabel={loc ? "Contrato de locação" : "Contrato de comodato"} number={number}>
      <DocTitle sub="Para fins de comprovação de posse e transferência de titularidade de unidade consumidora">{A.contrato}</DocTitle>
      <Clause>
        <b>{A.de}:</b> {qualifica(d.locador)}.
      </Clause>
      <Clause>
        <b>{A.para}:</b> {qualifica(d.locatario)}.
      </Clause>
      <Clause>As partes acima identificadas têm entre si justo e contratado o presente {A.ato}, que se regerá pelas cláusulas seguintes{loc ? " e pela Lei nº 8.245/1991" : " e pelos arts. 579 a 585 do Código Civil"}.</Clause>
      <Clause title={`${c()} — Do objeto`}>
        O {A.de} cede ao {A.para}, para uso {d.uso}, o imóvel situado em <B v={d.imovel} w={320} />, atendido pela unidade consumidora nº <B v={d.uc} w={130} /> da Equatorial Alagoas.
      </Clause>
      <Clause title={`${c()} — Do prazo`}>
        O prazo é de <b>{d.prazoMeses || "___"} meses</b>, com início em <b>{todayLong(d.inicio)}</b> e término em <b>{todayLong(fim)}</b>, podendo ser prorrogado por acordo entre as partes.
      </Clause>
      {loc ? (
        <Clause title={`${c()} — Do aluguel`}>
          O aluguel mensal é de <b>{d.valor ? brl(d.valor) : "R$ ________"}</b>
          {d.valor ? ` (${reaisPorExtenso(d.valor)})` : ""}, a ser pago até o dia <b>{d.vencimento}</b> de cada mês, diretamente ao {A.de} ou em conta por ele indicada.
        </Clause>
      ) : (
        <Clause title={`${c()} — Da gratuidade`}>O presente comodato é gratuito, cabendo ao {A.para} apenas as despesas ordinárias de uso e conservação do imóvel.</Clause>
      )}
      <Clause title={`${c()} — Das contas de consumo e da titularidade`}>
        Durante a vigência deste contrato, são de responsabilidade do {A.para} as faturas de energia elétrica do imóvel. Fica o {A.para} expressamente autorizado a solicitar à Equatorial Alagoas a
        transferência da titularidade da unidade consumidora nº <B v={d.uc} w={120} /> para o seu nome, bem como a representá-lo nos atos necessários junto à distribuidora.
      </Clause>
      {d.autorizaSolar && (
        <Clause title={`${c()} — Da geração de energia`}>
          O {A.de} autoriza a instalação, pelo {A.para} e às suas expensas, de sistema de microgeração fotovoltaica e/ou de carregador para veículo elétrico no imóvel, observadas as normas técnicas,
          ficando os equipamentos de propriedade do {A.para}, que poderá retirá-los ao término do contrato, restituindo o imóvel no estado em que o recebeu.
        </Clause>
      )}
      <Clause title={`${c()} — Da conservação e restituição`}>
        O {A.para} se obriga a conservar o imóvel e a restituí-lo, ao final do prazo, nas mesmas condições em que o recebeu, ressalvado o desgaste natural pelo uso.
      </Clause>
      <Clause title={`${c()} — Da veracidade`}>As partes declaram, sob as penas da lei, que as informações deste contrato são verdadeiras e que o imóvel é efetivamente ocupado pelo {A.para}.</Clause>
      <Clause title={`${c()} — Do foro`}>
        Fica eleito o foro da comarca de <B v={d.foro} w={120} />/AL para dirimir quaisquer questões oriundas deste contrato.
      </Clause>
      <Clause>E, por estarem assim justas e contratadas, as partes assinam o presente em 2 (duas) vias de igual teor, na presença das testemunhas abaixo.</Clause>
      <p className="mt-6 text-right">
        {d.cidade || "Maceió"}/AL, {todayLong(d.data)}.
      </p>
      <div className="tool-avoid-break grid grid-cols-2 gap-x-10">
        <Signature name={d.locador.nome} role={A.de === "LOCADOR" ? "Locador" : "Comodante"} doc={d.locador.cpf} />
        <Signature name={d.locatario.nome} role={A.para === "LOCATÁRIO" ? "Locatário" : "Comodatário"} doc={d.locatario.cpf} />
        <Signature name={d.testemunha1} role="Testemunha 1" doc={d.testemunha1Cpf} />
        <Signature name={d.testemunha2} role="Testemunha 2" doc={d.testemunha2Cpf} />
      </div>
    </Paper>
  );

  return (
    <ToolWorkspace
      kind="aluguel"
      docTitle={`${loc ? "Locação" : "Comodato"} ${d.locatario.nome || "imóvel"}${d.uc ? ` — UC ${d.uc}` : ""}`}
      data={d}
      setData={setD}
      defaults={() => aluguelDefaults(company)}
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

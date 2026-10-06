import { useState } from "react";
import { Building2, FileSignature, Plug, UserRound } from "lucide-react";
import { Field, Segmented, Select, Switch } from "@/components/ui";
import type { CrmLead } from "@/lib/crm-leads";
import { B, Clause, DocTitle, FormCard, Paper, Signature, TF, ToolWorkspace, todayIso, todayLong, type Company } from "./common";

const POWERS = [
  { id: "conexao", text: "solicitar orçamento de conexão, acesso e conexão de micro e minigeração distribuída ao sistema da distribuidora, nos termos da Lei nº 14.300/2022 e da Resolução Normativa ANEEL nº 1.000/2021, protocolando projetos, memoriais, formulários, ARTs/TRTs e demais documentos técnicos;" },
  { id: "vistoria", text: "solicitar e acompanhar vistorias, adequações do padrão de entrada, troca ou instalação de medidor bidirecional e todo o processo de homologação até a efetiva ligação do sistema;" },
  { id: "carga", text: "solicitar ligação nova, aumento ou redução de carga e alteração do tipo de fornecimento (monofásico, bifásico ou trifásico);" },
  { id: "titularidade", text: "solicitar a alteração de titularidade da unidade consumidora e a atualização de dados cadastrais;" },
  { id: "rateio", text: "cadastrar, alterar e cancelar listas de rateio e de compensação de créditos de energia entre unidades consumidoras do OUTORGANTE (autoconsumo remoto, geração compartilhada ou múltiplas unidades);" },
  { id: "faturas", text: "solicitar segundas vias de faturas, histórico de consumo e de geração, extratos de créditos e demais informações da unidade consumidora;" },
  { id: "protocolos", text: "abrir, acompanhar, responder e recorrer de protocolos, reclamações e solicitações junto à distribuidora, sua ouvidoria e à ANEEL;" },
  { id: "assinar", text: "assinar requerimentos, formulários, termos e declarações estritamente necessários à execução dos atos acima." },
];

export interface ProcuracaoData {
  tipo: "pf" | "pj";
  nome: string;
  nacionalidade: string;
  estadoCivil: string;
  profissao: string;
  cpf: string;
  rg: string;
  endereco: string;
  // PJ
  representante: string;
  representanteCpf: string;
  // UC
  uc: string;
  enderecoUc: string;
  distribuidora: string;
  // outorgado
  outorgadoNome: string;
  outorgadoCnpj: string;
  outorgadoEndereco: string;
  tecnico: string;
  tecnicoCpf: string;
  tecnicoRegistro: string;
  // poderes
  poderes: string[];
  validade: string;
  substabelecer: boolean;
  cidade: string;
  data: string;
}

export function procuracaoDefaults(c: Company): ProcuracaoData {
  return {
    tipo: "pf",
    nome: "",
    nacionalidade: "brasileiro(a)",
    estadoCivil: "",
    profissao: "",
    cpf: "",
    rg: "",
    endereco: "",
    representante: "",
    representanteCpf: "",
    uc: "",
    enderecoUc: "",
    distribuidora: "Equatorial Alagoas Distribuidora de Energia S.A.",
    outorgadoNome: c.name,
    outorgadoCnpj: c.cnpj,
    outorgadoEndereco: c.address,
    tecnico: c.tech,
    tecnicoCpf: "",
    tecnicoRegistro: c.techRegistry,
    poderes: POWERS.map((p) => p.id),
    validade: "12 (doze) meses",
    substabelecer: false,
    cidade: c.city,
    data: todayIso(),
  };
}

const fromLead = (l: CrmLead, d: ProcuracaoData): ProcuracaoData => {
  const pj = (l.document ?? "").replace(/\D/g, "").length === 14;
  return { ...d, tipo: pj ? "pj" : "pf", nome: l.name, cpf: l.document ?? d.cpf, endereco: l.address ? [l.address, l.city].filter(Boolean).join(", ") : d.endereco, enderecoUc: d.enderecoUc || [l.address, l.city].filter(Boolean).join(", ") };
};

export function ProcuracaoTool({ company }: { company: Company }) {
  const [d, setD] = useState<ProcuracaoData>(() => procuracaoDefaults(company));
  const [number, setNumber] = useState(1);
  const [leadId, setLeadId] = useState<string | null>(null);
  const set = <K extends keyof ProcuracaoData>(k: K, v: ProcuracaoData[K]) => setD((x) => ({ ...x, [k]: v }));
  const pj = d.tipo === "pj";

  const issues = [
    !d.nome && (pj ? "razão social" : "nome do outorgante"),
    !d.cpf && (pj ? "CNPJ" : "CPF"),
    !d.uc && "nº da UC",
    !d.outorgadoNome && "outorgado",
  ].filter(Boolean) as string[];

  const form = (
    <>
      <FormCard title="Outorgante (cliente)" icon={<UserRound className="h-4 w-4" />} action={<Segmented size="sm" value={d.tipo} onChange={(v) => set("tipo", v)} options={[{ value: "pf", label: "Pessoa física" }, { value: "pj", label: "Empresa" }]} />}>
        <TF full label={pj ? "Razão social" : "Nome completo"} value={d.nome} onChange={(v) => set("nome", v)} />
        <TF label={pj ? "CNPJ" : "CPF"} value={d.cpf} onChange={(v) => set("cpf", v)} />
        {!pj && <TF label="RG / órgão emissor" value={d.rg} onChange={(v) => set("rg", v)} placeholder="0000000 SSP/AL" />}
        {!pj && <TF label="Nacionalidade" value={d.nacionalidade} onChange={(v) => set("nacionalidade", v)} />}
        {!pj && (
          <Field label="Estado civil">
            <Select value={d.estadoCivil} onChange={(e) => set("estadoCivil", e.target.value)}>
              <option value="">Selecione…</option>
              {["solteiro(a)", "casado(a)", "divorciado(a)", "viúvo(a)", "em união estável"].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </Select>
          </Field>
        )}
        {!pj && <TF label="Profissão" value={d.profissao} onChange={(v) => set("profissao", v)} />}
        {pj && <TF label="Representante legal" value={d.representante} onChange={(v) => set("representante", v)} />}
        {pj && <TF label="CPF do representante" value={d.representanteCpf} onChange={(v) => set("representanteCpf", v)} />}
        <TF full label="Endereço completo" value={d.endereco} onChange={(v) => set("endereco", v)} placeholder="Rua, nº, bairro, cidade/UF, CEP" />
      </FormCard>

      <FormCard title="Unidade consumidora" icon={<Plug className="h-4 w-4" />}>
        <TF label="Nº da UC / conta contrato" value={d.uc} onChange={(v) => set("uc", v)} hint="Está na fatura da Equatorial" />
        <TF label="Distribuidora" value={d.distribuidora} onChange={(v) => set("distribuidora", v)} />
        <TF full label="Endereço da instalação" value={d.enderecoUc} onChange={(v) => set("enderecoUc", v)} placeholder="Se diferente do endereço do outorgante" />
      </FormCard>

      <FormCard title="Outorgado (Quark)" icon={<Building2 className="h-4 w-4" />}>
        <TF full label="Razão social" value={d.outorgadoNome} onChange={(v) => set("outorgadoNome", v)} />
        <TF label="CNPJ" value={d.outorgadoCnpj} onChange={(v) => set("outorgadoCnpj", v)} />
        <TF label="Endereço" value={d.outorgadoEndereco} onChange={(v) => set("outorgadoEndereco", v)} />
        <TF label="Responsável técnico" value={d.tecnico} onChange={(v) => set("tecnico", v)} />
        <TF label="CPF do responsável" value={d.tecnicoCpf} onChange={(v) => set("tecnicoCpf", v)} />
        <TF full label="Registro profissional (CREA/CFT)" value={d.tecnicoRegistro} onChange={(v) => set("tecnicoRegistro", v)} />
      </FormCard>

      <FormCard title="Poderes e validade" icon={<FileSignature className="h-4 w-4" />}>
        <div className="grid gap-2 sm:col-span-2">
          {POWERS.map((p) => {
            const on = d.poderes.includes(p.id);
            return (
              <label key={p.id} className="flex cursor-pointer items-start gap-3 rounded-xl bg-black/20 px-3 py-2.5 ring-1 ring-white/5 transition hover:ring-white/15">
                <input type="checkbox" checked={on} onChange={() => set("poderes", on ? d.poderes.filter((x) => x !== p.id) : [...d.poderes, p.id])} className="mt-1 h-4 w-4 accent-lime-400" />
                <span className="text-[13px] leading-snug text-zinc-300">{p.text.charAt(0).toUpperCase() + p.text.slice(1, -1)}</span>
              </label>
            );
          })}
        </div>
        <Field label="Validade">
          <Select value={d.validade} onChange={(e) => set("validade", e.target.value)}>
            {["6 (seis) meses", "12 (doze) meses", "24 (vinte e quatro) meses", "prazo indeterminado, até revogação expressa"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <TF label="Data" type="date" value={d.data} onChange={(v) => set("data", v)} />
        <TF label="Cidade" value={d.cidade} onChange={(v) => set("cidade", v)} />
        <div className="flex items-end pb-2">
          <Switch checked={d.substabelecer} onChange={(v) => set("substabelecer", v)} label={<span className="text-[13px] text-zinc-300">Permitir substabelecer</span>} />
        </div>
      </FormCard>
    </>
  );

  const powers = POWERS.filter((p) => d.poderes.includes(p.id));
  const paper = (
    <Paper company={company} docLabel="Procuração" number={number}>
      <DocTitle sub={`Unidade consumidora ${d.uc || "______________"} · ${d.distribuidora}`}>Procuração particular</DocTitle>
      <Clause title="Outorgante">
        {pj ? (
          <>
            <B v={d.nome} w={260} />, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <B v={d.cpf} />, com sede em <B v={d.endereco} w={300} />, neste ato representada por <B v={d.representante} w={200} />, CPF nº <B v={d.representanteCpf} />.
          </>
        ) : (
          <>
            <B v={d.nome} w={260} />, <B v={d.nacionalidade} w={90} />, <B v={d.estadoCivil} w={90} />, <B v={d.profissao} w={110} />, portador(a) do RG nº <B v={d.rg} w={120} /> e inscrito(a) no CPF sob o nº <B v={d.cpf} w={130} />, residente e domiciliado(a) em <B v={d.endereco} w={300} />.
          </>
        )}
      </Clause>
      <Clause title="Outorgado">
        <B v={d.outorgadoNome} w={240} />, inscrita no CNPJ sob o nº <B v={d.outorgadoCnpj} />, com sede em <B v={d.outorgadoEndereco} w={260} />
        {d.tecnico ? (
          <>
            , neste ato também por seu responsável técnico <B v={d.tecnico} />
            {d.tecnicoCpf && (
              <>
                , CPF nº <B v={d.tecnicoCpf} />
              </>
            )}
            {d.tecnicoRegistro && (
              <>
                , registro profissional <B v={d.tecnicoRegistro} />
              </>
            )}
          </>
        ) : null}
        .
      </Clause>
      <Clause title="Poderes">
        Pelo presente instrumento particular, o OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, para representá-lo perante a{" "}
        <b>{d.distribuidora}</b>, especificamente em relação à unidade consumidora nº <B v={d.uc} w={140} />
        {d.enderecoUc && (
          <>
            , localizada em <B v={d.enderecoUc} />
          </>
        )}
        , com poderes para:
        <ol className="mt-2 ml-5 list-[lower-alpha] space-y-1">
          {powers.map((p) => (
            <li key={p.id}>{p.text}</li>
          ))}
        </ol>
      </Clause>
      <Clause title="Limites">
        Este mandato não confere poderes para contrair obrigações financeiras, receber valores, dar quitação ou alienar bens em nome do OUTORGANTE.{" "}
        {d.substabelecer ? "É permitido o substabelecimento, com reserva de iguais poderes." : "É vedado o substabelecimento."} A presente procuração é válida por {d.validade}, a contar da data de sua
        assinatura, podendo ser revogada a qualquer tempo mediante comunicação ao OUTORGADO e à distribuidora.
      </Clause>
      <p className="mt-8 text-right">
        {d.cidade || "Maceió"}/AL, {todayLong(d.data)}.
      </p>
      <div className="mx-auto mt-4 max-w-[420px]">
        <Signature name={pj ? d.representante || d.nome : d.nome} role={pj ? `Outorgante · p/ ${d.nome || "empresa"}` : "Outorgante"} doc={pj ? d.representanteCpf : d.cpf} />
      </div>
      <p className="mt-10 rounded-md border border-dashed border-[#c9c6d3] px-3 py-2 font-sans text-[10px] leading-snug text-[#6b6878]">
        Assinatura com firma reconhecida em cartório ou assinatura eletrônica gov.br, conforme exigência da distribuidora. Anexar cópia do documento de identificação do outorgante
        {pj ? ", do contrato social e do documento do representante" : ""}.
      </p>
    </Paper>
  );

  return (
    <ToolWorkspace
      kind="procuracao"
      docTitle={`Procuração ${d.nome || "cliente"}${d.uc ? ` — UC ${d.uc}` : ""}`}
      data={d}
      setData={setD}
      defaults={() => procuracaoDefaults(company)}
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

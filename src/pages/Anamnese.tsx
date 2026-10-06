import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2, Lock, MessageCircle, Pencil } from "lucide-react";
import { cx } from "@/components/ui";
import { SERVICES, type ServiceId } from "@/lib/services";
import { MACEIO_TARIFF } from "@/lib/defaults";
import { brl, fmtNum } from "@/lib/pricing";
import { whatsappUrl } from "@/lib/format";
import { Chip, Logo, PublicBackdrop, PublicInput, maskPhone, phoneValid, submitPublicLead, trackConversion, usePublicCompany } from "@/components/public/shared";
import { TrackingScripts } from "@/components/capture/tracking";

type StepId = "servicos" | "voce" | "energia" | "detalhes" | "decisao" | "revisao" | "pronto";

interface Answers {
  services: ServiceId[];
  name: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  imovel: string;
  propriedade: string;
  conta: number;
  concessionaria: string;
  ligacao: string;
  titular: string;
  telhado: string;
  sombra: string;
  veiculo: string;
  local_carregador: string;
  vagas: string;
  negocio: string;
  potencia_usina: string;
  ultima_limpeza: string;
  problema: string;
  gestao_servicos: string[];
  uc_count: string;
  prazo: string;
  pagamento: string;
  melhor_horario: string;
  origem: string;
  observacoes: string;
  website: string;
  consent: boolean;
}

const INITIAL: Answers = {
  services: [],
  name: "",
  phone: "",
  email: "",
  city: "Maceió",
  address: "",
  imovel: "",
  propriedade: "",
  conta: 0,
  concessionaria: "Equatorial Alagoas",
  ligacao: "",
  titular: "",
  telhado: "",
  sombra: "",
  veiculo: "",
  local_carregador: "",
  vagas: "",
  negocio: "",
  potencia_usina: "",
  ultima_limpeza: "",
  problema: "",
  gestao_servicos: [],
  uc_count: "",
  prazo: "",
  pagamento: "",
  melhor_horario: "",
  origem: "",
  observacoes: "",
  website: "",
  consent: true,
};

const ENERGY_SERVICES: ServiceId[] = ["solar", "gestao", "projeto", "manutencao"];
const BILL_PRESETS = [200, 350, 500, 800, 1200, 2000];
const ROOFS = ["Cerâmico", "Fibrocimento", "Metálico", "Laje", "Solo", "Não sei"];

export default function Anamnese() {
  const company = usePublicCompany();
  const [params] = useSearchParams();
  const [a, setA] = useState<Answers>(() => {
    const s = (params.get("s") ?? "").split(",").filter((x): x is ServiceId => SERVICES.some((sv) => sv.id === x));
    return { ...INITIAL, services: s, name: params.get("nome") ?? "", phone: maskPhone(params.get("tel") ?? "") };
  });
  const [step, setStep] = useState<StepId>("servicos");
  const [touched, setTouched] = useState<Partial<Record<StepId, boolean>>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const top = useRef<HTMLDivElement>(null);

  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setA((x) => ({ ...x, [k]: v }));
  const has = (id: ServiceId) => a.services.includes(id);
  const needsEnergy = a.services.some((s) => ENERGY_SERVICES.includes(s));
  const needsDetails = a.services.length > 0;

  const flow = useMemo<StepId[]>(
    () => ["servicos", "voce", ...(needsEnergy ? (["energia"] as StepId[]) : []), ...(needsDetails ? (["detalhes"] as StepId[]) : []), "decisao", "revisao"],
    [needsEnergy, needsDetails],
  );
  const idx = flow.indexOf(step);
  const progress = step === "pronto" ? 100 : Math.round((idx / (flow.length - 1)) * 100);

  useEffect(() => {
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [step]);

  const errors = useMemo(() => {
    const e: Partial<Record<string, string>> = {};
    if (!a.services.length) e.services = "Escolha pelo menos um serviço";
    if (a.name.trim().length < 2) e.name = "Informe seu nome";
    if (!phoneValid(a.phone)) e.phone = "WhatsApp com DDD, ex.: (82) 99999-9999";
    if (a.email && !/^\S+@\S+\.\S+$/.test(a.email)) e.email = "E-mail inválido";
    if (needsEnergy && has("solar") && !a.conta) e.conta = "Informe o valor aproximado da conta";
    if (!a.prazo) e.prazo = "Escolha um prazo";
    return e;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a, needsEnergy]);

  const stepFields: Record<StepId, string[]> = { servicos: ["services"], voce: ["name", "phone", "email"], energia: ["conta"], detalhes: [], decisao: ["prazo"], revisao: [], pronto: [] };
  const stepValid = (s: StepId) => stepFields[s].every((f) => !errors[f]);
  const showErr = (f: string) => (touched[step] ? errors[f] : undefined);

  const next = () => {
    setTouched((t) => ({ ...t, [step]: true }));
    if (!stepValid(step)) return;
    setStep(flow[idx + 1]);
  };
  const back = () => idx > 0 && setStep(flow[idx - 1]);

  const temperature = a.prazo === "Imediato" || a.prazo === "Em até 30 dias" ? "quente" : a.prazo === "Em até 3 meses" ? "morno" : "frio";
  const kwh = a.conta > 0 ? Math.round(Math.max(0, a.conta - 25) / MACEIO_TARIFF) : 0;

  const answersPayload = () => {
    const out: Record<string, unknown> = {
      objetivo: a.services.map((s) => SERVICES.find((x) => x.id === s)?.label).join(", "),
      imovel: a.imovel,
      propriedade: a.propriedade,
      conta: a.conta ? brl(a.conta, 0) : "",
      consumo: kwh ? `${fmtNum(kwh)} kWh (estimado)` : "",
      concessionaria: needsEnergy ? a.concessionaria : "",
      ligacao: a.ligacao,
      titular: a.titular,
      telhado: has("solar") ? a.telhado : "",
      sombra: has("solar") ? a.sombra : "",
      veiculo: has("save") ? a.veiculo : "",
      local_carregador: has("save") ? a.local_carregador : "",
      vagas: has("eletroposto") || has("save") ? a.vagas : "",
      negocio: has("eletroposto") ? a.negocio : "",
      potencia_usina: has("manutencao") || has("projeto") ? a.potencia_usina : "",
      ultima_limpeza: has("manutencao") ? a.ultima_limpeza : "",
      problema: has("manutencao") ? a.problema : "",
      gestao_servicos: has("gestao") ? a.gestao_servicos : [],
      uc_count: has("gestao") ? a.uc_count : "",
      prazo: a.prazo,
      pagamento: a.pagamento,
      melhor_horario: a.melhor_horario,
      indicacao: a.origem,
      observacoes: a.observacoes,
    };
    return Object.fromEntries(Object.entries(out).filter(([, v]) => (Array.isArray(v) ? v.length : v)));
  };

  async function submit() {
    if (Object.keys(errors).length) {
      const firstBad = flow.find((s) => !stepValid(s));
      if (firstBad) {
        setTouched((t) => ({ ...t, [firstBad]: true }));
        setStep(firstBad);
      }
      return;
    }
    setSending(true);
    setError("");
    const ans = answersPayload();
    const ok = await submitPublicLead({
      name: a.name.trim(),
      phone: a.phone,
      email: a.email,
      city: a.city,
      address: a.address,
      services: a.services,
      source: params.get("src") || "Anamnese",
      temperature,
      avg_bill: a.conta || null,
      consumption_kwh: kwh || null,
      roof_type: has("solar") && a.telhado && a.telhado !== "Não sei" ? (a.telhado === "Laje" || a.telhado === "Solo" ? a.telhado : `Telhado ${a.telhado.toLowerCase()}`) : undefined,
      connection_type: a.ligacao === "Monofásica" ? "mono" : a.ligacao === "Bifásica" ? "bi" : a.ligacao === "Trifásica" ? "tri" : undefined,
      notes: a.observacoes,
      summary: `Anamnese: ${String(ans.objetivo)} · prazo ${a.prazo}${a.conta ? ` · conta ${brl(a.conta, 0)}` : ""}`,
      answers: ans,
      owner: params.get("v"),
      website: a.website,
    });
    setSending(false);
    if (!ok) return setError("Não conseguimos enviar agora. Confira sua conexão e tente novamente.");
    trackConversion(a.services[0] ?? "solar");
    setStep("pronto");
  }

  const wa = company.whatsapp || "";

  return (
    <div translate="no" className="notranslate relative min-h-dvh font-sans text-white antialiased">
      <TrackingScripts metaPixelId={company.metaPixelId ?? undefined} gaId={company.gaId ?? undefined} />
      <PublicBackdrop />
      <div ref={top} className="relative mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-32">
        <header className="sticky top-0 z-20 -mx-5 bg-[#07060D]/75 px-5 pt-3 pb-4 backdrop-blur-2xl">
          <div className="flex items-center justify-between">
            <Logo src={company.logo_url} className="h-11 w-auto" />
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-500">
              <Lock className="h-3 w-3" /> Dados protegidos
            </span>
          </div>
          {step !== "pronto" && (
            <div className="mt-4">
              <div className="mb-1.5 flex justify-between text-[11px] font-semibold text-zinc-500">
                <span>Anamnese energética</span>
                <span className="tnum">{progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-[#F3EA3B] via-lime-300 to-emerald-400 transition-all duration-500" style={{ width: `${Math.max(4, progress)}%` }} />
              </div>
            </div>
          )}
        </header>

        <main key={step} className="animate-fade-up mt-4 flex-1">
          {step === "servicos" && (
            <StepShell kicker="Vamos começar" title="O que você está buscando?" text="Marque tudo que fizer sentido — montamos um atendimento sob medida.">
              <div className="grid gap-2.5">
                {SERVICES.map((s) => {
                  const on = has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("services", on ? a.services.filter((x) => x !== s.id) : [...a.services, s.id])}
                      className={cx(
                        "flex items-center gap-4 rounded-[22px] p-3.5 text-left ring-1 transition active:scale-[0.985]",
                        on ? "bg-white/[0.08] ring-lime-300/60 shadow-[0_10px_40px_-18px_rgba(190,242,100,0.6)]" : "bg-white/[0.035] ring-white/10 hover:ring-white/20",
                      )}
                    >
                      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white" style={{ background: s.gradient }}>
                        <s.icon className="h-[22px] w-[22px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-[15px] font-semibold">{s.label}</span>
                        <span className="block text-[13px] text-zinc-400">{s.pitch}</span>
                      </span>
                      <span className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full ring-1 transition", on ? "bg-lime-300 text-zinc-950 ring-lime-300" : "ring-white/20")}>
                        {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <ErrorText>{showErr("services")}</ErrorText>
            </StepShell>
          )}

          {step === "voce" && (
            <StepShell kicker="Sobre você" title="Como falamos com você?" text="Usamos só para o atendimento e a proposta.">
              <div className="grid gap-4">
                <PublicInput label="Nome completo *" autoComplete="name" value={a.name} onChange={(e) => set("name", e.target.value)} error={showErr("name")} placeholder="Seu nome" />
                <PublicInput label="WhatsApp *" type="tel" inputMode="tel" autoComplete="tel" value={a.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} error={showErr("phone")} placeholder="(82) 99999-9999" />
                <PublicInput label="E-mail (opcional)" type="email" autoComplete="email" value={a.email} onChange={(e) => set("email", e.target.value)} error={showErr("email")} placeholder="voce@email.com" />
                <div className="grid grid-cols-2 gap-3">
                  <PublicInput label="Cidade" autoComplete="address-level2" value={a.city} onChange={(e) => set("city", e.target.value)} />
                  <PublicInput label="Bairro / endereço" autoComplete="street-address" value={a.address} onChange={(e) => set("address", e.target.value)} placeholder="Opcional" />
                </div>
                <Question label="Tipo de imóvel">
                  <Options value={a.imovel} onChange={(v) => set("imovel", v)} options={["Casa", "Apartamento", "Comércio", "Indústria", "Rural", "Condomínio"]} cols={3} />
                </Question>
                <Question label="O imóvel é…">
                  <Options value={a.propriedade} onChange={(v) => set("propriedade", v)} options={["Próprio", "Alugado", "Financiado"]} cols={3} />
                </Question>
              </div>
            </StepShell>
          )}

          {step === "energia" && (
            <StepShell kicker="Sua energia" title="Como é sua conta de luz?" text="Um valor aproximado já ajuda bastante — confirme depois com a fatura.">
              <div className="grid gap-6">
                <div className="rounded-3xl bg-white/[0.04] p-5 ring-1 ring-white/10">
                  <p className="text-[13px] font-medium text-zinc-300">Valor médio por mês {has("solar") && "*"}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-zinc-400">R$</span>
                    <input
                      inputMode="numeric"
                      value={a.conta ? a.conta.toLocaleString("pt-BR") : ""}
                      onChange={(e) => set("conta", Number(e.target.value.replace(/\D/g, "")) || 0)}
                      placeholder="0"
                      className="tnum w-full bg-transparent font-display text-5xl font-bold tracking-tight outline-none placeholder:text-zinc-700"
                    />
                  </div>
                  <input type="range" min={0} max={3000} step={10} value={Math.min(a.conta, 3000)} onChange={(e) => set("conta", Number(e.target.value))} className="mt-4 w-full accent-lime-300" aria-label="Valor da conta" />
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {BILL_PRESETS.map((v) => (
                      <button key={v} type="button" onClick={() => set("conta", v)} className={cx("tnum rounded-full px-3 py-1 text-xs font-semibold ring-1", a.conta === v ? "bg-lime-300 text-zinc-950 ring-lime-300" : "bg-white/5 text-zinc-300 ring-white/10")}>
                        {brl(v, 0)}
                      </button>
                    ))}
                  </div>
                  {kwh > 0 && (
                    <p className="mt-4 rounded-2xl bg-lime-300/10 px-4 py-3 text-[13px] text-lime-100 ring-1 ring-lime-300/20">
                      ≈ <b className="tnum">{fmtNum(kwh)} kWh/mês</b> de consumo (tarifa Equatorial AL ~{brl(MACEIO_TARIFF)}/kWh + iluminação pública)
                    </p>
                  )}
                  <ErrorText>{showErr("conta")}</ErrorText>
                </div>
                <Question label="Concessionária">
                  <Options value={a.concessionaria} onChange={(v) => set("concessionaria", v)} options={["Equatorial Alagoas", "Outra"]} cols={2} />
                </Question>
                <Question label="Tipo de ligação" hint="Aparece na fatura, perto do número da instalação">
                  <Options value={a.ligacao} onChange={(v) => set("ligacao", v)} options={["Monofásica", "Bifásica", "Trifásica", "Não sei"]} cols={2} />
                </Question>
                <Question label="A conta está no seu nome?">
                  <Options value={a.titular} onChange={(v) => set("titular", v)} options={["Sim, no meu nome", "No nome de outra pessoa", "No nome da empresa"]} cols={1} />
                </Question>
              </div>
            </StepShell>
          )}

          {step === "detalhes" && (
            <StepShell kicker="Detalhes técnicos" title="Só mais alguns detalhes" text="Responda o que souber — o resto vemos na visita técnica.">
              <div className="grid gap-7">
                {has("solar") && (
                  <Block title="Energia solar">
                    <Question label="Tipo de telhado">
                      <Options value={a.telhado} onChange={(v) => set("telhado", v)} options={ROOFS} cols={3} />
                    </Question>
                    <Question label="Tem sombra no telhado (árvores, prédios)?">
                      <Options value={a.sombra} onChange={(v) => set("sombra", v)} options={["Não", "Um pouco", "Bastante", "Não sei"]} cols={2} />
                    </Question>
                  </Block>
                )}
                {has("save") && (
                  <Block title="Carregador veicular">
                    <Question label="Veículo elétrico">
                      <Options value={a.veiculo} onChange={(v) => set("veiculo", v)} options={["Já tenho", "Vou comprar", "Pesquisando"]} cols={3} />
                    </Question>
                    <Question label="Onde será instalado?">
                      <Options value={a.local_carregador} onChange={(v) => set("local_carregador", v)} options={["Garagem de casa", "Condomínio", "Empresa"]} cols={3} />
                    </Question>
                  </Block>
                )}
                {has("eletroposto") && (
                  <Block title="Eletroposto">
                    <Question label="Tipo de negócio">
                      <Options value={a.negocio} onChange={(v) => set("negocio", v)} options={["Posto", "Shopping", "Hotel", "Restaurante", "Estacionamento", "Outro"]} cols={3} />
                    </Question>
                    <Question label="Quantas vagas de recarga?">
                      <Options value={a.vagas} onChange={(v) => set("vagas", v)} options={["1", "2 a 4", "5 a 10", "Mais de 10"]} cols={4} />
                    </Question>
                  </Block>
                )}
                {(has("manutencao") || has("projeto")) && (
                  <Block title={has("manutencao") ? "Sua usina" : "Projeto fotovoltaico"}>
                    <Question label="Potência da usina">
                      <Options value={a.potencia_usina} onChange={(v) => set("potencia_usina", v)} options={["Até 5 kWp", "5 a 15 kWp", "15 a 75 kWp", "Acima de 75 kWp", "Não sei"]} cols={2} />
                    </Question>
                    {has("manutencao") && (
                      <>
                        <Question label="Última limpeza">
                          <Options value={a.ultima_limpeza} onChange={(v) => set("ultima_limpeza", v)} options={["Menos de 6 meses", "6 a 12 meses", "Mais de 1 ano", "Nunca limpei"]} cols={2} />
                        </Question>
                        <Question label="O que está acontecendo?">
                          <Options value={a.problema} onChange={(v) => set("problema", v)} options={["Só limpeza", "Geração caiu", "Inversor com erro", "Inspeção preventiva"]} cols={2} />
                        </Question>
                      </>
                    )}
                  </Block>
                )}
                {has("gestao") && (
                  <Block title="Gestão de fatura, créditos e rateio">
                    <Question label="Do que você precisa?" hint="Pode marcar mais de um">
                      <div className="grid grid-cols-2 gap-2">
                        {["Troca de titularidade", "Rateio de créditos", "Auditoria de fatura", "Gestão de várias contas", "Revisão de demanda", "Recuperar créditos"].map((op) => (
                          <Chip key={op} active={a.gestao_servicos.includes(op)} onClick={() => set("gestao_servicos", a.gestao_servicos.includes(op) ? a.gestao_servicos.filter((x) => x !== op) : [...a.gestao_servicos, op])}>
                            {op}
                          </Chip>
                        ))}
                      </div>
                    </Question>
                    <Question label="Quantas unidades consumidoras (contas)?">
                      <Options value={a.uc_count} onChange={(v) => set("uc_count", v)} options={["1", "2 a 5", "6 a 20", "Mais de 20"]} cols={4} />
                    </Question>
                  </Block>
                )}
              </div>
            </StepShell>
          )}

          {step === "decisao" && (
            <StepShell kicker="Quase lá" title="Quando você quer resolver?" text="Assim priorizamos seu atendimento.">
              <div className="grid gap-6">
                <Question label="Prazo *">
                  <Options value={a.prazo} onChange={(v) => set("prazo", v)} options={["Imediato", "Em até 30 dias", "Em até 3 meses", "Só pesquisando"]} cols={2} />
                  <ErrorText>{showErr("prazo")}</ErrorText>
                </Question>
                <Question label="Como prefere pagar?">
                  <Options value={a.pagamento} onChange={(v) => set("pagamento", v)} options={["À vista / PIX", "Financiamento", "Cartão de crédito", "Ainda não sei"]} cols={2} />
                </Question>
                <Question label="Melhor horário para contato">
                  <Options value={a.melhor_horario} onChange={(v) => set("melhor_horario", v)} options={["Manhã", "Tarde", "Noite"]} cols={3} />
                </Question>
                <Question label="Como conheceu a Quark?">
                  <Options value={a.origem} onChange={(v) => set("origem", v)} options={["Instagram", "Indicação", "Google", "Vi uma obra", "Outro"]} cols={3} />
                </Question>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-zinc-300">Algo mais que devemos saber?</span>
                  <textarea
                    value={a.observacoes}
                    onChange={(e) => set("observacoes", e.target.value)}
                    rows={3}
                    placeholder="Ex.: vou ampliar a casa, tenho piscina, quero instalar antes de dezembro…"
                    className="w-full rounded-2xl bg-white/[0.05] px-4 py-3 text-[16px] text-white ring-1 ring-white/10 outline-none placeholder:text-zinc-500 focus:ring-2 focus:ring-lime-300"
                  />
                </label>
              </div>
            </StepShell>
          )}

          {step === "revisao" && (
            <StepShell kicker="Revisão" title="Confira suas respostas" text="Toque em uma seção para corrigir.">
              <div className="grid gap-2.5">
                <ReviewRow title="Serviços" onEdit={() => setStep("servicos")} value={a.services.map((s) => SERVICES.find((x) => x.id === s)?.short).join(", ")} />
                <ReviewRow title="Contato" onEdit={() => setStep("voce")} value={[a.name, a.phone, a.email, a.city].filter(Boolean).join(" · ")} />
                {needsEnergy && <ReviewRow title="Conta de luz" onEdit={() => setStep("energia")} value={[a.conta ? `${brl(a.conta, 0)}/mês` : "Não informada", a.ligacao, a.concessionaria].filter(Boolean).join(" · ")} />}
                {needsDetails && (
                  <ReviewRow
                    title="Detalhes"
                    onEdit={() => setStep("detalhes")}
                    value={[a.telhado && `Telhado ${a.telhado}`, a.veiculo, a.negocio, a.potencia_usina, a.problema, a.gestao_servicos.join(", "), a.uc_count && `${a.uc_count} UC`].filter(Boolean).join(" · ") || "—"}
                  />
                )}
                <ReviewRow title="Decisão" onEdit={() => setStep("decisao")} value={[a.prazo, a.pagamento, a.melhor_horario && `contato pela ${a.melhor_horario.toLowerCase()}`].filter(Boolean).join(" · ")} />
                <label className="mt-3 flex items-start gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 text-[13px] text-zinc-400 ring-1 ring-white/5">
                  <input type="checkbox" checked={a.consent} onChange={(e) => set("consent", e.target.checked)} className="mt-0.5 h-4 w-4 accent-lime-300" />
                  Autorizo a Quark Energia a usar estes dados para me atender e enviar a proposta (LGPD).
                </label>
                <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={a.website} onChange={(e) => set("website", e.target.value)} />
                {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30">{error}</p>}
              </div>
            </StepShell>
          )}

          {step === "pronto" && (
            <div className="flex flex-col items-center pt-10 text-center">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-lime-300 text-zinc-950 shadow-[0_0_60px_rgba(190,242,100,0.55)]">
                <Check className="h-10 w-10" strokeWidth={3} />
              </div>
              <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Anamnese enviada!</h1>
              <p className="mt-2 max-w-sm text-zinc-400">
                Obrigado, {a.name.split(" ")[0]}. Nossa engenharia já está com suas respostas e vai te chamar {a.melhor_horario ? `pela ${a.melhor_horario.toLowerCase()}` : "em breve"} no WhatsApp.
              </p>
              {kwh > 0 && (
                <div className="mt-6 w-full rounded-3xl bg-white/[0.04] p-5 text-left ring-1 ring-white/10">
                  <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Prévia do seu perfil</p>
                  <p className="mt-2 text-sm text-zinc-300">
                    Consumo estimado de <b className="tnum text-white">{fmtNum(kwh)} kWh/mês</b>. Um sistema de aproximadamente{" "}
                    <b className="tnum text-white">{fmtNum(Math.max(0, kwh - 50) / 125, 1)} kWp</b> cobriria sua conta — a proposta final sai após a análise técnica.
                  </p>
                </div>
              )}
              {wa && (
                <a
                  href={whatsappUrl(wa, `Olá! Sou ${a.name.split(" ")[0]} e acabei de responder a anamnese da Quark.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-8 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-semibold text-[#062b14] shadow-[0_12px_40px_-12px_rgba(37,211,102,0.7)]"
                >
                  <MessageCircle className="h-5 w-5" /> Falar agora no WhatsApp
                </a>
              )}
            </div>
          )}
        </main>

        {step !== "pronto" && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/5 bg-[#07060D]/85 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-2xl">
            <div className="mx-auto flex max-w-[560px] gap-2.5">
              {idx > 0 && (
                <button type="button" onClick={back} className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/[0.06] ring-1 ring-white/10 hover:bg-white/10" aria-label="Voltar">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                disabled={sending || (step === "revisao" && !a.consent)}
                onClick={step === "revisao" ? submit : next}
                className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-300 text-[16px] font-semibold text-zinc-950 shadow-[0_14px_44px_-14px_rgba(190,242,100,0.8)] transition hover:bg-lime-200 active:scale-[0.98] disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : step === "revisao" ? "Enviar anamnese" : <>Continuar <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepShell({ kicker, title, text, children }: { kicker: string; title: string; text: string; children: ReactNode }) {
  return (
    <section>
      <p className="text-[11px] font-bold tracking-[0.16em] text-lime-200/80 uppercase">{kicker}</p>
      <h1 className="mt-1.5 font-display text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
      <p className="mt-1.5 mb-6 text-[15px] text-zinc-400">{text}</p>
      {children}
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-5 rounded-3xl bg-white/[0.025] p-4 ring-1 ring-white/5">
      <p className="text-[12px] font-bold tracking-[0.12em] text-zinc-300 uppercase">{title}</p>
      {children}
    </div>
  );
}

function Question({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2.5 text-[14px] font-semibold text-zinc-200">{label}</p>
      {hint && <p className="-mt-1.5 mb-2.5 text-xs text-zinc-500">{hint}</p>}
      {children}
    </div>
  );
}

function Options({ value, onChange, options, cols = 2 }: { value: string; onChange: (v: string) => void; options: string[]; cols?: 1 | 2 | 3 | 4 }) {
  return (
    <div className={cx("grid gap-2", cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4")}>
      {options.map((op) => (
        <Chip key={op} active={value === op} onClick={() => onChange(value === op ? "" : op)} className={cx(cols >= 3 && "px-2 text-center text-[13px]")}>
          {op}
        </Chip>
      ))}
    </div>
  );
}

function ReviewRow({ title, value, onEdit }: { title: string; value: string; onEdit: () => void }) {
  return (
    <button type="button" onClick={onEdit} className="group flex items-start gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-left ring-1 ring-white/10 transition hover:ring-white/20">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-100">{value || "—"}</p>
      </div>
      <Pencil className="mt-1 h-4 w-4 shrink-0 text-zinc-500 group-hover:text-white" />
    </button>
  );
}

function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p className="mt-2 text-sm text-rose-300">{children}</p>;
}

import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Check, ChevronRight, ClipboardList, Hammer, Instagram, Loader2, MapPin, MessageCircle, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { cx } from "@/components/ui";
import { SERVICES, type ServiceDef, type ServiceId } from "@/lib/services";
import { whatsappUrl } from "@/lib/format";
import { Chip, Logo, PublicBackdrop, PublicInput, maskPhone, phoneValid, submitPublicLead, trackConversion, usePublicCompany } from "@/components/public/shared";
import { TrackingScripts } from "@/components/capture/tracking";

/** Pergunta rápida específica de cada serviço (1 toque) — qualifica o lead sem cansar. */
const QUICK: Record<ServiceId, { key: string; question: string; options: string[]; multi?: boolean }[]> = {
  solar: [
    { key: "conta", question: "Quanto vem sua conta de luz por mês?", options: ["Até R$ 300", "R$ 300 a 600", "R$ 600 a 1.000", "R$ 1.000 a 2.000", "Acima de R$ 2.000"] },
    { key: "imovel", question: "Onde seria a instalação?", options: ["Casa", "Empresa / comércio", "Condomínio", "Área rural"] },
  ],
  save: [
    { key: "veiculo", question: "Você já tem carro elétrico?", options: ["Sim, já tenho", "Vou comprar em breve", "Ainda pesquisando"] },
    { key: "local_carregador", question: "Onde quer instalar o carregador?", options: ["Casa", "Condomínio", "Empresa"] },
  ],
  eletroposto: [
    { key: "negocio", question: "Qual é o seu negócio?", options: ["Posto de combustível", "Shopping / centro comercial", "Hotel / pousada", "Restaurante", "Estacionamento", "Outro"] },
    { key: "vagas", question: "Que tipo de recarga você imagina?", options: ["AC (até 22 kW)", "DC rápida (30 kW+)", "Ainda não sei"] },
  ],
  manutencao: [
    { key: "potencia_usina", question: "Qual o tamanho da sua usina?", options: ["Até 5 kWp", "5 a 15 kWp", "15 a 50 kWp", "Acima de 50 kWp", "Não sei"] },
    { key: "problema", question: "O que está acontecendo?", options: ["Quero limpeza", "A geração caiu", "Inversor com erro", "Inspeção preventiva"] },
  ],
  projeto: [
    { key: "perfil", question: "Para quem é o projeto?", options: ["Sou integrador / instalador", "Para meu imóvel", "Para minha empresa"] },
    { key: "potencia_usina", question: "Potência aproximada", options: ["Até 10 kWp", "10 a 75 kWp (micro)", "75 kWp a 5 MW (mini)", "Não sei"] },
  ],
  gestao: [
    { key: "gestao_servicos", question: "Do que você precisa?", options: ["Troca de titularidade", "Rateio de créditos", "Auditoria de fatura", "Gestão de várias contas"], multi: true },
    { key: "uc_count", question: "Quantas contas de luz (UCs)?", options: ["1", "2 a 5", "6 a 20", "Mais de 20"] },
  ],
};

const TRUST = [
  { icon: Hammer, title: "Engenharia própria", text: "Projeto, ART e instalação com equipe da casa" },
  { icon: BadgeCheck, title: "Homologação Equatorial", text: "Cuidamos de toda a papelada com a concessionária" },
  { icon: ShieldCheck, title: "Garantia de verdade", text: "Equipamentos de primeira linha e pós-venda ativo" },
];

const billValue: Record<string, number> = { "Até R$ 300": 250, "R$ 300 a 600": 450, "R$ 600 a 1.000": 800, "R$ 1.000 a 2.000": 1500, "Acima de R$ 2.000": 2500 };

type Step = "home" | "quick" | "contact" | "done";

export default function BioLanding() {
  const company = usePublicCompany();
  const [params] = useSearchParams();
  const [step, setStep] = useState<Step>("home");
  const [service, setService] = useState<ServiceDef | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [form, setForm] = useState({ name: "", phone: "", city: "Maceió", website: "" });
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const topRef = useRef<HTMLDivElement>(null);

  const go = (s: Step) => {
    setStep(s);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const pick = (s: ServiceDef) => {
    setService(s);
    setAnswers({});
    go("quick");
  };

  const questions = service ? QUICK[service.id] : [];
  const quickDone = questions.every((q) => (Array.isArray(answers[q.key]) ? (answers[q.key] as string[]).length > 0 : !!answers[q.key]));
  const nameError = touched && form.name.trim().length < 2 ? "Conte seu nome" : "";
  const phoneError = touched && !phoneValid(form.phone) ? "WhatsApp com DDD, ex.: (82) 99999-9999" : "";
  const wa = company.whatsapp || "";

  const summary = useMemo(
    () =>
      service
        ? `${service.label} — ${questions
            .map((q) => `${q.question} ${Array.isArray(answers[q.key]) ? (answers[q.key] as string[]).join(", ") : answers[q.key] ?? "—"}`)
            .join(" | ")}`
        : "",
    [service, questions, answers],
  );

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!service || form.name.trim().length < 2 || !phoneValid(form.phone)) return;
    setSending(true);
    setError("");
    const ok = await submitPublicLead({
      name: form.name.trim(),
      phone: form.phone,
      city: form.city,
      services: [service.id],
      source: params.get("src") || "Bio Instagram",
      temperature: "morno",
      avg_bill: typeof answers.conta === "string" ? billValue[answers.conta] ?? null : null,
      summary,
      answers: { ...answers, servico: service.label },
      owner: params.get("v"),
      website: form.website,
    });
    setSending(false);
    if (!ok) return setError("Não conseguimos enviar agora. Tente de novo ou chame no WhatsApp.");
    trackConversion(service.id);
    go("done");
  }

  const waMessage = `Olá! Me chamo ${form.name.split(" ")[0] || ""} e tenho interesse em ${service?.label.toLowerCase() ?? "seus serviços"}. Acabei de preencher o formulário pelo Instagram.`;

  return (
    <div translate="no" className="notranslate relative min-h-dvh font-sans text-white antialiased">
      <TrackingScripts metaPixelId={company.metaPixelId ?? undefined} gaId={company.gaId ?? undefined} />
      <PublicBackdrop />
      <div ref={topRef} className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-10">
        {/* Topo */}
        <header className="flex items-center justify-between py-2">
          {step === "home" ? (
            <Logo src={company.logo_url} className="h-14 w-auto" />
          ) : (
            <button onClick={() => go(step === "contact" ? "quick" : "home")} className="flex h-10 items-center gap-1.5 rounded-full bg-white/5 pr-4 pl-3 text-sm font-semibold text-zinc-300 ring-1 ring-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          )}
          {company.instagram && (
            <a
              href={`https://instagram.com/${company.instagram.replace(/^@/, "").replace(/.*instagram\.com\//, "")}`}
              target="_blank"
              rel="noreferrer"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/5 text-zinc-300 ring-1 ring-white/10 hover:text-white"
              aria-label="Instagram"
            >
              <Instagram className="h-[18px] w-[18px]" />
            </a>
          )}
        </header>

        {step === "home" && (
          <main className="animate-fade-up mt-4">
            {/* Hero */}
            <section className="relative overflow-hidden rounded-[28px] ring-1 ring-white/10">
              <img src="/projetos-entregues.jpg" alt="Usina solar instalada pela Quark Energia" className="h-56 w-full object-cover" fetchPriority="high" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#07060D] via-[#07060D]/60 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5">
                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-lime-300/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-lime-200 ring-1 ring-lime-300/30 backdrop-blur">
                  <MapPin className="h-3 w-3" /> {company.city || "Maceió e todo Alagoas"}
                </span>
                <h1 className="font-display text-[28px] leading-[1.1] font-bold tracking-tight">
                  Energia inteligente,{" "}
                  <span className="bg-gradient-to-r from-[#F3EA3B] via-[#BEF264] to-[#6CC690] bg-clip-text text-transparent">do projeto à conta zerada.</span>
                </h1>
              </div>
            </section>

            <p className="mt-6 mb-3 px-1 text-[13px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">Como podemos te ajudar?</p>
            <div className="grid gap-2.5">
              {SERVICES.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => pick(s)}
                  style={{ animationDelay: `${i * 50}ms` }}
                  className="animate-fade-up group relative flex items-center gap-4 overflow-hidden rounded-[22px] bg-white/[0.04] p-3.5 pr-4 text-left ring-1 ring-white/10 backdrop-blur-xl transition hover:bg-white/[0.07] hover:ring-white/20 active:scale-[0.985]"
                >
                  <span className="absolute inset-y-0 left-0 w-24 opacity-20 blur-2xl transition group-hover:opacity-40" style={{ background: s.gradient }} />
                  <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: s.gradient }}>
                    <s.icon className="h-[22px] w-[22px]" />
                  </span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block font-display text-[16px] font-semibold tracking-tight">{s.label}</span>
                    <span className="block text-[13px] leading-snug text-zinc-400">{s.pitch}</span>
                  </span>
                  <ChevronRight className="relative h-5 w-5 shrink-0 text-zinc-500 transition group-hover:translate-x-0.5 group-hover:text-white" />
                </button>
              ))}
            </div>

            <a href="/anamnese" className="mt-3 flex items-center gap-3 rounded-[22px] bg-gradient-to-r from-lime-300/15 to-emerald-400/10 p-4 ring-1 ring-lime-300/25 transition hover:ring-lime-300/50">
              <ClipboardList className="h-5 w-5 shrink-0 text-lime-200" />
              <span className="flex-1">
                <span className="block text-sm font-semibold">Quer um diagnóstico completo?</span>
                <span className="block text-xs text-zinc-400">Responda a anamnese (2 min) e receba a proposta mais precisa</span>
              </span>
              <ArrowRight className="h-4 w-4 text-lime-200" />
            </a>

            <section className="mt-8 grid gap-2.5">
              {TRUST.map((t) => (
                <div key={t.title} className="flex items-center gap-3 rounded-2xl bg-white/[0.03] px-4 py-3 ring-1 ring-white/5">
                  <t.icon className="h-5 w-5 shrink-0 text-lime-200" />
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-zinc-400">{t.text}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-8">
              <p className="mb-3 px-1 text-[13px] font-semibold tracking-[0.12em] text-zinc-400 uppercase">Obras entregues</p>
              <div className="grid grid-cols-2 gap-2.5">
                <img src="/instalacao-premium.jpg" alt="Instalação solar comercial" loading="lazy" className="col-span-2 h-44 w-full rounded-2xl object-cover ring-1 ring-white/10" />
                <img src="/dji_fly_20240426_122838_238_1714145396541_photo_optimized.jpg" alt="Vista aérea de usina solar" loading="lazy" className="h-32 w-full rounded-2xl object-cover ring-1 ring-white/10" />
                <img src="/projetos-entregues.jpg" alt="Projeto solar entregue" loading="lazy" className="h-32 w-full rounded-2xl object-cover ring-1 ring-white/10" />
              </div>
            </section>

            {wa && (
              <a
                href={whatsappUrl(wa, "Olá! Vim pelo Instagram e quero falar com um especialista da Quark.")}
                target="_blank"
                rel="noreferrer"
                className="mt-8 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-semibold text-[#062b14] shadow-[0_12px_40px_-12px_rgba(37,211,102,0.7)] transition active:scale-[0.98]"
              >
                <MessageCircle className="h-5 w-5" /> Falar agora no WhatsApp
              </a>
            )}
            <Footer name={company.company_name} />
          </main>
        )}

        {step === "quick" && service && (
          <main className="animate-fade-up mt-6">
            <ServiceHeader service={service} step={1} />
            <div className="mt-6 grid gap-7">
              {questions.map((q) => (
                <fieldset key={q.key}>
                  <legend className="mb-3 font-display text-lg font-semibold tracking-tight">{q.question}</legend>
                  {q.multi && <p className="-mt-2 mb-3 text-xs text-zinc-400">Pode marcar mais de uma</p>}
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((op) => {
                      const cur = answers[q.key];
                      const on = q.multi ? Array.isArray(cur) && cur.includes(op) : cur === op;
                      return (
                        <Chip
                          key={op}
                          active={on}
                          className={op.length > 18 ? "col-span-2" : undefined}
                          onClick={() =>
                            setAnswers((a) => {
                              if (!q.multi) return { ...a, [q.key]: op };
                              const list = Array.isArray(a[q.key]) ? (a[q.key] as string[]) : [];
                              return { ...a, [q.key]: list.includes(op) ? list.filter((x) => x !== op) : [...list, op] };
                            })
                          }
                        >
                          {op}
                        </Chip>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            <PrimaryButton disabled={!quickDone} onClick={() => go("contact")} className="mt-8">
              Continuar <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </main>
        )}

        {step === "contact" && service && (
          <main className="animate-fade-up mt-6">
            <ServiceHeader service={service} step={2} />
            <h2 className="mt-6 font-display text-2xl font-bold tracking-tight">Pra quem enviamos o atendimento?</h2>
            <p className="mt-1 text-sm text-zinc-400">Um especialista te chama no WhatsApp — sem spam, prometido.</p>
            <form onSubmit={send} className="mt-6 grid gap-4" noValidate>
              <PublicInput label="Seu nome" autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Como podemos te chamar?" error={nameError} />
              <PublicInput label="WhatsApp" type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value) })} placeholder="(82) 99999-9999" error={phoneError} />
              <PublicInput label="Cidade" autoComplete="address-level2" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
              {error && <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-rose-500/30">{error}</p>}
              <PrimaryButton type="submit" disabled={sending} className="mt-2">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Quero meu atendimento <Sparkles className="h-4 w-4" /></>}
              </PrimaryButton>
              <p className="text-center text-[11px] leading-relaxed text-zinc-500">Ao enviar, você concorda em ser contatado pela Quark Energia. Seus dados não são compartilhados (LGPD).</p>
            </form>
          </main>
        )}

        {step === "done" && service && (
          <main className="animate-fade-up mt-10 flex flex-1 flex-col items-center text-center">
            <div className="relative grid h-20 w-20 place-items-center rounded-full bg-lime-300 text-zinc-950 shadow-[0_0_60px_rgba(190,242,100,0.55)]">
              <Check className="h-10 w-10" strokeWidth={3} />
            </div>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight">Recebemos, {form.name.split(" ")[0]}!</h2>
            <p className="mt-2 max-w-xs text-zinc-400">Um especialista em {service.label.toLowerCase()} vai te chamar no WhatsApp em breve.</p>
            <div className="mt-8 grid w-full gap-2.5">
              {wa && (
                <a href={whatsappUrl(wa, waMessage)} target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-semibold text-[#062b14] shadow-[0_12px_40px_-12px_rgba(37,211,102,0.7)]">
                  <MessageCircle className="h-5 w-5" /> Adiantar pelo WhatsApp
                </a>
              )}
              <a href={`/anamnese?nome=${encodeURIComponent(form.name)}&tel=${encodeURIComponent(form.phone)}&s=${service.id}`} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-white/[0.06] font-semibold ring-1 ring-white/10 hover:bg-white/10">
                <ClipboardList className="h-5 w-5" /> Responder anamnese completa
              </a>
            </div>
            <p className="mt-4 text-xs text-zinc-500">A anamnese leva 2 minutos e deixa sua proposta muito mais precisa.</p>
            <Footer name={company.company_name} />
          </main>
        )}
      </div>
    </div>
  );
}

function ServiceHeader({ service, step }: { service: ServiceDef; step: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg" style={{ background: service.gradient }}>
        <service.icon className="h-[22px] w-[22px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-500 uppercase">Passo {step} de 2</p>
        <p className="truncate font-display text-lg font-semibold">{service.label}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2].map((i) => (
          <span key={i} className={cx("h-1.5 rounded-full transition-all", i <= step ? "w-6 bg-lime-300" : "w-3 bg-white/15")} />
        ))}
      </div>
    </div>
  );
}

function PrimaryButton({ className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={cx(
        "flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 text-[16px] font-semibold text-zinc-950 shadow-[0_14px_44px_-14px_rgba(190,242,100,0.8)] transition hover:bg-lime-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Footer({ name }: { name?: string | null }) {
  return (
    <footer className="mt-10 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600">
      <Zap className="h-3 w-3" /> {name || "Quark Energia"} · Energia solar e mobilidade elétrica
    </footer>
  );
}

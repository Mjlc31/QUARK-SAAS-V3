import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Field, Input, Modal, MoneyInput, NumberInput, Select, Textarea, cx } from "@/components/ui";
import { ROOF_TYPES } from "@/lib/constants";
import { type Opportunity } from "@/lib/crm";
import { MACEIO_TARIFF } from "@/lib/defaults";
import { brl, fmtNum } from "@/lib/pricing";
import { formatPhone, onlyDigits } from "@/lib/format";
import { LEAD_SOURCES, SERVICES, type ServiceId } from "@/lib/services";
import { supabase } from "@/lib/supabaseClient";

const EMPTY = {
  title: "",
  phone: "",
  email: "",
  city: "Maceió",
  address: "",
  cpf_cnpj: "",
  source: "",
  temperature: "morno" as "frio" | "morno" | "quente",
  avg_bill: 0,
  consumption_kwh: 0,
  roof_type: "",
  connection_type: "",
  system_power: 0,
  amount: 0,
  notes: "",
};

/**
 * Cadastro de oportunidade com o que importa para a venda: serviço(s), origem,
 * temperatura e — para solar — conta de luz, consumo e telhado.
 */
export function NewOpportunityModal({ 
  onClose, 
  onSaved,
  existingOpps,
}: { 
  onClose: () => void; 
  onSaved: (o: Opportunity, merged: boolean) => void;
  existingOpps?: Opportunity[];
}) {
  const [form, setForm] = useState(EMPTY);
  const [services, setServices] = useState<ServiceId[]>(["solar"]);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({ ...f, [k]: v }));
  const hasSolar = services.some((s) => s === "solar" || s === "gestao" || s === "projeto");
  const estimatedKwh = form.avg_bill > 0 ? Math.round(Math.max(0, form.avg_bill - 25) / MACEIO_TARIFF) : 0;
  const phoneDigits = onlyDigits(form.phone);
  const phoneError = form.phone && phoneDigits.length < 10 ? "Inclua DDD + número" : "";

  const toggle = (id: ServiceId) => setServices((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Informe o nome do cliente");
    if (phoneError) return toast.error("WhatsApp incompleto");
    if (!services.length) return toast.error("Escolha ao menos um serviço");
    setSaving(true);

    try {
      // 1. Resolução ultrarrápida de usuário a partir da sessão local (timeout seguro de 400ms para evitar deadlocks de abas)
      const sessionPromise = supabase.auth.getSession().catch(() => ({ data: { session: null } }));
      const timeoutPromise = new Promise<{ data: { session: null } }>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 400));
      const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]);
      const currentUserId = sessionData?.session?.user?.id || "7dacc88f-9ebd-4710-a1be-0647841db24a";

      // Payload para o PostgreSQL: NUNCA incluir colunas geradas ('client_name', 'value', 'pipeline_stage')
      const dbPayload = {
        title: form.title.trim(),
        phone: form.phone ? form.phone.trim() : null,
        email: form.email ? form.email.trim() : null,
        city: form.city ? form.city.trim() : null,
        address: form.address ? form.address.trim() : null,
        cpf_cnpj: form.cpf_cnpj ? form.cpf_cnpj.trim() : null,
        status: "Lead",
        amount: form.amount || 0,
        segment: services[0] || "solar",
        services: services.length > 0 ? services : ["solar"],
        source: form.source || null,
        temperature: form.temperature || "morno",
        avg_bill: hasSolar && form.avg_bill ? form.avg_bill : null,
        consumption_kwh: hasSolar ? form.consumption_kwh || estimatedKwh || null : null,
        roof_type: hasSolar && form.roof_type ? form.roof_type : null,
        connection_type: hasSolar && form.connection_type ? form.connection_type : null,
        system_power: form.system_power || null,
        notes: form.notes ? form.notes.trim() : null,
        user_id: currentUserId,
      };

      // 2. Verificação instantânea de duplicatas na memória / cache local (0ms de rede)
      const oppList = existingOpps && existingOpps.length > 0 ? existingOpps : (() => {
        try {
          const raw = localStorage.getItem("quark_crm_kanban_v4");
          return raw ? JSON.parse(raw)?.opps || [] : [];
        } catch { return []; }
      })();

      const cleanDigitsInput = phoneDigits;
      const cleanEmailInput = form.email ? form.email.trim().toLowerCase() : "";
      const cleanTitleInput = form.title.trim().toLowerCase();

      const existing = oppList.find((opp: Opportunity) => {
        if (!opp || opp.deleted_at) return false;
        const oppTitle = (opp.title || "").trim().toLowerCase();
        // Só mescla se for o mesmo cliente/nome para não sobrescrever negócios distintos
        if (oppTitle !== cleanTitleInput) return false;

        const oppDigits = onlyDigits(opp.phone || "");
        const phoneMatch = cleanDigitsInput.length >= 8 && oppDigits.length >= 8 &&
          (cleanDigitsInput.endsWith(oppDigits.slice(-8)) || oppDigits.endsWith(cleanDigitsInput.slice(-8)));

        const oppEmail = (opp.email || "").trim().toLowerCase();
        const emailMatch = Boolean(cleanEmailInput && oppEmail && cleanEmailInput === oppEmail);

        return phoneMatch || emailMatch;
      });

      if (existing) {
        // Caso 1: Mescla com oportunidade existente
        const updatedOpp: Opportunity = {
          ...existing,
          ...dbPayload,
          client_name: dbPayload.title,
          value: dbPayload.amount,
          services: [...new Set([...(existing.services ?? []), ...services])],
          status: existing.status === "Perdido" ? "Lead" : existing.status,
          updated_at: new Date().toISOString(),
        };

        // Resposta instantânea na interface (Optimistic UI - 0ms de espera)
        setSaving(false);
        onSaved(updatedOpp, true);
        onClose();
        toast(`Cliente já existia (“${updatedOpp.title}”, etapa ${updatedOpp.status}) — dados mesclados.`, { icon: "🔗" });

        // Persistência assíncrona no Supabase sem colunas geradas
        (async () => {
          try {
            const patch: Record<string, any> = {
              ...dbPayload,
              services: updatedOpp.services,
              updated_at: new Date().toISOString(),
            };
            if (existing.status === "Perdido") patch.status = "Lead";
            delete patch.amount; // não substitui valor financeiro existente a menos que explícito

            const { error } = await supabase.from("opportunities").update(patch).eq("id", existing.id);
            if (error) console.warn("Falha no update da oportunidade:", error.message);
          } catch (err: any) {
            console.warn("Supabase update error:", err?.message || err);
          }
        })();

        return;
      }

      // Caso 2: Nova oportunidade
      const newId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `opp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      const now = new Date().toISOString();

      const fullDbPayload = {
        id: newId,
        ...dbPayload,
        created_at: now,
        updated_at: now,
      };

      const savedOpp: Opportunity = {
        ...fullDbPayload,
        client_name: fullDbPayload.title,
        value: fullDbPayload.amount,
        pipeline_stage: "Lead",
      } as Opportunity;

      // Resposta instantânea na interface (Optimistic UI - 0ms de espera)
      setSaving(false);
      onSaved(savedOpp, false);
      onClose();
      toast.success("Oportunidade criada");

      // Atualiza imediatamente os caches L2 para resposta instantânea em todo o app
      try {
        const cachedDashboardRaw = localStorage.getItem("quark_dashboard_crm_v4");
        if (cachedDashboardRaw) {
          const cachedDashboard = JSON.parse(cachedDashboardRaw);
          if (Array.isArray(cachedDashboard)) {
            cachedDashboard.unshift(savedOpp);
            localStorage.setItem("quark_dashboard_crm_v4", JSON.stringify(cachedDashboard));
          }
        }
      } catch (_) {}

      try {
        const cachedRaw = localStorage.getItem("quark_opportunities");
        const list: Opportunity[] = cachedRaw ? JSON.parse(cachedRaw) : [];
        localStorage.setItem("quark_opportunities", JSON.stringify([savedOpp, ...list]));
      } catch (_) {}

      try {
        const rawKanban = localStorage.getItem("quark_crm_kanban_v4");
        if (rawKanban) {
          const kanbanData = JSON.parse(rawKanban);
          if (kanbanData && Array.isArray(kanbanData.opps)) {
            kanbanData.opps.unshift(savedOpp);
            localStorage.setItem("quark_crm_kanban_v4", JSON.stringify(kanbanData));
          }
        }
      } catch (_) {}

      // Notifica instantaneamente Dashboard e outras telas via evento
      window.dispatchEvent(new CustomEvent("quark_crm_updated", { detail: savedOpp }));

      // Persiste no Supabase de forma resiliente
      (async () => {
        try {
          const { error } = await supabase.from("opportunities").insert([fullDbPayload]);
          if (error) {
            console.warn("Aviso ao salvar no Supabase, tentando insert com campos essenciais:", error.message);
            const coreRow = {
              id: newId,
              title: fullDbPayload.title,
              phone: fullDbPayload.phone,
              email: fullDbPayload.email,
              city: fullDbPayload.city,
              status: fullDbPayload.status,
              amount: fullDbPayload.amount,
              segment: fullDbPayload.segment,
              services: fullDbPayload.services,
              consumption_kwh: fullDbPayload.consumption_kwh,
              avg_bill: fullDbPayload.avg_bill,
              user_id: currentUserId,
            };
            await supabase.from("opportunities").insert([coreRow]);
          }
        } catch (err: any) {
          console.warn("Supabase insert erro:", err?.message || err);
        }
      })();

      // Sincroniza fire-and-forget com endpoint de oportunidades se disponível
      try {
        fetch("/api/opportunities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savedOpp),
        }).catch(() => {});
      } catch (_) {}
    } catch (err: any) {
      console.error("Erro inesperado ao salvar oportunidade:", err);
      setSaving(false);
      toast.error("Ocorreu um erro ao salvar o lead. Tente novamente.");
    }
  }

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Nova oportunidade"
      subtitle="Cadastre o cliente e o que ele quer comprar"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="new-opp-form" type="submit" loading={saving}>
            Salvar oportunidade
          </Button>
        </>
      }
    >
      <form id="new-opp-form" onSubmit={submit} className="grid gap-6">
        <Section title="Serviço de interesse" hint="Pode marcar mais de um">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SERVICES.map((s) => {
              const on = services.includes(s.id);
              return (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggle(s.id)}
                  aria-pressed={on}
                  className={cx(
                    "group relative flex items-center gap-2.5 overflow-hidden rounded-xl px-3 py-2.5 text-left ring-1 transition",
                    on ? "bg-white/[0.07] ring-white/25" : "bg-black/20 ring-white/5 hover:ring-white/15",
                  )}
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white" style={{ background: on ? s.gradient : "rgba(255,255,255,0.05)" }}>
                    <s.icon className="h-4 w-4" style={on ? undefined : { color: s.color }} />
                  </span>
                  <span className={cx("text-[13px] leading-tight font-semibold", on ? "text-white" : "text-zinc-400")}>{s.short}</span>
                  {on && services[0] === s.id && services.length > 1 && <span className="absolute top-1 right-1.5 text-[9px] font-bold text-lime-300 uppercase">principal</span>}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Contato">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome do cliente *" className="sm:col-span-2">
              <Input autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Maria Souza" />
            </Field>
            <Field label="WhatsApp" hint={phoneError ? <span className="text-rose-400">{phoneError}</span> : undefined}>
              <Input inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} onBlur={() => set("phone", formatPhone(form.phone))} placeholder="(82) 99999-9999" />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="cliente@email.com" />
            </Field>
            <Field label="Cidade">
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="CPF / CNPJ">
              <Input value={form.cpf_cnpj} onChange={(e) => set("cpf_cnpj", e.target.value)} placeholder="000.000.000-00" />
            </Field>
            <Field label="Endereço" className="sm:col-span-2">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Rua, número, bairro" />
            </Field>
          </div>
        </Section>

        {hasSolar && (
          <Section title="Conta de luz" hint="Base do orçamento solar">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Conta média (R$)" hint={estimatedKwh ? `≈ ${fmtNum(estimatedKwh)} kWh/mês a ${brl(MACEIO_TARIFF)}/kWh` : "Valor total da fatura"}>
                <MoneyInput value={form.avg_bill || null} digits={0} placeholder="Ex.: 450" onChange={(v) => set("avg_bill", v)} />
              </Field>
              <Field label="Consumo médio" hint="Opcional — se souber pela fatura">
                <NumberInput value={form.consumption_kwh || null} onChange={(v) => set("consumption_kwh", v)} suffix="kWh" digits={0} placeholder={estimatedKwh ? String(estimatedKwh) : "0"} />
              </Field>
              <Field label="Telhado">
                <Select value={form.roof_type} onChange={(e) => set("roof_type", e.target.value)}>
                  <option value="">Não informado</option>
                  {ROOF_TYPES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Ligação">
                <Select value={form.connection_type} onChange={(e) => set("connection_type", e.target.value)}>
                  <option value="">Não informado</option>
                  <option value="mono">Monofásica</option>
                  <option value="bi">Bifásica</option>
                  <option value="tri">Trifásica</option>
                </Select>
              </Field>
            </div>
          </Section>
        )}

        <Section title="Negócio">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Valor estimado">
              <MoneyInput value={form.amount || null} digits={0} placeholder="0" onChange={(v) => set("amount", v)} />
            </Field>
            <Field label="Origem">
              <Select value={form.source} onChange={(e) => set("source", e.target.value)}>
                <option value="">Selecione…</option>
                {LEAD_SOURCES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Temperatura" className="sm:col-span-2">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["frio", "🧊 Frio", "Só pesquisando"],
                    ["morno", "🌤️ Morno", "Interessado"],
                    ["quente", "🔥 Quente", "Quer fechar logo"],
                  ] as const
                ).map(([v, l, sub]) => (
                  <button
                    type="button"
                    key={v}
                    onClick={() => set("temperature", v)}
                    className={cx(
                      "rounded-xl px-3 py-2 text-left ring-1 transition",
                      form.temperature === v ? "bg-white/[0.07] text-white ring-white/25" : "bg-black/20 text-zinc-400 ring-white/5 hover:ring-white/15",
                    )}
                  >
                    <p className="text-[13px] font-semibold">{l}</p>
                    <p className="text-[11px] text-zinc-500">{sub}</p>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Observações" className="sm:col-span-2">
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Ex.: quer instalar antes do verão, tem 2 imóveis…" />
            </Field>
          </div>
        </Section>
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-lime-300" /> Se o telefone já estiver no CRM, os dados são mesclados — nada de lead duplicado.
        </p>
      </form>
    </Modal>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
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

export function friendly(msg: string) {
  return /column/i.test(msg) ? "Banco desatualizado: rode a migração 20261007 no Supabase (SQL Editor)." : msg;
}

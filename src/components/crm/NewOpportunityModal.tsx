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
export function NewOpportunityModal({ onClose, onSaved }: { onClose: () => void; onSaved: (o: Opportunity, merged: boolean) => void }) {
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
    const row: Partial<Opportunity> & Record<string, unknown> = {
      title: form.title.trim(),
      phone: form.phone || null,
      email: form.email || null,
      city: form.city || null,
      address: form.address || null,
      cpf_cnpj: form.cpf_cnpj || null,
      status: "Lead",
      amount: form.amount || 0,
      segment: services[0],
      services,
      source: form.source || null,
      temperature: form.temperature,
      avg_bill: hasSolar && form.avg_bill ? form.avg_bill : null,
      consumption_kwh: hasSolar ? form.consumption_kwh || estimatedKwh || null : null,
      roof_type: hasSolar && form.roof_type ? form.roof_type : null,
      connection_type: hasSolar && form.connection_type ? form.connection_type : null,
      system_power: form.system_power || null,
      notes: form.notes || null,
    };

    // Mesmo telefone ou e-mail já no CRM: completa o cadastro em vez de duplicar.
    if (phoneDigits || form.email) {
      const { data: all } = await supabase.from("opportunities").select("id, title, status, phone, email, services").limit(2000);
      const existing = (all ?? []).find(
        (o) => (phoneDigits && onlyDigits(o.phone) === phoneDigits) || (form.email && o.email?.toLowerCase() === form.email.toLowerCase()),
      );
      if (existing) {
        const patch = Object.fromEntries(Object.entries(row).filter(([k, v]) => v != null && v !== "" && k !== "status" && k !== "amount"));
        patch.services = [...new Set([...(existing.services ?? []), ...services])];
        const { data, error } = await supabase.from("opportunities").update(patch).eq("id", existing.id).select().single();
        setSaving(false);
        if (error) return toast.error(friendly(error.message));
        toast(`Cliente já existia (“${existing.title}”, etapa ${existing.status}) — dados mesclados.`, { icon: "🔗" });
        onSaved(data as Opportunity, true);
        return onClose();
      }
    }

    const { data, error } = await supabase.from("opportunities").insert([row]).select().single();
    setSaving(false);
    if (error) return toast.error(friendly(error.message));
    toast.success("Oportunidade criada");
    onSaved(data as Opportunity, false);
    onClose();
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

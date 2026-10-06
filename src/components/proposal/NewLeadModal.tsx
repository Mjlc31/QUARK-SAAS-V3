import { useState } from "react";
import { UserPlus } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Field, Input, Modal, MoneyInput, cx } from "@/components/ui";
import { formatPhone, onlyDigits } from "@/lib/format";
import { SERVICES, type ServiceId } from "@/lib/services";
import { supabase } from "@/lib/supabase/client";

/** Cadastro rápido de cliente no CRM sem sair do orçamento. */
export function NewLeadModal({
  onClose,
  onCreated,
  service = "solar",
}: {
  onClose: () => void;
  onCreated: (id: string) => void;
  service?: ServiceId;
}) {
  const [form, setForm] = useState({ title: "", phone: "", city: "Maceió", avg_bill: 0 });
  const [segment, setSegment] = useState<ServiceId>(service);
  const [loading, setLoading] = useState(false);
  const phoneOk = !form.phone || onlyDigits(form.phone).length >= 10;

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) return toast.error("Informe o nome do cliente");
    if (!phoneOk) return toast.error("WhatsApp incompleto — use DDD + número");
    setLoading(true);
    const base = { title: form.title.trim(), phone: form.phone, city: form.city, status: "Lead", amount: 0 };
    const full = { ...base, segment, services: [segment], avg_bill: form.avg_bill || null, source: "Orçamento" };
    let res = await supabase().from("opportunities").insert([full]).select("id").single();
    // Banco sem a migração de serviços: cadastra só o básico para não travar o orçamento.
    if (res.error && /column/i.test(res.error.message)) res = await supabase().from("opportunities").insert([base]).select("id").single();
    setLoading(false);
    if (res.error || !res.data) return toast.error(res.error?.message ?? "Erro ao cadastrar cliente");
    toast.success("Cliente cadastrado no CRM");
    onCreated(res.data.id);
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-lime-300" /> Novo cliente
        </span>
      }
      subtitle="Já entra no CRM, na etapa Lead"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="new-lead-form" type="submit" loading={loading}>
            Cadastrar e usar no orçamento
          </Button>
        </>
      }
    >
      <form id="new-lead-form" onSubmit={handleSave} className="grid gap-4">
        <Field label="Nome do cliente *">
          <Input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex.: João da Silva" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="WhatsApp" hint={!phoneOk ? <span className="text-rose-400">Inclua DDD + número</span> : undefined}>
            <Input
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              onBlur={() => setForm((f) => ({ ...f, phone: formatPhone(f.phone) }))}
              placeholder="(82) 99999-9999"
            />
          </Field>
          <Field label="Cidade">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Maceió" />
          </Field>
        </div>
        <Field label="Serviço">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => setSegment(s.id)}
                className={cx(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold ring-1 transition",
                  segment === s.id ? "bg-white/10 text-white ring-white/30" : "bg-black/20 text-zinc-400 ring-white/5 hover:text-zinc-200",
                )}
              >
                <s.icon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                <span className="truncate">{s.short}</span>
              </button>
            ))}
          </div>
        </Field>
        {(segment === "solar" || segment === "gestao" || segment === "projeto") && (
          <Field label="Conta de luz média" hint="Usada para calcular o consumo no orçamento">
            <MoneyInput value={form.avg_bill || null} digits={0} placeholder="Ex.: 450" onChange={(v) => setForm({ ...form, avg_bill: v })} />
          </Field>
        )}
      </form>
    </Modal>
  );
}

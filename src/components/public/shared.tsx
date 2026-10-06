import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabaseClient";
import { cx } from "@/components/ui";

export interface PublicCompanyInfo {
  company_name?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  logo_url?: string | null;
  city?: string | null;
  about?: string | null;
  warranty_modules_performance_years?: number | null;
  metaPixelId?: string | null;
  gaId?: string | null;
}

/** Dados públicos da empresa (sem custos nem configurações internas). */
export function usePublicCompany() {
  const [company, setCompany] = useState<PublicCompanyInfo>({});
  useEffect(() => {
    supabase.rpc("get_public_company").then(
      ({ data }) => data && setCompany(data as PublicCompanyInfo),
      () => {},
    );
  }, []);
  return company;
}

export interface LeadPayload {
  name: string;
  phone: string;
  email?: string;
  city?: string;
  address?: string;
  services: string[];
  source: string;
  temperature?: "frio" | "morno" | "quente";
  avg_bill?: number | null;
  consumption_kwh?: number | null;
  roof_type?: string;
  connection_type?: string;
  notes?: string;
  summary?: string;
  answers?: Record<string, unknown>;
  owner?: string | null;
  website?: string;
}

/**
 * Envia o lead direto para o CRM (`create_crm_lead`). Se o banco ainda não tiver a
 * migração nova, cai para a função antiga (`create_public_lead`) para nunca perder o contato.
 */
export async function submitPublicLead(p: LeadPayload): Promise<boolean> {
  const payload = { ...p, segment: p.services[0] ?? "solar", avg_bill: p.avg_bill ?? "", consumption_kwh: p.consumption_kwh ?? "" };
  const res = await supabase.rpc("create_crm_lead", { p: payload });
  if (!res.error) return true;
  const legacy = await supabase.rpc("create_public_lead", {
    p: { ...payload, segment: ["solar", "save", "eletroposto", "manutencao", "gestao"].includes(payload.segment) ? payload.segment : "solar", notes: [p.summary, p.notes].filter(Boolean).join(" · ") },
  });
  return !legacy.error;
}

/** Marca a conversão no Pixel da Meta e no Google Analytics, se configurados. */
export function trackConversion(service: string) {
  const w = window as unknown as { fbq?: (...a: unknown[]) => void; gtag?: (...a: unknown[]) => void };
  try {
    w.fbq?.("track", "Lead", { content_category: service });
    w.gtag?.("event", "generate_lead", { lead_type: service });
  } catch {
    // rastreamento nunca atrapalha o envio
  }
}

export function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export const phoneValid = (v: string) => v.replace(/\D/g, "").length >= 10;

/** Fundo premium das páginas públicas: noite profunda com brilhos da marca. */
export function PublicBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-[#07060D]">
      <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(163,230,53,0.16),transparent)]" />
      <div className="absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(91,52,214,0.22),transparent)]" />
      <div className="absolute -bottom-40 -left-32 h-[420px] w-[420px] rounded-full bg-[radial-gradient(closest-side,rgba(243,234,59,0.08),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
      />
    </div>
  );
}

export function Logo({ src, className }: { src?: string | null; className?: string }) {
  return <img src={src || "/LOGOQUARK.png"} alt="Quark Energia" className={cx("object-contain", className)} />;
}

export function Chip({ active, onClick, children, className }: { active: boolean; onClick: () => void; children: ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "rounded-2xl px-4 py-3 text-left text-[14px] font-semibold ring-1 transition active:scale-[0.98]",
        active ? "bg-lime-300 text-zinc-950 ring-lime-300 shadow-[0_8px_30px_-10px_rgba(190,242,100,0.7)]" : "bg-white/[0.04] text-zinc-200 ring-white/10 hover:bg-white/[0.07] hover:ring-white/20",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function PublicInput({ label, error, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-zinc-300">{label}</span>
      <input
        {...rest}
        className={cx(
          "h-12 w-full rounded-2xl bg-white/[0.05] px-4 text-[16px] text-white ring-1 transition outline-none placeholder:text-zinc-500 focus:bg-white/[0.08] focus:ring-2",
          error ? "ring-rose-400/70 focus:ring-rose-400" : "ring-white/10 focus:ring-lime-300",
        )}
      />
      {error && <span className="mt-1 block text-xs text-rose-300">{error}</span>}
    </label>
  );
}

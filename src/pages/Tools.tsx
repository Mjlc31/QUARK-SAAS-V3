import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ClipboardCheck, FileKey2, Home, Receipt, type LucideIcon } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { cx } from "@/components/ui";
import { companyOf } from "@/components/tools/common";
import { ProcuracaoTool } from "@/components/tools/Procuracao";
import { AluguelTool } from "@/components/tools/Aluguel";
import { ReciboTool } from "@/components/tools/Recibo";
import { NotaServicoTool } from "@/components/tools/NotaServico";

type ToolId = "procuracao" | "aluguel" | "recibo" | "nota";

const TOOLS: { id: ToolId; title: string; sub: string; icon: LucideIcon; color: string }[] = [
  { id: "procuracao", title: "Procuração Equatorial", sub: "Representar o cliente na distribuidora", icon: FileKey2, color: "#A78BFA" },
  { id: "aluguel", title: "Contrato p/ titularidade", sub: "Locação ou comodato do imóvel", icon: Home, color: "#38BDF8" },
  { id: "recibo", title: "Recibo", sub: "Comprovante de pagamento recebido", icon: Receipt, color: "#A3E635" },
  { id: "nota", title: "Nota de serviço", sub: "O que foi executado, itens e valores", icon: ClipboardCheck, color: "#FBBF24" },
];

export default function Tools() {
  const { settings } = useApp();
  const company = useMemo(() => companyOf(settings), [settings]);
  const [params, setParams] = useSearchParams();
  const active = (TOOLS.find((t) => t.id === params.get("t"))?.id ?? "procuracao") as ToolId;

  return (
    <div className="animate-enter">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[28px]">Ferramentas</h1>
        <p className="mt-1 text-sm text-zinc-400">Documentos prontos com a sua marca — preencha com um cliente do CRM, confira na folha e imprima ou salve em PDF.</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4" role="tablist">
        {TOOLS.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setParams({ t: t.id }, { replace: true })}
              className={cx(
                "group relative overflow-hidden rounded-2xl p-4 text-left ring-1 transition",
                on ? "bg-zinc-900 ring-white/20 shadow-[0_18px_50px_-24px_rgba(0,0,0,0.9)]" : "bg-zinc-900/40 ring-white/5 hover:bg-zinc-900/70 hover:ring-white/10",
              )}
            >
              <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition group-hover:opacity-30" style={{ background: t.color, opacity: on ? 0.35 : undefined }} />
              <span className="relative mb-3 grid h-10 w-10 place-items-center rounded-xl ring-1 ring-white/10" style={{ background: `${t.color}1f`, color: t.color }}>
                <t.icon className="h-5 w-5" />
              </span>
              <p className={cx("relative font-display text-[15px] font-semibold", on ? "text-white" : "text-zinc-200")}>{t.title}</p>
              <p className="relative mt-0.5 text-xs text-zinc-500">{t.sub}</p>
              {on && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full" style={{ background: t.color }} />}
            </button>
          );
        })}
      </div>

      {active === "procuracao" && <ProcuracaoTool key={`p-${company.name}`} company={company} />}
      {active === "aluguel" && <AluguelTool key={`a-${company.name}`} company={company} />}
      {active === "recibo" && <ReciboTool key={`r-${company.name}`} company={company} />}
      {active === "nota" && <NotaServicoTool key={`n-${company.name}`} company={company} />}
    </div>
  );
}

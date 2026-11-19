import { useParams, useSearchParams } from "react-router-dom";
import { Loader2, FileText } from "lucide-react";
import { ProposalEditor } from "@/components/proposal/editor";
import { SaveEditor } from "@/components/save/editor";
import { productOf } from "@/lib/constants";
import { Empty } from "@/components/ui";
import { must, useLive } from "@/lib/live";
import { supabase } from "@/lib/supabase/client";
import type { Proposal } from "@/lib/types";

export default function ProposalEditorPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  
  const { data, loading } = useLive(
    async () => {
      if (!id) return null;
      let p: any = null;

      // 0. Cache em memória / lista local para resposta instantânea (<1ms)
      try {
        const rawList = localStorage.getItem("quark_proposals_list");
        if (rawList) {
          const parsed = JSON.parse(rawList);
          if (Array.isArray(parsed)) {
            p = parsed.find((item: any) => item.id === id || String(item.number) === id || item.public_token === id);
          }
        }
      } catch (_) {}

      // 1. Busca ultra rápida via RPC atômico indexado (<5ms)
      try {
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 4000)
        );
        const rpcPromise = supabase().rpc("get_proposal_by_id", { p_id: id });
        const { data: rpcData, error: rpcErr } = await Promise.race([rpcPromise, timeoutPromise]);
        if (!rpcErr && rpcData && typeof rpcData === "object" && (rpcData as any).id) {
          p = rpcData;
        }
      } catch (_) {}

      // 2. Fallbacks diretos
      if (!p) {
        try {
          const direct = await supabase().from("proposals").select("*").eq("id", id).maybeSingle();
          if (direct?.data) p = direct.data;
        } catch (_) {}
      }

      if (!p) return null;
      const inputs = p.inputs || p.data?.inputs || null;
      return {
        ...p,
        inputs,
        lead: p.lead || p.data?.lead || { name: p.client_name || p.data?.clientName || 'Sem nome', city: p.city || p.data?.city, phone: p.phone }
      } as Proposal;
    },
    [id],
    ["proposals"],
    { cacheKey: `quark_proposal_edit_${id}` }
  );

  if (id) {
    if (loading && !data)
      return (
        <div className="grid h-[60vh] place-items-center text-ink-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      );
    if (!data) return <Empty icon={<FileText className="h-6 w-6" />} title="Orçamento não encontrado" />;
    if (productOf(data.inputs) === "save") return <SaveEditor key={data.id} proposal={data} />;
    return <ProposalEditor key={data.id} proposal={data} />;
  }

  // Novo orçamento
  const tipo = params.get("tipo") === "save" ? "save" : "solar";
  if (tipo === "save") return <SaveEditor key="new-save" />;
  return <ProposalEditor key="new-solar" initialLeadId={params.get("lead")} />;
}

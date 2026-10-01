import React, { useMemo } from "react";
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
      const p = must(await supabase().from("proposals").select("*").eq("id", id).maybeSingle()) as any;
      if (!p) return null;
      return {
        ...p,
        lead: p.lead || { name: p.client_name || p.data?.clientName || 'Sem nome', city: p.city || p.data?.city, phone: p.phone }
      } as Proposal;
    },
    [id],
    [],
    { fresh: true }
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

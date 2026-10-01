import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ProposalDocument, type PublicProposal } from "@/components/proposal/document";
import { SaveDocument } from "@/components/save/document";
import { productOf } from "@/lib/constants";
import { supabase } from "@/lib/supabase/client";

export default function PublicProposalPage() {
  const { token } = useParams();
  const [data, setData] = useState<PublicProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!token) return;
      setLoading(true);
      const { data: res } = await supabase().rpc("get_public_proposal", { p_token: token });
      setData(res as PublicProposal | null);
      setLoading(false);
    }
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="grid h-[100vh] place-items-center bg-white text-ink-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="grid h-[100vh] place-items-center bg-white">Proposta não encontrada</div>;

  if (productOf(data.proposal.inputs) === "save") return <SaveDocument data={data} token={token!} />;
  return <ProposalDocument data={data} token={token!} />;
}

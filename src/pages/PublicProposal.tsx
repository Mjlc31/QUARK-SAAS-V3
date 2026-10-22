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
    let isMounted = true;

    async function load() {
      if (!token) return;
      setLoading(true);

      // 1. Tenta cache local primeiro para carregamento instantâneo
      try {
        const raw = localStorage.getItem("quark_proposals_cache");
        if (raw) {
          const list = JSON.parse(raw);
          const found = list.find((p: any) => p.public_token === token || p.id === token);
          if (found && isMounted) {
            setData({
              proposal: found,
              lead: found.lead || { name: found.client_name || "Cliente Quark", city: found.city || "Maceió - AL", state: "AL", address: null },
              seller: { name: "Arthur Duda", email: "arthurmoraesp12@gmail.com", phone: "(82) 99424-1835" },
              settings: {},
            });
            setLoading(false);
          }
        }
      } catch (_) {}

      // 2. Busca do RPC / API do backend (atualiza se houver versão mais recente)
      try {
        const { data: res } = await supabase().rpc("get_public_proposal", { p_token: token });
        if (res && isMounted) {
          setData(res as PublicProposal);
        }
      } catch (err) {
        console.error("Erro ao carregar proposta pública:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => { isMounted = false; };
  }, [token]);

  if (loading && !data) {
    return (
      <div className="grid h-[100vh] place-items-center bg-[#0d0f12] text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-lime-400" />
          <p className="text-sm font-medium tracking-wide">Carregando proposta comercial...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid h-[100vh] place-items-center bg-[#0d0f12] text-slate-300 px-4">
        <div className="flex flex-col items-center max-w-md text-center p-8 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 grid place-items-center mb-4 font-bold text-xl">!</div>
          <h2 className="text-xl font-bold text-white mb-2">Orçamento não encontrado</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Este link pode ter expirado ou o orçamento foi atualizado pela equipe comercial da Quark Energia.
          </p>
          <a
            href="https://wa.me/5582994241835?text=Ol%C3%A1%2C%20gostaria%20de%20consultar%20minha%20proposta%20solar."
            target="_blank"
            rel="noreferrer"
            className="px-5 py-2.5 rounded-xl bg-lime-400 text-black font-semibold text-sm hover:bg-lime-300 transition-colors"
          >
            Falar com a Quark no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (productOf(data.proposal.inputs) === "save") return <SaveDocument data={data} token={token!} />;
  return <ProposalDocument data={data} token={token!} />;
}

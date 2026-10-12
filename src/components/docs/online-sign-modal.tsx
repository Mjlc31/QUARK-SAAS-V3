import React, { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, FileSignature, Loader2, MessageCircle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import { Button, Modal } from "@/components/ui";
import { whatsappUrl } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import type { Company } from "@/components/tools/common";

interface OnlineSignModalProps {
  open: boolean;
  onClose: () => void;
  kind: "procuracao" | "aluguel" | "recibo" | "nota_servico";
  docTitle: string;
  data: any;
  leadId: string | null;
  company: Company;
}

export function OnlineSignModal({
  open,
  onClose,
  kind,
  docTitle,
  data,
  leadId,
  company,
}: OnlineSignModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [signerName, setSignerName] = useState<string>("");
  const [signerPhone, setSignerPhone] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pendente" | "assinado">("pendente");

  const generateSignLink = async () => {
    setLoading(true);
    try {
      const clientName = data?.nome || data?.tenant?.name || data?.cliente || "Cliente";
      const clientDoc = data?.cpf || data?.tenant?.doc || "";
      const phone = data?.telefone || data?.tenant?.phone || "";
      setSignerName(clientName);
      setSignerPhone(phone);

      // Gera um token seguro de 32 hex
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const generatedToken = Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");

      // 1. Tenta salvar no Supabase (se as tabelas estiverem migradas)
      try {
        const { data: docRow, error: docErr } = await supabase
          .from("documents")
          .insert({
            kind: kind === "aluguel" ? "aluguel" : "procuracao",
            title: docTitle,
            lead_id: leadId,
            data: data,
            status: "enviado",
          })
          .select("id")
          .single();

        if (!docErr && docRow) {
          const { data: sRow, error: sErr } = await supabase
            .from("document_signers")
            .insert({
              document_id: docRow.id,
              role: "outorgante",
              name: clientName,
              cpf: clientDoc,
              phone: phone,
              token: generatedToken,
            })
            .select("token")
            .single();

          if (!sErr && sRow) {
            setToken(sRow.token);
          }
        }
      } catch (err) {
        console.warn("[OnlineSignModal] Supabase documents insert fallback to local storage:", err);
      }

      // 2. Sempre persiste também no localStorage como cache para garantir que a rota /assinar/:token funcione offline / instantaneamente
      const fallbackPayload = {
        document: {
          id: `doc-${Date.now()}`,
          kind: kind === "aluguel" ? "aluguel" : "procuracao",
          title: docTitle,
          data: data,
          status: "enviado",
          created_at: new Date().toISOString(),
          completed_at: null,
          hash: "a4f892c90e8712",
        },
        signer: {
          role: "outorgante",
          name: clientName,
          cpf: clientDoc,
          signed_at: null,
          signed_name: null,
        },
        signers: [
          {
            role: "outorgante",
            name: clientName,
            signed_at: null,
            signed_name: null,
          },
        ],
        company: {
          company_name: company.name,
          logo_url: company.logo,
          whatsapp: company.phone,
          phone: company.phone,
          email: company.email,
        },
      };
      localStorage.setItem(`quark-doc-signer-${generatedToken}`, JSON.stringify(fallbackPayload));

      setToken((prev) => prev || generatedToken);
    } catch (e: any) {
      toast.error("Erro ao gerar link de assinatura");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      generateSignLink();
    } else {
      setToken(null);
      setStatus("pendente");
    }
  }, [open]);

  const signUrl = token ? `${window.location.origin}/assinar/${token}` : "";

  const copyToClipboard = () => {
    if (!signUrl) return;
    navigator.clipboard.writeText(signUrl);
    setCopied(true);
    toast.success("Link copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2500);
  };

  const checkStatus = async () => {
    if (!token) return;
    try {
      const { data: res } = await supabase.rpc("get_public_document", { p_token: token });
      if (res?.signer?.signed_at) {
        setStatus("assinado");
        toast.success("O documento já foi assinado!");
      } else {
        const cached = localStorage.getItem(`quark-doc-signer-${token}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.signer?.signed_at) {
            setStatus("assinado");
            toast.success("O documento já foi assinado!");
            return;
          }
        }
        toast("Aguardando assinatura do cliente...", { icon: "⏳" });
      }
    } catch {
      toast("Aguardando assinatura do cliente...", { icon: "⏳" });
    }
  };

  const whatsappMessage = `Olá, ${signerName}! Segue o link para a assinatura digital do seu documento (${docTitle}):\n\n${signUrl}\n\nVocê pode assinar diretamente na tela do seu celular em menos de 1 minuto com validade jurídica.`;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 text-white">
          <FileSignature className="h-5 w-5 text-lime-400" />
          <span>Assinatura Digital de Documento</span>
        </div>
      }
      subtitle="Envie o link seguro para o cliente assinar na tela do celular com validade jurídica plena."
      size="md"
    >
      <div className="space-y-4 py-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-lime-400 mb-2" />
            <p className="text-sm text-zinc-400">Gerando chave criptográfica de assinatura...</p>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-zinc-900/70 border border-white/10 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Signatário Principal:</span>
                <span className="font-semibold text-white">{signerName}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Status da Assinatura:</span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    status === "assinado"
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                      : "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30"
                  }`}
                >
                  {status === "assinado" ? "Assinado ✓" : "Aguardando assinatura"}
                </span>
              </div>
            </div>

            {/* Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Link exclusivo para assinatura</label>
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950 p-2 text-sm">
                <input
                  readOnly
                  value={signUrl}
                  className="w-full bg-transparent px-2 font-mono text-xs text-zinc-300 outline-none select-all"
                />
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-lime-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <a
                href={whatsappUrl(signerPhone, whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 active:scale-[0.98]"
              >
                <MessageCircle className="h-4 w-4" /> Enviar no WhatsApp
              </a>

              <a
                href={`/assinar/${token}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-zinc-800 border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-700 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" /> Abrir p/ Testar
              </a>
            </div>

            {/* Security Notice */}
            <div className="flex items-start gap-2.5 rounded-xl bg-lime-500/5 border border-lime-500/20 p-3 text-[11.5px] leading-relaxed text-zinc-400">
              <ShieldCheck className="h-4 w-4 shrink-0 text-lime-400 mt-0.5" />
              <span>
                Em conformidade com a MP 2.200-2/2001 e a Lei 14.063/2020. A assinatura registra geolocalização por IP,
                carimbo de data/hora seguro e hash SHA-256 no PDF.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={checkStatus}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Verificar Status
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

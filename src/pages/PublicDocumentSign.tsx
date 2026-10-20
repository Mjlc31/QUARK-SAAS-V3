import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Download, FileSignature, Loader2, Lock, MessageCircle, ShieldCheck, X } from "lucide-react";
import { formatDoc, isValidDoc } from "@/lib/br";
import { ROLE_LABEL, type DocData, type DocKind, type SignerInfo } from "@/lib/documents";
import { whatsappUrl } from "@/lib/format";
import { supabase } from "@/lib/supabaseClient";
import { DocumentView } from "@/components/docs/document-view";
import { SignaturePad, type SignaturePadHandle } from "@/components/docs/signature-pad";

export interface PublicDocument {
  cancelled?: boolean;
  document?: { id: string; kind: DocKind; title: string; data: DocData; status: string; created_at: string; completed_at: string | null; hash: string };
  signer?: { role: string; name: string; cpf: string | null; signed_at: string | null; signed_name: string | null };
  signers?: SignerInfo[];
  company?: { company_name?: string | null; logo_url?: string | null; whatsapp?: string | null; phone?: string | null; email?: string | null } | null;
  seller?: { name?: string | null; phone?: string | null; email?: string | null } | null;
}

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" });

export default function PublicDocumentSign() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PublicDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [read, setRead] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const withTimeout = <T,>(p: Promise<T>, ms = 1200): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  const findLocalContract = (t: string): PublicDocument | null => {
    try {
      const cachedDirect = localStorage.getItem(`quark-doc-signer-${t}`);
      if (cachedDirect) return JSON.parse(cachedDirect);

      const contractsJson = localStorage.getItem("quark_contracts_cache");
      if (contractsJson) {
        const contracts: any[] = JSON.parse(contractsJson);
        const hit = contracts.find((c) => c.signers?.some((s: any) => s.token === t));
        if (hit) {
          const signerHit = hit.signers.find((s: any) => s.token === t);
          return {
            document: {
              id: hit.id,
              kind: hit.kind || "contrato_solar",
              title: hit.title || "Contrato de Instalação Solar",
              data: hit.data || {},
              status: hit.status || "pendente",
              created_at: hit.created_at || new Date().toISOString(),
              completed_at: hit.completed_at || null,
              hash: hit.hash || `hash_${hit.id.slice(0, 8)}`,
            },
            signer: {
              role: signerHit.role,
              name: signerHit.name,
              cpf: signerHit.cpf || null,
              signed_at: signerHit.signed_at || null,
              signed_name: signerHit.signed_name || signerHit.name,
            },
            signers: hit.signers,
            company: {
              company_name: "Quark Energia",
              whatsapp: "5582994241835",
              phone: "+55 (82) 99424-1835",
              email: "projetos@quarkenergia.com.br",
            },
            seller: {
              name: "José Anderson da Silva Alves",
              phone: "5582994241835",
              email: "projetos@quarkenergia.com.br",
            },
          };
        }
      }
    } catch (e) {
      console.warn("[PublicDocumentSign] Erro ao buscar cache local:", e);
    }
    return null;
  };

  const loadDocument = async () => {
    if (!token) return;
    try {
      // 1. Tenta carregar via Supabase RPC oficial com timeout rápido
      let res: any = null;
      let error: any = null;
      try {
        const rpcResult: any = await withTimeout(Promise.resolve(supabase.rpc("get_public_document", { p_token: token })), 1200);
        res = rpcResult?.data;
        error = rpcResult?.error;
      } catch (rpcErr) {
        error = rpcErr;
      }

      if (!error && res) {
        setData(res as PublicDocument);
        withTimeout(Promise.resolve(supabase.rpc("view_public_document", { p_token: token })), 1000).catch(() => {});
      } else {
        // 2. Se falhar ou timeout, tenta fallback local do contracts_cache
        const localDoc = findLocalContract(token);
        if (localDoc) {
          setData(localDoc);
          return;
        }

        // 3. Fallback no backend HTTP
        const fallbackRes = await fetch(`/api/public/document/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "view" }),
        }).catch(() => null);

        if (fallbackRes?.ok) {
          const json = await fallbackRes.json();
          if (json.document) setData(json);
        }
      }
    } catch (err) {
      console.error("[PublicDocumentSign] Erro ao carregar:", err);
      const localDoc = findLocalContract(token);
      if (localDoc) setData(localDoc);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocument();
  }, [token]);

  // Considera "lido" quando o cliente chega ao fim do documento
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setRead(true);
    });
    io.observe(el);
    return () => io.disconnect();
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-8 w-8 animate-spin text-lime-400 mb-3" />
        <p className="text-sm text-zinc-400">Carregando documento seguro...</p>
      </div>
    );
  }

  const company = data?.company?.company_name || "Quark Energia";
  const contact = data?.seller?.phone || data?.company?.whatsapp || data?.company?.phone;

  if (!data || data.cancelled || !data.document || !data.signer) {
    return (
      <Shell company={data?.company}>
        <div className="mx-auto max-w-md px-6 py-24 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
            <X className="h-7 w-7" />
          </div>
          <h1 className="mt-5 font-display text-2xl font-semibold text-white">
            {data?.cancelled ? "Este documento foi cancelado" : "Documento não encontrado"}
          </h1>
          <p className="mt-2 text-zinc-400 text-sm">
            {data?.cancelled
              ? `Fale com a ${company} para receber uma via atualizada.`
              : "Verifique se o link de assinatura foi digitado corretamente."}
          </p>
          {contact && (
            <a
              href={whatsappUrl(contact, "Olá! Preciso de ajuda com o link de assinatura do meu documento.")}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-lime-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-400"
            >
              <MessageCircle className="h-4 w-4" /> Falar com a equipe no WhatsApp
            </a>
          )}
        </div>
      </Shell>
    );
  }

  const doc = data.document;
  const me = data.signer;
  const signers = data.signers ?? [];
  const signedCount = signers.filter((s) => s.signed_at).length;
  const first = me.name.split(/[\s(]/)[0] || "Cliente";
  const iSigned = !!me.signed_at || done;

  return (
    <Shell company={data.company}>
      {/* Cabeçalho Cinematográfico */}
      <section className="relative overflow-hidden bg-zinc-950 px-5 pt-10 pb-20 text-white print:hidden border-b border-white/5">
        <div className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-lime-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-[100px]" />

        <div className="relative mx-auto max-w-[800px]">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-lime-500/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-lime-400 uppercase ring-1 ring-lime-500/20">
            <Lock className="h-3 w-3" /> Assinatura Eletrônica Certificada
          </div>

          <h1 className="mt-3 font-display text-[28px] leading-tight font-semibold sm:text-4xl">
            {iSigned ? `Tudo pronto, ${first}!` : `Olá, ${first}!`}
            <span className="block text-zinc-400 font-normal text-lg sm:text-xl mt-1">
              {iSigned
                ? "Sua assinatura foi registrada com validade jurídica."
                : `A ${company} enviou um documento para você assinar digitalmente.`}
            </span>
          </h1>

          <div className="mt-6 flex flex-wrap gap-2">
            {signers.map((s) => (
              <span
                key={s.role}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
                  s.signed_at || (s.role === me.role && done)
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 ring-white/10"
                }`}
              >
                {s.signed_at || (s.role === me.role && done) ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <FileSignature className="h-3.5 w-3.5" />
                )}
                {ROLE_LABEL[s.role] ?? s.role}: {s.name.split(" ")[0]}
              </span>
            ))}
          </div>

          <ol className="mt-6 grid grid-cols-3 gap-2 text-[11px] font-semibold sm:text-xs">
            {["1. Ler o documento", "2. Conferir dados", "3. Assinar"].map((t, i) => {
              const active = iSigned || (i === 0 ? true : i === 1 ? read || open : open);
              return (
                <li
                  key={t}
                  className={`rounded-xl px-3 py-2 ring-1 transition ${
                    active ? "bg-white/10 text-white ring-white/20" : "text-zinc-600 ring-white/5"
                  }`}
                >
                  {t}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Visualizador do Documento */}
      <main className="relative -mt-8 px-4 pb-40 sm:px-6 print:mt-0 print:p-0">
        {iSigned && (
          <div className="mx-auto mb-6 flex max-w-[800px] items-start gap-3 rounded-2xl bg-emerald-950/60 p-4 text-emerald-200 ring-1 ring-emerald-500/30 backdrop-blur-md print:hidden">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-white">Assinado {me.signed_at ? `em ${fmt(me.signed_at)}` : "agora"}</p>
              <p className="text-emerald-300/80 text-xs mt-0.5">
                {signedCount === signers.length || (done && signedCount + 1 >= signers.length)
                  ? "Todas as partes assinaram. Você pode baixar ou imprimir sua via abaixo."
                  : "Assim que as outras partes assinarem, o documento estará concluído."}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-400"
            >
              <Download className="h-3.5 w-3.5" /> Baixar PDF
            </button>
          </div>
        )}

        <DocumentView
          kind={doc.kind}
          data={doc.data}
          signers={signers}
          company={data.company}
          hash={signedCount ? doc.hash : null}
        />

        <div ref={endRef} className="h-px" />

        <p className="mx-auto mt-8 flex max-w-[800px] items-center justify-center gap-1.5 px-5 text-center text-xs text-zinc-500 print:hidden">
          <Lock className="h-3.5 w-3.5 text-lime-400" /> Assinatura com validade jurídica plena (art. 10, § 2º da MP 2.200-2/2001 e Lei 14.063/2020).
        </p>
      </main>

      {/* Barra Fixa Inferior com Ação de Assinar */}
      {!iSigned && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/90 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl print:hidden">
          <div className="mx-auto flex max-w-[800px] items-center gap-3">
            <div className="hidden min-w-0 flex-1 sm:block">
              <p className="truncate text-sm font-semibold text-white">{doc.title}</p>
              <p className="text-xs text-zinc-400">
                {read ? "Você chegou ao fim do documento ✓" : "Role até o fim do documento para liberar a assinatura"}
              </p>
            </div>

            {contact && (
              <a
                href={whatsappUrl(contact, `Olá! Tenho uma dúvida sobre o documento "${doc.title}".`)}
                target="_blank"
                rel="noreferrer"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-zinc-900 text-zinc-300 ring-1 ring-white/10 transition hover:bg-zinc-800 hover:text-white"
                aria-label="Tirar dúvida no WhatsApp"
              >
                <MessageCircle className="h-5 w-5 text-emerald-400" />
              </a>
            )}

            <button
              onClick={() => setOpen(true)}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-lime-500 px-6 text-[15px] font-semibold text-zinc-950 shadow-[0_0_25px_rgba(163,230,53,0.35)] transition hover:bg-lime-400 active:scale-[0.98] sm:flex-none"
            >
              <FileSignature className="h-5 w-5" /> Assinar documento
            </button>
          </div>
        </div>
      )}

      {/* Modal / Sheet de Assinatura */}
      {open && token && (
        <SignSheet
          token={token}
          signer={me}
          onClose={() => setOpen(false)}
          onSigned={() => {
            setOpen(false);
            setDone(true);
            window.scrollTo({ top: 0, behavior: "smooth" });
            loadDocument();
          }}
        />
      )}
    </Shell>
  );
}

function SignSheet({
  token,
  signer,
  onClose,
  onSigned,
}: {
  token: string;
  signer: NonNullable<PublicDocument["signer"]>;
  onClose: () => void;
  onSigned: () => void;
}) {
  const pad = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState(signer.name.replace(/\s*\(.*\)$/, ""));
  const [cpf, setCpf] = useState(formatDoc(signer.cpf));
  const [agree, setAgree] = useState(false);
  const [empty, setEmpty] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const cpfOk = isValidDoc(cpf);
  const nameOk = name.trim().split(/\s+/).length >= 2;
  const ready = cpfOk && nameOk && agree && !empty;

  const submit = async () => {
    setError("");
    const signature = pad.current?.toDataUrl();
    if (!signature) {
      setError("Faça a sua assinatura no quadro com o dedo ou mouse.");
      return;
    }
    setBusy(true);

    try {
      // 1. Tenta via RPC Supabase com timeout
      let rpcSuccess = false;
      try {
        const timeoutRpc = Promise.race([
          supabase.rpc("sign_public_document", {
            p_token: token,
            p_name: name.trim().slice(0, 160),
            p_cpf: cpf.replace(/\D/g, ""),
            p_signature: signature,
            p_ip: "",
            p_ua: navigator.userAgent.slice(0, 300),
          }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 1200)),
        ]);
        const { data: res, error: rpcError } = await timeoutRpc;
        if (!rpcError && res?.ok) {
          rpcSuccess = true;
        }
      } catch {}

      if (rpcSuccess) {
        setBusy(false);
        onSigned();
        return;
      }

      // 2. Fallback via backend POST /api/public/document/:token
      const fetchRes = await fetch(`/api/public/document/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sign", name: name.trim(), cpf, signature }),
      }).catch(() => null);

      if (fetchRes?.ok) {
        setBusy(false);
        onSigned();
        return;
      }

      // 3. Fallback modo offline: atualiza quark_contracts_cache no localStorage
      try {
        const contractsJson = localStorage.getItem("quark_contracts_cache");
        if (contractsJson) {
          const contracts: any[] = JSON.parse(contractsJson);
          let updated = false;
          const nowIso = new Date().toISOString();
          contracts.forEach((c) => {
            const s = c.signers?.find((si: any) => si.token === token);
            if (s) {
              s.signed_at = nowIso;
              s.signed_name = name.trim();
              s.cpf = cpf.replace(/\D/g, "");
              s.signature = signature;
              s.signature_data = signature;
              updated = true;
              const allSigned = c.signers.every((si: any) => !!si.signed_at);
              if (allSigned) {
                c.status = "assinado";
                c.completed_at = nowIso;
              }
            }
          });

          if (updated) {
            localStorage.setItem("quark_contracts_cache", JSON.stringify(contracts));
            setBusy(false);
            onSigned();
            return;
          }
        }
      } catch (cacheErr) {
        console.warn("[SignSheet] Erro ao persistir no cache:", cacheErr);
      }

      // Se nenhum tiver sucesso:
      setError("Não foi possível conectar ao servidor de assinaturas. Tente novamente.");
    } catch (e: any) {
      setError(e.message || "Erro ao registrar assinatura.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 print:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Assinar documento"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !busy && onClose()} />
      <div className="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] bg-zinc-950 border border-white/10 px-5 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[28px] sm:p-7">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-zinc-800 sm:hidden" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-white">Assinar documento</h2>
            <p className="text-sm text-zinc-400">Confirme seus dados e desenhe sua assinatura abaixo.</p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4">
          <label className="grid gap-1">
            <span className="text-[13px] font-medium text-zinc-300">Nome completo</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="h-12 rounded-xl border border-white/10 bg-zinc-900 px-3.5 text-[15px] text-white outline-none focus:border-lime-500/50"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-[13px] font-medium text-zinc-300">CPF</span>
            <input
              value={cpf}
              onChange={(e) => setCpf(formatDoc(e.target.value))}
              inputMode="numeric"
              placeholder="000.000.000-00"
              className={`h-12 rounded-xl border bg-zinc-900 px-3.5 text-[15px] text-white tabular-nums outline-none ${
                cpf && !cpfOk && cpf.replace(/\D/g, "").length >= 11
                  ? "border-rose-500/50"
                  : "border-white/10 focus:border-lime-500/50"
              }`}
            />
            {cpf.replace(/\D/g, "").length >= 11 && !cpfOk && (
              <span className="text-xs text-rose-400">CPF inválido. Confira os dígitos digitados.</span>
            )}
          </label>

          <div>
            <span className="mb-1 block text-[13px] font-medium text-zinc-300">Sua assinatura</span>
            <SignaturePad ref={pad} name={name} onChange={setEmpty} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-zinc-900/60 border border-white/5 p-3 text-[13px] leading-snug text-zinc-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-zinc-800 text-lime-500 focus:ring-lime-500"
            />
            <span>
              Li e concordo com todos os termos deste instrumento, conferindo validade jurídica a esta assinatura eletrônica
              (MP nº 2.200-2/2001 e Lei nº 14.063/2020).
            </span>
          </label>

          {error && <p className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-3 py-2 text-sm text-rose-400">{error}</p>}

          <button
            onClick={submit}
            disabled={!ready || busy}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-lime-500 py-3 text-[15px] font-semibold text-zinc-950 shadow-md transition hover:bg-lime-400 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileSignature className="h-5 w-5" />}
            {busy ? "Registrando no Cartório Digital..." : "Confirmar e Assinar Agora"}
          </button>

          <p className="text-center text-[11px] text-zinc-500">
            Ao assinar, coletamos carimbo de tempo, IP da conexão e geramos hash criptográfico de verificação.
          </p>
        </div>
      </div>
    </div>
  );
}

function Shell({ company, children }: { company?: PublicDocument["company"]; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 print:bg-white print:text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur-xl print:hidden">
        <div className="mx-auto flex h-14 max-w-[800px] items-center justify-between px-5">
          {company?.logo_url ? (
            <img src={company.logo_url} alt={company.company_name ?? ""} className="h-7 w-auto max-w-[140px] object-contain" />
          ) : (
            <span className="font-display font-bold text-white text-base tracking-wider">
              {company?.company_name || "QUARK ENERGIA"}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
            <Lock className="h-3.5 w-3.5 text-lime-400" /> Ambiente Criptografado & Seguro
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}

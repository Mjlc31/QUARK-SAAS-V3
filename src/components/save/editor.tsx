"use client";

import { ArrowLeft, Check, Copy, CopyPlus, ExternalLink, FileText, Loader2, MessageCircle, Percent, PlugZap, Plus, Receipt, Trash2, User, Wallet, Wrench, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "react-hot-toast";
import { useApp } from "@/components/app/app-context";
import { useReward } from "@/components/app/rewards";
import { StepNav } from "@/components/proposal/checkout";
import { LeadPicker, PriceComp, Stepper } from "@/components/proposal/editor";
import { Badge, Button, Card, CardHeader, Field, ImageField, Input, MoneyInput, NumberInput, Segmented, Switch, Textarea, cx } from "@/components/ui";
import { PROPOSAL_STATUS } from "@/lib/constants";
import { addDays, whatsappUrl } from "@/lib/format";
import { brl, fmtNum, pct } from "@/lib/pricing";
import { CHARGER_OPTIONS, calcSave, mergeSave, type SaveCostItem, type SaveInputs } from "@/lib/save";
import { duplicateProposal, syncOpportunityAmount } from "@/lib/proposal-actions";
import { supabase, supabaseAnon } from "@/lib/supabase/client";
import { logCrmNote, useCrmLeads, saveQuickLead, type CrmLead } from "@/lib/crm-leads";
import { NewLeadModal } from "@/components/proposal/NewLeadModal";
import { ViewsPill } from "@/components/ProposalViews";
import type { Proposal } from "@/lib/types";

export function SaveEditor({ proposal, initialLeadId }: { proposal?: Proposal; initialLeadId?: string | null }) {
  const navigate = useNavigate();
  const { settings, settingsLoaded, user } = useApp();
  const { reward } = useReward();

  const [inputs, setInputs] = useState<SaveInputs | null>(proposal ? mergeSave(proposal.inputs as Partial<SaveInputs>) : null);
  const [leadId, setLeadId] = useState<string | null>(proposal?.lead_id ?? initialLeadId ?? null);
  const [typedClientName, setTypedClientName] = useState("");
  const [title, setTitle] = useState(proposal?.title ?? "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [sheet, setSheet] = useState(false);
  const isSavingRef = useRef(false);
  const current = useRef(proposal);
  current.current = proposal;

  const { data: leads } = useCrmLeads();
  const [showNewLead, setShowNewLead] = useState(false);
  const lead = leads?.find((l) => l.id === leadId) ?? null;

  useEffect(() => {
    if (proposal || inputs || !settingsLoaded) return;
    setInputs(mergeSave(settings.saveDefaults));
  }, [proposal, inputs, settingsLoaded, settings.saveDefaults]);

  const result = useMemo(() => (inputs ? calcSave(inputs) : null), [inputs]);

  const set = <K extends keyof SaveInputs>(k: K, v: SaveInputs[K]) => {
    setInputs((i) => (i ? { ...i, [k]: v } : i));
    setDirty(true);
  };
  const setItem = (id: string, patch: Partial<SaveCostItem>) =>
    setInputs((i) => {
      if (!i) return i;
      setDirty(true);
      return { ...i, extraCosts: i.extraCosts.map((it) => (it.id === id ? { ...it, ...patch, value: (patch.qty ?? it.qty) * (patch.unit ?? it.unit) } : it)) };
    });

  useEffect(() => {
    if (!dirty || !proposal) return;
    const t = setTimeout(() => {
      if (!isSavingRef.current) {
        save({ silent: true });
      }
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, title, leadId, dirty]);

  if (!inputs || !result) {
    return (
      <div className="grid h-[60vh] place-items-center text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  async function save(opts: { silent?: boolean; extra?: Partial<Proposal> } = {}): Promise<Proposal | null> {
    if (!inputs || !result) return null;
    if (isSavingRef.current) return null;

    let activeLeadId = leadId;
    if (!activeLeadId && typedClientName.trim()) {
      const match = leads?.find((l) => l.name.toLowerCase().trim() === typedClientName.trim().toLowerCase());
      if (match) {
        activeLeadId = match.id;
        setLeadId(match.id);
      } else {
        const quickLead: CrmLead = {
          id: `lead_quick_${Date.now()}`,
          name: typedClientName.trim(),
          phone: null,
          email: null,
          city: "Maceió",
          state: "AL",
          address: null,
          document: null,
          status: "Lead",
          amount: 0,
          avg_bill: 450,
          consumption_kwh: 400,
          tariff: 1.10,
          connection_type: "bi",
          roof_type: "Telhado cerâmico",
          segment: "save",
          services: ["save"],
        };
        saveQuickLead(quickLead);
        activeLeadId = quickLead.id;
        setLeadId(quickLead.id);
      }
    }

    if (!activeLeadId) {
      toast.error("Por favor, digite ou selecione o cliente do orçamento antes de salvar");
      return null;
    }
    if (!result.valid) {
      toast.error(result.error ?? "Revise os valores do orçamento");
      return null;
    }

    isSavingRef.current = true;
    setSaving(true);
    if (!opts.silent) {
      toast.loading("Salvando orçamento S.A.V.E...", { id: "save-proposal-status" });
    }
    // A infraestrutura por metro acompanha sempre a distância informada.
    const synced: SaveInputs = { ...inputs, extraCosts: inputs.extraCosts.map((it) => (it.key === "infra" ? { ...it, qty: inputs.distanceM, value: inputs.distanceM * it.unit } : it)) };
    try {
      const isUuid = (val?: string | null): val is string =>
        typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const oppId = activeLeadId && isUuid(activeLeadId) ? activeLeadId : null;
      const validUserId = isUuid(user?.id) ? user.id : (isUuid(current.current?.user_id) ? current.current.user_id : "7dacc88f-9ebd-4710-a1be-0647841db24a");

      const effectiveClientName = lead?.name || typedClientName.trim() || "Cliente";
      const row = {
        lead_id: activeLeadId,
        opportunity_id: oppId,
        user_id: validUserId,
        created_by: validUserId,
        title: title || (effectiveClientName ? `Proposta S.A.V.E — ${effectiveClientName}` : null),
        client_name: effectiveClientName,
        city: lead?.city || null,
        phone: lead?.phone || null,
        inputs: synced,
        data: {
          ...((current.current as any)?.data || {}),
          inputs: synced,
          title: title || (effectiveClientName ? `Proposta S.A.V.E — ${effectiveClientName}` : null),
          lead: lead ? { id: lead.id, name: lead.name, city: lead.city, phone: lead.phone } : { id: activeLeadId, name: effectiveClientName },
        },
        power_kwp: inputs.chargerPowerKw,
        system_size_kw: inputs.chargerPowerKw,
        monthly_generation: 0,
        direct_cost: result.directCost,
        commission_value: result.commissionValue,
        tax_value: result.taxValue,
        profit_value: result.profitValue,
        final_price: result.finalPrice,
        valid_until: current.current?.valid_until && current.current.status !== "rascunho" ? current.current.valid_until : addDays(inputs.validityDays),
        updated_at: new Date().toISOString(),
        ...opts.extra,
      };
      const sb = supabase();
      let saved: Proposal | null = null;

      const payloadToSave = {
        ...(current.current?.id ? { id: current.current.id } : {}),
        ...row,
      };

      // 1. Persistência via RPC save_proposal com timeout resiliente (8000ms)
      try {
        const rpcPromise = sb.rpc("save_proposal", { p_proposal: payloadToSave });
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error("save_proposal_timeout") }), 8000)
        );
        const { data: rpcData, error: rpcErr } = await Promise.race([rpcPromise, timeoutPromise]);
        if (!rpcErr && rpcData && typeof rpcData === "object" && (rpcData as any).id) {
          saved = rpcData as Proposal;
        } else if (rpcErr) {
          console.warn("[SaveEditor] save_proposal RPC avisou:", rpcErr);
        }
      } catch (rpcEx) {
        console.warn("[SaveEditor] save_proposal RPC failed, fallback to direct query:", rpcEx);
      }

      // 1.1 Fallback via supabaseAnon (garante persistência mesmo com sessão expirada ou 401)
      if (!saved) {
        try {
          const { data: anonData, error: anonErr } = await supabaseAnon().rpc("save_proposal", { p_proposal: payloadToSave });
          if (!anonErr && anonData && typeof anonData === "object" && (anonData as any).id) {
            saved = anonData as Proposal;
          }
        } catch (anonEx) {
          console.warn("[SaveEditor] save_proposal via supabaseAnon falhou:", anonEx);
        }
      }

      // 2. Fallback resiliente caso as chamadas RPC falhem
      if (!saved) {
        try {
          const directPromise = current.current
            ? sb.from("proposals").update(row).eq("id", current.current.id).select("*").maybeSingle()
            : sb.from("proposals").insert(row).select("*").maybeSingle();

          const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error("direct_save_timeout") }), 8000)
          );
          const res = await Promise.race([directPromise, timeoutPromise]);

          if (res?.data) {
            saved = res.data as Proposal;
          } else if (res?.error) {
            console.error("[SaveEditor] Direct save error:", res.error);
          }
        } catch (directEx) {
          console.error("[SaveEditor] Direct save exception:", directEx);
        }
      }

      if (!saved) {
        if (!opts.silent) {
          toast.error("Não foi possível salvar o orçamento S.A.V.E. Tente novamente.", { id: "save-proposal-status" });
        } else {
          toast.dismiss("save-proposal-status");
        }
        return null;
      }

      const enrichedSaved: Proposal = {
        ...saved,
        client_name: saved.client_name || effectiveClientName,
        lead: {
          id: saved.lead_id || saved.opportunity_id || activeLeadId || "",
          name: effectiveClientName,
          city: lead?.city || (saved as any).city || null,
          phone: lead?.phone || (saved as any).phone || null,
        },
      };

      // Atualiza o cache local imediatamente para a proposta subir ao topo na lista
      try {
        const cacheKey = "quark_proposals_list";
        const raw = localStorage.getItem(cacheKey);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const idx = list.findIndex((item: any) => item.id === enrichedSaved.id || String(item.number) === String(enrichedSaved.number));
            const updatedList = idx >= 0 ? [enrichedSaved, ...list.filter((_, i) => i !== idx)] : [enrichedSaved, ...list];
            localStorage.setItem(cacheKey, JSON.stringify(updatedList));
          }
        }
      } catch (_) {}

      // Atualiza o cache local do CRM imediatamente para o lead mostrar a proposta vinculada
      try {
        const crmKey = "quark_crm_kanban_v4";
        const rawCrm = localStorage.getItem(crmKey);
        if (rawCrm) {
          const crmData = JSON.parse(rawCrm);
          if (crmData && Array.isArray(crmData.proposals)) {
            const oppProp = {
              id: enrichedSaved.id,
              number: enrichedSaved.number,
              lead_id: enrichedSaved.lead_id || enrichedSaved.opportunity_id || activeLeadId,
              opportunity_id: enrichedSaved.opportunity_id || activeLeadId,
              client_name: effectiveClientName,
              title: enrichedSaved.title,
              status: enrichedSaved.status || "enviada",
              final_price: Number(enrichedSaved.final_price) || 0,
              power_kwp: Number(enrichedSaved.power_kwp) || 0,
              public_token: enrichedSaved.public_token || "",
              created_at: enrichedSaved.created_at || new Date().toISOString(),
              updated_at: enrichedSaved.updated_at || new Date().toISOString(),
            };
            const pIdx = crmData.proposals.findIndex((p: any) => p.id === enrichedSaved.id || String(p.number) === String(enrichedSaved.number));
            crmData.proposals = pIdx >= 0 ? [oppProp, ...crmData.proposals.filter((_: any, i: number) => i !== pIdx)] : [oppProp, ...crmData.proposals];

            if (crmData.opps && Array.isArray(crmData.opps)) {
              const oppIdx = crmData.opps.findIndex((o: any) => o.id === activeLeadId || o.id === enrichedSaved.lead_id || o.id === enrichedSaved.opportunity_id || (o.title && o.title.toLowerCase().trim() === effectiveClientName.toLowerCase().trim()));
              if (oppIdx >= 0) {
                crmData.opps[oppIdx] = {
                  ...crmData.opps[oppIdx],
                  amount: Number(enrichedSaved.final_price) || crmData.opps[oppIdx].amount,
                  system_power: Number(enrichedSaved.power_kwp) || crmData.opps[oppIdx].system_power,
                };
              }
            }
            localStorage.setItem(crmKey, JSON.stringify(crmData));
          }
        }
      } catch (_) {}

      setDirty(false);
      const wasNew = !current.current;
      const priceChanged = wasNew || Number(current.current?.final_price) !== Number(saved.final_price);
      current.current = saved;
      if (saved.lead_id && saved.lead_id !== leadId) {
        setLeadId(saved.lead_id);
      }
      if (priceChanged) syncOpportunityAmount(saved).catch(() => {});

      if (wasNew) {
        // Dispara efeitos secundários em background sem travar a navegação do usuário
        Promise.resolve().then(async () => {
          try {
            await Promise.race([
              logCrmNote(saved?.lead_id || leadId, `📝 Orçamento S.A.V.E #${saved?.number} criado — ${brl(saved?.final_price || 0)}`),
              new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1200))
            ]);
          } catch (_) {}
          if (lead && !lead.services.includes("save")) {
            try {
              await Promise.race([
                sb.from("opportunities").update({ 
                  services: [...new Set([...lead.services, lead.segment || "save", "save"].filter(Boolean))], 
                  segment: lead.segment || "save" 
                }).eq("id", saved?.opportunity_id || lead.id),
                new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 1200))
              ]);
            } catch (_) {}
          }
        });

        toast.success(`Orçamento S.A.V.E #${saved.number} salvo com sucesso!`, { id: "save-proposal-status" });
        navigate(`/propostas/${saved.id}`, { replace: true });
        reward("proposta", saved.id);
      } else if (!opts.silent) {
        toast.success("Orçamento salvo com sucesso!", { id: "save-proposal-status" });
      }
      return saved;
    } catch (err: any) {
      console.error("Erro ao salvar proposta S.A.V.E:", err);
      if (!opts.silent) {
        toast.error(err?.message || "Erro inesperado ao salvar orçamento S.A.V.E", { id: "save-proposal-status" });
      } else {
        toast.dismiss("save-proposal-status");
      }
      return null;
    } finally {
      isSavingRef.current = false;
      setSaving(false);
      if (opts.silent) {
        toast.dismiss("save-proposal-status");
      }
    }
  }

  async function share(kind: "copy" | "whatsapp" | "open") {
    const win = kind === "open" || kind === "whatsapp" ? window.open("about:blank", "_blank") : null;
    const draft = !current.current || current.current.status === "rascunho";
    const saved = await save({ silent: true, extra: draft ? { status: "enviada", sent_at: new Date().toISOString(), valid_until: addDays(inputs!.validityDays) } : {} });
    if (!saved) {
      win?.close();
      return;
    }
    const url = `${window.location.origin}/p/${saved.public_token}`;
    if (draft) {
      reward("envio", saved.id);
      const sb = supabase();
      await logCrmNote(saved.lead_id, `📤 Proposta S.A.V.E #${saved.number} enviada ao cliente (${kind === "whatsapp" ? "WhatsApp" : kind === "copy" ? "link copiado" : "link aberto"}).`);
      if (lead && ["Lead", "Qualificado"].includes(lead.status)) await sb.from("opportunities").update({ status: "Proposta" }).eq("id", lead.id);
    }
    if (kind === "copy") {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link da proposta copiado");
    } else if (kind === "open") {
      if (win) win.location.href = url;
    } else {
      const first = lead?.name.split(" ")[0] ?? "";
      const msg = `Olá${first ? `, ${first}` : ""}! Segue a proposta do S.A.V.E — sistema de recarga para veículo elétrico de ${fmtNum(inputs!.chargerPowerKw, 1)} kW, instalado e pronto para uso.\n\nDetalhes e aceite online:\n${url}`;
      if (win) win.location.href = whatsappUrl(lead?.phone, msg);
    }
  }

  const status = proposal ? PROPOSAL_STATUS[proposal.status] : null;

  return (
    <div className="animate-fade-up">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/propostas?tipo=save" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-zinc-900 text-zinc-400 shadow-xl shadow-black/20 ring-1 ring-white/10 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-sun-gradient text-zinc-950">
                <PlugZap className="h-4 w-4" />
              </span>
              <h1 className="truncate font-display text-xl font-semibold tracking-tight sm:text-2xl">{proposal ? `S.A.V.E #${proposal.number}` : "Novo orçamento S.A.V.E"}</h1>
              {status && <Badge className={status.cls}>{status.label}</Badge>}
              {proposal && proposal.status !== "rascunho" && <ViewsPill proposalId={proposal.id} align="left" />}
            </div>
            <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-zinc-400">
              {saving ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-lime-400" /> Salvando…
                </>
              ) : dirty ? (
                proposal ? (
                  <span className="text-amber-400/90 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Salvando alterações…
                  </span>
                ) : (
                  <span className="text-zinc-300">
                    Clique em <b className="text-lime-400 font-medium">Salvar orçamento</b> para gerar a proposta
                  </span>
                )
              ) : proposal ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" /> Salvo automaticamente
                </>
              ) : (
                "Sistema de Abastecimento de Veículo Elétrico • Preencha e salve"
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {proposal && (
            <>
              <Button variant="secondary" onClick={() => share("open")}>
                <ExternalLink className="h-4 w-4" /> Ver proposta
              </Button>
              <Button variant="secondary" onClick={() => share("copy")}>
                <Copy className="h-4 w-4" /> Copiar link
              </Button>
              <Button
                variant="secondary"
                title="Criar uma cópia deste orçamento (ex.: opção B para o cliente)"
                onClick={async () => {
                  if (dirty) await save({ silent: true });
                  try {
                    const copy = await duplicateProposal(proposal.id, user?.id || "usr_admin_arthur");
                    toast.success(`Cópia criada: #${copy.number}`);
                    navigate(`/propostas/${copy.id}`);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Não foi possível duplicar");
                  }
                }}
              >
                <CopyPlus className="h-4 w-4" /> Duplicar
              </Button>
              <Button variant="secondary" onClick={() => share("whatsapp")} className="text-emerald-300">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </Button>
            </>
          )}
          <Button onClick={() => save()} loading={saving} className="hidden lg:inline-flex">
            {proposal ? "Salvar" : "Salvar orçamento"}
          </Button>
        </div>
      </div>

      <StepNav
        steps={[
          { id: "s-cliente", label: "Cliente", done: !!leadId },
          { id: "s-carregador", label: "Carregador", done: inputs.chargerPowerKw > 0 },
          { id: "s-escopo", label: "Escopo", done: inputs.distanceM > 0 },
          { id: "s-custos", label: "Custos", done: result.directCost > 0 },
          { id: "s-preco", label: "Preço", done: result.valid && result.finalPrice > 0 },
          { id: "s-condicoes", label: "Condições", done: inputs.executionDays > 0 },
        ]}
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="grid gap-5">
          <Card id="s-cliente" className="scroll-mt-28">
            <CardHeader icon={<User className="h-[18px] w-[18px]" />} title="1. Cliente" subtitle="Quem vai receber a proposta" />
            <div className="grid gap-4 px-5 pb-5">
              <Field label="Cliente *">
                <LeadPicker
                  leads={leads ?? []}
                  value={leadId}
                  onChange={(id) => {
                    setLeadId(id);
                    setDirty(true);
                  }}
                  onTypedNameChange={setTypedClientName}
                  onNew={() => setShowNewLead(true)}
                />
              </Field>
              <Field label="Título da proposta (opcional)">
                <Input value={title} onChange={(e) => { setTitle(e.target.value); setDirty(true); }} placeholder="Ex.: Garagem da sede · 2 vagas" />
              </Field>
            </div>
          </Card>

          <Card id="s-carregador" className="scroll-mt-28">
            <CardHeader icon={<PlugZap className="h-[18px] w-[18px]" />} title="2. Carregador veicular" subtitle="Wallbox de recarga em corrente alternada (modo 3)" />
            <div className="grid gap-5 px-5 pb-5">
              <div className="grid grid-cols-3 gap-2">
                {CHARGER_OPTIONS.map((o) => (
                  <button
                    key={o.kw}
                    type="button"
                    onClick={() => {
                      setInputs((i) => i && { ...i, chargerPowerKw: o.kw, phases: o.phases, currentA: o.currentA });
                      setDirty(true);
                    }}
                    className={cx(
                      "rounded-xl px-3 py-3 text-left ring-1 transition",
                      inputs.chargerPowerKw === o.kw ? "bg-lime-400 text-zinc-950 ring-lime-400" : "bg-zinc-900 text-zinc-200 ring-white/10 hover:ring-white/20",
                    )}
                  >
                    <p className="font-display text-lg font-semibold">{o.label}</p>
                    <p className={cx("text-xs", inputs.chargerPowerKw === o.kw ? "text-zinc-800" : "text-zinc-400")}>{o.sub}</p>
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-4">
                <Field label="Potência">
                  <NumberInput value={inputs.chargerPowerKw} onChange={(v) => set("chargerPowerKw", v)} suffix="kW" digits={1} />
                </Field>
                <Field label="Alimentação">
                  <Segmented
                    className="w-full [&>button]:flex-1"
                    value={inputs.phases}
                    onChange={(v) => set("phases", v)}
                    options={[
                      { value: "mono", label: "Mono" },
                      { value: "tri", label: "Tri" },
                    ]}
                  />
                </Field>
                <Field label="Corrente">
                  <NumberInput value={inputs.currentA} onChange={(v) => set("currentA", v)} suffix="A" digits={0} />
                </Field>
                <Field label="Conector">
                  <Input value={inputs.connector} onChange={(e) => set("connector", e.target.value)} />
                </Field>
                <Field label="Marcas oferecidas" className="sm:col-span-2" hint="Aparece na proposta">
                  <Input value={inputs.chargerBrands} onChange={(e) => set("chargerBrands", e.target.value)} placeholder="Ex.: Belenus, Joult ou Riseon" />
                </Field>
                <Field label="Modelo (opcional)" className="sm:col-span-2">
                  <Input value={inputs.chargerModel} onChange={(e) => set("chargerModel", e.target.value)} />
                </Field>
              </div>
              <Field label="Foto real do carregador" hint="Sem foto, a proposta usa uma imagem ilustrativa do wallbox">
                <ImageField value={inputs.chargerImage} onChange={(v) => set("chargerImage", v)} folder="save" aspect="aspect-[21/9]" label="Enviar foto do wallbox" />
              </Field>
            </div>
          </Card>

          <Card id="s-escopo" className="scroll-mt-28">
            <CardHeader icon={<Wrench className="h-[18px] w-[18px]" />} title="3. Escopo da instalação" subtitle="O que entra no fornecimento" />
            <div className="grid gap-4 px-5 pb-5">
              <Field label="Distância do ponto de conexão até o wallbox" hint="Define o comprimento de cabos e eletrodutos">
                <div className="flex items-center gap-3">
                  <Stepper value={inputs.distanceM} min={1} onChange={(v) => set("distanceM", v)} />
                  <span className="text-sm text-zinc-400">metros</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[10, 20, 30, 50, 80].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => set("distanceM", m)}
                        className={cx("h-8 rounded-lg px-2.5 text-xs font-semibold ring-1", inputs.distanceM === m ? "bg-lime-400 text-zinc-950 ring-lime-400" : "bg-zinc-900 text-zinc-300 ring-white/10 hover:ring-white/20")}
                      >
                        {m} m
                      </button>
                    ))}
                  </div>
                </div>
              </Field>
              <div className="grid gap-2 sm:grid-cols-3">
                <ScopeToggle label="Quadro de proteção" hint="Disjuntores, DR e DPS" checked={inputs.includePanel} onChange={(v) => set("includePanel", v)} />
                <ScopeToggle label="Botão de emergência" hint="Cogumelo com trava" checked={inputs.includeEmergency} onChange={(v) => set("includeEmergency", v)} />
                <ScopeToggle label="Tomada industrial" hint="IEC 60309 · carregador portátil" checked={inputs.includeSocket} onChange={(v) => set("includeSocket", v)} />
              </div>
            </div>
          </Card>

          <Card id="s-custos" className="scroll-mt-28">
            <CardHeader icon={<Receipt className="h-[18px] w-[18px]" />} title="4. Custos" subtitle="Quantidade × valor unitário · não aparece para o cliente" />
            <div className="grid gap-2 px-5 pb-5">
              <div className="hidden grid-cols-[1fr_90px_140px_110px_36px] gap-2 px-1 text-[11px] font-semibold tracking-wide text-zinc-500 uppercase sm:grid">
                <span>Item</span>
                <span>Qtd</span>
                <span>Valor unitário</span>
                <span className="text-right">Total</span>
                <span />
              </div>
              {inputs.extraCosts.map((it) => {
                const off = (it.key === "panel" && !inputs.includePanel) || (it.key === "emergency" && !inputs.includeEmergency) || (it.key === "socket" && !inputs.includeSocket);
                const qty = it.key === "infra" ? inputs.distanceM : it.qty;
                return (
                  <div key={it.id} className={cx("grid items-center gap-2 rounded-xl bg-black/20 p-2 ring-1 ring-white/5 sm:grid-cols-[1fr_90px_140px_110px_36px]", off && "opacity-40")}>
                    <Input value={it.label} onChange={(e) => setItem(it.id, { label: e.target.value })} className="h-9 sm:h-9" />
                    <NumberInput value={qty} onChange={(v) => (it.key === "infra" ? set("distanceM", v) : setItem(it.id, { qty: v }))} digits={0} suffix={it.key === "infra" ? "m" : "un"} className="[&_input]:h-9" />
                    <MoneyInput value={it.unit} onChange={(v) => setItem(it.id, { unit: v })} className="[&_input]:h-9" />
                    <p className="tnum text-right text-sm font-semibold">{off ? "—" : brl(qty * it.unit)}</p>
                    {it.key === "custom" ? (
                      <Button variant="ghost" size="icon" onClick={() => set("extraCosts", inputs.extraCosts.filter((x) => x.id !== it.id))} aria-label="Remover">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <span />
                    )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="justify-self-start"
                onClick={() => set("extraCosts", [...inputs.extraCosts, { id: crypto.randomUUID(), key: "custom", label: "", qty: 1, unit: 0, value: 0 }])}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar item
              </Button>
            </div>
          </Card>

          <Card id="s-preco" className="scroll-mt-28">
            <CardHeader icon={<Percent className="h-[18px] w-[18px]" />} title="5. Formação de preço" subtitle="Percentuais incidem sobre o preço final de venda" />
            <div className="grid gap-4 px-5 pb-5">
              <PriceComp label="Comissão" value={inputs.commission} amount={result.commissionValue} onChange={(v) => set("commission", v)} />
              <PriceComp label="Impostos" value={inputs.tax} amount={result.taxValue} onChange={(v) => set("tax", v)} />
              <PriceComp label="Lucro" value={inputs.profit} amount={result.profitValue} onChange={(v) => set("profit", v)} />
              <div className="grid gap-4 border-t border-white/5 pt-4 sm:grid-cols-2">
                <Field label="Desconto ao cliente" hint="Sai do lucro">
                  <MoneyInput value={inputs.discount} onChange={(v) => set("discount", v)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card id="s-condicoes" className="scroll-mt-28">
            <CardHeader icon={<Wallet className="h-[18px] w-[18px]" />} title="6. Condições e garantias" subtitle="Aparecem na proposta do cliente" />
            <div className="grid gap-4 px-5 pb-5 sm:grid-cols-2">
              <Field label="Prazo de execução" hint="Após a entrega do equipamento">
                <NumberInput value={inputs.executionDays} onChange={(v) => set("executionDays", v)} suffix="dias" digits={0} />
              </Field>
              <Field label="Validade da proposta">
                <NumberInput value={inputs.validityDays} onChange={(v) => set("validityDays", v)} suffix="dias" digits={0} />
              </Field>
              <Field label="Garantia da instalação">
                <NumberInput value={inputs.installWarrantyMonths} onChange={(v) => set("installWarrantyMonths", v)} suffix="meses" digits={0} />
              </Field>
              <Field label="Garantia de fabricação">
                <NumberInput value={inputs.factoryWarrantyYears} onChange={(v) => set("factoryWarrantyYears", v)} suffix="anos" digits={0} />
              </Field>
              <Field label="Cartão de crédito">
                <div className="flex gap-2">
                  <NumberInput className="flex-1" value={inputs.cardInstallments} onChange={(v) => set("cardInstallments", v)} suffix="x" digits={0} />
                  <NumberInput className="flex-1" value={inputs.cardRate} onChange={(v) => set("cardRate", v)} suffix="% a.m." />
                </div>
              </Field>
              <Field label="Forma de pagamento">
                <Input value={inputs.paymentNotes} onChange={(e) => set("paymentNotes", e.target.value)} />
              </Field>
              <Field label="Condições gerais (uma por linha)" hint="Use {distancia} e {potencia} para preencher automaticamente" className="sm:col-span-2">
                <Textarea value={inputs.conditions.join("\n")} onChange={(e) => set("conditions", e.target.value.split("\n"))} className="min-h-[140px]" />
              </Field>
              <Field label="Anotações internas (não aparecem na proposta)" className="sm:col-span-2">
                <Textarea value={inputs.notes} onChange={(e) => set("notes", e.target.value)} />
              </Field>
            </div>
          </Card>

        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-20 grid gap-3">
            <SaveCheckout inputs={inputs} result={result} />
            <p className="px-2 text-center text-xs text-zinc-400">
              <Receipt className="mr-1 inline h-3.5 w-3.5" />
              Na proposta do cliente aparece somente o <b>preço final</b>.
            </p>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 border-t border-white/10 bg-zinc-900/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-3">
          <button onClick={() => setSheet(true)} className="min-w-0 flex-1 text-left">
            <p className="text-[11px] font-semibold text-zinc-400">Preço final</p>
            <p className="tnum font-display text-xl font-semibold tracking-tight">{result.valid ? brl(result.finalPrice) : "—"}</p>
          </button>
          <Button variant="secondary" onClick={() => setSheet(true)}>
            <FileText className="h-4 w-4" /> Detalhes
          </Button>
          <Button onClick={() => save()} loading={saving}>
            Salvar
          </Button>
        </div>
      </div>
      {showNewLead && (
        <NewLeadModal
          service="save"
          onClose={() => setShowNewLead(false)}
          onCreated={(id) => {
            setLeadId(id);
            setDirty(true);
          }}
        />
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSheet(false)} />
          <div className="animate-sheet-up absolute inset-x-0 bottom-0 max-h-[90dvh] overflow-y-auto rounded-t-3xl bg-zinc-950 border border-white/5 pb-[env(safe-area-inset-bottom)]">
            <button onClick={() => setSheet(false)} className="absolute top-4 right-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white" aria-label="Fechar">
              <X className="h-4 w-4" />
            </button>
            <SaveCheckout inputs={inputs} result={result} />
          </div>
        </div>
      )}
    </div>
  );
}

function ScopeToggle({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={cx("flex cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 ring-1 transition", checked ? "bg-lime-400/10 ring-lime-400/30" : "bg-black/20 ring-white/5")}>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-zinc-400">{hint}</p>
      </div>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function SaveCheckout({ inputs, result }: { inputs: SaveInputs; result: ReturnType<typeof calcSave> }) {
  const Row = ({ label, detail, value, strong }: { label: string; detail?: string; value: number; strong?: boolean }) => (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <div className="min-w-0">
        <p className={cx("text-[13px]", strong ? "font-semibold text-white" : "text-zinc-300")}>{label}</p>
        {detail && <p className="truncate text-[11px] text-zinc-400">{detail}</p>}
      </div>
      <p className={cx("tnum shrink-0 text-[13px]", strong ? "font-semibold text-white" : "text-zinc-200")}>{brl(value)}</p>
    </div>
  );
  const comp = (name: string, c: SaveInputs["commission"]) => (c.mode === "percent" ? `${name} (${fmtNum(c.value, c.value % 1 ? 1 : 0)}%)` : name);
  return (
    <div className="relative overflow-hidden rounded-3xl bg-zinc-950 border border-white/5 text-white shadow-lift">
      <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-sun-500/20 blur-3xl" />
      <div className="relative px-6 pt-6">
        <p className="text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase">Resumo S.A.V.E</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Mini label="Carregador" value={`${fmtNum(inputs.chargerPowerKw, 1)} kW`} />
          <Mini label="Distância" value={`${fmtNum(inputs.distanceM)} m`} />
          <Mini label="Execução" value={`${inputs.executionDays} dias`} />
        </div>
      </div>
      <div className="relative mt-5 border-t border-dashed border-white/10 px-6 pt-4">
        <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase">Custos diretos</p>
        {result.lines.map((l) => (
          <Row key={l.key} label={l.label} detail={l.detail} value={l.value} />
        ))}
        <div className="mt-1 border-t border-white/10 pt-1">
          <Row label="Custo total" value={result.directCost} strong />
        </div>
      </div>
      <div className="relative mt-3 border-t border-dashed border-white/10 px-6 pt-4">
        <p className="mb-1 text-[11px] font-bold tracking-[0.14em] text-zinc-400 uppercase">Formação de preço</p>
        <Row label={comp("Comissão", inputs.commission)} value={result.commissionValue} />
        <Row label={comp("Impostos", inputs.tax)} value={result.taxValue} />
        <Row label={comp("Lucro", inputs.profit)} detail={`Margem líquida ${pct(result.netMargin)}`} value={result.profitValue} />
        {result.discountValue > 0 && (
          <div className="mt-3 rounded border border-white/5 bg-white/5 px-3 py-2 text-[11px] leading-relaxed text-zinc-400">
            Ajustes absorvidos pelo lucro: desconto de {brl(result.discountValue)}.
          </div>
        )}
      </div>
      <div className="relative mt-4 bg-white/[0.03] px-6 py-5">
        {result.error ? (
          <p className="text-sm text-rose-300">{result.error}</p>
        ) : (
          <>
            <div className="flex items-end justify-between gap-3">
              <p className="pb-1 text-sm font-medium text-zinc-500">Preço final</p>
              <p className="tnum font-display text-[34px] leading-none font-semibold tracking-tight text-brand-lime">{brl(result.finalPrice)}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <Mini label="Markup" value={`${fmtNum(result.markup, 2)}×`} />
              <Mini label="Lucro" value={brl(result.profitValue, 0)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-white/[0.05] px-2 py-2 text-center ring-1 ring-white/[0.06]">
      <p className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">{label}</p>
      <p className="tnum mt-0.5 text-[13px] font-semibold text-white">{value}</p>
    </div>
  );
}

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Table, Search, Settings2, Package, Check, ArrowRight, TrendingUp, SunMedium, Zap, Calculator, Plus, Share2, FileText, ChevronDown, ChevronUp, X, Save } from "lucide-react";
import { useApp } from "@/components/app/app-context";
import { Badge, Button, Card, CardHeader, Input, MoneyInput, NumberInput, Segmented, cx, Field } from "@/components/ui";
import { brl, calcPricing, calcFinancing, type ProposalInputs } from "@/lib/pricing";
import { mergeInputs, toStoredSettings, type KitPreset } from "@/lib/defaults";
import { whatsappUrl } from "@/lib/format";
import { supabase } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

export default function PriceList() {
  const { settings, settingsLoaded } = useApp();
  const navigate = useNavigate();

  // Settings Simulation Variables
  const [q, setQ] = useState("");
  const [minKw, setMinKw] = useState<number | "">("");
  const [maxKw, setMaxKw] = useState<number | "">("");
  const [profitMargin, setProfitMargin] = useState<number>(20);
  const [commission, setCommission] = useState<number>(5);
  const [tax, setTax] = useState<number>(6);
  const [laborPerModule, setLaborPerModule] = useState<number>(110);
  const [electricalPerKwp, setElectricalPerKwp] = useState<number>(120);
  const [artCost, setArtCost] = useState<number>(300);

  // Modal State
  const [showNewKit, setShowNewKit] = useState(false);

  React.useEffect(() => {
    if (settingsLoaded) {
      setLaborPerModule(settings.defaults?.laborPerModule || 110);
      setElectricalPerKwp(settings.defaults?.electricalPerKwp || 120);
      setProfitMargin(settings.defaults?.profit?.value || 20);
      setCommission(settings.defaults?.commission?.value || 5);
      setTax(settings.defaults?.tax?.value || 6);
    }
  }, [settingsLoaded, settings.defaults]);

  const kits = settings.kits || [];
  
  const filteredKits = useMemo(() => {
    let list = kits;
    if (q) {
      const lower = q.toLowerCase();
      list = list.filter(k => 
        (k.name || "").toLowerCase().includes(lower) || 
        (k.moduleBrand || "").toLowerCase().includes(lower) || 
        (k.inverterBrand || "").toLowerCase().includes(lower)
      );
    }
    if (minKw !== "") {
      list = list.filter(k => (k.modulePowerW * k.moduleQty) / 1000 >= Number(minKw));
    }
    if (maxKw !== "") {
      list = list.filter(k => (k.modulePowerW * k.moduleQty) / 1000 <= Number(maxKw));
    }
    return list;
  }, [kits, q, minKw, maxKw]);

  const simulatedKits = useMemo(() => {
    return filteredKits.map(kit => {
      const mockInputs: ProposalInputs = mergeInputs({
        ...settings.defaults,
        kitPrice: kit.kitPrice,
        moduleBrand: kit.moduleBrand,
        modulePowerW: kit.modulePowerW,
        moduleQty: kit.moduleQty,
        inverterBrand: kit.inverterBrand,
        inverterPowerKw: kit.inverterPowerKw,
        inverterQty: kit.inverterQty || 1,
        laborPerModule,
        electricalPerKwp,
        extraCosts: [{ id: "art", label: "ART", value: artCost }],
        profit: { mode: "percent", value: profitMargin },
        commission: { mode: "percent", value: commission },
        tax: { mode: "percent", value: tax },
        discount: 0,
        roundTo: 0,
        consumptionKwh: 500,
        tariff: 0.95,
        financingRate: 1.49,
        financingTerms: [12, 24, 36, 48, 60, 72]
      });

      const pricing = calcPricing(mockInputs);
      const financing = calcFinancing(pricing.finalPrice, mockInputs.financingRate, mockInputs.financingTerms);
      const powerKw = (kit.modulePowerW * kit.moduleQty) / 1000;
      
      return { kit, pricing, financing, powerKw, inputs: mockInputs };
    }).sort((a, b) => a.powerKw - b.powerKw);
  }, [filteredKits, laborPerModule, electricalPerKwp, artCost, profitMargin, commission, tax, settings.defaults]);

  const handleShare = (row: typeof simulatedKits[0]) => {
    const { kit, pricing, financing, powerKw } = row;
    const txt = `*Proposta Rápida - Gerador Fotovoltaico*\n\n` +
      `⚡ *Potência:* ${powerKw.toFixed(2)} kWp\n` +
      `📦 *Equipamentos:*\n` +
      `• ${kit.moduleQty}x Módulos ${kit.moduleBrand} ${kit.modulePowerW}W\n` +
      `• Inversor ${kit.inverterBrand} ${kit.inverterPowerKw}kW\n\n` +
      `💰 *Investimento à vista:* ${brl(pricing.finalPrice)}\n\n` +
      `🏦 *Opções de Financiamento:*\n` +
      financing.map(f => `• ${f.months}x de ${brl(f.installment)}`).join('\n') +
      `\n\n_Valores sujeitos a análise de crédito e validade da proposta._`;

    window.open(whatsappUrl("", txt), '_blank');
  };

  if (!settingsLoaded) return <div className="p-8 text-center text-zinc-500 animate-pulse">Carregando catálogo...</div>;

  return (
    <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            <Calculator className="h-7 w-7 text-lime-500" />
            Tabela de Preços e Kits
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Simulação dinâmica do catálogo. Os preços abaixo já incluem todos os custos indiretos.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowNewKit(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Kit
          </Button>
          <Link to="/propostas/nova">
            <Button variant="sun">
              Novo Orçamento <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Control Panel (Variables) */}
      <Card className="border border-white/5 bg-zinc-900/50 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <Settings2 className="h-4 w-4 text-zinc-400" /> Variáveis da Simulação (em tempo real)
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6 lg:grid-cols-8">
          <div className="space-y-1.5 col-span-2 md:col-span-1">
            <label className="text-[11px] font-bold tracking-wider text-lime-500 uppercase">Margem Alvo (%)</label>
            <Input type="number" max={100} value={profitMargin} onChange={e => setProfitMargin(Number(e.target.value))} className="border-lime-500/30 bg-lime-500/5 text-lime-400 font-bold" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Imposto NF (%)</label>
            <Input type="number" max={100} value={tax} onChange={e => setTax(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Comissão (%)</label>
            <Input type="number" max={100} value={commission} onChange={e => setCommission(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-2">
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Instalação (R$/placa)</label>
            <MoneyInput value={laborPerModule} onChange={setLaborPerModule} />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-2">
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">Material (R$/kWp)</label>
            <MoneyInput value={electricalPerKwp} onChange={setElectricalPerKwp} />
          </div>
          <div className="space-y-1.5 col-span-2 md:col-span-1 lg:col-span-1">
            <label className="text-[11px] font-bold tracking-wider text-zinc-500 uppercase">ART (R$)</label>
            <MoneyInput value={artCost} onChange={setArtCost} />
          </div>
        </div>
      </Card>

      {/* Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por marca ou nome..." className="pl-10" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Input 
            type="number" 
            placeholder="Mín kWp" 
            value={minKw} 
            onChange={(e) => setMinKw(e.target.value ? Number(e.target.value) : "")} 
            className="w-24"
          />
          <span className="text-zinc-600">-</span>
          <Input 
            type="number" 
            placeholder="Máx kWp" 
            value={maxKw} 
            onChange={(e) => setMaxKw(e.target.value ? Number(e.target.value) : "")} 
            className="w-24"
          />
        </div>
        <div className="text-sm text-zinc-500 font-medium ml-auto">
          {simulatedKits.length} {simulatedKits.length === 1 ? 'kit encontrado' : 'kits encontrados'}
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-xl border border-white/5 bg-zinc-900 shadow-2xl">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-zinc-800/50 text-[11px] font-bold tracking-wider text-zinc-400 uppercase hidden md:table-header-group">
            <tr>
              <th className="px-4 py-3">Fornecedor / Kit</th>
              <th className="px-4 py-3">Potência</th>
              <th className="px-4 py-3 text-right">Mão de Obra+Mat</th>
              <th className="px-4 py-3 text-right">Custo Base Total</th>
              <th className="px-4 py-3 text-right text-emerald-500">Lucro (R$)</th>
              <th className="px-4 py-3 text-right text-lime-400">Preço à Vista</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 block md:table-row-group">
            {simulatedKits.map((row) => (
              <KitRow key={row.kit.id} row={row} onShare={() => handleShare(row)} />
            ))}
            
            {simulatedKits.length === 0 && (
              <tr className="block md:table-row">
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500 block md:table-cell">
                  Nenhum kit encontrado. Ajuste os filtros ou crie um novo kit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {showNewKit && <NewKitModal onClose={() => setShowNewKit(false)} />}
    </div>
  );
}

function KitRow({ row, onShare }: { row: any; onShare: () => void }) {
  const { kit, pricing, financing, powerKw } = row;
  const [expanded, setExpanded] = useState(false);

  const opCost = pricing.lines.find((l: any) => l.key === 'labor')?.value || 0;
  const eleCost = pricing.lines.find((l: any) => l.key === 'electrical')?.value || 0;
  const extCost = pricing.lines.find((l: any) => l.key === 'extra')?.value || 0;
  const totalOpCost = opCost + eleCost + extCost;
  const costBase = kit.kitPrice + totalOpCost;

  return (
    <>
      <tr className="transition-colors hover:bg-zinc-800/40 block md:table-row border-b border-zinc-800/60 md:border-b-0 p-4 md:p-0">
        <td className="md:px-4 md:py-3 block md:table-cell mb-2 md:mb-0">
          <p className="font-semibold text-white">{kit.name || "Sem Nome"}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-normal">{kit.moduleBrand}</Badge>
            <Badge className="bg-zinc-800 text-zinc-300 border-zinc-700 font-normal">{kit.inverterBrand}</Badge>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1.5">
            <SunMedium className="h-3 w-3" /> {kit.moduleQty}x {kit.modulePowerW}W 
            <span className="mx-1">•</span> 
            <Zap className="h-3 w-3" /> {kit.inverterQty || 1}x {kit.inverterPowerKw}kW
          </p>
        </td>
        <td className="md:px-4 md:py-3 md:text-left block md:table-cell mb-2 md:mb-0">
          <span className="md:hidden text-xs text-zinc-500 uppercase font-bold mr-2">Potência:</span>
          <span className="font-display font-semibold text-white">{powerKw.toFixed(2)} kWp</span>
        </td>
        <td className="md:px-4 md:py-3 md:text-right text-zinc-500 text-xs block md:table-cell mb-2 md:mb-0">
          <span className="md:hidden text-xs text-zinc-500 uppercase font-bold mr-2">Instalação:</span>
          {brl(totalOpCost, 2)}
        </td>
        <td className="md:px-4 md:py-3 md:text-right block md:table-cell mb-2 md:mb-0">
          <span className="md:hidden text-xs text-zinc-500 uppercase font-bold mr-2">Custo Base:</span>
          <span className="text-zinc-300">{brl(costBase, 2)}</span>
          <p className="text-[10px] text-zinc-500">Kit: {brl(kit.kitPrice)}</p>
        </td>
        <td className="md:px-4 md:py-3 md:text-right text-emerald-500/80 font-medium block md:table-cell mb-2 md:mb-0">
          <span className="md:hidden text-xs text-zinc-500 uppercase font-bold mr-2">Lucro:</span>
          {brl(pricing.profitValue, 2)}
        </td>
        <td className="md:px-4 md:py-3 md:text-right block md:table-cell mb-4 md:mb-0">
          <span className="md:hidden text-xs text-zinc-500 uppercase font-bold mr-2">Venda:</span>
          <p className="font-display font-bold text-lg tracking-tight text-lime-400">
            {pricing.valid ? brl(pricing.finalPrice) : "ERRO"}
          </p>
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-zinc-400 hover:text-zinc-200 font-semibold uppercase flex items-center justify-end w-full md:w-auto ml-auto gap-0.5 mt-0.5"
          >
            Ver parcelas {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        </td>
        <td className="md:px-4 md:py-3 text-center block md:table-cell">
          <div className="flex items-center justify-end md:justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={onShare} title="Compartilhar WhatsApp">
              <Share2 className="h-4 w-4" />
            </Button>
            <Link to={`/propostas/nova`}>
              <Button size="sm" variant="outline" title="Criar Proposta">
                <FileText className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </td>
      </tr>
      
      {/* Expanded Row for Financing */}
      {expanded && (
        <tr className="bg-zinc-900/80 block md:table-row border-b border-zinc-800/60 md:border-b-0 shadow-inner">
          <td colSpan={7} className="px-4 py-4 block md:table-cell">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-zinc-300">
              <Calculator className="h-4 w-4 text-lime-500" /> Simulação de Financiamento (Tabela Price)
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              {financing.map((f: any) => (
                <div key={f.months} className="bg-zinc-800/50 rounded-lg p-3 border border-zinc-700/50 text-center">
                  <p className="text-[11px] text-zinc-400 font-bold tracking-widest uppercase mb-1">{f.months}x</p>
                  <p className="font-display font-bold text-sm text-white">{brl(f.installment)}</p>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ── New Kit Modal ──
function NewKitModal({ onClose }: { onClose: () => void }) {
  const { settings } = useApp();
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState<Partial<KitPreset>>({
    name: "",
    kitPrice: 0,
    moduleBrand: "",
    modulePowerW: 0,
    moduleQty: 0,
    inverterBrand: "",
    inverterPowerKw: 0,
    inverterQty: 1,
    structureType: "Telhado cerâmico",
  });

  const set = (k: keyof KitPreset, v: any) => setFormData(p => ({ ...p, [k]: v }));

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.kitPrice || !formData.moduleQty) {
      toast.error("Preencha os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const kit: KitPreset = {
        id: crypto.randomUUID(),
        name: formData.name,
        kitPrice: Number(formData.kitPrice),
        moduleBrand: formData.moduleBrand || "",
        moduleModel: "",
        modulePowerW: Number(formData.modulePowerW),
        moduleQty: Number(formData.moduleQty),
        inverterBrand: formData.inverterBrand || "",
        inverterModel: "",
        inverterPowerKw: Number(formData.inverterPowerKw),
        inverterQty: Number(formData.inverterQty),
        structureType: formData.structureType || "Telhado cerâmico",
      };

      const { error } = await supabase().from("settings").upsert({ 
        id: 1, 
        data: toStoredSettings({ ...settings, kits: [kit, ...(settings.kits || [])] }) 
      });
      
      if (error) throw error;
      toast.success("Kit salvo com sucesso!");
      window.location.reload(); // Quick refresh to update context
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar kit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-2xl bg-zinc-950 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-zinc-800 p-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="h-5 w-5 text-lime-500" />
            Cadastrar Novo Kit
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-6">
          <Field label="Nome de Referência do Kit">
            <Input value={formData.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Solfácil 4kWp Microinversor" autoFocus required />
          </Field>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Preço de Custo do Distribuidor (R$)">
              <MoneyInput value={formData.kitPrice} onChange={v => set('kitPrice', v)} className="[&_input]:border-lime-500/30 [&_input]:bg-lime-500/5 [&_input]:text-lime-400 font-bold" />
            </Field>
            <Field label="Tipo de Estrutura">
              <Input value={formData.structureType} onChange={e => set('structureType', e.target.value)} placeholder="Ex: Telhado cerâmico" />
            </Field>
          </div>

          <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><SunMedium className="h-4 w-4 text-amber-500" /> Módulos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Marca">
                <Input value={formData.moduleBrand} onChange={e => set('moduleBrand', e.target.value)} placeholder="Ex: Canadian" />
              </Field>
              <Field label="Potência (W)">
                <NumberInput value={formData.modulePowerW} onChange={v => set('modulePowerW', v)} />
              </Field>
              <Field label="Quantidade">
                <NumberInput value={formData.moduleQty} onChange={v => set('moduleQty', v)} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /> Inversor</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field label="Marca">
                <Input value={formData.inverterBrand} onChange={e => set('inverterBrand', e.target.value)} placeholder="Ex: Growatt" />
              </Field>
              <Field label="Potência (kW)">
                <NumberInput value={formData.inverterPowerKw} onChange={v => set('inverterPowerKw', v)} />
              </Field>
              <Field label="Quantidade">
                <NumberInput value={formData.inverterQty} onChange={v => set('inverterQty', v)} />
              </Field>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="submit" variant="sun" disabled={saving}>
              {saving ? 'Salvando...' : <><Save className="h-4 w-4 mr-2" /> Salvar Kit</>}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

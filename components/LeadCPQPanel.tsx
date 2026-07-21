import React, { useState } from 'react';
import { FileText, Download, Calculator, Sparkles, Loader2, Zap, Settings2 } from 'lucide-react';
import { Lead } from '../types';
import { calcRecommendedPower, calcSolar, calcFinancingOptions } from './proposal/solarCalc';
import { pdf } from '@react-pdf/renderer';
import { ProposalPDF } from './proposal/ProposalPDF';
import { buildInitialBlocks } from './proposal/catalog';
import { ProposalData, DEFAULT_THEME } from './proposal/types';

interface LeadCPQPanelProps {
    lead: Lead;
    onUpdateLead?: (data: Partial<Lead>) => void;
}

export const LeadCPQPanel: React.FC<LeadCPQPanelProps> = ({ lead, onUpdateLead }) => {
    const [consumption, setConsumption] = useState<number>(lead.monthlyConsumption || 500);
    const [tariff, setTariff] = useState<number>(0.95);
    const [connectionType, setConnectionType] = useState<'mono' | 'bi' | 'tri'>('bi');
    
    // Configurações do Kit
    const [pricePerWp, setPricePerWp] = useState<number>(3.5); // R$/Wp
    const [margin, setMargin] = useState<number>(30); // %
    
    const [isGenerating, setIsGenerating] = useState(false);
    
    // Cálculo Dinâmico
    const recommendedKwp = calcRecommendedPower(consumption, 130, 1.0);
    const finalPrice = recommendedKwp * 1000 * pricePerWp * (1 + margin / 100);
    
    const result = calcSolar({
        monthlyConsumptionKwh: consumption,
        tariffRate: tariff,
        fiobEffective: tariff * 0.45,
        publicLighting: 0,
        connectionType,
        generationFactor: 130,
        systemPowerKwp: recommendedKwp,
        finalPrice,
        tariffAdjustmentRate: 7,
        systemLifeYears: 25,
        tma: 12
    });

    const handleGeneratePDF = async () => {
        setIsGenerating(true);
        try {
            const baseData: ProposalData = {
                clientName: lead.name,
                city: lead.city || '',
                consumption: consumption,
                systemSizeKw: recommendedKwp,
                moduleBrand: 'Canadian Solar',
                modulePower: 550,
                modulesCount: Math.ceil((recommendedKwp * 1000) / 550),
                inverterBrand: 'Growatt',
                inverterPower: recommendedKwp,
                inverterCount: 1,
                pricePerModule: pricePerWp * 550,
                priceKit: finalPrice * 0.6,
                priceCA: finalPrice * 0.1,
                taxPercentage: 10,
                profitPercentage: margin,
                additionalCosts: 0,
                finalPrice: finalPrice,
                monthlyGenerationKwh: result.monthlyGenerationKwh,
                monthlySavings: result.monthlySavings,
                paybackYears: result.paybackYears,
                co2EvitedKgYear: result.co2EvitedKgYear
            };
            
            // Build blocks with calculated data
            const generatedBlocks = buildInitialBlocks(baseData);
            
            const blob = await pdf(<ProposalPDF blocks={generatedBlocks} theme={DEFAULT_THEME} clientName={lead.name} />).toBlob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Proposta_Quark_${lead.name.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Atualizar lead com valor da proposta
            if (onUpdateLead) {
                onUpdateLead({ value: finalPrice });
            }
            
        } catch (error) {
            console.error("Erro ao gerar PDF:", error);
            alert("Erro ao gerar PDF");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Inputs do CPQ */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Calculator size={16} className="text-lime-400" /> Dimensionamento
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Consumo Médio (kWh/mês)</label>
                            <input type="number" value={consumption} onChange={e => setConsumption(Number(e.target.value))}
                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-2.5 text-white w-full outline-none focus:border-lime-500 transition-colors" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Tarifa (R$/kWh)</label>
                            <input type="number" step="0.01" value={tariff} onChange={e => setTariff(Number(e.target.value))}
                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-2.5 text-white w-full outline-none focus:border-lime-500 transition-colors" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Tipo de Ligação</label>
                            <select value={connectionType} onChange={e => setConnectionType(e.target.value as any)}
                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-2.5 text-white w-full outline-none focus:border-lime-500 transition-colors">
                                <option value="mono">Monofásico (30 kWh)</option>
                                <option value="bi">Bifásico (50 kWh)</option>
                                <option value="tri">Trifásico (100 kWh)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Margens e Preço */}
                <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Settings2 size={16} className="text-lime-400" /> Precificação
                    </h3>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Custo (R$/Wp)</label>
                            <input type="number" step="0.1" value={pricePerWp} onChange={e => setPricePerWp(Number(e.target.value))}
                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-2.5 text-white w-full outline-none focus:border-lime-500 transition-colors" />
                        </div>
                        
                        <div>
                            <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Margem de Lucro (%)</label>
                            <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))}
                                className="bg-black/50 border border-zinc-700/50 rounded-lg p-2.5 text-white w-full outline-none focus:border-lime-500 transition-colors" />
                        </div>
                        
                        <div className="mt-4 p-4 bg-lime-500/10 border border-lime-500/20 rounded-xl">
                            <p className="text-xs text-lime-400 font-bold uppercase tracking-wider mb-1">Preço Final Sugerido</p>
                            <p className="text-2xl font-black text-white">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalPrice)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Resultados Rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Potência</p>
                    <p className="text-lg font-bold text-white">{recommendedKwp.toFixed(2)} kWp</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Geração</p>
                    <p className="text-lg font-bold text-white">{Math.round(result.monthlyGenerationKwh)} kWh/mês</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Economia Mensal</p>
                    <p className="text-lg font-bold text-green-400">R$ {Math.round(result.monthlySavings)}</p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Payback</p>
                    <p className="text-lg font-bold text-white">{result.paybackYears.toFixed(1)} anos</p>
                </div>
            </div>

            {/* Ação Principal */}
            <div className="pt-4">
                <button 
                    onClick={handleGeneratePDF}
                    disabled={isGenerating}
                    className="w-full py-4 bg-lime-500 hover:bg-lime-400 text-black rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    {isGenerating ? 'Gerando PDF com IA...' : 'Gerar Proposta Comercial PDF'}
                </button>
            </div>
        </div>
    );
};

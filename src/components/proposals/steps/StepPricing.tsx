import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, PlusCircle, Calculator, ChevronRight, ChevronLeft, Percent, TrendingUp } from 'lucide-react';
import type { ProposalData } from '../../proposal/types';
import { calcSolar } from '../../proposal/solarCalc';

interface StepPricingProps {
  data: Partial<ProposalData>;
  onUpdate: (data: Partial<ProposalData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepPricing({ data, onUpdate, onNext, onBack }: StepPricingProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const modulesCount = data.modulesCount || 0;
  const systemSizeKw = data.systemSizeKw || 0;

  useEffect(() => {
    let updates: Partial<ProposalData> = {};
    if (data.installationCost === undefined && modulesCount > 0) {
      updates.installationCost = 110 * modulesCount;
    }
    if (data.priceCA === undefined) {
      updates.priceCA = 110;
    }
    if (data.profitPercentage === undefined) {
      updates.profitPercentage = 20;
    }
    if (data.taxPercentage === undefined) {
      updates.taxPercentage = 0;
    }
    if (Object.keys(updates).length > 0) {
      onUpdate(updates);
    }
  }, [data.installationCost, data.priceCA, data.profitPercentage, data.taxPercentage, modulesCount, onUpdate]);

  const priceKit = data.priceKit || 0;
  const priceCA = data.priceCA !== undefined ? data.priceCA : 110;
  const installationCost = data.installationCost !== undefined ? data.installationCost : (110 * modulesCount);
  const additionalCosts = data.additionalCosts || 0;

  const taxPercentage = data.taxPercentage || 0;
  const profitPercentage = data.profitPercentage !== undefined ? data.profitPercentage : 20;

  // Cálculo de custos
  const brutoEquipment = priceKit + (priceCA * systemSizeKw);
  const brutoTotal = brutoEquipment + installationCost + additionalCosts;
  
  // Cálculo final (Markup)
  const marginFactor = 1 - ((taxPercentage / 100) + (profitPercentage / 100));
  const finalPrice = marginFactor > 0 ? brutoTotal / marginFactor : 0;
  
  // R$/Wp
  const pricePerWp = (finalPrice > 0 && systemSizeKw > 0) ? finalPrice / (systemSizeKw * 1000) : 0;

  useEffect(() => {
    if (finalPrice !== data.finalPrice) {
      onUpdate({ finalPrice });
    }
  }, [finalPrice, data.finalPrice, onUpdate]);

  // Preview Financeiro
  const [financialPreview, setFinancialPreview] = useState<any>(null);

  useEffect(() => {
    if (finalPrice > 0 && systemSizeKw > 0 && data.consumption) {
      try {
        const result = calcSolar({
          monthlyConsumptionKwh: data.consumption,
          tariffRate: data.tariffRate || 0.95,
          fiobEffective: (data.fiobRate || 0.45) * 0.45, 
          publicLighting: data.publicLighting || 0,
          connectionType: data.connectionType || 'mono',
          generationFactor: data.generationFactor || 125,
          systemPowerKwp: systemSizeKw,
          finalPrice: finalPrice,
          tariffAdjustmentRate: 7,
          systemLifeYears: 25,
          tma: 12
        });
        setFinancialPreview(result);
      } catch (err) {
        console.error("Erro ao calcular preview", err);
      }
    } else {
      setFinancialPreview(null);
    }
  }, [finalPrice, systemSizeKw, data]);

  const handleChange = (field: keyof ProposalData, value: any) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    onUpdate({ [field]: value });
  };

  const validateAndNext = () => {
    const newErrors: { [key: string]: string } = {};

    if (!priceKit || priceKit <= 0) newErrors.priceKit = 'Insira o preço do kit';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  const inputClass = "w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition-all placeholder:text-zinc-600";
  const labelClass = "block text-sm text-zinc-400 font-medium mb-1.5";
  const sectionTitleClass = "text-lg md:text-xl font-semibold text-white truncate mb-4 flex items-center gap-2";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 lg:p-8 space-y-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Lado Esquerdo: Formulários */}
        <div className="space-y-8">
          
          {/* Custos de Equipamento */}
          <div>
            <h3 className={sectionTitleClass}><Calculator className="w-5 h-5 text-lime-400" /> Custos de Equipamento</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Preço Kit Fornecedor (Inversor, Módulos, Estrutura, Cabos)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input 
                    type="number" 
                    value={priceKit || ''} 
                    onChange={e => handleChange('priceKit', Number(e.target.value))}
                    className={`${inputClass} pl-10`}
                    placeholder="Ex: 15000"
                  />
                </div>
                {errors.priceKit && <p className="text-red-400 text-xs mt-1">{errors.priceKit}</p>}
              </div>
              <div>
                <label className={labelClass}>Preço Material CA (R$/kWp)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input 
                    type="number" 
                    value={priceCA || ''} 
                    onChange={e => handleChange('priceCA', Number(e.target.value))}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">Sugerido: R$ 110 por kWp. Total CA: R$ {(priceCA * systemSizeKw).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* Custos Adicionais */}
          <div className="border-t border-white/5 pt-6">
            <h3 className={sectionTitleClass}><PlusCircle className="w-5 h-5 text-lime-400" /> Custo de Instalação e Extras</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Mão de Obra / Instalação (R$)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input 
                    type="number" 
                    value={installationCost || ''} 
                    onChange={e => handleChange('installationCost', Number(e.target.value))}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <p className="text-zinc-500 text-xs mt-1">Sugerido: R$ 110 por módulo ({modulesCount} módulos = R$ {((modulesCount || 0) * 110).toLocaleString('pt-BR')})</p>
              </div>
              <div>
                <label className={labelClass}>Custos Adicionais (Frete, Seguro, etc) (R$)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
                  <input 
                    type="number" 
                    value={additionalCosts || ''} 
                    onChange={e => handleChange('additionalCosts', Number(e.target.value))}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Margens e Impostos */}
          <div className="border-t border-white/5 pt-6">
            <h3 className={sectionTitleClass}><Percent className="w-5 h-5 text-lime-400" /> Margem e Impostos (Markup)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Imposto (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={taxPercentage || ''} 
                    onChange={e => handleChange('taxPercentage', Number(e.target.value))}
                    className={`${inputClass} pr-10`}
                  />
                  <Percent className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Margem de Lucro Líquida (%)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={profitPercentage || ''} 
                    onChange={e => handleChange('profitPercentage', Number(e.target.value))}
                    className={`${inputClass} pr-10`}
                  />
                  <Percent className="w-4 h-4 text-zinc-500 absolute right-3 top-3.5" />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Lado Direito: Preview de Custos */}
        <div className="space-y-6">
          <div className="bg-zinc-800/30 border border-white/5 rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <Calculator className="w-32 h-32 text-white" />
            </div>
            
            <h3 className="text-xl font-medium text-white mb-6">Composição de Preço</h3>
            
            <div className="space-y-4 text-sm relative z-10">
              <div className="flex justify-between items-center text-zinc-300">
                <span>Kit Equipamentos</span>
                <span>R$ {priceKit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Material CA</span>
                <span>R$ {(priceCA * systemSizeKw).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Instalação / Mão de Obra</span>
                <span>R$ {installationCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Custos Adicionais</span>
                <span>R$ {additionalCosts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              
              <div className="border-t border-white/10 pt-4 flex justify-between items-center font-medium text-white">
                <span>Custo Bruto (S/ Imposto e Lucro)</span>
                <span>R$ {brutoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-300 pt-2">
                <span>Imposto ({taxPercentage}%)</span>
                <span>R$ {(finalPrice * (taxPercentage/100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-zinc-300">
                <span>Lucro Bruto ({profitPercentage}%)</span>
                <span className="text-lime-400">R$ {(finalPrice * (profitPercentage/100)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="mt-8 bg-lime-400/10 border border-lime-400/20 rounded-lg p-4 relative z-10">
              <p className="text-lime-400/80 font-medium mb-1">Preço Final de Venda</p>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-lime-400">
                  R$ {finalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              {pricePerWp > 0 && (
                <p className="text-zinc-400 text-sm mt-2">
                  R$ {pricePerWp.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / Wp
                </p>
              )}
            </div>
          </div>

          {financialPreview && (
            <div className="bg-zinc-800/30 border border-white/5 rounded-xl p-6">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-lime-400" />
                Indicadores Financeiros
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                  <p className="text-xs text-zinc-400 mb-1 truncate">Payback</p>
                  <p className="text-lg md:text-xl font-semibold text-white truncate">
                    {Math.floor(financialPreview.paybackYears)} anos e {Math.round(financialPreview.paybackMonths % 12)} meses
                  </p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3 border border-white/5">
                  <p className="text-xs text-zinc-400 mb-1 truncate">Retorno sobre Investimento</p>
                  <p className="text-lg md:text-xl font-semibold text-lime-400 truncate">
                    +{financialPreview.roi.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-zinc-400 hover:text-white px-4 py-2 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Voltar
        </button>
        <button 
          onClick={validateAndNext}
          className="flex items-center gap-2 bg-lime-400 text-zinc-900 px-6 py-3 rounded-lg font-semibold hover:bg-lime-500 transition-colors"
        >
          Próximo
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </motion.div>
  );
}

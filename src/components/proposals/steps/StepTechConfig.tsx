import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Zap, Hash, Battery, Gauge, ChevronRight, ChevronLeft } from 'lucide-react';
import type { ProposalData } from '../../proposal/types';
import { calcRecommendedPower } from '../../proposal/solarCalc';

interface StepTechConfigProps {
  data: Partial<ProposalData>;
  onUpdate: (data: Partial<ProposalData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function StepTechConfig({ data, onUpdate, onNext, onBack }: StepTechConfigProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const consumption = data.consumption || 0;
  const generationFactor = data.generationFactor || 130;
  
  const recommendedPower = calcRecommendedPower(consumption, generationFactor);
  
  const modulePower = data.modulePower || 550;
  const modulesCount = data.modulesCount || 0;
  const inverterPower = data.inverterPower || 0;
  const inverterCount = data.inverterCount || 1;

  const systemSizeKw = (modulesCount * modulePower) / 1000;
  const roofArea = modulesCount * 2.2;
  const estimatedGeneration = systemSizeKw * generationFactor;

  // Atualizar systemSizeKw no objeto data caso mude
  useEffect(() => {
    if (systemSizeKw !== data.systemSizeKw) {
      onUpdate({ systemSizeKw });
    }
  }, [systemSizeKw, data.systemSizeKw, onUpdate]);

  const validateAndNext = () => {
    const newErrors: { [key: string]: string } = {};

    if (modulePower <= 0) newErrors.modulePower = 'Potência inválida';
    if (modulesCount <= 0) newErrors.modulesCount = 'Quantidade inválida';
    if (inverterPower <= 0) newErrors.inverterPower = 'Potência inválida';
    if (inverterCount <= 0) newErrors.inverterCount = 'Quantidade inválida';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  const handleChange = (field: keyof ProposalData, value: any) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    onUpdate({ [field]: value });
  };

  const pctRecommended = recommendedPower > 0 ? (systemSizeKw / recommendedPower) * 100 : 0;
  let progressColor = 'bg-red-500';
  if (pctRecommended >= 90) progressColor = 'bg-lime-400';
  else if (pctRecommended >= 70) progressColor = 'bg-yellow-400';

  const inputClass = "w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition-all placeholder:text-zinc-600";
  const labelClass = "block text-sm text-zinc-400 font-medium mb-1.5";
  const sectionTitleClass = "text-lg font-semibold text-white mb-4 flex items-center gap-2";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 lg:p-8 space-y-8"
    >
      {/* Seção 1 — Potência Recomendada */}
      <div className="bg-lime-400/10 border border-lime-400/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-lime-400 font-medium text-sm mb-1">Potência Recomendada</h4>
          <p className="text-white text-2xl font-bold">{recommendedPower.toFixed(2)} <span className="text-sm font-normal text-zinc-400">kWp</span></p>
        </div>
        <div className="text-right sm:text-left text-zinc-300 text-sm">
          Para o consumo médio de <strong className="text-white">{consumption.toFixed(0)} kWh/mês</strong><br/>
          (Fator de geração: {generationFactor})
        </div>
      </div>

      {/* Datalists for Autocomplete */}
      <datalist id="module-brands">
        {['Jinko Solar', 'Canadian Solar', 'Trina Solar', 'Risen Energy', 'DAH Solar', 'JA Solar', 'Longi', 'Osda', 'GCL'].map(b => <option key={b} value={b} />)}
      </datalist>
      <datalist id="module-powers">
        {[460, 500, 545, 550, 555, 575, 600, 630, 650, 660, 690].map(p => <option key={p} value={p} />)}
      </datalist>
      <datalist id="inverter-brands">
        {['Sungrow', 'Huawei', 'Solis', 'SunPower', 'Growatt', 'Deye', 'FoxESS', 'Fronius', 'WEG', 'Dapsolar'].map(b => <option key={b} value={b} />)}
      </datalist>
      <datalist id="inverter-powers">
        {[2, 3, 4, 5, 6, 7, 8, 10, 15, 20, 25, 30, 40, 50, 60, 75, 110].map(p => <option key={p} value={p} />)}
      </datalist>

      {/* Seção 2 — Módulos Fotovoltaicos */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Sun className="w-5 h-5 text-lime-400" /> Módulos Fotovoltaicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Módulo</label>
            <input 
              type="text" 
              list="module-brands"
              value={data.moduleBrand || ''}
              onChange={e => handleChange('moduleBrand', e.target.value)}
              className={inputClass}
              placeholder="Ex: Jinko Solar"
            />
          </div>
          <div>
            <label className={labelClass}>Potência (Wp) *</label>
            <div className="relative">
              <Zap className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                list="module-powers"
                value={modulePower || ''} 
                onChange={e => handleChange('modulePower', Number(e.target.value))}
                className={`${inputClass} pl-10 ${errors.modulePower ? 'border-red-500 ring-red-500/20' : ''}`}
                placeholder="Ex: 550"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Quantidade *</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={modulesCount || ''} 
                onChange={e => handleChange('modulesCount', Number(e.target.value))}
                className={`${inputClass} pl-10 ${errors.modulesCount ? 'border-red-500 ring-red-500/20' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3 — Inversores */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Battery className="w-5 h-5 text-lime-400" /> Inversores</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Marca do Inversor</label>
            <input 
              type="text" 
              list="inverter-brands"
              value={data.inverterBrand || ''} 
              onChange={e => handleChange('inverterBrand', e.target.value)}
              className={inputClass}
              placeholder="Ex: Sungrow"
            />
          </div>
          <div>
            <label className={labelClass}>Potência Total (kW) *</label>
            <div className="relative">
              <Gauge className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                list="inverter-powers"
                value={inverterPower || ''} 
                onChange={e => handleChange('inverterPower', Number(e.target.value))}
                className={`${inputClass} pl-10 ${errors.inverterPower ? 'border-red-500 ring-red-500/20' : ''}`}
                step="0.1"
                placeholder="Ex: 5"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Quantidade *</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number" 
                value={inverterCount || ''} 
                onChange={e => handleChange('inverterCount', Number(e.target.value))}
                className={`${inputClass} pl-10 ${errors.inverterCount ? 'border-red-500 ring-red-500/20' : ''}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 4 — Resumo Técnico */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}>Resumo Técnico</h3>
        <div className="bg-zinc-800/30 rounded-xl p-6 border border-white/5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <p className="text-sm text-zinc-400 mb-1">Potência Real Instalada</p>
              <p className="text-xl font-semibold text-white">{systemSizeKw.toFixed(2)} kWp</p>
            </div>
            <div>
              <p className="text-sm text-zinc-400 mb-1">Área Estimada</p>
              <p className="text-xl font-semibold text-white">{roofArea.toFixed(1)} m²</p>
            </div>
            <div>
              <p className="text-sm text-zinc-400 mb-1">Geração Estimada</p>
              <p className="text-xl font-semibold text-white">{estimatedGeneration.toFixed(0)} kWh/mês</p>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">Em relação ao recomendado ({recommendedPower.toFixed(2)} kWp)</span>
              <span className="text-white font-medium">{pctRecommended.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div 
                className={`h-full ${progressColor} transition-all duration-500`}
                style={{ width: `${Math.min(pctRecommended, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-white/5">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 bg-transparent border border-white/10 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/5 transition-colors"
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

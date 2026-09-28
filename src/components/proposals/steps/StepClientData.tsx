import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Phone, Mail, MapPin, Map as MapIcon, Home, Zap, Plug, ChevronRight } from 'lucide-react';
import type { ProposalData, RoofType } from '../../proposal/types';
import { ROOF_TYPE_LABELS } from '../../proposal/types';
import { DISTRIBUTORS } from '../../proposal/distributors';
import { calcConsumptionFromBill } from '../../proposal/solarCalc';

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

interface StepClientDataProps {
  data: Partial<ProposalData>;
  onUpdate: (data: Partial<ProposalData>) => void;
  onNext: () => void;
}

export default function StepClientData({ data, onUpdate, onNext }: StepClientDataProps) {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [inputMode, setInputMode] = useState<'kwh' | 'money'>(data.billValue ? 'money' : 'kwh');

  // Masks
  const formatPhone = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 10) {
      return clean.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, p1, p2, p3) => {
        let res = `(${p1}`;
        if (p2) res += `) ${p2}`;
        if (p3) res += `-${p3}`;
        return res;
      });
    }
    return clean.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, p1, p2, p3) => {
      let res = `(${p1}`;
      if (p2) res += `) ${p2}`;
      if (p3) res += `-${p3}`;
      return res;
    }).slice(0, 15);
  };

  const formatCpfCnpj = (val: string) => {
    const clean = val.replace(/\D/g, '');
    if (clean.length <= 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4").slice(0, 14);
    }
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5").slice(0, 18);
  };

  useEffect(() => {
    if (inputMode === 'money' && data.billValue && data.tariffRate && data.concessionaria) {
      const publicLighting = data.publicLighting || 0;
      const connectionType = data.connectionType || 'mono';
      const calcKwh = calcConsumptionFromBill(data.billValue, data.tariffRate, publicLighting, connectionType);
      if (calcKwh !== data.consumption) {
        onUpdate({ consumption: calcKwh });
      }
    }
  }, [inputMode, data.billValue, data.tariffRate, data.publicLighting, data.connectionType, data.concessionaria]);

  const handleChange = (field: keyof ProposalData, value: any) => {
    setErrors(prev => ({ ...prev, [field]: '' }));
    onUpdate({ [field]: value });
  };

  const handleConcessionariaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    const dist = DISTRIBUTORS.find(d => d.id === id);
    if (dist) {
      onUpdate({
        concessionaria: dist.name,
        tariffRate: dist.tariffB1,
        fiobRate: dist.fiobTotal,
        publicLighting: dist.cip,
        generationFactor: 125,
      });
    } else {
      onUpdate({ concessionaria: id });
    }
  };

  const validateAndNext = () => {
    const newErrors: { [key: string]: string } = {};

    if (!data.clientName?.trim()) newErrors.clientName = 'Nome completo é obrigatório';
    if (!data.city?.trim()) newErrors.city = 'Cidade é obrigatória';

    if (inputMode === 'kwh') {
      if (!data.consumption || data.consumption <= 0) newErrors.consumption = 'Insira um consumo válido';
    } else {
      if (!data.billValue || data.billValue <= 0) newErrors.billValue = 'Insira o valor da conta';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext();
  };

  const inputClass = "w-full bg-zinc-800/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-lime-400/30 focus:border-lime-400/50 transition-all placeholder:text-zinc-600";
  const labelClass = "block text-sm text-zinc-400 font-medium mb-1.5";
  const sectionTitleClass = "text-lg font-semibold text-white mb-4 flex items-center gap-2";

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 lg:p-8 space-y-8"
    >
      {/* Seção 1 — Dados Pessoais */}
      <div>
        <h3 className={sectionTitleClass}><User className="w-5 h-5 text-lime-400" /> Dados Pessoais</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Nome Completo *</label>
            <input 
              type="text" 
              value={data.clientName || ''} 
              onChange={e => handleChange('clientName', e.target.value)}
              className={`${inputClass} ${errors.clientName ? 'border-red-500 ring-red-500/20' : ''}`}
              placeholder="Ex: João da Silva"
            />
            {errors.clientName && <p className="text-red-400 text-xs mt-1">{errors.clientName}</p>}
          </div>
          <div>
            <label className={labelClass}>CPF / CNPJ</label>
            <input 
              type="text" 
              value={data.cpfCnpj || ''} 
              onChange={e => handleChange('cpfCnpj', formatCpfCnpj(e.target.value))}
              className={inputClass}
              placeholder="000.000.000-00"
            />
          </div>
          <div>
            <label className={labelClass}>Telefone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="text" 
                value={data.phone || ''} 
                onChange={e => handleChange('phone', formatPhone(e.target.value))}
                className={`${inputClass} pl-10`}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="email" 
                value={data.email || ''} 
                onChange={e => handleChange('email', e.target.value)}
                className={`${inputClass} pl-10`}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção 2 — Localização da Obra */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><MapPin className="w-5 h-5 text-lime-400" /> Localização da Obra</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Endereço</label>
            <input 
              type="text" 
              value={data.address || ''} 
              onChange={e => handleChange('address', e.target.value)}
              className={inputClass}
              placeholder="Rua, Número, Bairro"
            />
          </div>
          <div>
            <label className={labelClass}>Cidade *</label>
            <input 
              type="text" 
              value={data.city || ''} 
              onChange={e => handleChange('city', e.target.value)}
              className={`${inputClass} ${errors.city ? 'border-red-500 ring-red-500/20' : ''}`}
              placeholder="Ex: São Paulo"
            />
            {errors.city && <p className="text-red-400 text-xs mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className={labelClass}>Estado / UF</label>
            <div className="relative">
              <MapIcon className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <select 
                value={data.state || ''} 
                onChange={e => handleChange('state', e.target.value)}
                className={`${inputClass} pl-10 appearance-none`}
              >
                <option value="">Selecione...</option>
                {BRAZIL_STATES.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Tipo de Telhado</label>
            <div className="relative">
              <Home className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <select 
                value={data.roofType || ''} 
                onChange={e => handleChange('roofType', e.target.value as RoofType)}
                className={`${inputClass} pl-10 appearance-none`}
              >
                <option value="">Selecione...</option>
                {Object.entries(ROOF_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Seção 3 — Dados Elétricos */}
      <div className="border-t border-white/5 pt-6">
        <h3 className={sectionTitleClass}><Zap className="w-5 h-5 text-lime-400" /> Dados Elétricos</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Concessionária</label>
            <select 
              value={DISTRIBUTORS.find(d => d.name === data.concessionaria)?.id || data.concessionaria || ''} 
              onChange={handleConcessionariaChange}
              className={`${inputClass} appearance-none`}
            >
              <option value="">Selecione a concessionária...</option>
              {DISTRIBUTORS.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.uf})</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fator de Geração (Mensal)</label>
            <div className="relative">
              <Zap className="w-4 h-4 text-zinc-500 absolute left-3 top-3.5" />
              <input 
                type="number"
                value={data.generationFactor || 125}
                onChange={e => handleChange('generationFactor', parseFloat(e.target.value))}
                className={`${inputClass} pl-10`}
                placeholder="Ex: 125"
              />
            </div>
            <p className="text-xs text-zinc-500 mt-1">Estimativa de kWh por kWp ao mês.</p>
          </div>
          <div>
            <label className={labelClass}>Tipo de Ligação</label>
            <div className="flex gap-4 items-center h-[50px]">
              {['mono', 'bi', 'tri'].map((type) => (
                <label key={type} className="flex items-center gap-2 cursor-pointer text-zinc-300">
                  <input 
                    type="radio" 
                    name="connectionType" 
                    value={type} 
                    checked={(data.connectionType || 'mono') === type}
                    onChange={e => handleChange('connectionType', e.target.value)}
                    className="text-lime-400 bg-zinc-800 border-white/10 focus:ring-lime-400/30"
                  />
                  <span className="capitalize">{type === 'mono' ? 'Monofásico' : type === 'bi' ? 'Bifásico' : 'Trifásico'}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 lg:col-span-2">
            <div className="flex items-center gap-4 mb-3">
              <label className={labelClass + " !mb-0"}>Modo de Entrada:</label>
              <div className="flex bg-zinc-800/50 p-1 rounded-lg border border-white/5">
                <button 
                  onClick={() => setInputMode('kwh')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${inputMode === 'kwh' ? 'bg-lime-400 text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                >
                  Por kWh
                </button>
                <button 
                  onClick={() => setInputMode('money')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${inputMode === 'money' ? 'bg-lime-400 text-zinc-900' : 'text-zinc-400 hover:text-white'}`}
                >
                  Por Valor (R$)
                </button>
              </div>
            </div>

            {inputMode === 'kwh' ? (
              <div>
                <label className={labelClass}>Consumo Médio Mensal (kWh/mês) *</label>
                <input 
                  type="number" 
                  value={data.consumption || ''} 
                  onChange={e => handleChange('consumption', Number(e.target.value))}
                  className={`${inputClass} ${errors.consumption ? 'border-red-500 ring-red-500/20' : ''}`}
                  placeholder="Ex: 500"
                />
                {errors.consumption && <p className="text-red-400 text-xs mt-1">{errors.consumption}</p>}
              </div>
            ) : (
              <div>
                <label className={labelClass}>Valor Médio da Conta (R$) *</label>
                <input 
                  type="number" 
                  value={data.billValue || ''} 
                  onChange={e => handleChange('billValue', Number(e.target.value))}
                  className={`${inputClass} ${errors.billValue ? 'border-red-500 ring-red-500/20' : ''}`}
                  placeholder="Ex: 450.00"
                />
                {errors.billValue && <p className="text-red-400 text-xs mt-1">{errors.billValue}</p>}
                {(data.billValue || 0) > 0 && data.tariffRate && (
                  <p className="text-lime-400/80 text-sm mt-2">
                    Consumo estimado: <strong className="text-lime-400">{data.consumption?.toFixed(0) || 0} kWh/mês</strong>
                  </p>
                )}
              </div>
            )}
          </div>


        </div>
      </div>

      <div className="flex justify-end pt-4">
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

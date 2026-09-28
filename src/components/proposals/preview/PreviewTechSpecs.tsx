import React from 'react';
import { TechSpecsContent, ProposalTheme } from '../../proposal/types';
import { Cpu, Maximize, Zap, CheckCircle2 } from 'lucide-react';

interface Props {
  content: TechSpecsContent;
  theme: ProposalTheme;
}

export default function PreviewTechSpecs({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-8 shadow-xl`}>
      <div className="flex justify-between items-start border-b border-white/10 pb-6">
        <div>
          <h2 className="text-xl font-bold text-lime-400">Especificações Técnicas</h2>
          <p className="text-zinc-500">Detalhes dos equipamentos e dimensionamento.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-lime-400/10 text-lime-400 rounded-lg border border-lime-400/20">
          <CheckCircle2 className="w-5 h-5" />
          <span className="font-bold text-sm">Turn-Key Completo</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <Zap className="w-6 h-6 text-lime-400 mb-4" />
          <p className="text-sm text-zinc-500 mb-1">Potência Total</p>
          <p className="text-xl font-bold">{(content.systemSizeKw || 0).toFixed(2)} kWp</p>
        </div>
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <Cpu className="w-6 h-6 text-lime-400 mb-4" />
          <p className="text-sm text-zinc-500 mb-1">Consumo Atendido</p>
          <p className="text-xl font-bold">{content.consumption || 0} kWh/mês</p>
        </div>
        <div className={`p-6 rounded-xl border ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <Maximize className="w-6 h-6 text-lime-400 mb-4" />
          <p className="text-sm text-zinc-500 mb-1">Área Necessária</p>
          <p className="text-xl font-bold">{content.roofArea || 0} m²</p>
        </div>
      </div>

      <div className={`flex-1 rounded-xl border overflow-hidden flex flex-col ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
        <div className="p-6 border-b border-white/5 bg-zinc-900/50">
          <h3 className="text-lg font-bold">Lista de Materiais</h3>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm text-zinc-500 uppercase font-semibold">
              <span>Módulos Fotovoltaicos</span>
              <span>Quantidade: {content.modulesCount || 0}x</span>
            </div>
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-lg">
              <span className="font-medium text-lg">{content.moduleBrand || 'Marca do Módulo'}</span>
              <span className="text-lime-400 font-bold">{content.modulePower || 0}W</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-sm text-zinc-500 uppercase font-semibold">
              <span>Inversores</span>
              <span>Quantidade: {content.inverterCount || 0}x</span>
            </div>
            <div className="flex justify-between items-center bg-black/20 p-4 rounded-lg">
              <span className="font-medium text-lg">{content.inverterBrand || 'Marca do Inversor'}</span>
              <span className="text-lime-400 font-bold">{content.inverterPower || 0}kW</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

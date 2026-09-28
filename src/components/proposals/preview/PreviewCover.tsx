import React from 'react';
import { CoverContent, ProposalTheme } from '../../proposal/types';

interface Props {
  content: CoverContent;
  theme: ProposalTheme;
  editable?: boolean;
  onUpdate?: (c: Partial<CoverContent>) => void;
}

export default function PreviewCover({ content, theme, editable, onUpdate }: Props) {
  const isDark = theme.mode !== 'light';
  
  return (
    <div className={`relative w-full aspect-[1/1.414] overflow-hidden rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col justify-between shadow-xl`}>
      <div className="absolute inset-0 z-0">
        <img src="https://images.unsplash.com/photo-1508514177221-188b1c8d40e7?q=80&w=2070&auto=format&fit=crop" className="w-full h-full object-cover opacity-20" alt="Solar Background" />
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? 'from-[#09090b] via-[#09090b]/90 to-transparent' : 'from-white via-white/90 to-transparent'}`} />
      </div>
      
      <div className="relative z-10 flex justify-between items-start">
        {theme.logoUrl ? (
          <img src={theme.logoUrl} alt="Logo" className="h-16 object-contain" />
        ) : (
          <h1 className="text-2xl font-bold tracking-tighter" style={{ color: theme.primaryColor || '#a3e635' }}>{theme.companyName || 'QUARK ENERGIA'}</h1>
        )}
        <div className="px-4 py-1.5 rounded-full bg-lime-400/10 border border-lime-400/20 text-lime-400 text-sm font-medium">
          {content.categoryLabel || 'Proposta Comercial'}
        </div>
      </div>
      
      <div className="relative z-10 flex flex-col gap-6">
        <h2 
          className={`text-5xl lg:text-6xl font-bold tracking-tight leading-tight ${editable ? 'cursor-pointer hover:bg-white/5 rounded px-2 -ml-2 transition-colors' : ''}`}
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ headlineLine1: e.currentTarget.textContent || '' })}
        >
          {content.headlineLine1 || 'Seu Projeto de Energia Solar'}
        </h2>
        
        <div className="space-y-1 mt-4">
          <p className="text-lg text-zinc-500">Preparado para:</p>
          <p className="text-3xl font-medium">{content.clientName || 'Nome do Cliente'}</p>
          <p className="text-zinc-500">{content.city || 'Cidade'} • {content.date || new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="p-6 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/5">
            <p className="text-sm text-zinc-400 mb-2">Potência do Sistema</p>
            <p className="text-3xl font-bold text-lime-400">{(content.systemSizeKw || 0).toFixed(2)} kWp</p>
          </div>
          <div className="p-6 rounded-xl bg-zinc-900/60 backdrop-blur-xl border border-white/5">
            <p className="text-sm text-zinc-400 mb-2">Nova Conta Estimada</p>
            <p className="text-3xl font-bold text-lime-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(content.newBill || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { EconomyContent, ProposalTheme } from '../../proposal/types';
import { TrendingDown, Wallet, Calendar, PiggyBank, ArrowRight } from 'lucide-react';

interface Props {
  content: EconomyContent;
  theme: ProposalTheme;
}

export default function PreviewEconomy({ content, theme }: Props) {
  const isDark = theme.mode !== 'light';

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className={`w-full aspect-[1/1.414] rounded-xl border border-white/10 ${isDark ? 'bg-[#09090b] text-white' : 'bg-white text-zinc-900'} p-12 flex flex-col gap-5 shadow-xl`}>
      <div className="flex justify-between items-start border-b border-white/10 pb-6">
        <div>
          <h2 className="text-xl font-bold text-lime-400">Sua Economia</h2>
          <p className="text-zinc-500">Veja o impacto financeiro do seu projeto solar.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-lime-400/10 text-lime-400 rounded-lg border border-lime-400/20 animate-pulse">
          <TrendingDown className="w-5 h-5" />
          <span className="font-bold text-sm">Economia Imediata</span>
        </div>
      </div>

      <div className="flex items-center gap-6 justify-center my-8">
        <div className={`flex-1 p-5 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
          <span className="text-sm text-red-500 font-semibold mb-2 uppercase tracking-wider">Conta Atual</span>
          <span className="text-4xl font-bold text-red-500 line-through opacity-80">{formatCurrency(content.currentBill)}</span>
        </div>
        
        <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center shrink-0 shadow-lg">
          <ArrowRight className="w-5 h-5 text-zinc-400" />
        </div>
        
        <div className={`flex-1 p-5 rounded-xl border flex flex-col items-center text-center ${isDark ? 'bg-lime-400/10 border-lime-400/20' : 'bg-lime-50 border-lime-200'}`}>
          <span className="text-sm text-lime-500 font-semibold mb-2 uppercase tracking-wider">Nova Conta</span>
          <span className="text-4xl font-bold text-lime-400">{formatCurrency(content.newBill)}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mt-auto">
        <div className={`p-5 rounded-xl border flex flex-col gap-4 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">Economia Mensal</p>
            <p className="text-xl font-bold text-lime-400">{formatCurrency(content.monthlySavings)}</p>
          </div>
        </div>
        
        <div className={`p-5 rounded-xl border flex flex-col gap-4 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">Economia Anual</p>
            <p className="text-xl font-bold text-lime-400">{formatCurrency(content.annualSavings)}</p>
          </div>
        </div>
        
        <div className={`p-5 rounded-xl border flex flex-col gap-4 ${isDark ? 'bg-[#18181b] border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
          <div className="w-10 h-10 rounded-lg bg-lime-400/10 flex items-center justify-center">
            <PiggyBank className="w-5 h-5 text-lime-400" />
          </div>
          <div>
            <p className="text-sm text-zinc-500 mb-1">Em 25 anos</p>
            <p className="text-xl font-bold text-lime-400">{formatCurrency(content.totalSavings25Years)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sun, Moon, Upload, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProposalData, ProposalTheme, ProposalBlock } from '../../proposal/types';
import { buildInitialBlocks } from '../../proposal/catalog';
import { 
  PreviewCover, PreviewClientInfo, PreviewHowItWorks, PreviewTechSpecs,
  PreviewGenerationChart, PreviewEconomy, PreviewROI, PreviewSocialProof, PreviewContact 
} from '../preview';

interface StepPreviewProps {
  data: Partial<ProposalData>;
  theme: ProposalTheme;
  blocks: ProposalBlock[];
  onUpdateTheme: (theme: Partial<ProposalTheme>) => void;
  onUpdateBlocks: (blocks: ProposalBlock[]) => void;
  onNext: () => void;
  onBack: () => void;
}

const COLORS = [
  { name: 'Gold', value: '#C4A050' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Âmbar', value: '#f59e0b' },
  { name: 'Roxo', value: '#a855f7' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Rosa', value: '#ec4899' }
];

const FONTS = [
  'Inter', 'Playfair', 'DM Sans', 'Montserrat', 'Raleway', 'Poppins', 'Space Grotesk'
];

export default function StepPreview({
  data, theme, blocks, onUpdateTheme, onUpdateBlocks, onNext, onBack
}: StepPreviewProps) {
  const [customColor, setCustomColor] = useState('');

  useEffect(() => {
    if (data.clientName) {
      const freshBlocks = buildInitialBlocks(data as ProposalData, theme);
      if (JSON.stringify(freshBlocks) !== JSON.stringify(blocks)) {
        onUpdateBlocks(freshBlocks);
      }
    }
  }, [blocks, data, theme, onUpdateBlocks]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      onUpdateTheme({ logoUrl: url });
    }
  };

  const handleColorSelect = (color: string) => {
    onUpdateTheme({ primaryColor: color });
    setCustomColor('');
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    if (/^#[0-9A-F]{6}$/i.test(color)) {
      onUpdateTheme({ primaryColor: color });
    }
  };

  // Safe fallback to avoid breaking if blocks aren't ready
  if (blocks.length === 0) {
    return <div className="p-8 text-center text-zinc-400">Gerando preview...</div>;
  }

  // Helper to find block content safely
  const getBlockContent = (type: string) => {
    const block = blocks.find(b => b.type === type);
    return block ? block.content : null;
  };

  const coverContent = getBlockContent('cover') as any;
  const clientInfoContent = getBlockContent('client_info') as any;
  const howItWorksContent = getBlockContent('how_it_works') as any;
  const techSpecsContent = getBlockContent('tech_specs') as any;
  const chartContent = getBlockContent('generation_chart') as any;
  const economyContent = getBlockContent('economy') as any;
  const roiContent = getBlockContent('roi') || getBlockContent('financial') as any; // Using financial if ROI doesn't exist? catalog builds 'financial'
  const socialProofContent = getBlockContent('social_proof') as any;
  const contactContent = getBlockContent('contact') as any;

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full h-[calc(100vh-12rem)]">
      {/* Sidebar de Configuração */}
      <div className="w-full lg:w-72 flex-shrink-0 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="bg-[#18181b] rounded-xl p-5 border border-white/5 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-white">Aparência</h3>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-white/5">
              <button
                onClick={() => onUpdateTheme({ mode: 'dark', backgroundColor: '#09090b', textColor: '#ffffff' })}
                className={`p-1.5 rounded-md transition-colors ${theme.mode === 'dark' || !theme.mode ? 'bg-zinc-800 text-lime-400' : 'text-zinc-400 hover:text-white'}`}
              >
                <Moon className="w-4 h-4" />
              </button>
              <button
                onClick={() => onUpdateTheme({ mode: 'light', backgroundColor: '#ffffff', textColor: '#09090b' })}
                className={`p-1.5 rounded-md transition-colors ${theme.mode === 'light' ? 'bg-white text-lime-400 shadow-sm' : 'text-zinc-400 hover:text-white'}`}
              >
                <Sun className="w-4 h-4" />
              </button>
            </div>
          </div>

          

          <div className="space-y-3">
            <label className="text-sm text-zinc-400">Fonte Principal</label>
            <select
              value={theme.fontFamily}
              onChange={(e) => onUpdateTheme({ fontFamily: e.target.value as any })}
              className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lime-400"
            >
              {FONTS.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <label className="text-sm text-zinc-400">Logomarca</label>
            <div className="relative border-2 border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-900 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {theme.logoUrl ? (
                <img src={theme.logoUrl} alt="Logo" className="max-h-16 object-contain" />
              ) : (
                <>
                  <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                  <span className="text-xs text-zinc-500 text-center">Clique ou arraste<br/>para alterar</span>
                </>
              )}
            </div>
            
            {theme.logoUrl && (
              <div className="flex gap-2 p-1 bg-zinc-900 border border-white/5 rounded-lg">
                {['sm', 'md', 'lg'].map((size) => (
                  <button
                    key={size}
                    onClick={() => onUpdateTheme({ logoSize: size as 'sm'|'md'|'lg' })}
                    className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${theme.logoSize === size ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            )}
          </div>
        
          {/* Informações da Empresa */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-white">Dados da Empresa</h3>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Nome Fantasia</label>
              <input type="text" value={theme.companyName || ''} onChange={e => onUpdateTheme({companyName: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Quark Energia" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">CNPJ</label>
              <input type="text" value={theme.companyCnpj || ''} onChange={e => onUpdateTheme({companyCnpj: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="00.000.000/0001-00" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Telefone</label>
              <input type="text" value={theme.companyPhone || ''} onChange={e => onUpdateTheme({companyPhone: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="(00) 00000-0000" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Email</label>
              <input type="text" value={theme.companyEmail || ''} onChange={e => onUpdateTheme({companyEmail: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="contato@quarkenergia.com.br" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Endereço</label>
              <input type="text" value={theme.companyAddress || ''} onChange={e => onUpdateTheme({companyAddress: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Av. Principal, 1000" />
            </div>
          </div>

          {/* Prova Social */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <h3 className="text-sm font-medium text-white">Métricas (Prova Social)</h3>
            {[0,1,2].map(i => {
               const metrics = theme.socialMetrics || [{label: '+500', sub: 'Projetos Entregues'}, {label: '100%', sub: 'Satisfação'}, {label: '25 Anos', sub: 'Garantia de Geração'}];
               return (
                 <div key={i} className="flex gap-2">
                   <input type="text" value={metrics[i].label} onChange={e => {
                     const newM = [...metrics];
                     newM[i] = { ...newM[i], label: e.target.value };
                     onUpdateTheme({socialMetrics: newM});
                   }} className="w-1/3 bg-zinc-900 border border-white/10 rounded-lg px-2 py-2 text-sm text-white font-bold text-center focus:ring-1 focus:ring-lime-400" placeholder="Dado" />
                   <input type="text" value={metrics[i].sub} onChange={e => {
                     const newM = [...metrics];
                     newM[i] = { ...newM[i], sub: e.target.value };
                     onUpdateTheme({socialMetrics: newM});
                   }} className="w-2/3 bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-lime-400" placeholder="Descrição" />
                 </div>
               )
            })}
          </div>
        </div>

        <div className="flex gap-3 mt-auto">
          <button
            onClick={onBack}
            className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          <button
            onClick={onNext}
            className="flex-1 py-3 px-4 rounded-xl bg-lime-400 text-zinc-900 font-bold hover:bg-lime-500 transition-colors flex items-center justify-center gap-2"
          >
            Avançar
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview Central */}
      <div className="flex-1 bg-zinc-900/30 rounded-xl border border-white/5 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto space-y-8 pb-16 flex flex-col items-center">
          {coverContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewCover content={coverContent} theme={theme} />
            </div>
          )}

          {clientInfoContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewClientInfo content={clientInfoContent} theme={theme} />
            </div>
          )}

          {howItWorksContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewHowItWorks content={howItWorksContent} theme={theme} />
            </div>
          )}

          {techSpecsContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewTechSpecs content={techSpecsContent} theme={theme} />
            </div>
          )}

          {chartContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewGenerationChart content={chartContent} theme={theme} />
            </div>
          )}

          {economyContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewEconomy content={economyContent} theme={theme} />
            </div>
          )}

          {roiContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewROI content={roiContent} theme={theme} />
            </div>
          )}

          {socialProofContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewSocialProof content={socialProofContent} theme={theme} />
            </div>
          )}

          {contactContent && (
            <div className="w-full aspect-[1/1.414] bg-white rounded-lg shadow-2xl overflow-hidden relative">
               <PreviewContact content={contactContent} theme={theme} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Sun, Moon, CheckCircle2, ChevronLeft, Save, Send, Loader2 } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import type { ProposalData, ProposalTheme, ProposalBlock } from '../../proposal/types';
import ProposalPDF from '../../proposal/ProposalPDF';
import { storageService } from '../../../services/storageService';
import toast from 'react-hot-toast';

interface StepExportProps {
  data: Partial<ProposalData>;
  theme: ProposalTheme;
  blocks: ProposalBlock[];
  onSave: (data: ProposalData) => Promise<void>;
  onBack: () => void;
  onClose: () => void;
}

export default function StepExport({ data, theme, blocks, onSave, onBack, onClose }: StepExportProps) {
  const [isExportingDark, setIsExportingDark] = useState(false);
  const [isExportingLight, setIsExportingLight] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const handleExport = async (mode: 'dark' | 'light') => {
    try {
      if (mode === 'dark') setIsExportingDark(true);
      else setIsExportingLight(true);

      const themeForMode = { ...theme, mode };

      const blob = await pdf(
        <ProposalPDF blocks={blocks} theme={themeForMode} clientName={data.clientName} />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Proposta_${data.clientName || 'Cliente'}_${mode}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Upload background to storage
      const fileName = `proposta_${data.id || Date.now()}_${mode}.pdf`;
      const publicUrl = await storageService.uploadFile('proposals_pdf', fileName, blob);
      
      if (publicUrl) {
        // We could update the proposal data with the url here if needed
        console.log('PDF Uploaded to:', publicUrl);
      }

    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao gerar o PDF da proposta.');
    } finally {
      if (mode === 'dark') setIsExportingDark(false);
      else setIsExportingLight(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onSave({ ...data, status: data.status || 'draft' } as ProposalData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar proposta:', error);
      toast.error('Erro ao salvar a proposta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWhatsApp = () => {
    const text = `Olá ${data.clientName}, segue o link da sua proposta solar: ...`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <CheckCircle2 className="w-32 h-32 text-lime-400" />
        </div>
        
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-lime-400/20 rounded-full flex items-center justify-center border border-lime-400/30">
            <CheckCircle2 className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Proposta Pronta!</h2>
            <p className="text-zinc-400">Tudo configurado para impressionar seu cliente.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5 relative z-10">
          <div>
            <span className="block text-xs text-zinc-500 mb-1">Cliente</span>
            <span className="font-medium text-white block truncate">{data.clientName || '-'}</span>
          </div>
          <div>
            <span className="block text-xs text-zinc-500 mb-1">Cidade</span>
            <span className="font-medium text-white block truncate">{data.city || '-'}</span>
          </div>
          <div>
            <span className="block text-xs text-zinc-500 mb-1">Sistema</span>
            <span className="font-medium text-lime-400">{data.systemSizeKw?.toFixed(2) || '0.00'} kWp</span>
          </div>
          <div>
            <span className="block text-xs text-zinc-500 mb-1">Investimento</span>
            <span className="font-medium text-white">{formatCurrency(data.finalPrice || 0)}</span>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => handleExport('dark')}
          disabled={isExportingDark}
          className="flex flex-col items-center justify-center p-8 bg-zinc-800 rounded-2xl border border-white/10 hover:bg-zinc-700 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExportingDark ? (
            <Loader2 className="w-10 h-10 text-lime-400 animate-spin mb-4" />
          ) : (
            <Moon className="w-10 h-10 text-lime-400 mb-4 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-lg font-bold text-white mb-1">Exportar PDF Dark</span>
          <span className="text-sm text-zinc-400">Design moderno e sofisticado</span>
        </button>

        <button
          onClick={() => handleExport('light')}
          disabled={isExportingLight}
          className="flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-zinc-200 hover:bg-zinc-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isExportingLight ? (
            <Loader2 className="w-10 h-10 text-lime-500 animate-spin mb-4" />
          ) : (
            <Sun className="w-10 h-10 text-amber-500 mb-4 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-lg font-bold text-zinc-900 mb-1">Exportar PDF Light</span>
          <span className="text-sm text-zinc-500">Design limpo e clássico</span>
        </button>
      </div>

      <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-white/5">
              Status Atual
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-zinc-700/60 text-zinc-300">
              Rascunho
            </span>
          </div>
          <p className="text-sm text-zinc-500 text-center sm:text-right">
            Proposta salva automaticamente como Rascunho. Você pode alterar o status a qualquer momento no CRM.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onBack}
            className="py-3 px-6 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </button>
          
          <button
            onClick={handleWhatsApp}
            className="py-3 px-6 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition-colors flex items-center justify-center gap-2 flex-1"
          >
            <Send className="w-4 h-4" />
            Enviar por WhatsApp
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="py-3 px-6 rounded-xl bg-lime-400 text-zinc-900 font-bold hover:bg-lime-500 transition-colors flex items-center justify-center gap-2 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isSaving ? 'Salvando...' : 'Salvar Proposta'}
          </button>
        </div>
      </div>
    </div>
  );
}

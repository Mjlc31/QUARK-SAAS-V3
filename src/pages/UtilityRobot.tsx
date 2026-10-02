import React, { useState, useEffect } from 'react';
import { Bot, Play, Search, Download, FileText, AlertTriangle, Settings } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useClientIntelligence } from '../hooks/useClientIntelligence';
import { ClientIntelligenceRecord, UtilityInvoice } from '../types';

const UtilityRobot: React.FC = () => {
  const { data: records = [], isLoading: loadingRecords = false } = useClientIntelligence() || {};
  const [invoices, setInvoices] = useState<UtilityInvoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // Status Mock
  const robotStatus = 'Online';
  const lastRun = new Date();
  lastRun.setHours(lastRun.getHours() - 2);
  const nextRun = new Date();
  nextRun.setHours(nextRun.getHours() + 4);

  useEffect(() => {
    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      const { data, error } = await supabase
        .from('utility_invoices')
        .select('*')
        .order('captured_at', { ascending: false })
        .limit(50);
        
      if (!error && data) {
        setInvoices(data);
      }
      setLoadingInvoices(false);
    };

    fetchInvoices();
  }, []);

  const configuredClients = records.filter((r: ClientIntelligenceRecord) => r.utility_login && Object.keys(r.utility_login).length > 0);

  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [ocrMessage, setOcrMessage] = useState('');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    setUploadProgress(1);
    setOcrMessage('');
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 10;
      });
    }, 300);

    await new Promise(resolve => setTimeout(resolve, 3000));
    clearInterval(interval);
    setUploadProgress(100);
    setOcrMessage('Fatura da Equatorial lida com sucesso: Economia de R$ 450,00 identificada');

    const dummyRecord = {
      intelligence_id: configuredClients[0]?.id || null,
      month_ref: '09/2026',
      consumption_kwh: 500,
      generation_kwh: 100,
      amount_brl: 450,
      savings_brl: 450,
      pdf_url: 'dummy.pdf'
    };
    
    await supabase.from('utility_invoices').insert(dummyRecord);
    
    const { data } = await supabase.from('utility_invoices').select('*').order('captured_at', { ascending: false }).limit(50);
    if (data) setInvoices(data);

    setTimeout(() => {
      setUploadProgress(0);
      setOcrMessage('');
    }, 5000);
  };

  return (
    <div className="space-y-6 pb-20 animate-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Bot className="text-lime-400" /> Robô de Faturas
          </h1>
          <p className="text-sm text-slate-400 mt-1">Captura automática de faturas da distribuidora (RPA).</p>
        </div>
      </div>

      {/* Robot Status Panel */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row items-center gap-6 border-l-4 border-l-lime-500">
        <div className="flex-1 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-lime-500/10 flex items-center justify-center relative">
            <Bot className="text-lime-400" size={32} />
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-zinc-900 rounded-full animate-pulse"></span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              QuarkBot RPA <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-xs rounded-full uppercase tracking-wider">Online</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">Monitorando {configuredClients.length} logins configurados nas concessionárias.</p>
          </div>
        </div>
        
        <div className="flex gap-6 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase mb-1">Última Execução</p>
             <p className="text-sm font-mono text-white">{lastRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hoje</p>
           </div>
           <div>
             <p className="text-xs text-slate-500 font-bold uppercase mb-1">Próxima Execução</p>
             <p className="text-sm font-mono text-lime-400">{nextRun.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} hoje</p>
           </div>
           <button 
             onClick={() => alert('Comando de Forçar Execução enviado ao robô.')}
             className="h-full px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-sm transition-colors border border-white/10 flex items-center gap-2">
             <Play size={16} className="text-lime-400" /> Forçar Execução
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configured Clients */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-white/5 flex flex-col h-[500px]">
          <div className="p-4 border-b border-white/10 bg-zinc-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-slate-400" /> Clientes Configurados
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
            {loadingRecords ? (
              <p className="text-center text-slate-500 py-10">Carregando...</p>
            ) : configuredClients.length === 0 ? (
              <div className="text-center py-10">
                <AlertTriangle size={32} className="mx-auto text-yellow-500/50 mb-3" />
                <p className="text-slate-400 text-sm">Nenhum cliente possui login da concessionária configurado na Inteligência.</p>
              </div>
            ) : (
              configuredClients.map((client: ClientIntelligenceRecord) => (
                <div key={client.id} className="p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/10 transition-colors flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{client.client_name}</h4>
                    <p className="text-xs text-slate-500 mt-1 font-mono">{client.utility_account || 'Conta não informada'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => alert(`Enviando comando para rodar bot na conta do cliente: ${client.client_name}`)}
                      className="px-3 py-1.5 bg-lime-500/10 text-lime-400 hover:bg-lime-500/20 rounded-lg text-xs font-bold transition-colors">
                      Rodar Agora
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Captured Invoices */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`glass-panel rounded-2xl overflow-hidden border ${isDragging ? 'border-lime-500 bg-lime-500/5' : 'border-white/5'} flex flex-col h-[500px] relative transition-colors`}
        >
          {uploadProgress > 0 && (
            <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800 z-50">
              <div className="h-full bg-lime-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}
          {isDragging && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-40 flex flex-col items-center justify-center border-2 border-dashed border-lime-500 rounded-2xl">
              <FileText size={48} className="text-lime-400 mb-4 animate-bounce" />
              <p className="text-xl font-bold text-white">Solte o PDF da fatura aqui</p>
              <p className="text-slate-400 mt-2">O QuarkBot fará o OCR e extração automática</p>
            </div>
          )}
          <div className="p-4 border-b border-white/10 bg-zinc-900/50">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FileText size={18} className="text-slate-400" /> Últimas Capturas
            </h3>
            {ocrMessage && (
              <p className="text-sm text-lime-400 mt-2 font-bold bg-lime-500/10 px-3 py-1.5 rounded-lg inline-block">
                {ocrMessage}
              </p>
            )}
          </div>
          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-black/20 sticky top-0 backdrop-blur-md z-10">
                <tr className="text-xs uppercase font-bold text-slate-500 border-b border-white/5">
                  <th className="px-4 py-3">Cliente / Mês</th>
                  <th className="px-4 py-3 text-right">Consumo</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3 text-center">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loadingInvoices ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Buscando faturas...</td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhuma fatura capturada ainda.</td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-white">{records.find((r: any) => r.id === inv.intelligence_id)?.client_name || 'Desconhecido'}</p>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">{inv.month_ref}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm text-yellow-400 font-mono">{inv.consumption_kwh} kWh</p>
                        {inv.generation_kwh && <p className="text-[10px] text-green-400">G: {inv.generation_kwh}</p>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-bold text-white font-mono">R$ {inv.amount_brl?.toFixed(2)}</p>
                        {inv.savings_brl && <p className="text-[10px] text-green-400">Econ: {inv.savings_brl.toFixed(2)}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          disabled={!inv.pdf_url}
                          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed mx-auto block"
                          title={inv.pdf_url ? "Baixar PDF" : "PDF não disponível"}
                        >
                          <Download size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UtilityRobot;

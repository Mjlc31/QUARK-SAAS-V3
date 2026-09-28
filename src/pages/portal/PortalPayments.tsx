import React, { useState } from 'react';
import { CreditCard, ShieldCheck, Zap, Droplets, PenTool as Tool, LogOut, CheckCircle2, ChevronDown, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

const mockServices = [
  { id: '1', title: 'Manutenção Preventiva', icon: Tool, color: 'text-blue-400', bg: 'bg-blue-400/10', desc: 'Revisão completa do inversor, quadros elétricos e reaperto de conexões. Recomendado anualmente.', duration: '2h', includes: ['Análise de Geração', 'Reaperto Elétrico', 'Inspeção Visual'] },
  { id: '2', title: 'Limpeza de Painéis', icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-400/10', desc: 'Lavagem técnica dos módulos fotovoltaicos utilizando água desmineralizada para remover sujeiras incrustadas.', duration: '3h', includes: ['Remoção de Poeira', 'Água Desmineralizada', 'Relatório Fotográfico'] },
  { id: '3', title: 'Inspeção Completa', icon: ShieldCheck, color: 'text-purple-400', bg: 'bg-purple-400/10', desc: 'Avaliação detalhada com câmera termográfica, análise de sombreamento e integridade estrutural.', duration: '4h', includes: ['Termografia', 'Análise Estrutural', 'Laudo Técnico'] },
  { id: '4', title: 'Reparo Emergencial', icon: Zap, color: 'text-orange-400', bg: 'bg-orange-400/10', desc: 'Visita técnica priorizada em até 24h para diagnóstico e correção de falhas críticas que interrompem a geração.', duration: 'Variável', includes: ['Prioridade 24h', 'Diagnóstico de Falha', 'Correção Imediata (se possível)'] },
];

const mockHistory = [
  { id: 'INV-001', service: 'Limpeza de Painéis', date: '10/05/2026', amount: 250, status: 'Pago' },
  { id: 'INV-002', service: 'Manutenção Preventiva', date: '15/12/2025', amount: 350, status: 'Pago' },
];

const PortalPayments: React.FC = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [panelCount, setPanelCount] = useState<number | ''>('');
  const [roofType, setRoofType] = useState('Cerâmica');
  const [problemDescription, setProblemDescription] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const handleHire = (service: any) => {
    setSelectedService(service);
  };

  const submitRequest = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setSelectedService(null);
      setPanelCount('');
      setRoofType('Cerâmica');
      setProblemDescription('');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }, 1000);
  };

  const faqs = [
    { q: 'Com que frequência devo limpar os painéis?', a: 'Recomendamos a limpeza a cada 6 meses ou anualmente, dependendo da região e acúmulo de poeira/sujeira.' },
    { q: 'A manutenção preventiva é obrigatória?', a: 'Não é obrigatória, mas é fortemente recomendada para garantir a vida útil dos equipamentos e máxima eficiência de geração.' },
    { q: 'Quais as formas de pagamento?', a: 'Aceitamos PIX, Cartão de Crédito em até 3x sem juros e Boleto Bancário.' }
  ];

  return (
    <div className="min-h-screen bg-quark-bg text-zinc-200 font-sans pb-10">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/portal/dashboard')}>
            <div className="w-8 h-8 rounded-lg bg-lime-500/20 flex items-center justify-center border border-lime-500/30 text-lime-400 font-display font-bold">
              Q
            </div>
            <span className="font-display font-bold text-white tracking-tight hidden sm:block">Portal Quark Energia</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
              <CreditCard size={24} />
            </div>
            Serviços e Pagamentos
          </h1>
          <p className="text-zinc-500 text-sm">Contrate manutenções e acompanhe seu histórico financeiro.</p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-12">
          {mockServices.map((service, index) => (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="glass-panel p-6 rounded-2xl flex flex-col h-full hover:border-lime-500/30 transition-colors group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${service.bg} ${service.color}`}>
                  <service.icon size={24} />
                </div>
                <div className="text-right">
                  <span className="block text-lg font-display font-bold text-lime-400">Orçamento Dinâmico</span>
                  <span className="text-xs text-zinc-500">Duração aprox: {service.duration}</span>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
              <p className="text-sm text-zinc-400 mb-6 flex-1">{service.desc}</p>
              
              <div className="mb-6 space-y-2">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">O que inclui:</span>
                {service.includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-300">
                    <CheckCircle2 size={16} className="text-lime-500" />
                    {item}
                  </div>
                ))}
              </div>

              <button 
                onClick={() => handleHire(service)}
                className="w-full py-3 bg-white/5 hover:bg-lime-500 hover:text-black border border-white/10 hover:border-lime-500 rounded-xl font-bold transition-all active:scale-95 text-white"
              >
                Contratar Serviço
              </button>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* History */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-4">Histórico de Pagamentos</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="pb-3 font-medium">Serviço</th>
                    <th className="pb-3 font-medium">Data</th>
                    <th className="pb-3 font-medium">Valor</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {mockHistory.map((item, i) => (
                    <tr key={i} className="text-zinc-300">
                      <td className="py-3 font-medium">{item.service}</td>
                      <td className="py-3">{item.date}</td>
                      <td className="py-3">R$ {item.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className="px-2 py-1 bg-lime-500/10 text-lime-400 rounded-full text-xs font-medium border border-lime-500/20">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAQ */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="font-bold text-white mb-4">Perguntas Frequentes</h3>
            <div className="space-y-2">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
                  <button 
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full p-4 flex justify-between items-center text-left bg-zinc-900/50 hover:bg-zinc-800 transition-colors"
                  >
                    <span className="font-medium text-sm text-zinc-200">{faq.q}</span>
                    <ChevronDown size={16} className={`text-zinc-500 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-zinc-950/50"
                      >
                        <p className="p-4 text-sm text-zinc-400 border-t border-white/5">{faq.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Contratação */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedService(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
              <h3 className="text-xl font-bold text-white mb-2">Solicitar Orçamento</h3>
              <p className="text-sm text-zinc-400 mb-6">Você está solicitando orçamento para <strong className="text-white">{selectedService.title}</strong>.</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Quantidade de Painéis</label>
                  <input 
                    type="number" 
                    value={panelCount}
                    onChange={(e) => setPanelCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none" 
                    placeholder="Ex: 12"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Tipo de Telhado</label>
                  <select
                    value={roofType}
                    onChange={(e) => setRoofType(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none appearance-none"
                  >
                    <option value="Cerâmica">Cerâmica</option>
                    <option value="Metálico">Metálico</option>
                    <option value="Fibrocimento">Fibrocimento</option>
                    <option value="Laje">Laje</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1.5">Descrição do Problema / Observações</label>
                  <textarea 
                    rows={3} 
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-lime-500 outline-none resize-none" 
                    placeholder="Descreva o motivo da solicitação ou detalhes adicionais..."
                  ></textarea>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setSelectedService(null)} disabled={isProcessing} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors border border-transparent disabled:opacity-50">
                  Cancelar
                </button>
                <button onClick={submitRequest} disabled={isProcessing} className="flex-1 btn-primary py-2.5 rounded-xl text-sm flex justify-center items-center">
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : 'Solicitar Orçamento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 right-6 bg-lime-500 text-black px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 z-[110]"
          >
            <CheckCircle2 size={20} className="shrink-0" />
            <span>Solicitação enviada com sucesso! Em breve enviaremos o orçamento no seu WhatsApp.</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalPayments;

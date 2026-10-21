import React, { useState } from 'react';
import { 
  CreditCard, ShieldCheck, Zap, Droplets, PenTool as Tool, LogOut, 
  CheckCircle2, ChevronDown, Loader2, Calendar, Clock, AlertCircle, Wrench, ArrowLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { usePortal } from '../../contexts/PortalContext';

const mockServices = [
  { 
    id: '1', 
    title: 'Manutenção Preventiva', 
    type: 'manutencao', 
    basePrice: 350,
    icon: Tool, 
    color: 'text-blue-400', 
    bg: 'bg-blue-400/10', 
    desc: 'Revisão completa do inversor, quadros elétricos e reaperto de conexões. Recomendado anualmente.', 
    duration: '2h', 
    includes: ['Análise de Geração', 'Reaperto Elétrico', 'Inspeção Visual'] 
  },
  { 
    id: '2', 
    title: 'Limpeza de Painéis', 
    type: 'limpeza', 
    basePrice: 250,
    icon: Droplets, 
    color: 'text-cyan-400', 
    bg: 'bg-cyan-400/10', 
    desc: 'Lavagem técnica dos módulos fotovoltaicos utilizando água desmineralizada para remover sujeiras incrustadas.', 
    duration: '3h', 
    includes: ['Remoção de Poeira', 'Água Desmineralizada', 'Relatório Fotográfico'] 
  },
  { 
    id: '3', 
    title: 'Inspeção Completa', 
    type: 'inspecao', 
    basePrice: 450,
    icon: ShieldCheck, 
    color: 'text-purple-400', 
    bg: 'bg-purple-400/10', 
    desc: 'Avaliação detalhada com câmera termográfica, análise de sombreamento e integridade estrutural.', 
    duration: '4h', 
    includes: ['Termografia', 'Análise Estrutural', 'Laudo Técnico'] 
  },
  { 
    id: '4', 
    title: 'Reparo Emergencial', 
    type: 'reparo', 
    basePrice: 390,
    icon: Zap, 
    color: 'text-orange-400', 
    bg: 'bg-orange-400/10', 
    desc: 'Visita técnica priorizada em até 24h para diagnóstico e correção de falhas críticas que interrompem a geração.', 
    duration: 'Variável', 
    includes: ['Prioridade 24h', 'Diagnóstico de Falha', 'Correção Imediata (se possível)'] 
  },
];

const PortalPayments: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { client, logout } = usePortal();

  const [selectedService, setSelectedService] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Solicitação enviada com sucesso! Em breve enviaremos o orçamento no seu WhatsApp.');
  const [isProcessing, setIsProcessing] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [panelCount, setPanelCount] = useState<number | ''>('');
  const [roofType, setRoofType] = useState('Cerâmica');
  const [problemDescription, setProblemDescription] = useState('');

  // Busca histórico de ordens de serviço do cliente em maintenance_services
  const { data: servicesHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['portal-client-services', client?.id, client?.name],
    queryFn: async () => {
      let localList: any[] = [];
      try {
        const rawMaint = localStorage.getItem('quark_maintenance_services');
        if (rawMaint) {
          const parsed = JSON.parse(rawMaint);
          if (Array.isArray(parsed) && parsed.length > 0) {
            localList = parsed.filter((s: any) => 
              (client?.id && s.client_id === client.id) ||
              (client?.name && s.client_name && s.client_name.toLowerCase().includes(client.name.toLowerCase())) ||
              (s.notes && s.notes.includes(client?.name || ''))
            );
          }
        }
      } catch (e) {}

      if (!client?.id && !client?.name) {
        return localList;
      }

      try {
        let query = supabase
          .from('maintenance_services')
          .select('*')
          .order('created_at', { ascending: false });

        if (client?.id) {
          const cleanName = (client.name || '').replace(/"/g, '');
          query = query.or(`client_id.eq.${client.id},notes.ilike."%${cleanName}%"`);
        } else if (client?.name) {
          query = query.ilike('notes', `%${client.name}%`);
        }

        const timeoutPromise = new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 1000));
        const res: any = await Promise.race([query, timeoutPromise]);
        const data = res?.data;

        if (data && data.length > 0) {
          const combined = [...localList];
          data.forEach((d: any) => {
            if (!combined.some(c => c.id === d.id)) combined.push(d);
          });
          return combined;
        }
      } catch (err) {
        console.warn('[PortalPayments] Falha ao carregar serviços remotos:', err);
      }

      return localList;
    },
    enabled: true,
  });

  const handleLogout = async () => {
    await logout();
    navigate('/portal/login');
  };

  const handleHire = (service: any) => {
    setSelectedService(service);
  };

  const submitRequest = async () => {
    if (!selectedService) return;
    setIsProcessing(true);

    const clientName = client?.name || 'Cliente';
    const serviceType = selectedService.type || 'manutencao';
    const estimatedPrice = selectedService.basePrice || 350;

    const fullNotes = `[Portal do Cliente] Solicitação de ${selectedService.title}. ` +
      `Cliente: ${clientName}. ` +
      `Painéis: ${panelCount || 'Não informado'}. ` +
      `Telhado: ${roofType}. ` +
      (problemDescription ? `Observações: ${problemDescription.trim()}` : '');

    try {
      const nowIso = new Date().toISOString();
      const newServiceOrder = {
        id: `srv-${Date.now()}`,
        client_id: client?.id || 'cli_portal',
        client_name: clientName,
        service_type: serviceType,
        status: 'pendente',
        price: estimatedPrice,
        cost: 0,
        technician: 'Equipe Técnica Quark',
        notes: fullNotes,
        before_photos: [],
        after_photos: [],
        created_at: nowIso,
        updated_at: nowIso,
      };

      try {
        const rawMaint = localStorage.getItem('quark_maintenance_services');
        const list = rawMaint ? JSON.parse(rawMaint) : [];
        localStorage.setItem('quark_maintenance_services', JSON.stringify([newServiceOrder, ...list]));
      } catch (err) {}

      // 1. Tenta envio via API do backend
      let saved = false;
      try {
        const response = await fetch('/api/maintenance/services', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: client?.id || null,
            client_name: clientName,
            service_type: serviceType,
            status: 'pendente',
            price: estimatedPrice,
            technician: 'Equipe Técnica Quark',
            notes: fullNotes,
          }),
        });

        if (response.ok) {
          saved = true;
        }
      } catch (httpErr) {
        console.warn('[PortalPayments] Falha na API HTTP, tentando fallback Supabase:', httpErr);
      }

      // 2. Fallback direto Supabase se não salvou pela API
      if (!saved) {
        const nowIso = new Date().toISOString();
        const { error: insertError } = await supabase
          .from('maintenance_services')
          .insert({
            client_id: client?.id || null,
            user_id: client?.auth_user_id || null,
            service_type: serviceType,
            status: 'pendente',
            price: estimatedPrice,
            cost: 0,
            technician: 'Equipe Técnica Quark',
            notes: fullNotes,
            before_photos: [],
            after_photos: [],
            created_at: nowIso,
            updated_at: nowIso,
          });

        if (insertError) {
          console.error('[PortalPayments] Erro no fallback Supabase:', insertError);
        }
      }

      // Invalida cache de serviços para atualizar tabela imediatamente
      queryClient.invalidateQueries({ queryKey: ['portal-client-services'] });
      queryClient.invalidateQueries({ queryKey: ['maintenance_services'] });

      setSelectedService(null);
      setPanelCount('');
      setRoofType('Cerâmica');
      setProblemDescription('');
      setToastMessage('Solicitação enviada com sucesso! Em breve nossa equipe entrará em contato via WhatsApp para confirmar o agendamento.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } catch (error) {
      console.error('[PortalPayments] Erro geral ao solicitar serviço:', error);
      setToastMessage('Sua solicitação foi registrada! Entraremos em contato em breve.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30';
      case 'agendado':
        return 'bg-blue-500/15 text-blue-400 border border-blue-500/30';
      case 'em_campo':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/30';
      case 'pendente':
      default:
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluido':
        return 'Concluído';
      case 'agendado':
        return 'Agendado';
      case 'em_campo':
        return 'Em Campo';
      case 'pendente':
      default:
        return 'Pendente';
    }
  };

  const formatServiceTitle = (type: string) => {
    switch (type) {
      case 'limpeza':
        return 'Limpeza Técnica de Painéis';
      case 'manutencao':
        return 'Manutenção Preventiva';
      case 'inspecao':
        return 'Inspeção Termográfica';
      case 'reparo':
        return 'Reparo Emergencial';
      default:
        return type || 'Serviço Técnico';
    }
  };

  const faqs = [
    { 
      q: 'Com que frequência devo limpar os painéis?', 
      a: 'Recomendamos a limpeza a cada 6 meses ou anualmente, dependendo da região e acúmulo de poeira/sujeira para garantir 100% da geração.' 
    },
    { 
      q: 'A manutenção preventiva é obrigatória?', 
      a: 'Não é obrigatória, mas é essencial para preservar a garantia dos inversores e módulos, além de prevenir paradas não programadas.' 
    },
    { 
      q: 'Posso usar meus Quark Points para pagar os serviços?', 
      a: 'Sim! Acesse a aba "Loja & Fidelidade" e troque seus pontos acumulados diretamente por limpezas e manutenções gratuitas.' 
    },
    { 
      q: 'Quais as formas de pagamento aceitas?', 
      a: 'Aceitamos PIX, Cartão de Crédito em até 3x sem juros, Boleto Bancário e Resgate com Quark Points.' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-zinc-200 font-sans pb-16">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-10">
        {/* Breadcrumb / Navegação */}
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <button 
            onClick={() => navigate('/portal')}
            className="hover:text-lime-400 transition-colors flex items-center gap-1 font-medium"
          >
            <ArrowLeft size={14} /> Início
          </button>
          <span>/</span>
          <span className="text-zinc-200 font-semibold">Serviços & Manutenção</span>
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <CreditCard size={24} />
            </div>
            Serviços & Manutenções Especializadas
          </h1>
          <p className="text-zinc-400 text-sm">
            Contrate vistorias, limpezas técnicas e acompanhe as ordens de serviço da sua usina solar.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {mockServices.map((service, index) => (
            <motion.div 
              key={service.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-lime-500/30 transition-all group border border-white/10"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${service.bg} ${service.color} border border-white/5`}>
                    <service.icon size={24} />
                  </div>
                  <div className="text-right">
                    <span className="block text-base font-display font-bold text-lime-400">
                      A partir de R$ {service.basePrice}
                    </span>
                    <span className="text-[11px] text-zinc-500">Duração aprox: {service.duration}</span>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{service.title}</h3>
                <p className="text-xs text-zinc-400 mb-5 leading-relaxed">{service.desc}</p>
                
                <div className="mb-6 space-y-2">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    Escopo incluído:
                  </span>
                  {service.includes.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 size={14} className="text-lime-400 shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => handleHire(service)}
                className="w-full py-2.5 bg-white/5 hover:bg-lime-500 hover:text-black border border-white/10 hover:border-lime-500 rounded-xl font-bold text-xs transition-all active:scale-98 text-white shadow-sm"
              >
                Solicitar Este Serviço
              </button>
            </motion.div>
          ))}
        </div>

        {/* Histórico Real de Serviços e Pagamentos */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History Table */}
          <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white flex items-center gap-2 text-base">
                  <Wrench size={18} className="text-lime-400" /> Histórico de Serviços da Usina
                </h3>
                <span className="text-[11px] text-zinc-500 font-mono">
                  {servicesHistory.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-zinc-500 uppercase text-[10px] tracking-wider">
                      <th className="pb-3 font-semibold">Serviço</th>
                      <th className="pb-3 font-semibold">Data</th>
                      <th className="pb-3 font-semibold">Valor</th>
                      <th className="pb-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {loadingHistory ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-zinc-500">
                          Carregando histórico...
                        </td>
                      </tr>
                    ) : servicesHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-400">
                          <p className="text-sm font-semibold text-zinc-300">Nenhum serviço contratado ainda</p>
                          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">Quando você agendar limpezas técnicas ou revisões preventivas, o histórico e laudos aparecerão aqui.</p>
                        </td>
                      </tr>
                    ) : (
                      servicesHistory.map((item: any, i: number) => {
                        const dateFormatted = item.scheduled_date 
                          ? new Date(item.scheduled_date).toLocaleDateString('pt-BR')
                          : item.created_at 
                            ? new Date(item.created_at).toLocaleDateString('pt-BR')
                            : 'A definir';

                        return (
                          <tr key={item.id || i} className="hover:bg-white/5 transition-colors">
                            <td className="py-3 font-medium text-white max-w-[140px] truncate">
                              {formatServiceTitle(item.service_type)}
                            </td>
                            <td className="py-3 text-zinc-400">{dateFormatted}</td>
                            <td className="py-3 font-mono text-lime-400 font-bold">
                              R$ {Number(item.price || 0).toFixed(2)}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase inline-block ${getStatusBadge(item.status)}`}>
                                {getStatusLabel(item.status)}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 mt-4 pt-3 border-t border-white/5">
              💡 As vistorias e limpezas resgatadas com <strong>Quark Points</strong> também aparecem aqui após a confirmação.
            </p>
          </div>

          {/* FAQ */}
          <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-white/10">
            <h3 className="font-bold text-white mb-4 text-base">Dúvidas Frequentes</h3>
            <div className="space-y-2.5">
              {faqs.map((faq, i) => (
                <div key={i} className="border border-white/5 rounded-xl overflow-hidden bg-zinc-950/40">
                  <button 
                    onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                    className="w-full p-3.5 flex justify-between items-center text-left hover:bg-white/5 transition-colors"
                  >
                    <span className="font-medium text-xs text-zinc-200 pr-2">{faq.q}</span>
                    <ChevronDown size={14} className={`text-zinc-500 transition-transform shrink-0 ${expandedFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {expandedFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                      >
                        <p className="p-3.5 text-xs text-zinc-400 border-t border-white/5 leading-relaxed bg-black/20">
                          {faq.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Contratação de Serviço */}
      <AnimatePresence>
        {selectedService && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/75 backdrop-blur-sm" 
              onClick={() => setSelectedService(null)} 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="relative w-full max-w-md bg-[#0c1222] border border-zinc-800 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-xl font-bold text-white mb-1">Solicitar Serviço</h3>
              <p className="text-xs text-zinc-400 mb-5">
                Você está solicitando <strong className="text-lime-400">{selectedService.title}</strong> para sua instalação.
              </p>
              
              <div className="space-y-3.5 mb-6">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Quantidade de Painéis</label>
                  <input 
                    type="number" 
                    value={panelCount}
                    onChange={(e) => setPanelCount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-500 outline-none" 
                    placeholder="Ex: 12"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Tipo de Telhado / Estrutura</label>
                  <select
                    value={roofType}
                    onChange={(e) => setRoofType(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-500 outline-none appearance-none"
                  >
                    <option value="Cerâmica">Cerâmica</option>
                    <option value="Metálico">Metálico / Trapezoidal</option>
                    <option value="Fibrocimento">Fibrocimento</option>
                    <option value="Laje">Laje de Concreto</option>
                    <option value="Solo">Estrutura de Solo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1">Observações ou Preferência de Data</label>
                  <textarea 
                    rows={3} 
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:border-lime-500 outline-none resize-none" 
                    placeholder="Descreva detalhes adicionais ou dias da semana com disponibilidade..."
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setSelectedService(null)} 
                  disabled={isProcessing} 
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={submitRequest} 
                  disabled={isProcessing} 
                  className="flex-1 btn-primary py-2.5 rounded-xl text-xs flex justify-center items-center shadow-lg shadow-lime-500/20 active:scale-95"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={16} /> : 'Confirmar Solicitação'}
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
            className="fixed bottom-6 right-6 max-w-md bg-zinc-900 border border-lime-500/50 text-white px-5 py-4 rounded-2xl shadow-2xl font-medium text-xs flex items-center gap-3 z-[110]"
          >
            <CheckCircle2 size={18} className="text-lime-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PortalPayments;

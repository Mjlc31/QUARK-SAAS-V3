import React, { useState, useRef } from 'react';
import { HardHat, Link as WebhookIcon, Paperclip, Plus, Loader2, Calendar, FileText, CheckCircle2, X } from 'lucide-react';

type EngStatus = 'Documentacao' | 'Viabilidade' | 'Concessionaria' | 'Instalacao' | 'Homologacao';

interface Obra {
  id: string;
  clientName: string;
  city: string;
  systemSize: string;
  status: EngStatus;
  attachments: number;
  hasWebhook: boolean;
  date: string;
}

const COLUMNS: { id: EngStatus; title: string; color: string }[] = [
  { id: 'Documentacao', title: 'Documentação', color: 'border-blue-500' },
  { id: 'Viabilidade', title: 'Viabilidade & Projeto', color: 'border-yellow-500' },
  { id: 'Concessionaria', title: 'Acesso Concessionária', color: 'border-purple-500' },
  { id: 'Instalacao', title: 'Instalação Física', color: 'border-orange-500' },
  { id: 'Homologacao', title: 'Homologação', color: 'border-lime-500' },
];

const INITIAL_OBRAS: Obra[] = [
  { id: '1', clientName: 'Indústria Metálica SA', city: 'São Paulo - SP', systemSize: '75.5 kWp', status: 'Viabilidade', attachments: 3, hasWebhook: true, date: '2023-10-15' },
  { id: '2', clientName: 'Supermercado CompreBem', city: 'Campinas - SP', systemSize: '150.0 kWp', status: 'Instalacao', attachments: 12, hasWebhook: true, date: '2023-11-02' },
];

const Engineering: React.FC = () => {
  const [obras, setObras] = useState<Obra[]>(INITIAL_OBRAS);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  
  // Modal de Detalhes da Obra
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const handleDrop = (e: React.DragEvent, status: EngStatus) => {
    e.preventDefault();
    if (draggedId) {
      setObras(obras.map(o => o.id === draggedId ? { ...o, status } : o));
      setDraggedId(null);
    }
  };

  const handleAddObra = () => {
    const newObra: Obra = {
      id: Date.now().toString(),
      clientName: 'Nova Obra (Clique para editar)',
      city: 'A definir',
      systemSize: '0.0 kWp',
      status: 'Documentacao',
      attachments: 0,
      hasWebhook: false,
      date: new Date().toISOString().split('T')[0]
    };
    setObras([...obras, newObra]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && selectedObra) {
      setIsUploading(true);
      setTimeout(() => {
        setObras(obras.map(o => o.id === selectedObra.id ? { ...o, attachments: o.attachments + 1 } : o));
        setSelectedObra({ ...selectedObra, attachments: selectedObra.attachments + 1 });
        setIsUploading(false);
      }, 1000);
    }
  };

  const toggleWebhook = () => {
    if (!selectedObra) return;
    const newStatus = !selectedObra.hasWebhook;
    setObras(obras.map(o => o.id === selectedObra.id ? { ...o, hasWebhook: newStatus } : o));
    setSelectedObra({ ...selectedObra, hasWebhook: newStatus });
    if(newStatus) alert('Webhook vinculado! Notificações de mudança de fase ativadas.');
  };

  return (
    <div className="space-y-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex flex-col relative animate-enter pb-10">
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Engenharia e Obras</h1>
          <p className="text-slate-400 mt-1">Gerencie projetos pós-vendas no estilo Trello.</p>
        </div>
        <button onClick={handleAddObra} className="flex items-center gap-2 px-5 py-2.5 bg-lime-500 text-black font-bold rounded-xl hover:bg-lime-400 transition-colors shadow-lg active:scale-95">
          <Plus size={20} /> Nova Obra
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden custom-scrollbar pb-4 -mx-4 md:mx-0 px-4 md:px-0 flex gap-6">
        {COLUMNS.map(column => {
          const columnObras = obras.filter(o => o.status === column.id);

          return (
            <div
              key={column.id}
              className={`flex flex-col w-[320px] shrink-0 h-full bg-zinc-900/40 backdrop-blur-sm border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              <div className={`p-4 border-t-4 ${column.color} bg-black/40 flex items-center justify-between shrink-0`}>
                <h3 className="font-bold text-white font-display tracking-tight text-sm uppercase">{column.title}</h3>
                <span className="bg-zinc-800 text-zinc-400 px-2.5 py-1 rounded-full text-xs font-bold">{columnObras.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {columnObras.map(obra => (
                  <div
                    key={obra.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, obra.id)}
                    onClick={() => setSelectedObra(obra)}
                    className="bg-[#0c121a] border border-white/10 hover:border-lime-500/50 p-5 rounded-2xl cursor-pointer shadow-lg active:scale-[0.98] transition-all touch-manipulation relative group"
                  >
                    <h4 className="font-bold text-white mb-2 leading-tight group-hover:text-lime-400 transition-colors">{obra.clientName}</h4>
                    <p className="text-xs text-zinc-500 mb-4">{obra.city} • <span className="font-bold text-zinc-400">{obra.systemSize}</span></p>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                       <div className="flex gap-3 text-xs text-zinc-500 font-medium">
                          <span className={`flex items-center gap-1 hover:text-white transition-colors ${obra.attachments > 0 ? 'text-blue-400' : ''}`}>
                            <Paperclip size={14} /> {obra.attachments}
                          </span>
                          <span className={`flex items-center gap-1 hover:text-white transition-colors ${obra.hasWebhook ? 'text-lime-400' : ''}`} title="Webhook de Notificação ativado">
                            <WebhookIcon size={14} />
                          </span>
                       </div>
                       <div className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-[10px] text-zinc-400 font-bold">
                         {obra.clientName.substring(0, 1)}
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal / Card Panel da Obra */}
      {selectedObra && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0a0f16] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-enter">
             <div className={`h-2 w-full ${COLUMNS.find(c => c.id === selectedObra.status)?.color.replace('border-', 'bg-')}`}></div>
             <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                   <div>
                     <input 
                       value={selectedObra.clientName}
                       onChange={e => {
                         const n = e.target.value;
                         setSelectedObra({...selectedObra, clientName: n});
                         setObras(obras.map(o => o.id === selectedObra.id ? {...o, clientName: n} : o));
                       }}
                       className="bg-transparent text-2xl font-bold font-display text-white outline-none w-full border-b border-transparent focus:border-lime-500/50 transition-colors"
                     />
                     <div className="flex gap-4 mt-3 text-sm font-medium text-zinc-500">
                        <span className="flex items-center gap-1"><HardHat size={16}/> {selectedObra.systemSize}</span>
                        <span className="flex items-center gap-1"><Calendar size={16}/> {selectedObra.date}</span>
                     </div>
                   </div>
                   <button onClick={() => setSelectedObra(null)} className="p-2 bg-white/5 text-zinc-400 hover:text-white rounded-lg"><X size={20}/></button>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                   <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Fase Atual</p>
                      <select 
                         value={selectedObra.status}
                         onChange={e => {
                           const s = e.target.value as EngStatus;
                           setSelectedObra({...selectedObra, status: s});
                           setObras(obras.map(o => o.id === selectedObra.id ? {...o, status: s} : o));
                         }}
                         className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white outline-none"
                      >
                        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                      </select>
                   </div>
                   <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Automação Externas</p>
                      <button 
                        onClick={toggleWebhook}
                        className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-bold transition-all border ${selectedObra.hasWebhook ? 'bg-lime-500/10 border-lime-500/30 text-lime-400' : 'bg-transparent border-white/10 text-zinc-400 hover:text-white hover:border-white/30'}`}
                      >
                        <WebhookIcon size={18} /> {selectedObra.hasWebhook ? 'Webhook Ativo' : 'Vincular Webhook ERP'}
                      </button>
                   </div>
                </div>

                <div>
                   <div className="flex justify-between items-center mb-4">
                     <p className="text-sm font-bold text-white flex items-center gap-2">
                       <FileText size={18} className="text-lime-400" />
                       Documentação e Anexos
                     </p>
                     <p className="text-xs font-bold bg-zinc-800 px-2 py-1 flex items-center gap-1 text-zinc-400 rounded-lg">
                       <Paperclip size={12} /> {selectedObra.attachments} Arquivos
                     </p>
                   </div>
                   
                   <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-zinc-900/30 hover:bg-zinc-900/50 transition-colors">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                      {isUploading ? (
                         <Loader2 size={32} className="text-lime-500 animate-spin mb-4" />
                      ) : (
                         <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-4 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                           <Plus size={32} />
                         </div>
                      )}
                      <p className="font-bold text-white text-sm mb-1">{isUploading ? 'Anexando arquivo...' : 'Fazer Upload de ART, Projetos ou Fotos'}</p>
                      <p className="text-xs text-zinc-500">Aceita DWG, PDF, JPG. Limite de 50MB.</p>
                   </div>
                </div>

             </div>
             <div className="p-6 bg-black/40 border-t border-white/5 flex gap-4">
                <button 
                  onClick={() => {
                     setObras(obras.filter(o => o.id !== selectedObra.id));
                     setSelectedObra(null);
                  }}
                  className="px-6 py-3 text-red-500 font-bold hover:bg-red-500/10 rounded-xl transition-colors"
                >
                   Finalizar / Excluir Obra
                </button>
                <div className="flex-1"></div>
                <button onClick={() => setSelectedObra(null)} className="px-8 py-3 bg-lime-500 hover:bg-lime-400 text-black font-bold rounded-xl shadow-[0_0_20px_rgba(163,230,53,0.2)] active:scale-95 transition-all">
                   Salvar Alterações
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Engineering;

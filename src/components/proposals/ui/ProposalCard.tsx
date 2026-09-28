import React, { useState } from 'react';
import { MoreVertical, Edit2, Copy, Trash2, Send, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProposalCardProps {
  proposal: {
    id?: string;
    clientName: string;
    city: string;
    systemSizeKw: number;
    finalPrice: number;
    status?: 'draft' | 'sent' | 'approved' | 'rejected';
    createdAt?: string;
    updatedAt?: string;
  };
  viewMode: 'grid' | 'list';
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSendWhatsApp?: () => void;
}

const getAvatarColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 40%)`;
};

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const statusConfig = {
  draft: { label: 'Rascunho', classes: 'bg-zinc-800 text-zinc-400 border-zinc-700' },
  sent: { label: 'Enviada', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  approved: { label: 'Aprovada', classes: 'bg-lime-500/10 text-lime-400 border-lime-500/20' },
  rejected: { label: 'Recusada', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

export default function ProposalCard({
  proposal,
  viewMode,
  onEdit,
  onDuplicate,
  onDelete,
  onSendWhatsApp
}: ProposalCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const status = proposal.status || 'draft';
  const conf = statusConfig[status];

  const handleAction = (action: () => void) => {
    action();
    setShowMenu(false);
  };

  const cardBaseClasses = "relative bg-zinc-900/60 backdrop-blur-xl border border-white/5 rounded-xl transition-all duration-300 hover:border-white/10 overflow-hidden";

  if (viewMode === 'list') {
    return (
      <div className={`${cardBaseClasses} p-4 flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-4 flex-1">
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-sm"
            style={{ backgroundColor: getAvatarColor(proposal.clientName) }}
          >
            {getInitials(proposal.clientName)}
          </div>
          <div>
            <h3 className="text-zinc-100 font-medium">{proposal.clientName}</h3>
            <p className="text-sm text-zinc-500">{proposal.city}</p>
          </div>
        </div>
        
        <div className="hidden md:flex flex-col items-end px-4">
          <span className="text-zinc-300">{proposal.systemSizeKw} kWp</span>
          <span className="text-xs text-zinc-500">Potência</span>
        </div>

        <div className="hidden sm:flex flex-col items-end px-4">
          <span className="text-lime-400 font-medium">{formatCurrency(proposal.finalPrice)}</span>
          <span className="text-xs text-zinc-500">{formatDate(proposal.createdAt)}</span>
        </div>

        <div className="px-4">
          <span className={`text-xs px-2.5 py-1 rounded-full border ${conf.classes}`}>
            {conf.label}
          </span>
        </div>

        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
          >
            <MoreVertical size={18} />
          </button>
          
          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full mt-2 w-48 bg-zinc-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1 flex flex-col">
                  {showConfirmDelete ? (
                    <div className="p-2 flex flex-col gap-2">
                      <p className="text-xs text-center text-zinc-300">Excluir?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-white transition-colors">Não</button>
                        <button onClick={() => { handleAction(onDelete); setShowConfirmDelete(false); }} className="flex-1 py-1 rounded bg-red-500 hover:bg-red-600 text-xs text-white transition-colors">Sim</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleAction(onEdit)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Edit2 size={14} /> Editar
                      </button>
                      <button onClick={() => handleAction(onDuplicate)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Copy size={14} /> Duplicar
                      </button>
                      {onSendWhatsApp && (
                        <button onClick={() => handleAction(onSendWhatsApp)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                          <Send size={14} /> WhatsApp
                        </button>
                      )}
                      <div className="h-px bg-white/5 my-1" />
                      <button onClick={() => setShowConfirmDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left">
                        <Trash2 size={14} /> Excluir
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // Grid mode
  return (
    <div className={`${cardBaseClasses} flex flex-col`}>
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-4">
          <div 
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-medium text-lg shadow-sm"
            style={{ backgroundColor: getAvatarColor(proposal.clientName) }}
          >
            {getInitials(proposal.clientName)}
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 transition-colors"
            >
              <MoreVertical size={18} />
            </button>

            <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="absolute right-0 top-full mt-1 w-48 bg-zinc-800 border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1 flex flex-col">
                  {showConfirmDelete ? (
                    <div className="p-2 flex flex-col gap-2">
                      <p className="text-xs text-center text-zinc-300">Excluir?</p>
                      <div className="flex gap-2">
                        <button onClick={() => setShowConfirmDelete(false)} className="flex-1 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-xs text-white transition-colors">Não</button>
                        <button onClick={() => { handleAction(onDelete); setShowConfirmDelete(false); }} className="flex-1 py-1 rounded bg-red-500 hover:bg-red-600 text-xs text-white transition-colors">Sim</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleAction(onEdit)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Edit2 size={14} /> Editar
                      </button>
                      <button onClick={() => handleAction(onDuplicate)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                        <Copy size={14} /> Duplicar
                      </button>
                      {onSendWhatsApp && (
                        <button onClick={() => handleAction(onSendWhatsApp)} className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 rounded-lg transition-colors text-left">
                          <Send size={14} /> WhatsApp
                        </button>
                      )}
                      <div className="h-px bg-white/5 my-1" />
                      <button onClick={() => setShowConfirmDelete(true)} className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left">
                        <Trash2 size={14} /> Excluir
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>

        <h3 className="text-zinc-100 font-medium text-lg mb-1 truncate">{proposal.clientName}</h3>
        <p className="text-sm text-zinc-500 mb-4">{proposal.city}</p>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Potência</span>
            <span className="text-zinc-200 font-medium">{proposal.systemSizeKw} kWp</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-zinc-400">Preço Final</span>
            <span className="text-lime-400 font-medium">{formatCurrency(proposal.finalPrice)}</span>
          </div>
        </div>
      </div>
      
      <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
        <span className="text-xs text-zinc-500">{formatDate(proposal.createdAt)}</span>
        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded border ${conf.classes}`}>
          {conf.label}
        </span>
      </div>
    </div>
  );
}

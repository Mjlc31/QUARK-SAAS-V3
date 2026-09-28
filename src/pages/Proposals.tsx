import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Plus, Search, LayoutGrid, List, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useProposals } from '../hooks/useProposals';
import type { ProposalData, ProposalStatus } from '../components/proposal/types';
import ProposalMetrics from '../components/proposals/ui/ProposalMetrics';
import ProposalCard from '../components/proposals/ui/ProposalCard';
import ProposalWizard from '../components/proposals/ProposalWizard';

const STATUS_FILTERS: { label: string; value: ProposalStatus | 'all' }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Rascunho', value: 'draft' },
  { label: 'Enviada', value: 'sent' },
  { label: 'Aprovada', value: 'approved' },
  { label: 'Recusada', value: 'rejected' },
];

export default function Proposals() {
  const { addLead } = useApp();
  const {
    proposals,
    isLoading,
    saveProposal,
    duplicateProposal,
    deleteProposal,
    updateStatus,
  } = useProposals();

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<ProposalData | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProposalStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const matchesSearch =
        p.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.city.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [proposals, searchQuery, statusFilter]);

  const handleOpenWizard = (proposal?: ProposalData) => {
    setSelectedProposal(proposal);
    setIsWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setSelectedProposal(undefined);
  };

  const handleSaveProposal = async (data: ProposalData) => {
    await saveProposal.mutateAsync(data);
    if (!data.id) {
      addLead({
        name: data.clientName,
        phone: data.phone || '',
        city: data.city,
        source: 'Proposta',
        status: 'Proposta',
        value: data.finalPrice || 0,
      });
    }
    handleCloseWizard();
  };

  const generateWhatsAppLink = (proposal: ProposalData) => {
    if (!proposal.phone) return;
    const phoneNum = proposal.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Olá ${proposal.clientName}, segue o link para a sua proposta de energia solar.`
    );
    window.open(`https://wa.me/55${phoneNum}?text=${message}`, '_blank');
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-lime-400/10 rounded-xl border border-lime-400/20">
            <FileText className="w-6 h-6 text-lime-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Propostas</h1>
            <p className="text-sm text-zinc-400 mt-1">Gerencie suas propostas comerciais</p>
          </div>
        </div>

        <button
          onClick={() => handleOpenWizard()}
          className="flex items-center gap-2 px-4 py-2 bg-lime-400 text-zinc-900 font-semibold rounded-lg hover:bg-lime-500 transition-colors shadow-lg shadow-lime-400/20 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          Nova Proposta
        </button>
      </div>

      {/* Metrics */}
      <ProposalMetrics proposals={proposals} />

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-[#18181b] p-4 rounded-xl border border-white/8">
        <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por cliente ou cidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#09090b] border border-white/8 rounded-lg pl-9 pr-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-lime-400/50 focus:ring-1 focus:ring-lime-400/50 transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((filter) => {
              const isSelected = statusFilter === filter.value;
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border cursor-pointer ${
                    isSelected
                      ? 'bg-lime-400/20 text-lime-400 border-lime-400/30'
                      : 'bg-zinc-800/50 text-zinc-400 border-transparent hover:bg-zinc-800'
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[#09090b] p-1 rounded-lg border border-white/8 hidden sm:flex">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'grid' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              viewMode === 'list' ? 'bg-zinc-800 text-lime-400' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#18181b] border border-white/8 rounded-xl h-[280px] animate-pulse p-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-32 h-5 bg-zinc-800 rounded"></div>
                  <div className="w-20 h-6 bg-zinc-800 rounded-full"></div>
                </div>
                <div className="w-48 h-4 bg-zinc-800 rounded"></div>
                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="w-full h-12 bg-zinc-800 rounded"></div>
                  <div className="w-full h-12 bg-zinc-800 rounded"></div>
                </div>
              </div>
              <div className="w-full h-10 bg-zinc-800 rounded mt-4"></div>
            </div>
          ))}
        </div>
      ) : filteredProposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center border border-dashed border-white/10 rounded-xl bg-[#18181b]/50">
          <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-zinc-500" />
          </div>
          <h3 className="text-xl font-medium text-zinc-200 mb-2">Nenhuma proposta encontrada</h3>
          <p className="text-zinc-500 mb-6 max-w-md">
            {searchQuery || statusFilter !== 'all'
              ? 'Tente ajustar os filtros ou os termos de busca.'
              : 'Você ainda não tem nenhuma proposta comercial. Comece criando a sua primeira proposta.'}
          </p>
          <button
            onClick={() => handleOpenWizard()}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-900 font-semibold rounded-lg hover:bg-white transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Criar primeira proposta
          </button>
        </div>
      ) : (
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 },
            },
          }}
          initial="hidden"
          animate="show"
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
              : 'flex flex-col gap-3'
          }
        >
          {filteredProposals.map((proposal) => (
            <motion.div
              key={proposal.id}
              variants={{
                hidden: { opacity: 0, y: 10 },
                show: { opacity: 1, y: 0 },
              }}
            >
              <ProposalCard
                proposal={proposal}
                viewMode={viewMode}
                onEdit={() => handleOpenWizard(proposal)}
                onDuplicate={() => duplicateProposal.mutate(proposal)}
                onDelete={() => deleteProposal.mutate(proposal.id!)}
                onSendWhatsApp={() => generateWhatsAppLink(proposal)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Wizard Modal */}
      <AnimatePresence>
        {isWizardOpen && (
          <ProposalWizard
            initialData={selectedProposal}
            onClose={handleCloseWizard}
            onSave={handleSaveProposal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

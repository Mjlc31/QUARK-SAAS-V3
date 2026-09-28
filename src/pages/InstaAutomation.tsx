import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Instagram, Plus, Trash2, Edit2, Play, Square, Settings, MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface Campaign {
  id: string;
  name: string;
  keyword: string;
  reply_text: string;
  is_active: boolean;
  created_at?: string;
}

const InstaAutomation: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.from('instagram_campaigns').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching campaigns:', error);
      } else {
        setCampaigns(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Para simplificar a demonstração inicial e caso a tabela não exista, usamos mock temporário se der erro
    // Na prática, deve-se criar a tabela instagram_campaigns no Supabase
    fetchCampaigns();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;

    if (editingCampaign.id) {
      // Update
      const { error } = await supabase.from('instagram_campaigns').update({
        name: editingCampaign.name,
        keyword: editingCampaign.keyword,
        reply_text: editingCampaign.reply_text,
        is_active: editingCampaign.is_active
      }).eq('id', editingCampaign.id);
      
      if (!error) {
        setCampaigns(prev => prev.map(c => c.id === editingCampaign.id ? editingCampaign : c));
      }
    } else {
      // Insert
      const { id, ...newCampaign } = editingCampaign; // supabase will generate it
      const { data, error } = await supabase.from('instagram_campaigns').insert([newCampaign]).select();
      if (!error && data) {
        setCampaigns(prev => [data[0], ...prev]);
      }
    }
    setIsModalOpen(false);
    setEditingCampaign(null);
  };

  const toggleActive = async (campaign: Campaign) => {
    const updated = { ...campaign, is_active: !campaign.is_active };
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? updated : c));
    await supabase.from('instagram_campaigns').update({ is_active: updated.is_active }).eq('id', campaign.id);
  };

  const handleDelete = async (id: string) => {
    if(confirm('Tem certeza que deseja excluir esta campanha?')) {
      setCampaigns(prev => prev.filter(c => c.id !== id));
      await supabase.from('instagram_campaigns').delete().eq('id', id);
    }
  }

  const openNewModal = () => {
    setEditingCampaign({ id: '', name: '', keyword: '', reply_text: '', is_active: true });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Instagram className="text-pink-500" /> Automação Instagram
          </h1>
          <p className="text-zinc-400 mt-1">Responda comentários automaticamente com DMs usando a API Oficial da Meta.</p>
        </div>
        <button onClick={openNewModal} className="bg-lime-500 text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-lime-400 transition-colors">
          <Plus size={20} />
          Nova Campanha
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-pink-500/20 flex items-center justify-center">
            <MessageCircle className="text-pink-400" />
          </div>
          <div>
            <p className="text-zinc-400 text-sm">DMs Enviadas (Mês)</p>
            <p className="text-2xl font-bold text-white">0</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-lime-500/20 flex items-center justify-center">
            <Play className="text-lime-400" />
          </div>
          <div>
            <p className="text-zinc-400 text-sm">Campanhas Ativas</p>
            <p className="text-2xl font-bold text-white">{campaigns.filter(c => c.is_active).length}</p>
          </div>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-white/10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-zinc-500/20 flex items-center justify-center">
            <Settings className="text-zinc-400" />
          </div>
          <div>
            <p className="text-zinc-400 text-sm">Status Conexão Meta</p>
            <p className="text-lg font-bold text-yellow-400">Pendente Configuração</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className="font-bold text-white">Suas Campanhas</h2>
        </div>
        <div className="p-4">
          {isLoading ? (
            <p className="text-zinc-500">Carregando...</p>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-10">
              <Instagram size={48} className="mx-auto text-zinc-600 mb-4 opacity-50" />
              <p className="text-zinc-400">Nenhuma campanha criada.</p>
              <button onClick={openNewModal} className="text-lime-400 mt-2 hover:underline">Criar a primeira</button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map(camp => (
                <div key={camp.id} className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-black/20 hover:bg-white/5 transition-colors">
                  <div>
                    <h3 className="font-bold text-white text-lg">{camp.name}</h3>
                    <p className="text-zinc-400 text-sm mt-1">Palavra-chave: <span className="bg-zinc-800 text-pink-300 px-2 py-0.5 rounded text-xs font-mono">{camp.keyword}</span></p>
                    <p className="text-zinc-500 text-xs mt-1 truncate max-w-md">Resposta: {camp.reply_text}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleActive(camp)} className={`p-2 rounded-lg transition-colors ${camp.is_active ? 'bg-lime-500/20 text-lime-400' : 'bg-zinc-800 text-zinc-500'}`} title={camp.is_active ? 'Ativa' : 'Pausada'}>
                      {camp.is_active ? <Play size={18} /> : <Square size={18} />}
                    </button>
                    <button onClick={() => { setEditingCampaign(camp); setIsModalOpen(true); }} className="p-2 text-zinc-400 hover:text-white transition-colors bg-white/5 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(camp.id)} className="p-2 text-red-400 hover:text-red-300 transition-colors bg-red-500/10 rounded-lg">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && editingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-panel p-6 rounded-2xl w-full max-w-lg border border-white/10">
            <h2 className="text-xl font-bold text-white mb-4">{editingCampaign.id ? 'Editar Campanha' : 'Nova Campanha'}</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome da Campanha</label>
                <input required type="text" value={editingCampaign.name} onChange={e => setEditingCampaign({...editingCampaign, name: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-lime-500 outline-none" placeholder="Ex: Black Friday 2026" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Palavra-chave Gatilho</label>
                <input required type="text" value={editingCampaign.keyword} onChange={e => setEditingCampaign({...editingCampaign, keyword: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-pink-500 outline-none font-mono" placeholder="Ex: EUQUERO" />
                <p className="text-xs text-zinc-500 mt-1">O sistema responderá apenas comentários que contenham esta palavra exata.</p>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Mensagem da DM</label>
                <textarea required rows={4} value={editingCampaign.reply_text} onChange={e => setEditingCampaign({...editingCampaign, reply_text: e.target.value})} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white focus:border-lime-500 outline-none resize-none" placeholder="Olá! Aqui está o link que você pediu: https://..." />
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" id="isActive" checked={editingCampaign.is_active} onChange={e => setEditingCampaign({...editingCampaign, is_active: e.target.checked})} className="accent-lime-500" />
                <label htmlFor="isActive" className="text-zinc-300 text-sm cursor-pointer">Ativar campanha imediatamente</label>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
                <button type="submit" className="bg-lime-500 text-black px-6 py-2 rounded-xl font-bold hover:bg-lime-400 transition-colors">Salvar</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default InstaAutomation;

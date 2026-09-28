import React, { useState } from 'react';
import { Search, MapPin, Building2, ExternalLink, Plus, Loader2, Store, Clock, Star } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { ProspectLead } from '../types';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

const SEGMENTOS_SUGERIDOS = [
  'Padarias',
  'Construtoras',
  'Supermercados',
  'Postos de Combustível',
  'Farmácias',
  'Academias',
  'Igrejas',
  'Indústrias',
  'Hotéis',
  'Hospitais',
  'Restaurantes',
  'Clínicas',
  'Açougues',
  'Escolas',
  'Agronegócio'
];

export default function Prospeccao() {
  const { addLead, user } = useApp();
  
  const [segmento, setSegmento] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [localizacao, setLocalizacao] = useState('Maceió - AL (Ponto Fixo)');
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [error, setError] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmento) return;

    setLoading(true);
    setError('');
    setLeads([]);
    setSelectedLeads(new Set());

    try {
      const res = await fetch('http://localhost:3001/api/prospeccao/buscar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          segmento, 
          localizacao, 
          lat: -9.565303169507171,
          lon: -35.75619080000001
        })
      });

      if (!res.ok) {
        let errorMsg = 'Erro ao buscar no servidor';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch (e) {
          errorMsg = `Erro de comunicação com servidor (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setLeads(data.leads || []);
    } catch (err: any) {
      setError(err.message || 'Falha na comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCRM = async (prospect: ProspectLead, skipAlert = false) => {
    const newOpp = {
      title: prospect.nome,
      phone: prospect.telefone || '-',
      city: prospect.endereco.split('-')[0]?.trim() || '',
      amount: 0,
      status: 'Lead',
      user_id: user?.id
    };

    const { data, error } = await supabase.from('opportunities').insert([newOpp]).select();
    
    if (data && data.length > 0) {
      await supabase.from('agent_notes').insert([{
        entity_type: 'opportunity',
        entity_id: data[0].id,
        note: `Lead prospectado via Google Maps.\nSegmento: ${segmento}\nAvaliação: ${prospect.avaliacao}\nWebsite: ${prospect.website}`,
        created_by_ai: false,
        user_id: user?.id
      }]);
    }

    if (!skipAlert) {
      toast.success(`${prospect.nome} adicionado ao CRM com sucesso!`);
    }
  };

  const openMapsRoof = (prospect: ProspectLead) => {
    let url = '';
    if (prospect.latitude && prospect.longitude) {
      url = `https://www.google.com/maps/@${prospect.latitude},${prospect.longitude},19z/data=!3m1!1e3`;
    } else {
      url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.endereco)}`;
    }
    window.open(url, '_blank');
  };

  const openStreetView = (prospect: ProspectLead) => {
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prospect.latitude},${prospect.longitude}`;
    window.open(url, '_blank');
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedLeads(new Set(leads.map((_, i) => i)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (index: number, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(index);
    } else {
      newSelected.delete(index);
    }
    setSelectedLeads(newSelected);
  };

  const handleImportSelected = () => {
    if (selectedLeads.size === 0) return;
    selectedLeads.forEach(index => {
      handleAddCRM(leads[index], true);
    });
    toast.success(`${selectedLeads.size} leads importados com sucesso!`);
    setSelectedLeads(new Set());
  };

  return (
    <div className="flex flex-col h-full animate-enter">
      <div className="max-w-7xl mx-auto w-full space-y-6 pb-12">
        
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white font-display flex items-center gap-3">
            <div className="p-2.5 bg-lime-500/10 rounded-xl border border-lime-500/20">
              <MapPin className="w-6 h-6 text-lime-400" />
            </div>
            Prospecção Ativa
          </h1>
          <p className="text-zinc-400 text-sm md:text-base max-w-2xl">
            Efetue buscas por segmentos na sua região utilizando o motor do Google Maps. Encontre telhados ideais para instalações solares e importe as melhores oportunidades diretamente para o CRM.
          </p>
        </div>

        {/* Search Bar / Filters */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-white/10 shadow-xl relative z-50">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-5 items-end">
            <div className="flex-1 w-full space-y-2 relative">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Segmento do Cliente</label>
              <div className="relative group">
                <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-lime-400 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Padarias, Supermercados..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-white focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
                  value={segmento}
                  onChange={e => {
                    setSegmento(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {SEGMENTOS_SUGERIDOS.filter(s => s.toLowerCase().includes(segmento.toLowerCase())).map(s => (
                      <div 
                        key={s} 
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-zinc-300 hover:text-white transition-colors"
                        onClick={() => {
                          setSegmento(s);
                          setShowDropdown(false);
                        }}
                      >
                        {s}
                      </div>
                    ))}
                    {segmento && !SEGMENTOS_SUGERIDOS.some(s => s.toLowerCase() === segmento.toLowerCase()) && (
                      <div 
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-lime-400 transition-colors"
                        onClick={() => {
                          setShowDropdown(false);
                        }}
                      >
                        Buscar por "{segmento}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 w-full space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Localização Base</label>
              <div className="relative group">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors" />
                <input 
                  type="text" 
                  readOnly
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-4 text-white outline-none transition-all placeholder-zinc-600 cursor-not-allowed opacity-80"
                  value="Maceió - AL (Ponto Fixo)"
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto px-8 h-12 btn-primary rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-lime-500/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shrink-0"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  <span className="text-black">Minerando...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5 text-black" />
                  <span className="text-black">Buscar Leads</span>
                </>
              )}
            </button>
          </form>
          {error && (
            <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-sm flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500"></div>
              {error}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="glass-panel p-12 rounded-2xl border border-white/5 flex flex-col items-center justify-center animate-pulse-glow">
            <div className="relative">
              <div className="absolute inset-0 bg-lime-500/20 blur-xl rounded-full"></div>
              <MapPin className="w-12 h-12 text-lime-400 animate-bounce relative z-10" />
            </div>
            <h3 className="text-xl font-bold text-white mt-6 mb-2 font-display">Minerando oportunidades</h3>
            <p className="text-zinc-400 text-sm text-center max-w-sm">
              Varrendo o Google Maps por novos potenciais clientes. Esse processo pode levar entre 15 e 60 segundos.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && leads.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white font-display">Resultados da Busca</h2>
                <span className="px-3 py-1 bg-lime-500/10 text-lime-400 border border-lime-500/20 rounded-full text-xs font-bold">
                  {leads.length} encontrados
                </span>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox"
                    className="w-4 h-4 text-lime-500 bg-zinc-800 border-zinc-700 rounded focus:ring-lime-500/50 focus:ring-offset-0 cursor-pointer"
                    checked={selectedLeads.size === leads.length && leads.length > 0}
                    onChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Selecionar Todos</span>
                </label>
                {selectedLeads.size > 0 && (
                  <button 
                    onClick={handleImportSelected}
                    className="px-4 py-2 bg-lime-500 hover:bg-lime-400 text-black rounded-lg text-sm font-bold transition-all active:scale-95 shadow-lg shadow-lime-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Importar ({selectedLeads.size})
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {leads.map((lead, idx) => (
                <div 
                  key={idx} 
                  className={`glass-panel p-5 rounded-2xl border transition-all duration-300 group flex flex-col h-full hover:-translate-y-1 shadow-lg ${selectedLeads.has(idx) ? 'border-lime-500/50 bg-lime-500/5' : 'border-white/5 hover:border-lime-500/30 hover:shadow-lime-500/5'}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <input 
                        type="checkbox"
                        className="w-4 h-4 text-lime-500 bg-zinc-800 border-zinc-700 rounded focus:ring-lime-500/50 focus:ring-offset-0 cursor-pointer mt-1"
                        checked={selectedLeads.has(idx)}
                        onChange={(e) => handleSelectLead(idx, e.target.checked)}
                      />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedLeads.has(idx) ? 'bg-lime-500/20 text-lime-400 border-lime-500/20' : 'bg-zinc-800 border border-white/5 text-zinc-400 group-hover:bg-lime-500/10 group-hover:text-lime-400'}`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-4">
                        <h3 className="font-bold text-white text-base truncate" title={lead.nome}>{lead.nome}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                            <Star className="w-3 h-3 fill-amber-400" /> {lead.avaliacao}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-start gap-2.5 text-zinc-400">
                      <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                      <p className="text-xs leading-relaxed line-clamp-2" title={lead.endereco}>{lead.endereco}</p>
                    </div>
                    {lead.telefone && lead.telefone !== '-' && (
                      <div className="flex items-center gap-2.5 text-zinc-400">
                        <span className="text-xs">📞</span>
                        <p className="text-xs font-medium">{lead.telefone}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-auto pt-4 border-t border-white/5">
                    <button 
                      onClick={() => openMapsRoof(lead)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg text-xs font-bold transition-all active:scale-95"
                      title="Ver Telhado"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Telhado</span>
                    </button>

                    <button 
                      onClick={() => openStreetView(lead)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 rounded-lg text-xs font-bold transition-all active:scale-95"
                      title="Street View"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Street View</span>
                    </button>
                    
                    <button 
                      onClick={() => handleAddCRM(lead)}
                      className="flex items-center justify-center gap-1.5 py-2 px-2 bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/20 rounded-lg text-xs font-bold transition-all active:scale-95"
                      title="Importar para o CRM"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Importar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && leads.length === 0 && !error && (
           <div className="glass-panel p-16 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
             <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center border border-white/5 mb-4">
               <Search className="w-6 h-6 text-zinc-600" />
             </div>
             <h3 className="text-lg font-bold text-white mb-1">Nenhum lead em vista</h3>
             <p className="text-sm text-zinc-500 max-w-sm">
               Preencha o segmento nos filtros acima para iniciar sua prospecção de vendas.
             </p>
           </div>
        )}

      </div>
    </div>
  );
}

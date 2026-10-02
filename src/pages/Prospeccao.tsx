import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, ExternalLink, Plus, Loader2, Store, Star, Globe, ChevronDown } from 'lucide-react';
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
  'Agronegócio',
  'Oficinas Mecânicas',
  'Lava-Jatos',
  'Fábricas de Gelo',
  'Frigoríficos',
  'Condomínios',
  'Shopping Centers',
  'Clubes',
  'Piscinas',
  'Cerâmicas'
];

// Cidades brasileiras com potencial solar organizadas por estado
const LOCALIZACOES_SUGERIDAS = [
  // Alagoas
  'Maceió, AL',
  'Arapiraca, AL',
  'Rio Largo, AL',
  'Palmeira dos Índios, AL',
  'Marechal Deodoro, AL',
  // Pernambuco
  'Recife, PE',
  'Caruaru, PE',
  'Petrolina, PE',
  'Olinda, PE',
  'Garanhuns, PE',
  // Sergipe
  'Aracaju, SE',
  'Nossa Senhora do Socorro, SE',
  // Bahia
  'Salvador, BA',
  'Feira de Santana, BA',
  'Vitória da Conquista, BA',
  'Juazeiro, BA',
  'Barreiras, BA',
  // Paraíba
  'João Pessoa, PB',
  'Campina Grande, PB',
  // Rio Grande do Norte
  'Natal, RN',
  'Mossoró, RN',
  // Ceará
  'Fortaleza, CE',
  'Juazeiro do Norte, CE',
  'Sobral, CE',
  // Piauí
  'Teresina, PI',
  // Maranhão
  'São Luís, MA',
  // São Paulo
  'São Paulo, SP',
  'Campinas, SP',
  'Ribeirão Preto, SP',
  'São José dos Campos, SP',
  // Minas Gerais
  'Belo Horizonte, MG',
  'Uberlândia, MG',
  'Montes Claros, MG',
  // Goiás
  'Goiânia, GO',
  'Aparecida de Goiânia, GO',
  // Mato Grosso
  'Cuiabá, MT',
  'Rondonópolis, MT',
  // Distrito Federal
  'Brasília, DF',
  // Rio de Janeiro
  'Rio de Janeiro, RJ',
  // Paraná
  'Curitiba, PR',
  'Londrina, PR',
  'Maringá, PR',
  // Rio Grande do Sul
  'Porto Alegre, RS',
  // Santa Catarina
  'Florianópolis, SC',
  'Joinville, SC',
];

export default function Prospeccao() {
  const { addLead, user } = useApp();
  
  const [segmento, setSegmento] = useState('');
  const [showSegmentoDropdown, setShowSegmentoDropdown] = useState(false);
  const [localizacao, setLocalizacao] = useState('Maceió, AL');
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [error, setError] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<Set<number>>(new Set());
  const [searchTime, setSearchTime] = useState<number | null>(null);
  const [existingOpps, setExistingOpps] = useState<{title: string, phone: string}[]>([]);

  const fetchExistingOpps = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('opportunities')
      .select('title, phone');
    if (data) setExistingOpps(data);
  };

  useEffect(() => {
    fetchExistingOpps();
  }, [user?.id]);
  
  const isLeadImported = (lead: ProspectLead) => {
    return existingOpps.some(opp => 
      opp.title.toLowerCase() === lead.nome.toLowerCase() || 
      (lead.telefone && lead.telefone !== '-' && opp.phone && opp.phone !== '-' && opp.phone === lead.telefone)
    );
  };
  
  const segDropdownRef = useRef<HTMLDivElement>(null);
  const locDropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdowns ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (segDropdownRef.current && !segDropdownRef.current.contains(e.target as Node)) {
        setShowSegmentoDropdown(false);
      }
      if (locDropdownRef.current && !locDropdownRef.current.contains(e.target as Node)) {
        setShowLocDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSegmentos = SEGMENTOS_SUGERIDOS.filter(s => 
    s.toLowerCase().includes(segmento.toLowerCase())
  );

  const filteredLocalizacoes = LOCALIZACOES_SUGERIDAS.filter(l =>
    l.toLowerCase().includes(localizacao.toLowerCase())
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!segmento || !localizacao) return;

    setLoading(true);
    setError('');
    setLeads([]);
    setSelectedLeads(new Set());
    setSearchTime(null);
    const startTime = Date.now();

    try {
      const res = await fetch('/api/prospeccao/buscar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          segmento, 
          localizacao
        })
      });

      if (!res.ok) {
        let errorMsg = 'Erro ao buscar no servidor';
        try {
          const errData = await res.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = `Erro de comunicação com servidor (${res.status})`;
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setLeads(data.leads || []);
      setSearchTime(Math.round((Date.now() - startTime) / 1000));
    } catch (err: any) {
      setError(err.message || 'Falha na comunicação com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCRM = async (prospect: ProspectLead, skipAlert = false) => {
    return new Promise<void>(async (resolve) => {
    const newOpp = {
      title: prospect.nome,
      phone: prospect.telefone || '-',
      city: prospect.endereco.split('-')[0]?.trim() || '',
      amount: 0,
      status: 'Lead',
      user_id: user?.id
    };

    const { data, error } = await supabase.from('opportunities').insert([newOpp]).select();
    
    if (error) {
      console.error('Erro ao importar lead:', error);
      if (!skipAlert) toast.error('Erro ao importar lead para o CRM');
      return;
    }

    if (data && data.length > 0) {
      await supabase.from('agent_notes').insert([{
        entity_type: 'opportunity',
        entity_id: data[0].id,
        note: `Lead prospectado via Google Maps.\nSegmento: ${segmento}\nLocalização: ${localizacao}\nAvaliação: ${prospect.avaliacao}\nWebsite: ${prospect.website || '-'}\nCategoria: ${(prospect as any).categoria || '-'}`,
        created_by_ai: false,
        user_id: user?.id
      }]);
    }

    if (!skipAlert) {
      toast.success(`${prospect.nome} adicionado ao CRM com sucesso!`);
    }
    setExistingOpps(prev => [...prev, { title: prospect.nome, phone: prospect.telefone || '-' }]);
    resolve();
    });
  };

  const handleImportAndShoot = async (prospect: ProspectLead) => {
    if (!prospect.telefone || prospect.telefone === '-') {
      toast.error('Este lead não possui telefone para contato.');
      return;
    }
    
    await handleAddCRM(prospect, true);
    toast.success(`${prospect.nome} importado! Iniciando disparo...`);
    
    try {
      const formattedPhone = prospect.telefone.replace(/\D/g, '');
      const message = `Olá, somos a Quark Energia! Vi que vocês são um destaque no segmento e gostaríamos de apresentar nossas soluções em energia solar para reduzir sua conta de luz. Podemos conversar?`;
      
      const res = await fetch('http://localhost:3001/api/evolution/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: formattedPhone, text: message })
      });
      
      if (res.ok) {
        toast.success(`Mensagem enviada com sucesso para ${prospect.nome}!`);
      } else {
        toast.error('Erro ao disparar mensagem.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Falha na comunicação com a API de envio.');
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
    if (prospect.latitude && prospect.longitude) {
      const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${prospect.latitude},${prospect.longitude}`;
      window.open(url, '_blank');
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(prospect.endereco)}`;
      window.open(url, '_blank');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const allNotImported = leads
        .map((l, i) => ({ lead: l, idx: i }))
        .filter(({ lead }) => !isLeadImported(lead))
        .map(({ idx }) => idx);
      setSelectedLeads(new Set(allNotImported));
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
            Busque leads reais do Google Maps por segmento e localização. Importe as melhores oportunidades direto para o CRM.
          </p>
        </div>

        {/* Search Filters */}
        <div className="glass-panel p-5 md:p-6 rounded-2xl border border-white/10 shadow-xl relative z-50">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-5 items-end">
            
            {/* Segmento Combobox */}
            <div className="flex-1 w-full space-y-2" ref={segDropdownRef}>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Segmento do Cliente</label>
              <div className="relative group">
                <Building2 className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-lime-400 transition-colors" />
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Padarias, Supermercados..."
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-10 text-white focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
                  value={segmento}
                  onChange={e => {
                    setSegmento(e.target.value);
                    setShowSegmentoDropdown(true);
                  }}
                  onFocus={() => setShowSegmentoDropdown(true)}
                />
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                {showSegmentoDropdown && filteredSegmentos.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                    {filteredSegmentos.map(s => (
                      <div 
                        key={s} 
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
                        onMouseDown={() => {
                          setSegmento(s);
                          setShowSegmentoDropdown(false);
                        }}
                      >
                        <Store className="w-4 h-4 text-zinc-600" />
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Localização Combobox */}
            <div className="flex-1 w-full space-y-2" ref={locDropdownRef}>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider pl-1">Localização (Cidade, Estado)</label>
              <div className="relative group">
                <Globe className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-lime-400 transition-colors" />
                <input 
                  type="text"
                  required
                  placeholder="Ex: Maceió, AL"
                  className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-3.5 pl-12 pr-10 text-white focus:border-lime-500/50 outline-none transition-all placeholder-zinc-600"
                  value={localizacao}
                  onChange={e => {
                    setLocalizacao(e.target.value);
                    setShowLocDropdown(true);
                  }}
                  onFocus={() => setShowLocDropdown(true)}
                />
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                {showLocDropdown && filteredLocalizacoes.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto">
                    {filteredLocalizacoes.map(l => (
                      <div 
                        key={l} 
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-zinc-300 hover:text-white transition-colors flex items-center gap-3"
                        onMouseDown={() => {
                          setLocalizacao(l);
                          setShowLocDropdown(false);
                        }}
                      >
                        <MapPin className="w-4 h-4 text-zinc-600" />
                        {l}
                      </div>
                    ))}
                    {localizacao && !LOCALIZACOES_SUGERIDAS.some(l => l.toLowerCase() === localizacao.toLowerCase()) && (
                      <div 
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer text-lime-400 transition-colors flex items-center gap-3 border-t border-zinc-800"
                        onMouseDown={() => setShowLocDropdown(false)}
                      >
                        <Search className="w-4 h-4" />
                        Buscar em "{localizacao}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full md:w-auto px-8 h-[54px] btn-primary rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-lime-500/10 active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all shrink-0"
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
              Varrendo o Google Maps em <span className="text-lime-400 font-bold">{localizacao}</span> por leads reais. 
              Esse processo pode levar entre 30 segundos e 3 minutos.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-zinc-600">
              <div className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
              Scraper ativo — buscando dados em tempo real
            </div>
          </div>
        )}

        {/* Results */}
        {!loading && leads.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1 flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-bold text-white font-display">Resultados da Busca</h2>
                <span className="px-3 py-1 bg-lime-500/10 text-lime-400 border border-lime-500/20 rounded-full text-xs font-bold">
                  {leads.length} encontrados
                </span>
                {searchTime && (
                  <span className="px-3 py-1 bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-full text-xs">
                    {searchTime}s
                  </span>
                )}
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
              {leads.map((lead, idx) => {
                const isImported = isLeadImported(lead);
                return (
                <div 
                  key={idx} 
                  className={`glass-panel p-5 rounded-2xl border transition-all duration-300 group flex flex-col h-full ${isImported ? 'opacity-70 border-white/10' : 'hover:-translate-y-1 shadow-lg ' + (selectedLeads.has(idx) ? 'border-lime-500/50 bg-lime-500/5' : 'border-white/5 hover:border-lime-500/30 hover:shadow-lime-500/5')}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <input 
                        type="checkbox"
                        className={`w-4 h-4 text-lime-500 bg-zinc-800 border-zinc-700 rounded focus:ring-lime-500/50 focus:ring-offset-0 mt-1 ${isImported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        checked={selectedLeads.has(idx)}
                        onChange={(e) => !isImported && handleSelectLead(idx, e.target.checked)}
                        disabled={isImported}
                      />
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedLeads.has(idx) ? 'bg-lime-500/20 text-lime-400 border-lime-500/20' : 'bg-zinc-800 border border-white/5 text-zinc-400 group-hover:bg-lime-500/10 group-hover:text-lime-400'}`}>
                        <Store className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2 justify-between w-full">
                          <h3 className="font-bold text-white text-base truncate flex-1" title={lead.nome}>{lead.nome}</h3>
                          {isImported && (
                            <span className="shrink-0 px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded text-[10px] font-bold uppercase tracking-wider">
                              Já no CRM
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {lead.avaliacao && lead.avaliacao !== '-' && (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                              <Star className="w-3 h-3 fill-amber-400" /> {lead.avaliacao}
                            </span>
                          )}
                          {(lead as any).categoria && (
                            <span className="text-[10px] text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                              {(lead as any).categoria}
                            </span>
                          )}
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
                    {lead.website && lead.website !== '-' && (
                      <div className="flex items-center gap-2.5 text-zinc-400">
                        <Globe className="w-3.5 h-3.5" />
                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-lime-400/70 hover:text-lime-400 truncate">{lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-white/5">
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
                    
                    <div className="col-span-2 flex gap-1">
                      <button 
                        onClick={() => !isImported && handleAddCRM(lead)}
                        disabled={isImported}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${isImported ? 'bg-zinc-800/50 text-zinc-500 border border-white/5 cursor-not-allowed' : 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/20 active:scale-95'}`}
                        title={isImported ? "Lead já importado" : "Apenas Importar"}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      
                      <button 
                        onClick={() => !isImported && handleImportAndShoot(lead)}
                        disabled={isImported}
                        className={`flex-[3] flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all ${isImported ? 'bg-zinc-800/50 text-zinc-500 border border-white/5 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-400 text-black active:scale-95'}`}
                        title={isImported ? "Lead já importado" : "Importar e enviar mensagem no WhatsApp"}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                        <span className="hidden sm:inline">{isImported ? 'Importado' : 'Importar & Disparar'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )})}
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
               Escolha um segmento e uma localização para iniciar sua prospecção de vendas com dados reais do Google Maps.
             </p>
           </div>
        )}

      </div>
    </div>
  );
}

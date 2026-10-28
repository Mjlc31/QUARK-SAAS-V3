import React, { useState, useEffect } from 'react';
import {
  Instagram,
  Video,
  Calendar,
  Clock,
  Sparkles,
  Plus,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  RefreshCw,
  Layers,
  Send,
  Eye,
  Settings,
  Share2,
  Globe,
  Check,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  ExternalLink,
  Sliders,
  Filter,
  Film,
  X,
  Volume2,
  VolumeX,
  Heart,
  MessageCircle,
  Bookmark,
  TrendingUp,
  Flame,
  BarChart3,
  Edit3,
  CheckSquare,
  ShieldCheck,
  Radio,
  Tv,
  Smartphone
} from 'lucide-react';
import {
  socialService,
  SocialAccount,
  SocialPost,
  BulkUploadItem,
  SocialAnalytics
} from '../services/socialService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

// Exemplos de vídeos de engenharia e energia solar da Quark para teste instantâneo
const SAMPLE_VIDEOS: BulkUploadItem[] = [
  {
    title: 'Não compre placas solares, assine energia? Mito desvendado!',
    url: 'https://instagram.fmcz3-1.fna.fbcdn.net/o1/v/t2/f2/m86/AQMg4HrmIp-iKIYB1Hpeh5lR3LL95K8VImxUpd6mEuu9xAWvx7BDRNza56bmqQCXrvFR7MJA0_s8ZkfGN6eLjXAM8gZ7ehdFRNWVz9Y.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
    caption: '“Não compre placas solares, assine energia sem gastar nada.”\n\nEssa frase parece irresistível nos anúncios, até você fazer a conta de 3 anos. Assinar energia tendo telhado próprio é igual a morar de aluguel quando a própria parcela quitaria a sua casa.\n\n👉 Solicite seu Diagnóstico Financeiro gratuito no link da bio.\n\n#energiasolar #maceio #economia #investimento #quark',
    media_type: 'REELS'
  },
  {
    title: 'A armadilha do Feirão Solar em Maceió',
    url: 'https://instagram.fmcz3-1.fna.fbcdn.net/o1/v/t2/f2/m86/AQOH2--yBi8z6u1Co8KpGcwinab0Y40wW4H56oq7v-KheXQwM0w_jUUYQdTXWy5nJhDU8IaHYU4rmPvhcVSxGeMa2ic3MGQw9AmrtkA.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&auto=format&fit=crop&q=80',
    caption: 'Toda semana a gente vê cliente caindo na armadilha do “Feirão Solar”: promessas agressivas de desconto, contratos na pressa e 5 meses sem homologar na Equatorial.\n\nEnergia solar é engenharia séria para durar 30 anos!\n\n#energiasolar #engenharia #alagoas #maceio #qualidade',
    media_type: 'REELS'
  },
  {
    title: 'Carregador Veicular Solar: Lucro real ou custo?',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
    caption: '⚡ Compra a R$ 0,60 o kWh e revende no carregador ultrarrápido. Com 10 carros por dia, são mais de R$ 15.000 de faturamento mensal.\n\nConfira nosso projeto de mobilidade elétrica para condomínios e empresas!\n\n#mobilidadeeletrica #carroeletrico #energiasolar #quarkenergia #maceio',
    media_type: 'REELS'
  },
  {
    title: 'Instalação de 20kWp em Condomínio Fechado',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    thumbnail_url: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=600&auto=format&fit=crop&q=80',
    caption: '🚀 Mais uma obra homologada e gerando economia real! 36 módulos de alta eficiência com monitoramento em tempo real no app.\n\n#energialimpa #engenharia #obrasmaceio #sustentabilidade #quark',
    media_type: 'REELS'
  }
];

export const SocialStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'bulk' | 'accounts'>('queue');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar' | 'table'>('grid');
  const [statusFilter, setStatusFilter] = useState<'all' | 'scheduled' | 'published'>('all');
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [analytics, setAnalytics] = useState<SocialAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingFeed, setSyncingFeed] = useState(false);

  // Contagem regressiva ao vivo para o próximo post
  const [countdown, setCountdown] = useState<string>('00h:00m:00s');

  // Estados do Agendamento em Massa (Cut.Pro Core Replica)
  const [bulkVideos, setBulkVideos] = useState<BulkUploadItem[]>([]);
  const [staggerIntervalHours, setStaggerIntervalHours] = useState(24);
  const [staggerStartTime, setStaggerStartTime] = useState('18:00');
  const [staggerStartDate, setStaggerStartDate] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    'instagram',
    'tiktok',
    'youtube_shorts'
  ]);
  const [globalCaption, setGlobalCaption] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<
    Array<{ title: string; caption: string; hashtags: string[] }>
  >([]);

  // Modais
  const [selectedPreviewPost, setSelectedPreviewPost] = useState<SocialPost | null>(null);
  const [videoMuted, setVideoMuted] = useState(true);
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editScheduledAt, setEditScheduledAt] = useState('');

  // Conexão manual via token
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [connectingToken, setConnectingToken] = useState(false);

  // Mês e ano para navegação no Calendário Mensal
  const [calendarDate, setCalendarDate] = useState(new Date());

  useEffect(() => {
    loadData();

    // Trata retorno do OAuth da Meta estilo Cut.Pro
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === 'success') {
      const user = params.get('username') || 'Instagram';
      toast.success(`🎉 Conta @${user} conectada com sucesso via Meta OAuth!`, { duration: 5000 });
      window.history.replaceState({}, document.title, window.location.pathname);
      loadData();
    } else if (params.get('error')) {
      toast.error(`Falha na autorização da Meta: ${params.get('error')}`, { duration: 6000 });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Timer de contagem regressiva em tempo real
  useEffect(() => {
    const nextPost = posts.find(p => p.status === 'scheduled');
    if (!nextPost || !nextPost.scheduled_at) {
      setCountdown('Fila Vazia');
      return;
    }

    const timer = setInterval(() => {
      const target = new Date(nextPost.scheduled_at).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setCountdown('Publicando Agora...');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(
          `${String(hours).padStart(2, '0')}h : ${String(minutes).padStart(2, '0')}m : ${String(seconds).padStart(2, '0')}s`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [posts]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accs, pts, anlt] = await Promise.all([
        socialService.getAccounts(),
        socialService.getPosts({ include_live: true }),
        socialService.getAnalytics()
      ]);
      setAccounts(accs);
      setPosts(pts);
      setAnalytics(anlt);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar dados do Social Studio');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncFeed = async () => {
    setSyncingFeed(true);
    try {
      const pts = await socialService.getPosts({ include_live: true });
      const anlt = await socialService.getAnalytics();
      setPosts(pts);
      setAnalytics(anlt);
      toast.success('Feed sincronizado com o Instagram ao vivo!');
    } catch (_) {
      toast.error('Falha ao sincronizar feed.');
    } finally {
      setSyncingFeed(false);
    }
  };

  const handleCutProConnect = async () => {
    try {
      toast.loading('Iniciando conexão com Meta Graph API...', { id: 'conn' });
      const res = await socialService.connectInstagram();
      if (res.data?.connected) {
        toast.success(res.data.message || 'Conta conectada com sucesso!', { id: 'conn' });
        loadData();
      } else if (res.data?.AuthUrl) {
        toast.success('Abrindo autorização segura da Meta...', { id: 'conn' });
        const popup = window.open(
          res.data.AuthUrl,
          'meta_oauth_dialog',
          'width=600,height=750,menubar=no,toolbar=no,status=no'
        );
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          window.location.href = res.data.AuthUrl;
        } else {
          const poll = setInterval(() => {
            if (popup.closed) {
              clearInterval(poll);
              loadData();
            }
          }, 1000);
        }
      } else {
        toast.dismiss('conn');
        setShowConnectModal(true);
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao conectar conta', { id: 'conn' });
    }
  };

  const handleDisconnectAccount = async (id: string, username: string) => {
    if (!window.confirm(`Deseja realmente desconectar a conta @${username}?`)) return;
    try {
      toast.loading('Desconectando conta...', { id: 'disc' });
      await socialService.disconnectAccount(id);
      toast.success(`Conta @${username} desconectada com sucesso.`, { id: 'disc' });
      setAccounts([]);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao desconectar conta', { id: 'disc' });
    }
  };

  const handleConnectToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnectingToken(true);
    try {
      const res = await socialService.connectManualToken(manualToken);
      if (res.success) {
        toast.success(`Conta @${res.account?.username} conectada com sucesso!`);
        setShowConnectModal(false);
        setManualToken('');
        loadData();
      } else {
        toast.error(res.error || 'Erro ao validar token');
      }
    } catch (err: any) {
      toast.error(err.message || 'Falha na conexão');
    } finally {
      setConnectingToken(false);
    }
  };

  const handlePublishNow = async (postId: string) => {
    try {
      toast.loading('Publicando Reels no Instagram...', { id: 'pub' });
      await socialService.publishNow(postId);
      toast.success('Reels publicado no Instagram com sucesso!', { id: 'pub' });
      loadData();
      if (selectedPreviewPost?.id === postId) {
        setSelectedPreviewPost(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao publicar agora', { id: 'pub' });
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja remover este post da fila?')) return;
    try {
      await socialService.deletePost(postId);
      toast.success('Post removido da fila.');
      setPosts(prev => prev.filter(p => p.id !== postId));
      if (selectedPreviewPost?.id === postId) setSelectedPreviewPost(null);
    } catch (err) {
      toast.error('Erro ao excluir post.');
    }
  };

  // Abrir modal de edição rápida
  const handleOpenEdit = (post: SocialPost) => {
    setEditingPost(post);
    setEditCaption(post.caption || '');
    setEditScheduledAt(post.scheduled_at ? post.scheduled_at.substring(0, 16) : '');
  };

  // Salvar edição rápida
  const handleSaveEdit = async () => {
    if (!editingPost) return;
    try {
      await socialService.updatePost(editingPost.id, {
        caption: editCaption,
        scheduled_at: new Date(editScheduledAt).toISOString()
      });
      toast.success('Post atualizado com sucesso!');
      setEditingPost(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar alterações.');
    }
  };

  // Carregar exemplos de vídeos da Quark
  const handleLoadSampleVideos = () => {
    setBulkVideos(SAMPLE_VIDEOS);
    toast.success(`${SAMPLE_VIDEOS.length} vídeos de exemplo da Quark carregados!`);
  };

  // Upload de arquivos locais com hospedagem automática em nuvem (Supabase / CDN)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const toastId = toast.loading(`Enviando ${fileList.length} vídeo(s) para o CDN...`);

    try {
      const uploadPromises = fileList.map(async (file) => {
        // Converte para base64 para envio seguro
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;
        let publicUrl = '';

        try {
          const res = await socialService.uploadMedia(base64Data, file.name, file.type || 'video/mp4');
          if (res?.url) {
            publicUrl = res.url;
          }
        } catch (uploadErr) {
          console.warn('[SocialStudio] Falha no upload remoto, usando Blob URL local:', uploadErr);
          publicUrl = URL.createObjectURL(file);
        }

        return {
          title: file.name.replace(/\.[^/.]+$/, ''),
          url: publicUrl || URL.createObjectURL(file),
          thumbnail_url:
            'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600&auto=format&fit=crop&q=80',
          media_type: 'REELS' as const,
          caption:
            globalCaption ||
            `🚀 Novo Reels da Quark Energia! Veja os bastidores de engenharia em Maceió. #energiasolar #quarkenergia #maceio`
        };
      });

      const uploadedItems = await Promise.all(uploadPromises);
      setBulkVideos(prev => [...prev, ...uploadedItems]);
      toast.success(`${fileList.length} vídeo(s) processados e prontos para publicação!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar vídeos', { id: toastId });
    }
  };

  // Alternar plataformas no agendador em massa
  const togglePlatform = (p: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(item => item !== p) : [...prev, p]
    );
  };

  // Gerar legendas com Gemini
  const handleGenerateAiCaptions = async () => {
    if (!aiTopic.trim()) {
      toast.error('Informe o assunto do vídeo para a IA.');
      return;
    }
    setAiGenerating(true);
    try {
      const results = await socialService.generateCaptions(aiTopic);
      setAiSuggestions(results);
      toast.success('3 opções de legendas geradas pela IA da Quark!');
    } catch (err) {
      toast.error('Erro ao gerar legendas com IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Aplicar legenda gerada pela IA a todos os vídeos
  const applyCaptionToAll = (caption: string) => {
    setGlobalCaption(caption);
    setBulkVideos(prev => prev.map(v => ({ ...v, caption })));
    toast.success('Legenda aplicada a todos os vídeos da fila!');
  };

  // Submeter agendamento em massa
  const handleScheduleBulk = async () => {
    if (bulkVideos.length === 0) {
      toast.error('Adicione pelo menos um vídeo para agendar.');
      return;
    }

    try {
      toast.loading(`Agendando ${bulkVideos.length} vídeos com espaçamento automático...`, {
        id: 'bulk'
      });
      await socialService.createBulkPosts({
        bulk_items: bulkVideos,
        stagger_config: {
          interval_hours: staggerIntervalHours,
          start_date: staggerStartDate,
          time_of_day: staggerStartTime
        },
        account_id: accounts[0]?.id || 'acc_quarkenergia_main',
        caption: globalCaption
      });

      toast.success(`Parabéns! ${bulkVideos.length} Reels agendados com sucesso!`, { id: 'bulk' });
      setBulkVideos([]);
      setActiveTab('queue');
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao agendar vídeos.', { id: 'bulk' });
    }
  };

  // Cálculo da data prevista para cada vídeo da lista de lote
  const calculateSlotDate = (index: number) => {
    const base = new Date(staggerStartDate);
    const [hours, minutes] = staggerStartTime.split(':').map(Number);
    base.setHours(hours || 18, minutes || 0, 0, 0);
    const target = new Date(base.getTime() + index * staggerIntervalHours * 60 * 60 * 1000);
    return target.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredPosts = posts.filter(p => {
    if (statusFilter === 'all') return true;
    return p.status === statusFilter;
  });

  const mainAccount = accounts[0];
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const nextScheduledReel = posts.find(p => p.status === 'scheduled');
  const bestViralReel = posts.find(p => p.id === analytics?.bestReel?.id) || posts[0];

  // Helper para renderizar os dias do mês no modo Calendário
  const renderCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    // Espaços vazios antes do 1º dia
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(<div key={`empty-${i}`} className="p-2 border border-white/5 opacity-20 h-28" />);
    }

    // Dias do mês
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayPosts = posts.filter(p => {
        const pDate = (p.scheduled_at || p.created_at || '').substring(0, 10);
        return pDate === dateStr;
      });

      const isToday =
        new Date().toISOString().substring(0, 10) === dateStr;

      days.push(
        <div
          key={`day-${day}`}
          className={`p-2.5 rounded-xl border transition-all h-28 flex flex-col justify-between ${
            isToday
              ? 'bg-lime-500/10 border-lime-500/40 text-white'
              : 'bg-zinc-950/60 border-white/5 hover:border-white/20 text-zinc-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className={isToday ? 'text-lime-400 font-bold' : 'text-zinc-400'}>{day}</span>
            {dayPosts.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-lime-500 text-black font-bold">
                {dayPosts.length}
              </span>
            )}
          </div>

          <div className="space-y-1 overflow-hidden">
            {dayPosts.slice(0, 2).map(p => (
              <div
                key={p.id}
                onClick={() => setSelectedPreviewPost(p)}
                className={`text-[10px] p-1 rounded truncate cursor-pointer flex items-center gap-1 ${
                  p.status === 'scheduled'
                    ? 'bg-lime-500/20 text-lime-300 border border-lime-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}
                title={p.caption}
              >
                <Film size={10} />
                <span className="truncate">{p.caption.substring(0, 20)}...</span>
              </div>
            ))}
            {dayPosts.length > 2 && (
              <span className="text-[9px] text-zinc-500 block">+{dayPosts.length - 2} mais</span>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="space-y-6 pb-12 max-w-[1400px] mx-auto">
      {/* ─── 0. BARRA DE CONEXÃO E CONTA SOCIAL (Cut.Pro Connection Bar) ────────── */}
      {accounts.length > 0 ? (
        <div className="p-3.5 px-5 rounded-2xl glass-panel border border-lime-500/30 bg-lime-500/5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg shadow-lime-500/5">
          <div className="flex items-center gap-3">
            <img
              src={accounts[0].avatar_url || 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200'}
              alt={accounts[0].username}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-lime-400 flex-shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">@{accounts[0].username}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-ping" />
                  Meta Graph API Conectada
                </span>
                <span className="text-[11px] text-zinc-400 hidden sm:inline">
                  • {accounts[0].media_count || 168} mídias publicadas
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Conta comercial vinculada. Token com renovação ativa por mais {analytics?.tokenHealth?.daysRemaining || 58} dias.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
            <button
              onClick={handleSyncFeed}
              disabled={syncingFeed}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={12} className={syncingFeed ? 'animate-spin text-lime-400' : ''} />
              <span>Sincronizar Feed</span>
            </button>
            <button
              onClick={handleCutProConnect}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-lime-500 text-black hover:bg-lime-400 transition-all flex items-center gap-1.5"
            >
              <RefreshCw size={12} />
              <span>Reconectar</span>
            </button>
            <button
              onClick={() => handleDisconnectAccount(accounts[0].id, accounts[0].username)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
            >
              <Trash2 size={12} />
              <span>Desconectar</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 px-6 rounded-2xl glass-panel border border-amber-500/40 bg-amber-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-pink-500/20">
              <Instagram size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Nenhuma Conta do Instagram Conectada</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Ação Necessária
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Conecte a conta oficial da Quark no Instagram para agendar posts, vídeos em lote e publicar Reels com 1 clique estilo Cut.Pro.
              </p>
            </div>
          </div>

          <button
            onClick={handleCutProConnect}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center gap-2 flex-shrink-0"
          >
            <Instagram size={15} />
            <span>⚡ Conectar Instagram (1-Clique)</span>
          </button>
        </div>
      )}

      {/* ─── 1. HEADER & QUICK ACTIONS ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border border-white/10 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-amber-500 p-[2px] shadow-lg shadow-pink-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Instagram className="text-white" size={28} />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white font-display tracking-tight">
                Social Studio <span className="text-lime-400">& Reels Hub</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-lime-500/20 text-lime-400 border border-lime-500/30">
                Cut.Pro Full Clone
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Agendamento em massa, algoritmo de espaçamento inteligente (Smart Stagger) e cross-posting no Instagram.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSyncFeed}
            disabled={syncingFeed}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 transition-all active:scale-95"
          >
            <RefreshCw size={14} className={syncingFeed ? 'animate-spin text-lime-400' : ''} />
            <span>Sincronizar Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/20 transition-all active:scale-95"
          >
            <Layers size={15} />
            <span>Upload em Massa</span>
          </button>

          <button
            onClick={handleCutProConnect}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white shadow-md shadow-pink-500/20 transition-all active:scale-95"
          >
            <Instagram size={15} />
            <span>Conectar Conta</span>
          </button>
        </div>
      </div>

      {/* ─── 2. HERO REEL BANNER & CONTAGEM REGRESSIVA (Cut.Pro heroReel & postCardTimer) ─── */}
      {nextScheduledReel && (
        <div className="glass-panel p-6 rounded-2xl border border-lime-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Thumbnail e Play */}
            <div
              onClick={() => setSelectedPreviewPost(nextScheduledReel)}
              className="lg:col-span-3 aspect-[9/14] w-full max-w-[190px] mx-auto lg:mx-0 rounded-2xl overflow-hidden relative cursor-pointer border border-lime-500/40 shadow-xl shadow-lime-500/10 group"
            >
              <img
                src={
                  nextScheduledReel.thumbnail_url ||
                  'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'
                }
                alt="thumb"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-lime-500 text-black flex items-center justify-center shadow-lg shadow-lime-500/40">
                  <Play size={20} className="fill-current ml-0.5" />
                </div>
              </div>
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/70 text-lime-400">
                PRÓXIMO REEL
              </div>
            </div>

            {/* Informações Centrais e Timer */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/20 text-lime-400 border border-lime-500/30 flex items-center gap-1">
                  <Radio size={11} className="animate-pulse" />
                  EM CONTAGEM REGRESSIVA
                </span>
                <span className="text-xs text-zinc-400">
                  Agendado para{' '}
                  <strong className="text-white">
                    {new Date(nextScheduledReel.scheduled_at).toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </strong>
                </span>
              </div>

              <h2 className="text-lg font-bold text-white line-clamp-2 leading-snug">
                {nextScheduledReel.caption.split('\n')[0]}
              </h2>

              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {nextScheduledReel.caption}
              </p>

              {/* Contagem Regressiva Estilo Cut.Pro */}
              <div className="pt-2 flex items-center gap-3">
                <div className="p-3 px-4 rounded-xl bg-zinc-950 border border-white/10 font-mono text-base font-bold text-lime-400 tracking-wider flex items-center gap-2">
                  <Clock size={16} />
                  <span>{countdown}</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  Publicação automatizada em segundo plano
                </span>
              </div>
            </div>

            {/* Ações Rápidas do Próximo Reel */}
            <div className="lg:col-span-3 flex flex-col gap-2.5 justify-center">
              <button
                onClick={() => handlePublishNow(nextScheduledReel.id)}
                className="w-full py-3 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-lime-500/20 transition-all active:scale-95"
              >
                <Send size={15} />
                <span>Publicar Imediatamente</span>
              </button>

              <button
                onClick={() => handleOpenEdit(nextScheduledReel)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <Edit3 size={14} />
                <span>Alterar Horário & Legenda</span>
              </button>

              <button
                onClick={() => setSelectedPreviewPost(nextScheduledReel)}
                className="w-full py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5"
              >
                <Eye size={13} />
                <span>Ver no Mockup de iPhone</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. METRIC CARDS & BEST VIRAL REEL (Cut.Pro ChannelStats & Best) ─────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Conta Oficial */}
        <div className="glass-panel p-4 rounded-xl border border-white/10 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Canal Principal</span>
            <div className="w-2.5 h-2.5 rounded-full bg-lime-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <img
              src={
                mainAccount?.avatar_url ||
                'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200'
              }
              alt="avatar"
              className="w-8 h-8 rounded-full border border-lime-400/40 object-cover"
            />
            <div>
              <div className="flex items-center gap-1">
                <span className="text-sm font-bold text-white">
                  @{mainAccount?.username || 'quarkenergia'}
                </span>
                <CheckCircle2 size={13} className="text-sky-400" />
              </div>
              <span className="text-[10px] text-zinc-500">14.8k seguidores • 168 posts</span>
            </div>
          </div>
        </div>

        {/* Card 2: Visualizações Médias */}
        <div className="glass-panel p-4 rounded-xl border border-white/10 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Visualizações Médias</span>
            <BarChart3 size={16} className="text-lime-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-display">
            {analytics?.avgViews || 2787}{' '}
            <span className="text-xs font-normal text-lime-400">views/vídeo</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            Taxa de engajamento: <strong>{analytics?.engagementRate || '6.9%'}</strong>
          </span>
        </div>

        {/* Card 3: Fila de Publicação */}
        <div className="glass-panel p-4 rounded-xl border border-white/10 bg-zinc-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Fila Ativa de Reels</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-display">
            {scheduledCount}{' '}
            <span className="text-xs font-normal text-zinc-500">programados</span>
          </div>
          <span className="text-[11px] text-zinc-500 mt-1 block">
            {publishedCount} publicados neste ciclo
          </span>
        </div>

        {/* Card 4: Top Viral Reel (Cut.Pro best) */}
        {bestViralReel && (
          <div
            onClick={() => setSelectedPreviewPost(bestViralReel)}
            className="glass-panel p-4 rounded-xl border border-pink-500/30 bg-pink-500/5 cursor-pointer hover:border-pink-500/50 transition-all flex items-center gap-3"
          >
            <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-black relative">
              <img
                src={
                  bestViralReel.thumbnail_url ||
                  'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200'
                }
                alt="thumb"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-1 left-1 px-1 rounded text-[8px] font-bold bg-pink-600 text-white">
                #1
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[11px] font-bold text-pink-400">
                <Flame size={12} />
                <span>Reel Mais Viral do Mês</span>
              </div>
              <p className="text-xs font-bold text-white truncate mt-0.5">
                {bestViralReel.caption.substring(0, 30)}...
              </p>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                <strong>{bestViralReel.views_count || 4210}</strong> views • 284 likes
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. ABAS E ALTERNADORES DE VISUALIZAÇÃO ─────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'queue'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar size={15} className={activeTab === 'queue' ? 'text-lime-400' : ''} />
            <span>Fila & Calendário</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-md bg-zinc-800 text-[10px] text-zinc-300">
              {posts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bulk'
                ? 'bg-lime-500/10 text-lime-400 border border-lime-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers size={15} />
            <span>Agendador em Massa (Cut.Pro)</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] bg-lime-500/20 text-lime-300 font-bold uppercase">
              Pro
            </span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'accounts'
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Instagram size={15} className={activeTab === 'accounts' ? 'text-pink-400' : ''} />
            <span>Contas Conectadas</span>
          </button>
        </div>

        {/* Alternador de Modo de Exibição (Cards vs Calendário Mensal) */}
        {activeTab === 'queue' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Grade (Reels)
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-lime-500/20 text-lime-400'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Calendário Mensal
              </button>
            </div>

            <div className="flex items-center bg-zinc-900/60 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'all' ? 'bg-white/10 text-white' : 'text-zinc-500'
                }`}
              >
                Todos ({posts.length})
              </button>
              <button
                onClick={() => setStatusFilter('scheduled')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'scheduled' ? 'bg-lime-500/20 text-lime-400' : 'text-zinc-500'
                }`}
              >
                Agendados ({scheduledCount})
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === 'published' ? 'bg-sky-500/20 text-sky-400' : 'text-zinc-500'
                }`}
              >
                Publicados ({publishedCount})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── TAB 1: FILA & CALENDÁRIO ─────────────────────────────────────── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          {/* MODO A: CALENDÁRIO MENSAL (Cut.Pro Monthly Calendar View) */}
          {viewMode === 'calendar' ? (
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-lime-400" />
                  <h3 className="text-base font-bold text-white capitalize">
                    {calendarDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </h3>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    onClick={() => setCalendarDate(new Date())}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    Hoje
                  </button>
                  <button
                    onClick={() =>
                      setCalendarDate(
                        new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1)
                      )
                    }
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Cabeçalho dos Dias da Semana */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-zinc-500 uppercase">
                <div>Dom</div>
                <div>Seg</div>
                <div>Ter</div>
                <div>Qua</div>
                <div>Qui</div>
                <div>Sex</div>
                <div>Sáb</div>
              </div>

              {/* Grid dos Dias do Mês */}
              <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
            </div>
          ) : (
            /* MODO B: GRADE DE CARDS (Reels Grid) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPosts.map(post => (
                <div
                  key={post.id}
                  className="glass-panel rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all flex flex-col group bg-zinc-900/50"
                >
                  {/* Thumbnail / Video Preview */}
                  <div
                    onClick={() => setSelectedPreviewPost(post)}
                    className="relative aspect-[9/13] w-full bg-black overflow-hidden cursor-pointer group-hover:scale-[1.01] transition-transform"
                  >
                    <img
                      src={
                        post.thumbnail_url ||
                        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'
                      }
                      alt="thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      {post.status === 'scheduled' ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-lime-500 text-black flex items-center gap-1 shadow-md shadow-lime-500/20">
                          <Clock size={11} />
                          Agendado
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500 text-white flex items-center gap-1 shadow-md shadow-sky-500/20">
                          <CheckCircle2 size={11} />
                          Publicado
                        </span>
                      )}
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-md">
                        REELS
                      </span>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-lime-500/90 text-black flex items-center justify-center shadow-lg shadow-lime-500/40">
                        <Play size={20} className="fill-current ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar size={13} className="text-lime-400" />
                        <span>
                          {new Date(post.scheduled_at || post.created_at || '').toLocaleDateString(
                            'pt-BR',
                            {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            }
                          )}
                        </span>
                      </div>
                      {post.status === 'published' && post.views_count && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-300">
                          <Eye size={12} className="text-zinc-400" />
                          <span>{post.views_count}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Informações & Legenda */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                      {post.caption || 'Sem legenda'}
                    </p>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedPreviewPost(post)}
                        className="text-[11px] font-semibold text-lime-400 hover:text-lime-300 flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Ver Mockup</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(post)}
                          className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-all"
                          title="Editar Post"
                        >
                          <Edit3 size={13} />
                        </button>
                        {post.status === 'scheduled' && (
                          <button
                            onClick={() => handlePublishNow(post.id)}
                            className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition-all"
                            title="Publicar Agora"
                          >
                            <Send size={13} />
                          </button>
                        )}
                        {post.published_post_url && (
                          <a
                            href={post.published_post_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white transition-all"
                            title="Abrir no Instagram"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="p-1.5 rounded-lg bg-white/5 text-zinc-500 hover:text-rose-400 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB 2: AGENDAMENTO EM MASSA (Cut.Pro Core Replica) ────────────── */}
      {activeTab === 'bulk' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-5">
            {/* Dropzone de Vídeos */}
            <div className="glass-panel p-6 rounded-2xl border border-dashed border-white/20 bg-zinc-900/40 text-center relative overflow-hidden">
              <input
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
              />
              <div className="w-14 h-14 rounded-2xl bg-lime-500/10 border border-lime-500/20 text-lime-400 flex items-center justify-center mx-auto mb-3">
                <UploadCloud size={28} />
              </div>
              <h3 className="text-base font-bold text-white">
                Arraste múltiplos vídeos ou clique para enviar
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto">
                Suporta MP4 e MOV em formato vertical 9:16 (Reels/TikTok/Shorts). Carregue de 1 a 30 vídeos de uma só vez!
              </p>

              <div className="mt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleLoadSampleVideos}
                  className="relative z-20 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-lime-400 border border-lime-500/20 flex items-center gap-1.5 transition-all"
                >
                  <Sparkles size={14} />
                  <span>Carregar Vídeos de Teste da Quark</span>
                </button>
              </div>
            </div>

            {/* Seleção de Plataformas (Multi-Cross Posting) */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-3">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                Canais de Distribuição Simultânea
              </span>
              <div className="grid grid-cols-3 gap-3">
                <div
                  onClick={() => togglePlatform('instagram')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    selectedPlatforms.includes('instagram')
                      ? 'bg-pink-500/10 border-pink-500/40 text-white'
                      : 'bg-zinc-950 border-white/5 text-zinc-500'
                  }`}
                >
                  <Instagram size={18} className="text-pink-400" />
                  <div>
                    <span className="text-xs font-bold block">Instagram Reels</span>
                    <span className="text-[10px] text-zinc-400">@quarkenergia</span>
                  </div>
                </div>

                <div
                  onClick={() => togglePlatform('tiktok')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    selectedPlatforms.includes('tiktok')
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                      : 'bg-zinc-950 border-white/5 text-zinc-500'
                  }`}
                >
                  <Smartphone size={18} className="text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold block">TikTok</span>
                    <span className="text-[10px] text-zinc-400">Pronto para envio</span>
                  </div>
                </div>

                <div
                  onClick={() => togglePlatform('youtube_shorts')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                    selectedPlatforms.includes('youtube_shorts')
                      ? 'bg-red-500/10 border-red-500/40 text-white'
                      : 'bg-zinc-950 border-white/5 text-zinc-500'
                  }`}
                >
                  <Tv size={18} className="text-red-400" />
                  <div>
                    <span className="text-xs font-bold block">YouTube Shorts</span>
                    <span className="text-[10px] text-zinc-400">Canal Quark</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Configurações do Smart Stagger */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={18} className="text-lime-400" />
                  <h3 className="text-sm font-bold text-white">
                    Motor de Espaçamento Automático (Smart Stagger)
                  </h3>
                </div>
                <span className="text-xs text-zinc-400">Algoritmo Cut.Pro</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Data Inicial
                  </label>
                  <input
                    type="date"
                    value={staggerStartDate}
                    onChange={e => setStaggerStartDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Horário Diário
                  </label>
                  <input
                    type="time"
                    value={staggerStartTime}
                    onChange={e => setStaggerStartTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    Frequência
                  </label>
                  <select
                    value={staggerIntervalHours}
                    onChange={e => setStaggerIntervalHours(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  >
                    <option value={4}>A cada 4 horas (Viral)</option>
                    <option value={12}>A cada 12 horas (2x ao dia)</option>
                    <option value={24}>1 vídeo por dia (Recomendado)</option>
                    <option value={48}>A cada 2 dias</option>
                    <option value={72}>3x por semana</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Lista dos Vídeos no Lote */}
            {bulkVideos.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">
                    Fila do Lote ({bulkVideos.length} vídeos)
                  </h3>
                  <button
                    onClick={() => setBulkVideos([])}
                    className="text-xs text-rose-400 hover:text-rose-300"
                  >
                    Limpar Todos
                  </button>
                </div>

                <div className="space-y-2 max-h-[380px] overflow-y-auto custom-scrollbar pr-1">
                  {bulkVideos.map((video, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-950/70 border border-white/5 flex items-center justify-between gap-3 hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-14 rounded-lg bg-zinc-900 overflow-hidden flex-shrink-0 border border-white/10 relative">
                          <img
                            src={
                              video.thumbnail_url ||
                              'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200'
                            }
                            alt="thumb"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                            <Play size={12} className="text-white fill-current" />
                          </div>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-lime-500/20 text-lime-400">
                              #{idx + 1}
                            </span>
                            <span className="text-xs font-semibold text-white truncate">
                              {video.title || `Vídeo ${idx + 1}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                            {video.caption || 'Legenda padrão aplicada'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-lime-400 block">
                          {calculateSlotDate(idx)}
                        </span>
                        <button
                          onClick={() => setBulkVideos(prev => prev.filter((_, i) => i !== idx))}
                          className="text-[10px] text-zinc-500 hover:text-rose-400 mt-1"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <div className="text-xs text-zinc-400">
                    Período: <strong className="text-white">{calculateSlotDate(0)}</strong> até{' '}
                    <strong className="text-white">
                      {calculateSlotDate(bulkVideos.length - 1)}
                    </strong>
                  </div>

                  <button
                    onClick={handleScheduleBulk}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black shadow-lg shadow-lime-500/20 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Check size={16} />
                    <span>Confirmar e Agendar Todos ({bulkVideos.length})</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Gemini AI Caption Copilot */}
          <div className="lg:col-span-5 space-y-5">
            <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">IA Copilot para Legendas & Hashtags</h3>
                  <p className="text-[11px] text-zinc-400">Google Gemini 1.5 Flash</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Tema ou Gancho do Vídeo
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={e => setAiTopic(e.target.value)}
                    placeholder="Ex: Instalação no litoral, 90% de economia, mito do feirão..."
                    className="flex-1 bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={handleGenerateAiCaptions}
                    disabled={aiGenerating}
                    className="px-3 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Sparkles size={14} className={aiGenerating ? 'animate-spin' : ''} />
                    <span>{aiGenerating ? 'Gerando...' : 'Gerar'}</span>
                  </button>
                </div>
              </div>

              {aiSuggestions.length > 0 && (
                <div className="space-y-3 pt-2">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">
                    Sugestões Geradas:
                  </span>
                  {aiSuggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-purple-500/20 hover:border-purple-500/40 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-300">{sug.title}</span>
                        <button
                          onClick={() => applyCaptionToAll(sug.caption)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500 hover:text-white transition-all"
                        >
                          Aplicar ao Lote
                        </button>
                      </div>
                      <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar">
                        {sug.caption}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-white/10">
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Legenda Padrão Aplicada
                </label>
                <textarea
                  value={globalCaption}
                  onChange={e => setGlobalCaption(e.target.value)}
                  placeholder="Cole ou digite a legenda que será usada como padrão para todos os vídeos..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lime-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: CONTAS CONECTADAS ────────────────────────────────────────── */}
      {activeTab === 'accounts' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-white/10 bg-zinc-900/40 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">Contas de Redes Sociais Conectadas</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Gerenciamento de tokens da Meta Graph API e credenciais de publicação.
                </p>
              </div>

              <button
                onClick={() => setShowConnectModal(true)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-all flex items-center gap-1.5"
              >
                <Plus size={14} />
                <span>Conectar via Token</span>
              </button>
            </div>

            {/* Conta Principal do Instagram */}
            <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={
                      mainAccount?.avatar_url ||
                      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200'
                    }
                    alt="avatar"
                    className="w-16 h-16 rounded-full object-cover border-2 border-lime-400"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 flex items-center justify-center text-white">
                    <Instagram size={13} />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-white">Quark Energia Solar</h4>
                    <CheckCircle2 size={16} className="text-sky-400" />
                  </div>
                  <span className="text-xs text-zinc-400">
                    @{mainAccount?.username || 'quarkenergia'}
                  </span>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                    <span>
                      <strong className="text-white">14.8k</strong> seguidores
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-white">{mainAccount?.media_count || 168}</strong>{' '}
                      publicações
                    </span>
                    <span>•</span>
                    <span className="text-lime-400 font-semibold">Conta Business Verificada</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCutProConnect}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-lime-500/10 text-lime-400 hover:bg-lime-500 hover:text-black transition-all flex items-center gap-1.5"
                >
                  <RefreshCw size={14} />
                  <span>Revalidar Token</span>
                </button>
                <a
                  href={`https://www.instagram.com/${mainAccount?.username || 'quarkenergia'}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/5 text-zinc-300 hover:text-white transition-all"
                  title="Abrir no Instagram"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>

            {/* Como funciona o fluxo Cut.Pro */}
            <div className="p-4 rounded-xl bg-lime-500/5 border border-lime-500/20 text-xs space-y-2">
              <div className="flex items-center gap-2 text-lime-400 font-bold">
                <HelpCircle size={15} />
                <span>Como funciona a conexão sem fricção (Cut.Pro Architecture)</span>
              </div>
              <p className="text-zinc-300 leading-relaxed">
                Ao clicar em <strong>Conectar Instagram</strong>, nossa API gera o diálogo seguro da Meta Graph API com os escopos oficiais de publicação de Reels (<code className="text-lime-300">instagram_content_publish</code> e <code className="text-lime-300">instagram_basic</code>). O token de longa duração de 60 dias é renovado automaticamente em segundo plano pelo servidor Quark.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: REELS PHONE MOCKUP (Visualização Realista de iPhone) ───── */}
      <AnimatePresence>
        {selectedPreviewPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-[380px] bg-black rounded-[44px] border-[6px] border-zinc-800 shadow-2xl overflow-hidden aspect-[9/19] flex flex-col justify-between"
            >
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-800 mr-2" />
                <div className="w-2 h-2 rounded-full bg-blue-950/80" />
              </div>

              <button
                onClick={() => setSelectedPreviewPost(null)}
                className="absolute top-5 right-5 z-40 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/90 transition-all"
              >
                <X size={18} />
              </button>

              <div className="absolute inset-0 bg-zinc-950 z-10 flex items-center justify-center">
                {selectedPreviewPost.media_urls?.[0]?.endsWith('.mp4') ||
                selectedPreviewPost.media_urls?.[0]?.includes('instagram.fmcz') ||
                selectedPreviewPost.media_urls?.[0]?.includes('video') ? (
                  <video
                    src={selectedPreviewPost.media_urls[0]}
                    autoPlay
                    loop
                    muted={videoMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={
                      selectedPreviewPost.thumbnail_url ||
                      'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=600'
                    }
                    alt="cover"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />
              </div>

              <div className="relative z-20 pt-12 px-5 flex items-center justify-between text-white">
                <span className="text-base font-bold font-display tracking-wide">Reels</span>
                <button
                  onClick={() => setVideoMuted(!videoMuted)}
                  className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center backdrop-blur-sm"
                >
                  {videoMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
              </div>

              <div className="relative z-20 self-end mr-4 mb-24 flex flex-col items-center gap-5 text-white">
                <div className="flex flex-col items-center gap-1">
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                    <Heart size={22} className="text-white hover:text-rose-500 transition-colors" />
                  </button>
                  <span className="text-[11px] font-semibold">
                    {selectedPreviewPost.likes_count || '1.8k'}
                  </span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                    <MessageCircle size={22} />
                  </button>
                  <span className="text-[11px] font-semibold">142</span>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                    <Send size={20} />
                  </button>
                  <span className="text-[11px] font-semibold">Share</span>
                </div>

                <button className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
                  <Bookmark size={20} />
                </button>
              </div>

              <div className="relative z-20 p-5 space-y-3 text-white">
                <div className="flex items-center gap-2.5">
                  <img
                    src="https://images.unsplash.com/photo-1509391365360-2e959784a276?w=200"
                    alt="avatar"
                    className="w-9 h-9 rounded-full border border-lime-400 object-cover"
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold">quarkenergia</span>
                    <CheckCircle2 size={13} className="text-sky-400" />
                  </div>
                  <button className="px-3 py-1 rounded-full text-[11px] font-bold border border-white/60 bg-transparent hover:bg-white/10">
                    Seguir
                  </button>
                </div>

                <p className="text-xs text-zinc-100 line-clamp-3 leading-relaxed">
                  {selectedPreviewPost.caption}
                </p>

                <div className="flex items-center gap-2 text-[11px] text-zinc-300">
                  <Sparkles size={12} className="text-lime-400" />
                  <span>Quark Energia • Áudio Original</span>
                </div>

                {selectedPreviewPost.status === 'scheduled' && (
                  <button
                    onClick={() => handlePublishNow(selectedPreviewPost.id)}
                    className="w-full mt-2 py-2.5 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black flex items-center justify-center gap-2 shadow-lg shadow-lime-500/30"
                  >
                    <Send size={14} />
                    <span>Publicar Agora no Instagram</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: EDITAR POST / REAGENDAR ───────────────────────────────── */}
      <AnimatePresence>
        {editingPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-zinc-950 rounded-2xl border border-white/10 p-6 space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="text-lime-400" size={18} />
                  <h3 className="text-base font-bold">Editar Post / Reagendar Horário</h3>
                </div>
                <button
                  onClick={() => setEditingPost(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Data e Horário de Publicação
                  </label>
                  <input
                    type="datetime-local"
                    value={editScheduledAt}
                    onChange={e => setEditScheduledAt(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Legenda do Reels
                  </label>
                  <textarea
                    rows={5}
                    value={editCaption}
                    onChange={e => setEditCaption(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lime-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPost(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black flex items-center gap-1.5"
                  >
                    <Check size={14} />
                    <span>Salvar Alterações</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL: CONEXÃO VIA TOKEN MANUAL ──────────────────────────────── */}
      <AnimatePresence>
        {showConnectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-zinc-950 rounded-2xl border border-white/10 p-6 space-y-4 text-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Instagram className="text-pink-400" size={20} />
                  <h3 className="text-base font-bold">Conectar Conta via Access Token</h3>
                </div>
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleConnectToken} className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Insira o <strong>User Access Token</strong> ou <strong>Page Access Token</strong> gerado no Meta for Developers (Graph API Explorer) para conectar instantaneamente qualquer perfil do Instagram Business ou Creator.
                </p>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Meta Access Token
                  </label>
                  <textarea
                    rows={3}
                    value={manualToken}
                    onChange={e => setManualToken(e.target.value)}
                    placeholder="Cole seu token aqui (ex: EAA... ou IGA...)"
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lime-500 font-mono"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConnectModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={connectingToken}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-lime-500 hover:bg-lime-400 text-black flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {connectingToken && <RefreshCw size={14} className="animate-spin" />}
                    <span>{connectingToken ? 'Validando...' : 'Conectar Conta'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialStudio;

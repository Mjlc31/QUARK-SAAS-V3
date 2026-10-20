import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, Zap, FileText, Eye, EyeOff, MessageCircle, HelpCircle } from 'lucide-react';
import { usePortal } from '../../contexts/PortalContext';

const formatCpfCnpj = (value: string) => {
  // Se contiver @, é email, não formata como CPF/CNPJ
  if (value.includes('@')) return value;

  const numericValue = value.replace(/\D/g, '');
  if (numericValue.length <= 11) {
    return numericValue
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  } else {
    return numericValue
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  }
};

const ClientLoginScreen = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: portalLoading } = usePortal();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Se já estiver logado, redireciona diretamente ao portal
  React.useEffect(() => {
    if (!portalLoading && isAuthenticated) {
      navigate('/portal', { replace: true });
    }
  }, [isAuthenticated, portalLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!identifier.trim()) {
      setErrorMessage('Por favor, informe seu CPF ou CNPJ.');
      return;
    }

    if (!password.trim()) {
      setErrorMessage('Por favor, digite sua senha de acesso.');
      return;
    }

    setLoading(true);

    try {
      await login(identifier, password);
      navigate('/portal');
    } catch (err: any) {
      console.error(err);
      let message = err.message || 'Erro ao realizar login.';
      if (message.includes('Invalid login credentials')) {
        message = 'CPF ou senha incorretos. A senha inicial são os 6 primeiros dígitos do seu CPF.';
      }
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // WhatsApp oficial da Quark Energia: +55 82 99424-1835
  const officialQuarkWhatsApp = '5582994241835';

  const forgotPasswordUrl = identifier.trim()
    ? `https://wa.me/${officialQuarkWhatsApp}?text=${encodeURIComponent(`Olá! Sou cliente da Quark Energia (CPF/CNPJ: ${identifier}) e esqueci minha senha de acesso ao Portal do Cliente. Pode me ajudar a recuperar/redefinir?`)}`
    : `https://wa.me/${officialQuarkWhatsApp}?text=${encodeURIComponent('Olá! Sou cliente da Quark Energia e esqueci minha senha de acesso ao Portal do Cliente. Pode me ajudar a recuperar/redefinir?')}`;

  const requestAccessUrl = `https://wa.me/${officialQuarkWhatsApp}?text=${encodeURIComponent('Olá! Gostaria de suporte ou solicitar meu acesso ao Portal do Cliente da Quark Energia.')}`;

  return (
    <div className="min-h-[100dvh] bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Luzes de fundo atmosféricas */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-lime-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-lime-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl animate-enter bg-zinc-900/70 backdrop-blur-xl">
        {/* Logo & Boas-vindas */}
        <div className="text-center mb-7">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-lime-400 to-lime-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(163,230,53,0.35)]">
              <Zap size={28} className="text-black fill-black" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-1.5">
            Portal do Cliente
          </h1>
          <p className="text-sm text-zinc-400">
            Acompanhe sua obra, geração solar e faturas
          </p>
        </div>

        {/* Formulário de Acesso por CPF */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              CPF ou CNPJ
            </label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(formatCpfCnpj(e.target.value));
                  setErrorMessage('');
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 pl-11 text-white font-mono text-sm focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder:text-zinc-600"
                placeholder="000.000.000-00"
                autoComplete="username"
                required
              />
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <a 
                href={forgotPasswordUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-lime-400 hover:text-lime-300 transition-colors inline-flex items-center gap-1"
              >
                Esqueci a senha
              </a>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage('');
                }}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 pl-11 pr-11 text-white text-sm focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder:text-zinc-600"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors p-1"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5 flex items-start gap-1">
              <HelpCircle size={13} className="shrink-0 mt-0.5 text-zinc-400" />
              <span>
                <strong>Primeiro acesso?</strong> A senha padrão são os <strong>6 primeiros dígitos do seu CPF</strong>.
              </span>
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-start gap-2.5 animate-enter leading-relaxed">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-base transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed mt-5"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin text-black" />
                <span>Entrando...</span>
              </>
            ) : (
              <span>Entrar no Portal</span>
            )}
          </button>
        </form>

        {/* Rodapé de Suporte via WhatsApp */}
        <div className="mt-6 pt-5 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-400 mb-2">
            Ainda não possui acesso ou tem dúvidas?
          </p>
          <a
            href={requestAccessUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 px-3.5 py-2 rounded-xl transition-all"
          >
            <MessageCircle size={15} />
            Solicitar Acesso pelo WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default ClientLoginScreen;

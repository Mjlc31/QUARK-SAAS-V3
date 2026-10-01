const fs = require('fs');

const content = `import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, Zap, User, FileText } from 'lucide-react';
import { usePortal } from '../../contexts/PortalContext';

const ClientLoginScreen = () => {
  const navigate = useNavigate();
  const { login, signUp } = usePortal();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (isLoginMode) {
        await login(email, password);
        navigate('/portal');
      } else {
        await signUp(name, email, password, cpf);
        navigate('/portal');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || (isLoginMode ? 'Ocorreu um erro ao fazer login.' : 'Ocorreu um erro ao criar a conta.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#09090b] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-lime-500/10 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-lime-500/5 rounded-full blur-[120px]"></div>

      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl animate-enter bg-zinc-900/50 backdrop-blur-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              <Zap size={24} className="text-black fill-black" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Portal do Cliente</h1>
          <p className="text-slate-400">
            Acesse seus projetos e faturas
          </p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setIsLoginMode(true); setErrorMessage(''); }}
            className={\`flex-1 py-2 text-sm font-medium rounded-lg transition-all \${isLoginMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}\`}
          >
            Acessar Conta
          </button>
          <button
            type="button"
            onClick={() => { setIsLoginMode(false); setErrorMessage(''); }}
            className={\`flex-1 py-2 text-sm font-medium rounded-lg transition-all \${!isLoginMode ? 'bg-zinc-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'}\`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <>
              <div className="animate-enter">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setErrorMessage(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder-slate-600"
                    placeholder="Seu nome completo"
                    required={!isLoginMode}
                  />
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                </div>
              </div>
              <div className="animate-enter">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">CPF</label>
                <div className="relative">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => { setCpf(e.target.value); setErrorMessage(''); }}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder-slate-600"
                    placeholder="000.000.000-00"
                    required={!isLoginMode}
                  />
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder-slate-600"
                placeholder="seu@email.com"
                required
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Senha</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:ring-2 focus:ring-lime-500 focus:outline-none focus:border-transparent transition-all placeholder-slate-600"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-enter">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (isLoginMode ? 'Entrar no Portal' : 'Criar Conta')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ClientLoginScreen;
`;

fs.writeFileSync('src/pages/auth/ClientLoginScreen.tsx', content);

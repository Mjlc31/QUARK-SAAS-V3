import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Lock, KeyRound, Loader2 } from 'lucide-react';

export const NewPasswordScreen = () => {
  const { updatePassword, logout } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await updatePassword(password);
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    logout();
  };

  return (
    <div className="min-h-[100dvh] bg-[#050b14] flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl animate-enter">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              <KeyRound size={24} className="text-black fill-black" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Definir Nova Senha</h1>
          <p className="text-slate-400 text-sm">Crie uma nova senha segura para sua conta.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nova Senha</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all placeholder-slate-600"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Confirmar Senha</label>
            <div className="relative">
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all placeholder-slate-600"
                placeholder="••••••••"
                required
              />
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 min-w-[44px] min-h-[44px]"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : 'Atualizar Senha'}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            className="w-full py-2 text-slate-500 hover:text-white text-sm font-medium transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
};

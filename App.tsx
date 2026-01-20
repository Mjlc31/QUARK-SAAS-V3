import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CRM from './pages/CRM';
import Calculator from './pages/Calculator';
import Tasks from './pages/Tasks';
import Products from './pages/Products';
import Reports from './pages/Reports';
import { AppProvider, useApp } from './contexts/AppContext';
import { Lock, User, ArrowRight, Menu, Zap, Mail, Loader2, UserPlus, CheckCircle2, KeyRound, ArrowLeft } from 'lucide-react';

const LoginScreen = () => {
  const { login, signUp, resetPassword } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isRecovery) {
        // Recovery Logic
        if (!email) throw new Error("Por favor, informe seu email.");
        const { error } = await resetPassword(email);
        if (error) throw error;
        setSuccessMessage('Link de recuperação enviado para o seu email.');
      } else if (isSignUp) {
        // Sign Up Logic
        if (!name) throw new Error("Por favor, informe seu nome.");
        const { error } = await signUp(name, email, password);
        if (error) throw error;
        
        // Success Logic
        setSuccessMessage('Conta criada com sucesso!');
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMessage('Faça login com suas credenciais.');
          setPassword(''); // Clear password for security
        }, 1500);

      } else {
        // Login Logic
        const { error } = await login(email, password);
        if (error) throw error;
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Ocorreu um erro. Tente novamente.';
      
      // Defensive error extraction
      if (typeof err === 'string') {
        msg = err;
      } else if (err instanceof Error) {
        msg = err.message;
      } else if (err && typeof err.message === 'string') {
        msg = err.message;
      } else if (err && err.error && typeof err.error.message === 'string') {
        msg = err.error.message;
      }

      if (msg.includes('Invalid login credentials')) {
        setErrorMessage('E-mail ou senha incorretos.');
      } else if (msg.includes('User already registered') || msg.includes('já está cadastrado')) {
        setErrorMessage('Este e-mail já está cadastrado.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMode = (mode: 'login' | 'signup' | 'recovery') => {
    setErrorMessage('');
    setSuccessMessage('');
    setPassword('');
    if (mode === 'recovery') {
      setIsRecovery(true);
      setIsSignUp(false);
    } else if (mode === 'signup') {
      setIsRecovery(false);
      setIsSignUp(true);
    } else {
      setIsRecovery(false);
      setIsSignUp(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-lime-500/10 rounded-full blur-[150px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
      
      <div className="glass-panel w-full max-w-md p-8 rounded-3xl border border-white/10 relative z-10 shadow-2xl animate-enter">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-lime-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(163,230,53,0.3)]">
              {isRecovery ? <KeyRound size={24} className="text-black fill-black" /> : <Zap size={24} className="text-black fill-black" />}
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight mb-2">Quark<span className="text-lime-500">.</span></h1>
          <p className="text-slate-400">
            {isRecovery ? 'Recuperação de Acesso' : 'Enterprise Access'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Campo Nome (Apenas Cadastro) */}
          {isSignUp && !isRecovery && (
            <div className="animate-enter">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nome Completo</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all placeholder-slate-600"
                  placeholder="Seu Nome"
                  required
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email Corporativo</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrorMessage(''); }}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all placeholder-slate-600"
                placeholder="nome@empresa.com"
                required
              />
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
            </div>
          </div>

          {!isRecovery && (
            <div className="animate-enter">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-500 uppercase">Senha</label>
                {!isSignUp && (
                  <button 
                    type="button" 
                    onClick={() => handleToggleMode('recovery')}
                    className="text-xs text-lime-400 hover:text-lime-300 transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMessage(''); }}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 pl-12 text-white focus:border-lime-500 outline-none transition-all placeholder-slate-600"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-enter">
               <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></div>
               {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2 animate-enter">
               <CheckCircle2 size={16} className="flex-shrink-0" />
               {successMessage}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading || (successMessage && isSignUp) as boolean}
            className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={24} className="animate-spin" /> : (
              <>
                {isRecovery ? 'Enviar Link de Recuperação' : (isSignUp ? 'Criar Conta' : 'Acessar Sistema')}
                {!loading && !successMessage && !isRecovery && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          {isRecovery ? (
            <button 
              onClick={() => handleToggleMode('login')}
              className="text-slate-500 hover:text-white text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
            >
              <ArrowLeft size={16} /> Voltar para Login
            </button>
          ) : (
             <>
               <p className="text-slate-500 text-sm">
                 {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem acesso?'}
               </p>
               <button 
                 onClick={() => handleToggleMode(isSignUp ? 'login' : 'signup')}
                 className="mt-2 text-lime-400 hover:text-lime-300 font-bold text-sm transition-colors flex items-center justify-center gap-2 mx-auto"
               >
                 {isSignUp ? <><User size={16}/> Fazer Login</> : <><UserPlus size={16}/> Criar nova conta</>}
               </button>
             </>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
           <p className="text-[10px] text-slate-600 flex items-center gap-1.5">
             <Lock size={10} /> Protegido por criptografia End-to-End
           </p>
        </div>
      </div>
    </div>
  );
};

const NewPasswordScreen = () => {
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
      // Note: isRecoveryMode will be set to false in AppContext upon success
    } catch (err: any) {
      setError(err.message || 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    logout(); // Signs out and resets recovery mode
  };

  return (
    <div className="min-h-screen bg-[#050b14] flex items-center justify-center p-4">
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
             className="w-full py-4 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-lg transition-all shadow-lg shadow-lime-500/20 flex items-center justify-center gap-2"
           >
             {loading ? <Loader2 size={24} className="animate-spin" /> : 'Atualizar Senha'}
           </button>

           <button 
             type="button"
             onClick={handleCancel}
             className="w-full py-2 text-slate-500 hover:text-white text-sm font-medium transition-colors"
           >
             Cancelar
           </button>
         </form>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, isRecoveryMode } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Checks for recovery mode first (priority over login screen)
  if (isRecoveryMode) return <NewPasswordScreen />;

  if (!user) return <LoginScreen />;

  const renderPage = () => {
    switch(currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'crm': return <CRM />;
      case 'calculator': return <Calculator />;
      case 'tasks': return <Tasks />;
      case 'products': return <Products />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#050b14] text-slate-200 font-sans selection:bg-lime-500/30 overflow-hidden">
      {/* Cinematic Background */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] w-[30%] h-[30%] bg-lime-500/5 rounded-full blur-[100px]"></div>
      </div>

      <Sidebar 
        currentPage={currentPage} 
        onNavigate={setCurrentPage} 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 glass-panel border-b border-white/10 z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
           <Zap size={20} className="text-lime-500" />
           <span className="font-display font-bold text-white text-lg">Quark.</span>
        </div>
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-white bg-white/5 rounded-lg">
          <Menu size={24} />
        </button>
      </div>

      <main className="lg:ml-72 p-4 pt-20 lg:p-10 relative z-10 h-screen overflow-y-auto custom-scrollbar">
        {renderPage()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, ApiResult } from '../types';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isRecoveryMode: boolean;
  isSupabaseConnected: boolean;
  login: (email: string, password: string) => Promise<ApiResult<void>>;
  signUp: (name: string, email: string, password: string) => Promise<ApiResult<void>>;
  resetPassword: (email: string) => Promise<ApiResult<void>>;
  updatePassword: (password: string) => Promise<ApiResult<void>>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const offlineUserStr = localStorage.getItem('quark_offline_user');
      if (offlineUserStr) return JSON.parse(offlineUserStr);
      
      const sbSession = localStorage.getItem('quark-auth-token');
      if (sbSession) {
         const parsed = JSON.parse(sbSession);
         if (parsed?.user) {
            return {
              id: parsed.user.id,
              email: parsed.user.email!,
              name: parsed.user.user_metadata?.name || 'Usuário',
              role: 'Sales',
              avatarInitials: (parsed.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
            };
         }
      }
    } catch (e) {}
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  useEffect(() => {
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      setIsRecoveryMode(true);
    }

    checkSupabaseConnection();

    let initialLoadHandled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        initialLoadHandled = true;
        const currentUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
        };
        if (!user) setUser(currentUser);
      } else {
        const offlineUserStr = localStorage.getItem('quark_offline_user');
        if (offlineUserStr) {
          initialLoadHandled = true;
          setUser(JSON.parse(offlineUserStr));
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true);

      if (session?.user) {
        if (initialLoadHandled && event === 'INITIAL_SESSION') return;
        initialLoadHandled = true;

        const newUser: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name || 'Usuário',
          role: 'Sales',
          avatarInitials: (session.user.user_metadata?.name || 'U').substring(0, 2).toUpperCase()
        };
        setUser(newUser);
        localStorage.removeItem('quark_offline_user');
        checkSupabaseConnection();
      } else if (!localStorage.getItem('quark_offline_user')) {
        if (event !== 'INITIAL_SESSION') {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSupabaseConnection = async () => {
    try {
      const { error } = await supabase.from('leads').select('id').limit(1);
      const isConnected = !error || (error.code !== 'PGRST301' && !error.message?.includes('fetch') && !error.message?.includes('network'));
      setIsSupabaseConnected(isConnected);
      if (!isConnected) console.warn("⚠️ Supabase offline:", error?.message);
    } catch (err) {
      setIsSupabaseConnected(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const isAuthError = error.message.includes('Invalid login credentials') || error.message.includes('not found') || error.status === 400 || error.status === 422;
        if (isAuthError) return { error: { message: error.message, status: error.status } };

        setIsSupabaseConnected(false);
        const fallbackUser: User = { id: 'offline-user-id', email, name: 'Modo Offline', role: 'Admin', avatarInitials: email.substring(0, 2).toUpperCase() };
        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        return { error: null };
      }
      setIsSupabaseConnected(true);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'Unknown error' } };
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
      if (error) {
        if (error.message.includes('already registered') || error.status === 422) return { error: { message: error.message } };
        setIsSupabaseConnected(false);
        const fallbackUser: User = { id: 'offline-user-id', email, name, role: 'Admin', avatarInitials: name.substring(0, 2).toUpperCase() };
        setUser(fallbackUser);
        localStorage.setItem('quark_offline_user', JSON.stringify(fallbackUser));
        return { error: null };
      }
      setIsSupabaseConnected(true);
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message } };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      return { error: error ? { message: error.message } : null };
    } catch (err: any) {
      return { error: { message: err.message } };
    } finally {
      setIsLoading(false);
    }
  };

  const updatePassword = async (password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        setIsRecoveryMode(false);
        window.history.replaceState(null, '', window.location.pathname);
      }
      return { error: error ? { message: error.message } : null };
    } catch (err: any) {
      return { error: { message: err.message } };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    localStorage.removeItem('quark_offline_user');
    await supabase.auth.signOut();
    setUser(null);
    setIsRecoveryMode(false);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isRecoveryMode, isSupabaseConnected, login, signUp, resetPassword, updatePassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

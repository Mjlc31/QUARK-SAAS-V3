import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientPortalUser } from '../types';
import { supabase } from '../lib/supabaseClient';

const withTimeout = <T,>(p: PromiseLike<T>, ms = 1200): Promise<T> =>
  Promise.race([Promise.resolve(p), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

interface PortalContextType {
  client: ClientPortalUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, cpf?: string) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

// Cache antigo do login offline (validava senha no navegador). Só é limpo, nunca lido.
const LEGACY_SESSION_KEY = 'quark_portal_session_client';

export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ClientPortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // A RLS só devolve o perfil cujo auth_user_id é o usuário logado
  const fetchClientProfile = async (userId: string) => {
    const { data, error: profileError } = await supabase
      .from('client_portal_users')
      .select('*')
      .eq('auth_user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (profileError) console.error('Error fetching client profile:', profileError.message);
    return (data as ClientPortalUser | null) ?? null;
  };

  useEffect(() => {
    let mounted = true;
    try { localStorage.removeItem(LEGACY_SESSION_KEY); } catch {}

    const initialize = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user = data.session?.user;
        if (user) {
          const profile = await fetchClientProfile(user.id);
          if (mounted) setClient(profile?.is_active === false ? null : profile);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchClientProfile(session.user.id);
        if (mounted && profile) setClient(profile);
      } else if (event === 'SIGNED_OUT') {
        if (mounted) setClient(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string) => {
    setIsLoading(true);
    setError(null);

    const fail = (msg: string): never => {
      setError(msg);
      setIsLoading(false);
      throw new Error(msg);
    };

    let email = identifier.trim().toLowerCase();

    // CPF/CNPJ → e-mail da conta (a RPC também provisiona o acesso na primeira vez)
    if (!email.includes('@')) {
      const { data: resolvedEmail } = await withTimeout(
        supabase.rpc('get_client_auth_email', { p_identifier: email }),
        8000
      ).catch(() => ({ data: null }));
      if (!resolvedEmail) {
        fail('CPF/CNPJ não localizado no cadastro da Quark. Verifique os dados digitados ou solicite acesso pelo WhatsApp.');
      }
      email = String(resolvedEmail);
    }

    const { data, error: authError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      8000
    ).catch(() => ({ data: null, error: new Error('timeout') }));

    if (authError || !data?.session?.user) {
      fail(
        authError?.message === 'timeout'
          ? 'Não foi possível conectar. Verifique sua internet e tente novamente.'
          : 'CPF ou senha incorretos. A senha inicial são os 6 primeiros dígitos do seu CPF.'
      );
    }

    const profile = await fetchClientProfile(data!.session!.user.id);
    if (!profile || profile.is_active === false) {
      await supabase.auth.signOut();
      fail(profile ? 'Acesso negado: Seu acesso ao portal está desativado.' : 'Conta sem projeto vinculado. Solicite acesso pelo WhatsApp.');
    }

    setClient(profile);
    setIsLoading(false);
  };

  const signUp = async (name: string, email: string, password: string, cpf?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!cpf) {
        throw new Error('O CPF é obrigatório para realizar o cadastro.');
      }

      // Verifica no banco de dados se esse CPF já foi cadastrado no Quark OS
      const { data: checkData, error: checkError } = await supabase.rpc('check_cpf_exists', { p_cpf: cpf });
      
      if (checkError) {
        throw new Error('Erro ao verificar o documento. Tente novamente.');
      }

      if (!checkData?.exists) {
        throw new Error('Documento não encontrado. Você precisa ter um projeto registrado na Quark para acessar o portal.');
      }

      if (checkData?.already_registered) {
        throw new Error('Este documento já possui um cadastro ativo no portal. Faça login ou recupere sua senha.');
      }

      // Cria a conta do usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            cpf
          }
        }
      });

      if (authError) {
        throw new Error(authError.message || 'Erro ao criar conta no sistema.');
      }

      if (authData.user) {
        // Vincula o novo Auth User ao perfil de cliente existente via CPF
        const { error: linkError } = await supabase.rpc('link_client_portal_user', {
          p_auth_id: authData.user.id,
          p_cpf: cpf,
          p_name: name,
          p_email: email
        });

        if (linkError) {
          console.error("Link error:", linkError);
          // Mesmo que o Auth User tenha sido criado, avisamos sobre a falha no link
          throw new Error('Conta criada, mas não foi possível vincular ao seu projeto. Contate o suporte.');
        }

        // Tenta buscar o perfil recém-vinculado
        const profile = await fetchClientProfile(authData.user.id);
        if (profile) {
          setClient(profile);
        } else {
          // Caso a busca falhe no primeiro momento
          throw new Error('Conta criada com sucesso, mas faça login novamente.');
        }
      }
    } catch (err: any) {
      const message = err.message || 'Erro ao criar conta';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      localStorage.removeItem(LEGACY_SESSION_KEY);
      await withTimeout(supabase.auth.signOut(), 800).catch(() => {});
      setClient(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PortalContext.Provider 
      value={{
        client,
        isLoading,
        isAuthenticated: !!client,
        login,
        signUp,
        logout,
        error
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (context === undefined) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};

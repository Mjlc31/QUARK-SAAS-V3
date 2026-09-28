import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ClientPortalUser } from '../types';
import { supabase } from '../lib/supabaseClient';

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

export const PortalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [client, setClient] = useState<ClientPortalUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClientProfile = async (userId: string) => {

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const { data, error } = await supabase
        .from('client_portal_users')
        .select('*')
        .eq('auth_user_id', userId)
        .abortSignal(controller.signal)
        .single();
        
      clearTimeout(timeoutId);

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return null;
        }
        throw error;
      }
      return data as ClientPortalUser;
    } catch (err: any) {
      console.error('Error fetching client profile:', err.message);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout retrieving session')), 3000)
        );
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ]) as any;
        
        if (session?.user && mounted) {
          const profile = await fetchClientProfile(session.user.id);
          if (mounted) {
            setClient(profile);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const profile = await fetchClientProfile(session.user.id);
        setClient(profile);
      } else if (event === 'SIGNED_OUT') {
        setClient(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw new Error('E-mail ou senha incorretos.');
      }
      
      if (data.session?.user) {
        const profile = await fetchClientProfile(data.session.user.id);
          
        if (!profile) {
          await supabase.auth.signOut();
          throw new Error('Acesso negado: Você não tem perfil de cliente no portal.');
        }
        
        if (!profile.is_active) {
          await supabase.auth.signOut();
          throw new Error('Acesso negado: Seu acesso ao portal está desativado.');
        }
        
        setClient(profile);
      }
    } catch (err: any) {
      const message = err.message || 'Erro ao fazer login';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
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
      await supabase.auth.signOut();
      setClient(null);
    } catch (err: any) {
      console.error(err);
    } finally {
      console.log("Setting isLoading false"); setIsLoading(false);
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

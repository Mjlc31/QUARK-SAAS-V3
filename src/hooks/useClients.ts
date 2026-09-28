import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

export interface ClientData {
  id: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  birth_date: string;
  is_active: boolean;
  auth_user_id?: string | null;
  created_at: string;
  // Extras joined from client_intelligence
  install_date?: string;
  system_size_kw?: number;
}

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('client_portal_users')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as ClientData[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (client: Partial<ClientData>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth?.user) throw new Error('Not authenticated');

      // Create portal user
      const { data, error } = await supabase
        .from('client_portal_users')
        .insert({
          user_id: userAuth.user.id,
          name: client.name,
          email: client.email,
          phone: client.phone,
          cpf: client.cpf,
          birth_date: client.birth_date,
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      
      // Also create intelligence record if system size or install date provided
      if (client.install_date || client.system_size_kw) {
         await supabase.from('client_intelligence').insert({
           user_id: userAuth.user.id,
           client_id: data.id,
           client_name: client.name,
           install_start_date: client.install_date,
           system_size_kw: client.system_size_kw,
           is_active: true
         });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('client_portal_users')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { EcommerceProduct } from '../types';

export function useEcommerce() {
  return useQuery({
    queryKey: ['ecommerce_products'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ecommerce_products')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EcommerceProduct[];
    },
  });
}

export function useCreateEcommerceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Omit<EcommerceProduct, 'id' | 'user_id' | 'created_at'>) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ecommerce_products')
        .insert({
          ...product,
          user_id: userAuth.user.id,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
        
      if (error) throw error;
      return data as EcommerceProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_products'] });
    },
  });
}

export function useUpdateEcommerceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (product: Partial<EcommerceProduct> & { id: string }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { id, ...updateData } = product;

      const { data, error } = await supabase
        .from('ecommerce_products')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as EcommerceProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_products'] });
    },
  });
}

export function useDeleteEcommerceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { error } = await supabase
        .from('ecommerce_products')
        .delete()
        .eq('id', id)
        .eq('user_id', userAuth.user.id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_products'] });
    },
  });
}

export function useToggleEcommerceProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('ecommerce_products')
        .update({ is_active })
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();

      if (error) throw error;
      return data as EcommerceProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ecommerce_products'] });
    },
  });
}

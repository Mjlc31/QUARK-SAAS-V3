import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import type { ProposalData, ProposalVersion, ProposalStatus } from '../components/proposal/types';

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

export function useProposals() {
  const queryClient = useQueryClient();

  // ── Buscar todas as propostas do usuário logado ─────────────
  const proposalsQuery = useQuery({
    queryKey: ['proposals'],
    queryFn: async () => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('user_id', userAuth.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data as any[]).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        version: row.version || 1,
        clientName: row.client_name,
        cpfCnpj: row.cpf_cnpj,
        email: row.email,
        address: row.address,
        city: row.city,
        state: row.state,
        phone: row.phone,
        roofType: row.roof_type,
        systemSizeKw: row.system_size_kw,
        finalPrice: row.final_price,
        installationCost: row.installation_cost,
        status: row.status,
        pdfUrl: row.pdf_url,
        ...row.data,
        blocks: row.blocks,
        theme: row.theme,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as ProposalData[];
    },
  });

  // ── Buscar proposta por ID ──────────────────────────────────
  const getProposalById = (id: string) =>
    useQuery({
      queryKey: ['proposals', id],
      queryFn: async () => {
        const { data: userAuth } = await supabase.auth.getUser();
        if (!userAuth.user) throw new Error('Não autenticado');

        const { data, error } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .eq('user_id', userAuth.user.id)
          .single();

        if (error) throw error;
        if (!data) return null;

        const row = data as any;
        return {
          id: row.id,
          leadId: row.lead_id,
          version: row.version || 1,
          clientName: row.client_name,
          cpfCnpj: row.cpf_cnpj,
          email: row.email,
          address: row.address,
          city: row.city,
          state: row.state,
          phone: row.phone,
          roofType: row.roof_type,
          systemSizeKw: row.system_size_kw,
          finalPrice: row.final_price,
          installationCost: row.installation_cost,
          status: row.status,
          pdfUrl: row.pdf_url,
          ...row.data,
          blocks: row.blocks,
          theme: row.theme,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as ProposalData;
      },
      enabled: !!id,
    });

  // ── Salvar/Atualizar proposta (com versionamento) ───────────
  const saveProposal = useMutation({
    mutationFn: async (proposal: ProposalData) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const {
        id,
        leadId,
        version,
        clientName,
        cpfCnpj,
        email,
        address,
        city,
        state,
        phone,
        roofType,
        systemSizeKw,
        finalPrice,
        installationCost,
        status,
        blocks,
        theme,
        pdfUrl,
        createdAt,
        updatedAt,
        ...restData
      } = proposal;

      const payload = {
        user_id: userAuth.user.id,
        client_name: clientName,
        city,
        phone: phone || null,
        system_size_kw: systemSizeKw,
        final_price: finalPrice,
        status: status || 'draft',
        data: {
          ...restData,
          lead_id: leadId || null,
          cpf_cnpj: cpfCnpj || null,
          email: email || null,
          address: address || null,
          state: state || null,
          roof_type: roofType || null,
          installation_cost: installationCost || null,
          pdf_url: pdfUrl || null,
          version: version || 1
        },
        blocks,
        theme,
        updated_at: new Date().toISOString(),
      };

      if (id) {
        // ── UPDATE: Salvar versão anterior antes de atualizar ──
        const { data: currentRow } = await supabase
          .from('proposals')
          .select('*')
          .eq('id', id)
          .eq('user_id', userAuth.user.id)
          .single();

        if (currentRow) {
          const currentVersion = (currentRow as any).version || 1;
          
          // Salvar snapshot da versão atual na tabela de versões
          try {
            await supabase.from('proposal_versions').insert({
            proposal_id: id,
            version: currentVersion,
            client_name: (currentRow as any).client_name,
            city: (currentRow as any).city,
            system_size_kw: (currentRow as any).system_size_kw,
            final_price: (currentRow as any).final_price,
            data: (currentRow as any).data || {},
            blocks: (currentRow as any).blocks,
            theme: (currentRow as any).theme,
          });
          } catch (e) { console.warn('proposal_versions table might not exist yet', e); }

          // Incrementar versão
          payload.data.version = currentVersion + 1;
        }

        const { data, error } = await supabase
          .from('proposals')
          .update(payload)
          .eq('id', id)
          .eq('user_id', userAuth.user.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // ── INSERT ──
        const { data, error } = await supabase
          .from('proposals')
          .insert({
            ...payload,
            
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // ── Atualizar status da proposta ────────────────────────────
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ProposalStatus }) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('proposals')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userAuth.user.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // ── Duplicar proposta ───────────────────────────────────────
  const duplicateProposal = useMutation({
    mutationFn: async (proposal: ProposalData) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      const {
        id, leadId, version, createdAt, updatedAt, pdfUrl, status,
        clientName, cpfCnpj, email, address, city, state, phone, roofType,
        systemSizeKw, finalPrice, installationCost, blocks, theme,
        ...restData
      } = proposal;

      const { data, error } = await supabase
        .from('proposals')
        .insert({
          user_id: userAuth.user.id,
          client_name: `${clientName} (Cópia)`,
          city,
          phone: phone || null,
          system_size_kw: systemSizeKw,
          final_price: finalPrice,
          status: 'draft',
          data: {
            ...restData,
            cpf_cnpj: cpfCnpj || null,
            email: email || null,
            address: address || null,
            state: state || null,
            roof_type: roofType || null,
            installation_cost: installationCost || null,
            lead_id: leadId || null,
            pdf_url: pdfUrl || null,
            version: 1
          },
          blocks,
          theme,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // ── Deletar proposta ────────────────────────────────────────
  const deleteProposal = useMutation({
    mutationFn: async (id: string) => {
      const { data: userAuth } = await supabase.auth.getUser();
      if (!userAuth.user) throw new Error('Não autenticado');

      // Versões serão deletadas em cascata (ON DELETE CASCADE)
      const { error } = await supabase
        .from('proposals')
        .delete()
        .eq('id', id)
        .eq('user_id', userAuth.user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  // ── Buscar versões de uma proposta ──────────────────────────
  const getProposalVersions = (proposalId: string) =>
    useQuery({
      queryKey: ['proposal-versions', proposalId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('proposal_versions')
          .select('*')
          .eq('proposal_id', proposalId)
          .order('version', { ascending: false });

        if (error) throw error;

        return (data as any[]).map(row => ({
          id: row.id,
          proposalId: row.proposal_id,
          version: row.version,
          data: {
            clientName: row.client_name,
            city: row.city,
            systemSizeKw: row.system_size_kw,
            finalPrice: row.final_price,
            ...row.data,
          },
          blocks: row.blocks,
          theme: row.theme,
          createdAt: row.created_at,
        })) as ProposalVersion[];
      },
      enabled: !!proposalId,
    });

  // ── Gerar link de compartilhamento WhatsApp ─────────────────
  const generateWhatsAppLink = (proposal: ProposalData) => {
    const message = [
      `Olá ${proposal.clientName}! 👋`,
      ``,
      `Segue sua proposta de energia solar da *Quark Energia*:`,
      ``,
      `⚡ Sistema: ${proposal.systemSizeKw?.toFixed(2)} kWp`,
      `💰 Investimento: ${formatCurrency(proposal.finalPrice)}`,
      proposal.paybackYears ? `📊 Payback: ${proposal.paybackYears.toFixed(1)} anos` : '',
      ``,
      proposal.pdfUrl ? `📄 PDF da proposta: ${proposal.pdfUrl}` : '',
      ``,
      `Ficou com alguma dúvida? Estou à disposição!`,
    ].filter(Boolean).join('\n');

    const phone = proposal.phone?.replace(/\D/g, '') || '';
    const encodedMessage = encodeURIComponent(message);
    
    return phone
      ? `https://wa.me/55${phone}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
  };

  return {
    proposals: proposalsQuery.data || [],
    isLoading: proposalsQuery.isLoading,
    isError: proposalsQuery.isError,
    error: proposalsQuery.error,
    saveProposal,
    deleteProposal,
    duplicateProposal,
    updateStatus,
    getProposalById,
    getProposalVersions,
    generateWhatsAppLink,
  };
}

import express from 'express';
import { supabase } from '../services/supabase.js';
import { sendWhatsAppMessage, cleanPhoneNumber } from '../services/whatsapp.js';

const router = express.Router();

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (val) => typeof val === 'string' && UUID_REGEX.test(val.trim());

async function resolveClientUser(clientId, extraFields = '') {
  if (!clientId) return null;
  const selectQuery = `id, name, phone, cpf, email, system_size_kw, project_phase, project_phase_label${extraFields ? `, ${extraFields}` : ''}`;

  // 1. Se for UUID válido, busca por id ou auth_user_id
  if (isUuid(clientId)) {
    const { data } = await supabase
      .from('client_portal_users')
      .select(selectQuery)
      .or(`id.eq.${clientId},auth_user_id.eq.${clientId}`)
      .maybeSingle();
    if (data) return data;
  }

  // 2. Busca por dígitos limpos do CPF
  const cleanDigits = String(clientId).replace(/\D/g, '');
  if (cleanDigits.length >= 11) {
    const { data } = await supabase
      .from('client_portal_users')
      .select(selectQuery)
      .or(`cpf.eq.${cleanDigits},cpf.ilike.%${cleanDigits}%`)
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // 3. Busca por email
  if (typeof clientId === 'string' && clientId.includes('@')) {
    const { data } = await supabase
      .from('client_portal_users')
      .select(selectQuery)
      .eq('email', clientId.trim().toLowerCase())
      .limit(1)
      .maybeSingle();
    if (data) return data;
  }

  // 4. Se começar com cli_ ou similar
  if (typeof clientId === 'string' && clientId.startsWith('cli_')) {
    const stripped = clientId.replace('cli_', '');
    const cleanSub = stripped.replace(/\D/g, '');
    if (cleanSub.length >= 11) {
      const { data } = await supabase
        .from('client_portal_users')
        .select(selectQuery)
        .or(`cpf.eq.${cleanSub},cpf.ilike.%${cleanSub}%`)
        .limit(1)
        .maybeSingle();
      if (data) return data;
    }
  }

  return null;
}

const SOLAR_PHASES = [
  { phase: 'venda_confirmada', label: 'Venda Confirmada & Contrato', desc: 'Contrato assinado e documentação validada para início da engenharia.' },
  { phase: 'projeto_elaboracao', label: 'Elaboração do Projeto Técnico', desc: 'Engenharia realizou o dimensionamento e desenhou os diagramas elétricos.' },
  { phase: 'compra_kit', label: 'Compra do Kit & Emissão de NF', desc: 'Módulos solares, inversor e estrutura faturados com Nota Fiscal emitida.' },
  { phase: 'projeto_enviado', label: 'Protocolo na Concessionária', desc: 'Projeto e solicitação de acesso formalmente protocolados na Equatorial Energia.' },
  { phase: 'aprovacao_concessionaria', label: 'Parecer de Acesso Aprovado', desc: 'Parecer de acesso deferido e aprovado pela concessionária sem pendências.' },
  { phase: 'logistica_entrega', label: 'Logística & Entrega dos Equipamentos', desc: 'Módulos, inversor e estruturas em rota de entrega no endereço da obra.' },
  { phase: 'instalacao', label: 'Instalação & Montagem dos Painéis', desc: 'Equipe técnica executando fixação mecânica no telhado e conexões elétricas.' },
  { phase: 'homologacao', label: 'Vistoria & Troca do Medidor', desc: 'Concessionária realiza a vistoria final e substitui o medidor pelo bidirecional.' },
  { phase: 'finalizado', label: 'Usina Ativa & Gerando Economia!', desc: 'Sistema 100% energizado, homologado e gerando economia real!' },
];

// GET /api/portal/project/:clientId - Retorna tracking do cliente com seeding automático
router.get('/project/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    // 1. Busca dados do cliente e inteligência de forma segura (UUID, CPF, Email)
    const clientUser = await resolveClientUser(clientId);
    const actualClientId = clientUser?.id || (isUuid(clientId) ? clientId : null);

    const { data: intelligence } = actualClientId
      ? await supabase
          .from('client_intelligence')
          .select('system_size_kw, client_name')
          .eq('client_id', actualClientId)
          .maybeSingle()
      : { data: null };

    // 2. Busca fases gravadas
    let recordedPhases = null;
    if (actualClientId) {
      const { data: phasesData, error: trackingErr } = await supabase
        .from('project_tracking')
        .select('*')
        .eq('client_id', actualClientId)
        .order('started_at', { ascending: true });

      if (trackingErr) {
        console.warn('[TRACKING] Erro ao buscar fases:', trackingErr.message);
      } else if (phasesData) {
        recordedPhases = phasesData;
      }
    }

    // 3. Se não houver fases cadastradas para este cliente e temos UUID válido, inicializa o ciclo padrão
    if (actualClientId && (!recordedPhases || recordedPhases.length === 0)) {
      const now = new Date();
      const initialPhaseRecords = SOLAR_PHASES.map((p, idx) => {
        const isDone = idx < 2; // primeiras 2 concluídas por padrão
        const isCurrent = idx === 2; // terceira em andamento
        const phaseDate = new Date(now.getTime() - (SOLAR_PHASES.length - idx) * 2 * 86400000);

        return {
          client_id: actualClientId,
          phase: p.phase,
          phase_label: p.label,
          notes: p.desc,
          is_current: isCurrent,
          started_at: phaseDate.toISOString(),
          completed_at: isDone ? new Date(phaseDate.getTime() + 86400000).toISOString() : null,
        };
      });

      const { data: inserted, error: seedErr } = await supabase
        .from('project_tracking')
        .insert(initialPhaseRecords)
        .select();

      if (!seedErr && inserted) {
        recordedPhases = inserted;
      }
    }

    // Formata retorno ordenado conforme o ciclo de vida solar
    const phaseOrderMap = new Map(SOLAR_PHASES.map((p, idx) => [p.phase, idx]));
    const sortedPhases = (recordedPhases || []).sort(
      (a, b) => (phaseOrderMap.get(a.phase) ?? 99) - (phaseOrderMap.get(b.phase) ?? 99)
    );

    const isFinalizado = sortedPhases.some((p) => p.phase === 'finalizado' && (p.is_current || !!p.completed_at));

    let finalPhasesList = sortedPhases;
    let completionPercent = 0;

    const currentPhaseRecord = sortedPhases.find((p) => p.is_current);
    const activePhase = (currentPhaseRecord?.phase || clientUser?.project_phase || 'compra_kit');
    const curIdx = SOLAR_PHASES.findIndex((p) => p.phase === activePhase);
    const targetIdx = curIdx >= 0 ? curIdx : 2;

    const PHASE_PERCENTS = [12, 25, 38, 50, 63, 75, 85, 95, 100];

    if (isFinalizado || activePhase === 'finalizado') {
      completionPercent = 100;
      // Garante que todas as fases anteriores apareçam como concluídas
      const finalizadoRecord = sortedPhases.find((p) => p.phase === 'finalizado');
      const baseFinishDate = finalizadoRecord?.completed_at ? new Date(finalizadoRecord.completed_at) : new Date();

      finalPhasesList = SOLAR_PHASES.map((sp, idx) => {
        const existing = sortedPhases.find((p) => p.phase === sp.phase);
        const daysBefore = (SOLAR_PHASES.length - 1 - idx) * 5;
        const estDate = new Date(baseFinishDate.getTime() - daysBefore * 86400000);

        return {
          id: existing?.id || `auto-${sp.phase}`,
          phase: sp.phase,
          phase_label: sp.label,
          notes: existing?.notes || sp.desc,
          is_current: sp.phase === 'finalizado',
          started_at: existing?.started_at || estDate.toISOString(),
          completed_at: existing?.completed_at || estDate.toISOString(),
        };
      });
    } else {
      completionPercent = PHASE_PERCENTS[targetIdx] ?? 38;

      // Garante que todas as 9 fases sejam retornadas com estado consistente
      const now = new Date();
      finalPhasesList = SOLAR_PHASES.map((sp, idx) => {
        const existing = sortedPhases.find((p) => p.phase === sp.phase);
        const isDone = idx < targetIdx;
        const isCur = idx === targetIdx;

        return {
          id: existing?.id || `auto-${sp.phase}`,
          phase: sp.phase,
          phase_label: sp.label,
          notes: existing?.notes || sp.desc,
          is_current: isCur,
          started_at: existing?.started_at || (isDone || isCur ? new Date(now.getTime() - (targetIdx - idx) * 86400000 * 2).toISOString() : null),
          completed_at: isDone ? (existing?.completed_at || new Date(now.getTime() - (targetIdx - idx) * 86400000 * 2).toISOString()) : null,
        };
      });
    }

    const currentPhase = finalPhasesList.find((p) => p.is_current) || finalPhasesList[targetIdx] || finalPhasesList[0];

    res.json({
      success: true,
      client: {
        id: actualClientId,
        name: clientUser?.name || intelligence?.client_name || 'Cliente Quark',
        phone: clientUser?.phone,
        system_size_kw: clientUser?.system_size_kw || intelligence?.system_size_kw || 3.72,
      },
      completion_percent: completionPercent,
      current_phase: currentPhase,
      phases: finalPhasesList.map((p) => ({
        id: p.id,
        phase: p.phase,
        label: p.phase_label,
        notes: p.notes,
        is_current: p.is_current,
        completed: !!p.completed_at,
        started_at: p.started_at,
        completed_at: p.completed_at,
      })),
    });
  } catch (error) {
    console.error('[TRACKING] Erro no tracking do projeto:', error);
    res.status(500).json({ success: false, error: 'Erro ao obter tracking do projeto', details: error.message });
  }
});

// POST /api/portal/project/:clientId/advance - Avança etapa do projeto e notifica cliente via WhatsApp
router.post('/project/:clientId/advance', async (req, res) => {
  try {
    const { clientId } = req.params;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    // Validação de autenticação de operador
    const token = req.headers.authorization?.split(' ')[1] || req.headers['x-api-key'] || req.query.token;
    if (token) {
      const isAnonOrService = token === process.env.VITE_SUPABASE_ANON_KEY || token === process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!isAnonOrService) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) {
          return res.status(401).json({ success: false, error: 'Unauthorized: Token de operador inválido' });
        }
      }
    } else if (process.env.NODE_ENV === 'production') {
      return res.status(401).json({ success: false, error: 'Unauthorized: Operação restrita a operadores autenticados' });
    }

    const clientUser = await resolveClientUser(clientId, 'lead_id');
    const actualClientId = clientUser?.id || (isUuid(clientId) ? clientId : null);
    if (!actualClientId) {
      return res.status(404).json({ success: false, error: 'Cliente não localizado no banco de dados' });
    }

    // Busca todas as fases do cliente
    const { data: phases, error: fetchErr } = await supabase
      .from('project_tracking')
      .select('*')
      .eq('client_id', actualClientId);

    if (fetchErr) throw fetchErr;

    const phaseOrderMap = new Map(SOLAR_PHASES.map((p, idx) => [p.phase, idx]));
    const sortedPhases = (phases || []).sort(
      (a, b) => (phaseOrderMap.get(a.phase) ?? 99) - (phaseOrderMap.get(b.phase) ?? 99)
    );

    const currentIndex = sortedPhases.findIndex((p) => p.is_current);
    if (currentIndex === -1 || currentIndex >= sortedPhases.length - 1) {
      return res.status(400).json({
        success: false,
        error: 'O projeto já está na última fase ou não possui fase atual ativa.',
      });
    }

    const currentPhase = sortedPhases[currentIndex];
    const nextPhase = sortedPhases[currentIndex + 1];
    const now = new Date().toISOString();

    // 1. Conclui fase atual
    await supabase
      .from('project_tracking')
      .update({
        completed_at: now,
        is_current: false,
      })
      .eq('id', currentPhase.id);

    // 2. Ativa próxima fase
    await supabase
      .from('project_tracking')
      .update({
        started_at: now,
        is_current: true,
      })
      .eq('id', nextPhase.id);

    // 2.1 Sincroniza client_portal_users diretamente para o Portal e Catálogo refletirem na hora
    if (actualClientId) {
      await supabase
        .from('client_portal_users')
        .update({
          project_phase: nextPhase.phase,
          project_phase_label: nextPhase.phase_label,
        })
        .eq('id', actualClientId);
    }
    if (clientUser?.cpf) {
      await supabase
        .from('client_portal_users')
        .update({
          project_phase: nextPhase.phase,
          project_phase_label: nextPhase.phase_label,
        })
        .eq('cpf', clientUser.cpf);
    }

    // 3. Notificação automática ao cliente via WhatsApp
    const clientPhone = clientUser?.phone;
    if (clientPhone) {
      const clientName = clientUser.name || 'Cliente';
      const whatsappText = `Olá, ${clientName}! 🏗️⚡\n\nSua usina solar acaba de avançar para uma nova etapa!\n\n✅ *Concluído:* ${currentPhase.phase_label}\n🚀 *Nova Etapa em Andamento:* *${nextPhase.phase_label}*\n\n_${nextPhase.notes || ''}_\n\nAcompanhe o progresso em tempo real pelo seu Portal Quark Energia!`;

      sendWhatsAppMessage(clientPhone, whatsappText, {
        chatName: clientName,
        io: req.app.get('io'),
      }).catch((err) => console.warn('[TRACKING] Erro ao enviar WhatsApp de avanço:', err.message));
    }

    // 4. Verificação de Indicação e Crédito de Pontos (Quark Points)
    // Quando avançar para 'instalado' (ou 'instalacao') ou 'finalizado', verifica se este cliente foi indicado por alguém
    const isInstallationOrDone = ['instalado', 'instalacao', 'finalizado'].includes(nextPhase.phase.toLowerCase());

    if (isInstallationOrDone) {
      try {
        const cleanClientPhone = cleanPhoneNumber(clientUser?.phone);
        let referralQuery = supabase
          .from('client_referrals')
          .select('*')
          .eq('points_credited', false);

        if (clientUser?.lead_id && cleanClientPhone) {
          referralQuery = referralQuery.or(`referred_phone.eq.${cleanClientPhone},lead_id.eq.${clientUser.lead_id}`);
        } else if (cleanClientPhone) {
          referralQuery = referralQuery.eq('referred_phone', cleanClientPhone);
        } else if (clientUser?.lead_id) {
          referralQuery = referralQuery.eq('lead_id', clientUser.lead_id);
        } else {
          referralQuery = null;
        }

        if (referralQuery) {
          const { data: pendingReferrals, error: refErr } = await referralQuery;
          if (refErr) {
            console.warn('[TRACKING] Erro ao buscar indicações pendentes:', refErr.message);
          } else if (pendingReferrals && pendingReferrals.length > 0) {
            for (const ref of pendingReferrals) {
              console.log(`[TRACKING] Creditando pontos de indicação para o indicador do referral ${ref.id}...`);
              const { data: creditOk, error: creditErr } = await supabase.rpc('credit_referral_points', {
                p_referral_id: ref.id,
              });

              if (creditErr) {
                console.error('[TRACKING] Erro ao executar credit_referral_points:', creditErr.message);
                continue;
              }

              if (creditOk) {
                // Busca dados do cliente indicador
                const { data: referrerClient } = await supabase
                  .from('client_portal_users')
                  .select('id, name, phone')
                  .eq('id', ref.referrer_client_id)
                  .maybeSingle();

                if (referrerClient?.phone) {
                  const referrerName = referrerClient.name || 'Cliente';
                  const rewardPoints = ref.reward_points || 1000;
                  const pointsMsg = `Parabéns, ${referrerName}! 🎉\n\nA usina solar de *${ref.referred_name}*, indicada por você, foi instalada com sucesso!\n\nSeus *${rewardPoints} Quark Points* acabam de ser creditados na sua conta. Acesse o Portal Quark Energia para conferir seu novo saldo e resgatar prêmios exclusivos!`;

                  sendWhatsAppMessage(referrerClient.phone, pointsMsg, {
                    chatName: referrerName,
                    io: req.app.get('io'),
                  }).catch((wErr) => console.warn('[TRACKING] Erro ao enviar WhatsApp de pontos creditados:', wErr.message));
                }

                // Emite evento Socket.IO
                const ioInstance = req.app.get('io');
                if (ioInstance) {
                  ioInstance.emit('referral:rewarded', {
                    referrerClientId: ref.referrer_client_id,
                    referralId: ref.id,
                    points: ref.reward_points || 1000,
                    referredName: ref.referred_name,
                  });
                }
              }
            }
          }
        }
      } catch (refEx) {
        console.error('[TRACKING] Exceção no processamento de pontos de indicação:', refEx);
      }
    }

    // Emite evento Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('tracking:advance', {
        clientId: actualClientId,
        previousPhase: currentPhase.phase_label,
        currentPhase: nextPhase.phase_label,
      });
    }

    res.json({
      success: true,
      message: `Etapa avançada para ${nextPhase.phase_label}`,
      advanced_to: nextPhase,
    });
  } catch (error) {
    console.error('[TRACKING] Erro ao avançar etapa:', error);
    res.status(500).json({ success: false, error: 'Erro ao avançar etapa', details: error.message });
  }
});

// POST /api/portal/provision-access - Gera/redefine acesso do cliente por CPF e senha
router.post('/provision-access', async (req, res) => {
  try {
    const { clientId, customPassword, cpf } = req.body;
    if (!clientId && !cpf) {
      return res.status(400).json({ success: false, error: 'clientId ou cpf é obrigatório' });
    }

    let client = await resolveClientUser(clientId);
    if (!client && cpf) {
      client = await resolveClientUser(cpf);
    }

    if (!client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    const cleanCpf = (client.cpf || cpf || '').replace(/\D/g, '');
    const clientEmail = (client.email && client.email.includes('@')) 
      ? client.email.trim().toLowerCase() 
      : `${cleanCpf || client.id.slice(0, 8)}@cliente.quarkenergia.com.br`;

    // Senha inicial: senha customizada ou primeiros 6 dígitos do CPF ou 'quark2026'
    const finalPassword = customPassword && customPassword.trim().length >= 6
      ? customPassword.trim()
      : (cleanCpf && cleanCpf.length >= 6 ? cleanCpf.substring(0, 6) : 'quark2026');

    let authUserId = client.auth_user_id;

    if (authUserId) {
      const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(authUserId, {
        password: finalPassword,
        email_confirm: true,
      });
      if (updateAuthErr) throw updateAuthErr;
    } else {
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const foundUser = existingUsers?.users?.find((u) => u.email?.toLowerCase() === clientEmail);

      if (foundUser) {
        authUserId = foundUser.id;
        await supabase.auth.admin.updateUserById(authUserId, {
          password: finalPassword,
          email_confirm: true,
        });
      } else {
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: clientEmail,
          password: finalPassword,
          email_confirm: true,
          user_metadata: {
            name: client.name,
            cpf: cleanCpf,
            role: 'client',
          },
        });
        if (createErr) throw createErr;
        authUserId = newUser.user.id;
      }

      await supabase
        .from('client_portal_users')
        .update({ auth_user_id: authUserId, email: clientEmail })
        .eq('id', client.id);
    }

    res.json({
      success: true,
      message: 'Acesso do cliente gerado com sucesso!',
      loginCpf: client.cpf || cleanCpf,
      loginEmail: clientEmail,
      temporaryPassword: finalPassword,
    });
  } catch (error) {
    console.error('[TRACKING] Erro ao provisionar acesso:', error);
    res.status(500).json({ success: false, error: 'Erro ao provisionar acesso', details: error.message });
  }
});

// POST /api/portal/project/:clientId/set-phase - Define diretamente a fase do projeto do cliente
router.post('/project/:clientId/set-phase', async (req, res) => {
  try {
    const { clientId } = req.params;
    const { phase, phaseLabel, notes, cpf } = req.body;
    if (!clientId || !phase) {
      return res.status(400).json({ success: false, error: 'clientId e phase são obrigatórios' });
    }

    let clientUser = await resolveClientUser(clientId);
    if (!clientUser && cpf) {
      clientUser = await resolveClientUser(cpf);
    }

    const actualClientId = clientUser?.id || (isUuid(clientId) ? clientId : null);

    let data = null;
    let rpcError = null;

    if (actualClientId && isUuid(actualClientId)) {
      const result = await supabase.rpc('set_client_tracking_phase', {
        p_client_id: actualClientId,
        p_phase: phase,
        p_phase_label: phaseLabel || phase,
        p_notes: notes || null,
      });
      data = result.data;
      rpcError = result.error;

      // Sincroniza diretamente client_portal_users para leitura imediata
      await supabase
        .from('client_portal_users')
        .update({
          project_phase: phase,
          project_phase_label: phaseLabel || phase,
        })
        .eq('id', actualClientId);
    }

    if (clientUser?.cpf) {
      await supabase
        .from('client_portal_users')
        .update({
          project_phase: phase,
          project_phase_label: phaseLabel || phase,
        })
        .eq('cpf', clientUser.cpf);
    }

    if (rpcError) {
      console.warn('[TRACKING] RPC set_client_tracking_phase avisou:', rpcError.message);
    }

    // Emite evento Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.emit('tracking:updated', {
        clientId: actualClientId || clientId,
        phase,
        phaseLabel: phaseLabel || phase,
      });
    }

    return res.json({
      success: true,
      message: 'Etapa atualizada com sucesso',
      tracking: data || {
        client_id: actualClientId || clientId,
        phase,
        phase_label: phaseLabel || phase,
        is_current: true,
        notes: notes || null,
      },
    });
  } catch (err) {
    console.error('[TRACKING] Erro inesperado em set-phase:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

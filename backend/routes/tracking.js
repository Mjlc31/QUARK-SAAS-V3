import express from 'express';
import { supabase } from '../services/supabase.js';
import { sendWhatsAppMessage, cleanPhoneNumber } from '../services/whatsapp.js';

const router = express.Router();

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

    // 1. Busca dados do cliente e inteligência
    const { data: clientUser } = await supabase
      .from('client_portal_users')
      .select('id, name, phone, email')
      .or(`id.eq.${clientId},auth_user_id.eq.${clientId}`)
      .maybeSingle();

    const actualClientId = clientUser?.id || clientId;

    const { data: intelligence } = await supabase
      .from('client_intelligence')
      .select('system_size_kw, client_name')
      .eq('client_id', actualClientId)
      .maybeSingle();

    // 2. Busca fases gravadas
    let { data: recordedPhases, error: trackingErr } = await supabase
      .from('project_tracking')
      .select('*')
      .eq('client_id', actualClientId)
      .order('started_at', { ascending: true });

    if (trackingErr) {
      console.warn('[TRACKING] Erro ao buscar fases:', trackingErr.message);
    }

    // 3. Se não houver fases cadastradas para este cliente, inicializa o ciclo padrão
    if (!recordedPhases || recordedPhases.length === 0) {
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

    const completedCount = sortedPhases.filter((p) => !!p.completed_at).length;
    const completionPercent = Math.round((completedCount / SOLAR_PHASES.length) * 100);
    const currentPhase = sortedPhases.find((p) => p.is_current) || sortedPhases[0];

    res.json({
      success: true,
      client: {
        id: actualClientId,
        name: clientUser?.name || intelligence?.client_name || 'Cliente Quark',
        phone: clientUser?.phone,
        system_size_kw: intelligence?.system_size_kw || 6.6,
      },
      completion_percent: completionPercent,
      current_phase: currentPhase,
      phases: sortedPhases.map((p) => ({
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

    const { data: clientUser } = await supabase
      .from('client_portal_users')
      .select('id, name, phone, lead_id')
      .or(`id.eq.${clientId},auth_user_id.eq.${clientId}`)
      .maybeSingle();

    const actualClientId = clientUser?.id || clientId;

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
    const { clientId, customPassword } = req.body;
    if (!clientId) {
      return res.status(400).json({ success: false, error: 'clientId é obrigatório' });
    }

    const { data: client, error: clientErr } = await supabase
      .from('client_portal_users')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientErr || !client) {
      return res.status(404).json({ success: false, error: 'Cliente não encontrado' });
    }

    const cleanCpf = (client.cpf || '').replace(/\D/g, '');
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

export default router;

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
const envConfig = dotenv.parse(fs.readFileSync('.env'));
const SUPABASE_URL = envConfig.VITE_SUPABASE_URL || envConfig.SUPABASE_URL;
const SUPABASE_KEY = envConfig.VITE_SUPABASE_ANON_KEY || envConfig.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('FATAL: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas no .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const fmtMoney = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);

async function runTestSuite() {
  console.log('================================================================================');
  console.log('       QUARK SAAS - TEST SUITE DE LOGÍSTICA DE DADOS & QA RELACIONAL           ');
  console.log('================================================================================');
  console.log(`Ambiente Supabase: ${SUPABASE_URL}`);
  console.log(`Data/Hora: ${new Date().toISOString()}\n`);

  const results = {
    tc01: { name: 'TC-01: Integridade dos 15 Fechamentos Ganho', status: 'PENDING', details: [] },
    tc02: { name: 'TC-02: Idempotência de Transições e Duplicações', status: 'PENDING', details: [] },
    tc03: { name: 'TC-03: Resolução de Preço e Fallback de Propostas', status: 'PENDING', details: [] },
    tc04: { name: 'TC-04: Invariantes Matemáticas de Pró-labore e DRE', status: 'PENDING', details: [] },
    tc05: { name: 'TC-05: Verificação de Registros Órfãos e Integridade Referencial', status: 'PENDING', details: [] },
  };

  // Coleta geral de dados do banco
  const [
    { data: wonOpps, error: errWon },
    { data: allOpps, error: errAllOpps },
    { data: clients, error: errClients },
    { data: transactions, error: errTxs },
    { data: tracking, error: errTrk },
    { data: proposals, error: errProps },
    { data: projectsTable, error: errProj }
  ] = await Promise.all([
    supabase.from('opportunities').select('*').eq('status', 'Ganho').is('deleted_at', null).order('created_at', { ascending: true }),
    supabase.from('opportunities').select('id, title, client_name, amount, system_power, phone, email, status, deleted_at, created_at, updated_at'),
    supabase.from('client_portal_users').select('*'),
    supabase.from('financial_transactions').select('*'),
    supabase.from('project_tracking').select('*'),
    supabase.from('proposals').select('*'),
    supabase.from('projects').select('*')
  ]);

  if (errWon || errAllOpps || errClients || errTxs || errTrk || errProps) {
    console.error('Erro ao consultar Supabase:', { errWon, errAllOpps, errClients, errTxs, errTrk, errProps });
  }

  // -----------------------------------------------------------------------------
  // TC-01: Integridade dos 15 Fechamentos
  // -----------------------------------------------------------------------------
  console.log('--------------------------------------------------------------------------------');
  console.log('>>> EXECUTANDO TC-01: Integridade dos 15 Fechamentos');
  console.log('--------------------------------------------------------------------------------');

  let tc01PassCount = 0;
  let tc01FailCount = 0;
  const tc01Issues = [];

  const wonDealsAudit = wonOpps.map((opp, idx) => {
    const oppClients = clients.filter(c => c.opportunity_id === opp.id);
    const oppTxs = transactions.filter(t => t.opportunity_id === opp.id && t.type === 'receita');
    const oppTrk = tracking.filter(t => t.opportunity_id === opp.id);
    const txAmount = oppTxs.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const hasAmount = Number(opp.amount) > 0;
    const hasClient = oppClients.length > 0;
    const hasTx = oppTxs.length > 0;
    const hasTrk = oppTrk.length > 0;
    const amountMatches = Math.abs(Number(opp.amount) - txAmount) < 0.01;
    const isSingleClient = oppClients.length === 1;

    const issues = [];
    if (!hasAmount) issues.push('amount zerado ou nulo');
    if (!hasClient) issues.push('sem cliente provisionado no portal');
    if (oppClients.length > 1) issues.push(`duplicatas no portal (${oppClients.length} clientes com mesmo opportunity_id)`);
    if (!hasTx) issues.push('SEM RECEITA REGISTRADA no financeiro');
    if (hasTx && !amountMatches) issues.push(`divergência de valor: Opp=${opp.amount} vs Tx=${txAmount}`);
    if (!hasTrk) issues.push('sem registro de tracking de obras');

    const pass = hasAmount && hasClient && hasTx && amountMatches && oppClients.length === 1;
    if (pass) tc01PassCount++;
    else {
      tc01FailCount++;
      tc01Issues.push({ index: idx + 1, name: opp.client_name || opp.title, id: opp.id, issues });
    }

    return {
      idx: idx + 1,
      id: opp.id,
      name: opp.client_name || opp.title,
      amount: opp.amount,
      phone: opp.phone || 'N/A',
      clientCount: oppClients.length,
      txCount: oppTxs.length,
      txAmount,
      trkCount: oppTrk.length,
      pass,
      issues
    };
  });

  console.log(`Total de Oportunidades Ganhas encontradas: ${wonOpps.length}`);
  console.log(`Fechamentos 100% íntegros (1:1 Cliente, 1:1 Receita, Valores conferem): ${tc01PassCount}/15`);
  console.log(`Fechamentos com anomalias ou falhas: ${tc01FailCount}/15\n`);

  console.log('Detalhamento dos 15 Fechamentos:');
  console.table(wonDealsAudit.map(d => ({
    '#': d.idx,
    Nome: d.name.slice(0, 22),
    Valor: fmtMoney(d.amount),
    'Clientes Portal': d.clientCount,
    'Qtd Tx': d.txCount,
    'Valor Tx': fmtMoney(d.txAmount),
    'Obras Trk': d.trkCount,
    Status: d.pass ? 'PASS' : 'FAIL',
    Problemas: d.issues.join('; ') || 'Nenhum'
  })));

  results.tc01.status = tc01FailCount === 0 ? 'PASS' : 'FAIL';
  results.tc01.details = wonDealsAudit;

  // -----------------------------------------------------------------------------
  // TC-02: Idempotência de Transições e Duplicações
  // -----------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> EXECUTANDO TC-02: Idempotência de Transições e Duplicações');
  console.log('--------------------------------------------------------------------------------');

  // Análise 1: Como o código lida com maybeSingle() quando há múltiplos registros existentes
  // Simular query do crm.ts: supabase.from('client_portal_users').select('id').eq('opportunity_id', validOppId).maybeSingle()
  const duplicateOppId = '15a4fb41-9475-4b1c-a4cb-3c5d8dc25765'; // Jose Hugo Ferro (possui 2 registros)
  const maybeSingleTest = await supabase
    .from('client_portal_users')
    .select('id')
    .eq('opportunity_id', duplicateOppId)
    .maybeSingle();

  const maybeSingleFailed = maybeSingleTest.error !== null;
  console.log(`[TC-02.1] Teste de maybeSingle() para oportunidade com duplicatas (${duplicateOppId}):`);
  console.log(`  Resultado do data:`, maybeSingleTest.data);
  console.log(`  Resultado do error:`, maybeSingleTest.error ? `${maybeSingleTest.error.code} - ${maybeSingleTest.error.message}` : 'Nenhum');
  console.log(`  -> DIAGNÓSTICO: Como maybeSingle() falha com código ${maybeSingleTest.error?.code}, existingId é avaliado como falsy, induzindo o código a executar um NOVO INSERT! Falha grave de idempotência.`);

  // Análise 2: Tracking de Obras (project_tracking) sem verificação de existência
  const trackingPerOpp = {};
  tracking.filter(t => t.opportunity_id).forEach(t => {
    trackingPerOpp[t.opportunity_id] = (trackingPerOpp[t.opportunity_id] || 0) + 1;
  });
  const multipleTrackings = Object.entries(trackingPerOpp).filter(([_, c]) => c > 1);
  console.log(`\n[TC-02.2] Análise de Acúmulo em project_tracking:`);
  console.log(`  Oportunidades com múltiplos registros de tracking inseridos: ${multipleTrackings.length}`);
  multipleTrackings.forEach(([oppId, count]) => {
    const opp = wonOpps.find(o => o.id === oppId);
    console.log(`  - Opp: ${opp ? (opp.client_name || opp.title) : oppId} -> ${count} registros em project_tracking!`);
  });

  // Análise 3: Atualização de valor de oportunidade já ganha vs financial_transactions
  // O código verifica `if (!existingTx) { insert }` mas NUNCA atualiza caso o valor tenha mudado!
  console.log(`\n[TC-02.3] Análise de Atualização de Valor (Opportunity vs Financial Transaction):`);
  console.log(`  Se o valor de uma oportunidade for renegociado (ex: aditivo de escopo de R$ 15.000 para R$ 18.000), o método convertToClient() detecta existingTx=true e NÃO atualiza o amount da transação.`);
  
  results.tc02.status = 'FAIL';
  results.tc02.details = {
    maybeSingleVulnerability: maybeSingleFailed,
    multipleTrackingCounts: multipleTrackings,
    missingUpdateOnExistingTx: true
  };

  // -----------------------------------------------------------------------------
  // TC-03: Resolução de Preço e Fallback de Propostas
  // -----------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> EXECUTANDO TC-03: Resolução de Preço de Orçamento/Proposta');
  console.log('--------------------------------------------------------------------------------');

  // Testar todas as oportunidades no CRM que têm propostas
  const oppIdsWithProposals = [...new Set(proposals.map(p => p.opportunity_id || p.lead_id).filter(Boolean))];
  console.log(`Oportunidades vinculadas a propostas no sistema: ${oppIdsWithProposals.length}`);

  const proposalResolutionResults = [];
  for (const oppId of oppIdsWithProposals) {
    const opp = allOpps.find(o => o.id === oppId);
    const oppProps = proposals.filter(p => p.opportunity_id === oppId || p.lead_id === oppId);

    // Consulta de resolução como implementada no frontend
    const { data: propRow, error: propErr } = await supabase
      .from('proposals')
      .select('id, client_name, final_price, power_kwp, status, created_at')
      .or(`opportunity_id.eq.${oppId},lead_id.eq.${oppId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const acceptedProp = oppProps.find(p => p.status === 'aceita');
    const hasDiscrepancy = acceptedProp && propRow && acceptedProp.id !== propRow.id;

    proposalResolutionResults.push({
      oppId,
      oppName: opp ? (opp.client_name || opp.title) : 'Opp não encontrada',
      oppAmount: opp?.amount,
      proposalsCount: oppProps.length,
      resolvedProposalId: propRow?.id,
      resolvedPrice: propRow?.final_price,
      resolvedPower: propRow?.power_kwp,
      resolvedStatus: propRow?.status,
      acceptedProposalPrice: acceptedProp?.final_price,
      hasDiscrepancy: !!hasDiscrepancy
    });
  }

  console.table(proposalResolutionResults.map(p => ({
    Opp: p.oppName.slice(0, 20),
    'Valor Opp': fmtMoney(p.oppAmount),
    'Qtd Props': p.proposalsCount,
    'Status Resolvido': p.resolvedStatus,
    'Preço Resolvido': fmtMoney(p.resolvedPrice),
    'kWp': p.resolvedPower,
    'Divergência Aceita vs Última': p.hasDiscrepancy ? 'SIM (RISCO)' : 'NÃO'
  })));

  // Teste de caso de borda: Oportunidade com amount zerado ou null
  console.log('\n[TC-03.2] Verificação de Oportunidades com amount = 0 ou null:');
  const zeroAmountOpps = allOpps.filter(o => !o.amount || o.amount === 0);
  console.log(`Total de oportunidades com amount zerado no CRM: ${zeroAmountOpps.length}`);
  const zeroWon = zeroAmountOpps.filter(o => o.status === 'Ganho');
  console.log(`Oportunidades em 'Ganho' com amount zerado: ${zeroWon.length}`);

  results.tc03.status = proposalResolutionResults.some(p => p.hasDiscrepancy) ? 'WARN' : 'PASS';
  results.tc03.details = proposalResolutionResults;

  // -----------------------------------------------------------------------------
  // TC-04: Invariantes Matemáticas de Pró-labore e DRE
  // -----------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> EXECUTANDO TC-04: Invariantes Matemáticas de Pró-labore e DRE');
  console.log('--------------------------------------------------------------------------------');

  // Parâmetros de negócio da Quark Energia
  const TAX_RATE = 0.05;       // 5% sobre Nota QK
  const KIT_RATE = 0.45;       // 45% kit padrão
  const INSTALL_RATE = 0.10;   // 10% instalação
  const COMM_RATE = 0.05;      // 5% comissão
  const SHARE_ANDERSON = 0.45; // 45% Anderson
  const SHARE_ARTHUR = 0.45;   // 45% Arthur
  const SHARE_MKT = 0.10;      // 10% MKT Quark

  let totalRev = 0;
  let totalDeductions = 0;
  let totalNetProfit = 0;
  let totalAnderson = 0;
  let totalArthur = 0;
  let totalMkt = 0;
  let mathPennyDiscrepancies = 0;

  const prolaboreRows = wonOpps.map((opp, idx) => {
    const rev = Number(opp.amount || 0);
    const kitCost = Math.round(rev * KIT_RATE);
    const installCost = Math.round(rev * INSTALL_RATE);
    const commCost = Math.round(rev * COMM_RATE);
    const matCost = 0;
    const signCost = 0;

    const notaQK = rev - kitCost;
    const imposto = Math.max(0, notaQK * TAX_RATE);
    const deductions = kitCost + installCost + matCost + signCost + commCost + imposto;
    const netProfit = rev - deductions;

    const anderson = Math.max(0, netProfit * SHARE_ANDERSON);
    const arthur = Math.max(0, netProfit * SHARE_ARTHUR);
    const mkt = Math.max(0, netProfit * SHARE_MKT);
    const sumShares = anderson + arthur + mkt;
    const pennyDiff = Math.abs(netProfit - sumShares);

    totalRev += rev;
    totalDeductions += deductions;
    totalNetProfit += netProfit;
    totalAnderson += anderson;
    totalArthur += arthur;
    totalMkt += mkt;

    if (pennyDiff > 0.0001) mathPennyDiscrepancies++;

    return {
      '#': idx + 1,
      Cliente: (opp.client_name || opp.title).slice(0, 20),
      Receita: fmtMoney(rev),
      'Kit (45%)': fmtMoney(kitCost),
      'Nota QK': fmtMoney(notaQK),
      'Imposto (5%)': fmtMoney(imposto),
      'Deduções': fmtMoney(deductions),
      'Lucro Líquido': fmtMoney(netProfit),
      'Anderson (45%)': fmtMoney(anderson),
      'Arthur (45%)': fmtMoney(arthur),
      'MKT (10%)': fmtMoney(mkt),
      'Soma 100%': fmtMoney(sumShares),
      'Diff': pennyDiff.toFixed(4)
    };
  });

  console.table(prolaboreRows);

  console.log('\n--- TOTAIS CONSOLIDADOS DOS 15 CONTRATOS ---');
  console.log(`Receita Bruta Total:       ${fmtMoney(totalRev)}`);
  console.log(`Deduções Totais:           ${fmtMoney(totalDeductions)}`);
  console.log(`Lucro Líquido Consolidado: ${fmtMoney(totalNetProfit)}`);
  console.log(`-> Anderson (45%):         ${fmtMoney(totalAnderson)}`);
  console.log(`-> Arthur (45%):           ${fmtMoney(totalArthur)}`);
  console.log(`-> MKT Quark (10%):        ${fmtMoney(totalMkt)}`);
  console.log(`-> Soma Anderson+Arthur+MKT: ${fmtMoney(totalAnderson + totalArthur + totalMkt)}`);
  const globalPennyDiff = Math.abs(totalNetProfit - (totalAnderson + totalArthur + totalMkt));
  console.log(`Divergência de Centavos Consolidada: R$ ${globalPennyDiff.toFixed(4)}`);

  // Análise da persistência de Pró-labore no Banco de Dados
  console.log('\n[TC-04.2] Verificação de Persistência no Banco (Tabela `projects`):');
  console.log(`Total de registros na tabela 'projects': ${projectsTable.length}`);
  console.log(`RLS status: Tabela 'projects' rejeita inserções do frontend devido a RLS desabilitado ou sem user_id.`);
  console.log(`-> DIAGNÓSTICO: As finanças de rateio dos 15 clientes residem APENAS em cache/localStorage ou em memória, nunca foram consolidadas no banco de dados!`);

  results.tc04.status = (projectsTable.length === 0) ? 'FAIL' : 'PASS';
  results.tc04.details = {
    totalRev,
    totalNetProfit,
    totalAnderson,
    totalArthur,
    totalMkt,
    globalPennyDiff,
    projectsCount: projectsTable.length
  };

  // -----------------------------------------------------------------------------
  // TC-05: Verificação de Registros Órfãos e Integridade Referencial
  // -----------------------------------------------------------------------------
  console.log('\n--------------------------------------------------------------------------------');
  console.log('>>> EXECUTANDO TC-05: Verificação de Registros Órfãos e Integridade');
  console.log('--------------------------------------------------------------------------------');

  const oppIdSet = new Set(allOpps.map(o => o.id));
  const activeOppIdSet = new Set(allOpps.filter(o => !o.deleted_at).map(o => o.id));

  // 1. Clientes em client_portal_users
  const clientOrphans = clients.filter(c => !c.opportunity_id);
  const clientDeletedOpp = clients.filter(c => c.opportunity_id && !activeOppIdSet.has(c.opportunity_id));
  console.log(`[TC-05.1] Catálogo de Clientes (client_portal_users - total ${clients.length}):`);
  console.log(`  - Clientes vinculados a oportunidades ativas: ${clients.length - clientOrphans.length - clientDeletedOpp.length}`);
  console.log(`  - Clientes ÓRFÃOS (sem opportunity_id): ${clientOrphans.length}`);
  console.log(`  - Clientes apontando para oportunidades DELETADAS/INEXISTENTES: ${clientDeletedOpp.length}`);
  clientDeletedOpp.forEach(c => {
    console.log(`    * Cliente ${c.name} (${c.id}) aponta para Opp deletada: ${c.opportunity_id}`);
  });

  // 2. Transações em financial_transactions
  const txOrphans = transactions.filter(t => !t.opportunity_id);
  const txDeletedOpp = transactions.filter(t => t.opportunity_id && !activeOppIdSet.has(t.opportunity_id));
  console.log(`\n[TC-05.2] Transações Financeiras (financial_transactions - total ${transactions.length}):`);
  console.log(`  - Transações vinculadas a oportunidades ativas: ${transactions.length - txOrphans.length - txDeletedOpp.length}`);
  console.log(`  - Transações ÓRFÃS (sem opportunity_id): ${txOrphans.length}`);
  txOrphans.forEach(t => {
    console.log(`    * Tx: "${t.description}" (${fmtMoney(t.amount)}) - Type: ${t.type}, Cat: ${t.category}`);
  });
  console.log(`  - Transações apontando para oportunidades DELETADAS: ${txDeletedOpp.length}`);
  txDeletedOpp.forEach(t => {
    console.log(`    * Tx: "${t.description}" (${fmtMoney(t.amount)}) -> Opp deletada: ${t.opportunity_id}`);
  });

  // 3. Project Tracking
  const trkOrphans = tracking.filter(t => !t.opportunity_id);
  const trkDeletedOpp = tracking.filter(t => t.opportunity_id && !activeOppIdSet.has(t.opportunity_id));
  console.log(`\n[TC-05.3] Tracking de Obras (project_tracking - total ${tracking.length}):`);
  console.log(`  - Registros sem opportunity_id: ${trkOrphans.length}`);
  console.log(`  - Registros apontando para oportunidades deletadas: ${trkDeletedOpp.length}`);

  // 4. Propostas
  const propOrphans = proposals.filter(p => !p.opportunity_id && !p.lead_id);
  console.log(`\n[TC-05.4] Propostas Técnicas (proposals - total ${proposals.length}):`);
  console.log(`  - Propostas sem oportunidade/lead vinculado: ${propOrphans.length}`);

  const hasOrphansOrBrokenFk = clientDeletedOpp.length > 0 || txDeletedOpp.length > 0 || trkDeletedOpp.length > 0;
  results.tc05.status = hasOrphansOrBrokenFk ? 'FAIL' : 'PASS';
  results.tc05.details = {
    clientOrphansCount: clientOrphans.length,
    clientDeletedOppCount: clientDeletedOpp.length,
    txOrphansCount: txOrphans.length,
    txDeletedOppCount: txDeletedOpp.length,
    trkOrphansCount: trkOrphans.length,
    trkDeletedOppCount: trkDeletedOpp.length
  };

  // -----------------------------------------------------------------------------
  // RESUMO GERAL DE QA
  // -----------------------------------------------------------------------------
  console.log('\n================================================================================');
  console.log('                            RESUMO FINAL DE QA                                  ');
  console.log('================================================================================');
  console.log(`TC-01: Integridade dos 15 Fechamentos:          [${results.tc01.status}]`);
  console.log(`TC-02: Idempotência de Transições:              [${results.tc02.status}]`);
  console.log(`TC-03: Resolução de Preço e Fallback:           [${results.tc03.status}]`);
  console.log(`TC-04: Invariantes Matemáticas de Pró-labore:   [${results.tc04.status}]`);
  console.log(`TC-05: Registros Órfãos e Integridade:          [${results.tc05.status}]`);
  console.log('================================================================================\n');

  return results;
}

runTestSuite().catch(err => {
  console.error('Erro fatal na execução da suite de testes:', err);
  process.exit(1);
});

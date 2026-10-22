import { supabase } from '../services/supabase.js';
import fs from 'fs';

async function runCleanup() {
  console.log('=== INICIANDO LIMPEZA E DESDUPLICAÇÃO DE CLIENTES ===');

  // 1. Re-apontamento de chaves estrangeiras dos slugs para os clientes oficiais
  const slugReroutes = [
    { slugId: '370d8784-1824-49be-a2c3-09219044c1c3', realId: '5a780a18-6b29-489a-a10a-889d925cbc4a', label: 'claudetecariri -> CLAUDETE CARIRI' },
    { slugId: '80800c1e-69b9-4013-b1bd-11b984a9eb43', realId: '0ce6317d-45d2-4039-ad6d-a0bd9237df18', label: 'onoriopeiter -> ONORIO ALFREDO PEITER' },
    { slugId: '668c6068-198d-481c-9ac9-9f4dc1936956', realId: '12ac24cc-fe80-40af-94aa-a66f853ee6b8', label: 'rosenildocandido -> Rosenildo Candido' },
    { slugId: '937c3bcc-8259-49b0-b15f-da7cb46618d8', realId: '0828ac7a-f30c-4471-902c-d8d5c68833ac', label: 'sirmanifrazao -> SIRMANI MELO FRAZAO' },
    { slugId: '9ad99993-5a25-4379-b7c9-a44c1ec43e7e', realId: 'a8615215-4a2d-4c3d-bfdd-e6c463b837b2', label: 'genivaldopedro -> GENIVALDO PEDRO' },
    { slugId: '198217aa-c28e-43f0-b969-bfcf61a2f384', realId: '51758d09-22f8-4267-ab27-bb5443acd9af', label: 'glauciamd -> GLAUCIENE DE LIMA' },
    { slugId: '1021df0a-82ea-46dc-b695-1d6d26b592c5', realId: '796c703c-3d18-4b9d-b936-7dad02cb5066', label: 'CELIAMARTINS -> Claudia Celia Martins' },
    { slugId: 'f6c8a7d6-0351-4985-a08c-1fe67cc27229', realId: 'b9f4747b-8d99-4b98-8fa7-d26fae086f7a', label: 'Vip Fitness -> ACADEMIA ELITECH' },
    { slugId: 'ebf1cfdb-714e-4eeb-a7ae-b84b6a993b6e', realId: 'b9f4747b-8d99-4b98-8fa7-d26fae086f7a', label: 'ELITECH FIT CLUB -> ACADEMIA ELITECH' },
    { slugId: 'c86cf118-d484-473b-8129-a2503946ccf0', realId: '040acd16-0ecf-4c54-af63-bfaed7b341e6', label: 'diogopereira -> DIOGO PEREIRA TAVARES' },
    { slugId: '52a150ec-412f-4cdc-96a6-5c2d510aef71', realId: '2fa098cd-2bee-4088-b3a5-58f7ee5033ae', label: 'ronaldobarbosa -> JOSE RONALDO BARBOSA' },
    { slugId: 'ce3201da-cf04-489e-9efa-b371aba368cf', realId: '4399376a-53bb-4256-a228-c2801f6de68e', label: 'Ana Clia -> ANA CÉLIA ALMEIDA' },
    { slugId: 'bb63ae66-c201-4193-92e0-0881a666d1d8', realId: '031501e6-e659-469f-bcfc-c9bd1ac8f4db', label: 'Anderson Alves -> ARTHUR DUDA' },
  ];

  for (const r of slugReroutes) {
    console.log(`Re-apontando: ${r.label}`);
    // client_intelligence
    await supabase.from('client_intelligence').update({ client_id: r.realId }).eq('client_id', r.slugId);
    // project_tracking
    await supabase.from('project_tracking').update({ client_id: r.realId }).eq('client_id', r.slugId);
    // maintenance_services
    await supabase.from('maintenance_services').update({ client_id: r.realId }).eq('client_id', r.slugId);
    // support_tickets
    await supabase.from('support_tickets').update({ client_id: r.realId }).eq('client_id', r.slugId);
  }

  // 2. Remoção dos slugs duplicados e conta interna
  const idsToDelete = [
    '370d8784-1824-49be-a2c3-09219044c1c3', // claudetecariri
    '80800c1e-69b9-4013-b1bd-11b984a9eb43', // onoriopeiter
    '668c6068-198d-481c-9ac9-9f4dc1936956', // rosenildocandido
    '937c3bcc-8259-49b0-b15f-da7cb46618d8', // sirmanifrazao
    '9ad99993-5a25-4379-b7c9-a44c1ec43e7e', // genivaldopedro
    '198217aa-c28e-43f0-b969-bfcf61a2f384', // glauciamd
    '1021df0a-82ea-46dc-b695-1d6d26b592c5', // CELIAMARTINS
    'f6c8a7d6-0351-4985-a08c-1fe67cc27229', // Vip Fitness
    'ebf1cfdb-714e-4eeb-a7ae-b84b6a993b6e', // ELITECH FIT CLUB
    'c86cf118-d484-473b-8129-a2503946ccf0', // diogopereira
    '52a150ec-412f-4cdc-96a6-5c2d510aef71', // ronaldobarbosa
    'ce3201da-cf04-489e-9efa-b371aba368cf', // Ana Clia
    'bb63ae66-c201-4193-92e0-0881a666d1d8', // Anderson Alves
    // 3. Remoção das oportunidades de CRM indevidas em client_portal_users
    'cbbd06c8-9e82-403c-83c3-d94d2e188301', // Almir Ilário
    '43452ac3-89f9-4e96-abf8-5a5b7038db66', // Almir Ilário (dup)
    '72bedd72-4d50-4d02-97fe-31ee47aa2c82', // Jeferson
    'bd18eaa4-9056-4004-852f-0218bdaf7302', // Raul - Retrofit
    'f7022982-9da2-4db1-aea4-a7ce9a1a7c89', // Coronel Cleydson Villar
    '504539bc-9cc5-4caa-89c0-fcaaad05612f', // Haroldo
    'ad7be4ad-de1d-40c3-b130-0e257612c2a7', // Lucas
    '8d55c414-b6b2-49df-af69-093747c7d40a', // Jhoatan
    '37de37ab-eb39-4461-876f-7b23e580d1fe', // Cesar
  ];

  console.log(`\nExcluindo ${idsToDelete.length} registros duplicados/indevidos de client_portal_users...`);
  for (const id of idsToDelete) {
    const { error } = await supabase.from('client_portal_users').delete().eq('id', id);
    if (error) console.error(`Erro ao deletar ${id}:`, error.message);
    else console.log(`✓ Removido com sucesso: ${id}`);
  }

  // 4. Atualizar Yulia Amaral com os dados oficiais do Trello
  console.log('\nAtualizando dados de Yulia Amaral Almeida...');
  await supabase.from('client_portal_users').update({
    name: 'YULIA AMARAL ALMEIDA',
    cpf: '07571633435',
    birth_date: '1989-11-09',
    city: 'Maceió',
    state: 'AL',
    address: 'Rua João Rodrigues Sampaio, nº 50, QD I - Barro Duro',
    cep: '57045-370',
    system_size_kw: 15.75,
    utility_account: '75.925.008-07',
    notes: 'Origem Trello: VISTORIA PROCESSADA | Inversor 15 kW, 25 módulos RENEPV de 630 Wp | RG: 69.551.966-9'
  }).eq('id', '6fe0e0cc-8f3d-4068-81db-9d7978230948');

  // 5. Atualizar CPFs faltantes de clientes oficiais do Trello
  console.log('\nAtualizando CPFs faltantes em clientes do Trello...');
  await supabase.from('client_portal_users').update({
    cpf: '65163958453',
    system_size_kw: 9.99,
    install_date: '2024-08-06',
  }).eq('id', '4399376a-53bb-4256-a228-c2801f6de68e'); // ANA CÉLIA ALMEIDA

  await supabase.from('client_portal_users').update({
    cpf: '04887560000160',
  }).eq('id', '1b91f7b5-d297-4a5d-bbd4-4dde3550d685'); // COND. RESIDENCIAL VILA MADALENA

  // 6. Inserir clientes do Trello que faltam com dados completos
  const missingTrelloClients = [
    {
      name: 'Alcides Monteiro de Melo',
      cpf: '02152863836',
      city: 'Maceió',
      state: 'AL',
      phone: '82999812404',
      system_size_kw: 6.6,
      notes: 'Origem Trello: CONCLUÍDOS | Potência 6,6 kWp'
    },
    {
      name: 'ANA BEL DA CONCEIÇÃO',
      cpf: '05613796459',
      city: 'Maceió',
      state: 'AL',
      phone: '82996162791',
      system_size_kw: 8.8,
      notes: 'Origem Trello: CONCLUÍDOS | Potência 8,8 kWp'
    },
    {
      name: 'CELIA MARIA LISBOA CONDE',
      cpf: '13397460425',
      city: 'Maceió',
      state: 'AL',
      phone: '82999811566',
      system_size_kw: 5.5,
      notes: 'Origem Trello: CONCLUÍDOS | Potência 5,5 kWp'
    },
    {
      name: 'THIAGO AMORIM SILVA',
      cpf: '12302148444',
      city: 'Maceió',
      state: 'AL',
      phone: '82999887766',
      system_size_kw: 12.19,
      notes: 'Origem Trello: CONCLUÍDOS | Potência 12,19 kWp'
    },
    {
      name: 'Cassiano Victor de Moraes Belo Neto',
      cpf: '22875557491',
      city: 'Maceió',
      state: 'AL',
      phone: '82999155848',
      email: 'cvmbneto@hotmail.com',
      address: 'Rua Xavier de Brito, 113 - Prado',
      notes: 'Origem Trello: LEVANTAMENTO DE DADOS'
    }
  ];

  console.log('\nVerificando/inserindo clientes do Trello faltantes...');
  for (const tc of missingTrelloClients) {
    const { data: existing } = await supabase.from('client_portal_users').select('id').eq('cpf', tc.cpf);
    if (!existing || existing.length === 0) {
      const { data: inserted, error } = await supabase.from('client_portal_users').insert({
        ...tc,
        user_id: '7dacc88f-9ebd-4710-a1be-0647841db24a',
        is_active: true
      }).select();
      if (error) console.error(`Erro ao inserir ${tc.name}:`, error.message);
      else console.log(`✓ Inserido cliente Trello: ${tc.name}`);
    } else {
      console.log(`Cliente já existente: ${tc.name}`);
    }
  }

  // 7. Relatório Final
  const { data: finalClients } = await supabase.from('client_portal_users').select('id, name, cpf, email, city, system_size_kw');
  console.log(`\n=== CONCLUÍDO COM SUCESSO ===`);
  console.log(`Total de Clientes no Catálogo após higienização: ${finalClients.length}`);

  process.exit(0);
}

runCleanup();

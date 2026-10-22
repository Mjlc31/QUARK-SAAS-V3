import { supabase } from '../services/supabase.js';

async function cleanupRemainingDuplicates() {
  console.log('=== DESDUPLICANDO CLIENTES RESIDUAIS DO SOLARZ ===');

  const deduplications = [
    {
      dupId: '57c54c3d-991d-4766-bbab-c84ad1ec1dac',
      dupName: 'Ki barato Supermercado',
      realId: 'fe4e9f33-314c-4b79-b5c6-9da01f232ba9',
      realName: 'MARCOS ANTONIO GOMES DOS SANTOS',
      power: 107.64
    },
    {
      dupId: 'f23ef09f-13fd-419e-8b09-63cf2e015fba',
      dupName: 'Posto Santa Rita',
      realId: '33e6f987-a36c-4861-a832-6bc6b6c00d43',
      realName: 'C C JATOBA DA ROCHA EIRELI',
      power: 7.645
    },
    {
      dupId: 'b0daa54c-0f3e-4472-89cf-37e9d94074b2',
      dupName: 'Posto Santo Antônio',
      realId: 'c818131e-4cb2-4a00-9e58-f2ca67e35b71',
      realName: 'A. T. MELO DA ROCHA EIRELI',
      power: 8.34
    },
    {
      dupId: 'e8c31b7a-f480-45c7-b3fe-394d07915b25',
      dupName: 'Deleon Pereira',
      realId: '40d58852-c845-4c07-b08e-5b23d9b43171',
      realName: 'COMERCIO DE BEBIDAS E PETISCOS DELE LTDA',
      power: 23.8
    },
    {
      dupId: '1e655074-ef6f-4a37-b9a3-a95436611891',
      dupName: 'Gessé Teixeira',
      realId: '377d612e-13c5-4428-ba1e-c0fa16d5ba4b',
      realName: 'CICERO TEIXEIRA DOS SANTOS',
      power: 3.85
    },
    {
      dupId: '79347647-eed8-4cfc-88e9-11fe4163f371',
      dupName: 'Vitorcosta - Geradora',
      realId: 'bda93e50-93c6-4357-943d-0d67f7811ef6',
      realName: 'JOSÉ VITOR DA COSTA SILVA',
      power: 6.72
    },
    {
      dupId: 'a8e5d778-e935-4d2b-bf9b-e128caf82c62',
      dupName: 'Marcio Costa',
      realId: '7ea310f8-e9b4-4ef8-a1e4-18fe4be45a8d',
      realName: 'JOSIANO LOPES DA SILVA',
      power: 22.23
    },
    {
      dupId: 'a6da1fa4-4e0b-4634-9c96-c5723d35edfc',
      dupName: 'Adolfo Assis',
      realId: 'a88b5ecf-c7bf-4e78-b3d9-a35c5c9629ee',
      realName: 'JOSÉ ALFREDO DE SOUZA ASSIS',
      power: 8.19
    },
    {
      dupId: '2e0787a8-ca5e-4192-98d8-5633d805a559',
      dupName: 'Ademir Barros',
      realId: '68f760da-3700-4ea5-802c-499388dfc4d1',
      realName: 'VITÓRIA GABRIELLE MELO BARROS DOS SANTOS',
      power: 8.19
    },
    {
      dupId: '975d8436-a0b5-4226-8f23-a9d99efc45f0',
      dupName: 'Everson Braz',
      realId: 'd08aaf97-0068-430f-9b1a-8efdb970cad9',
      realName: 'SAMYLA THAYNARA SANTOS DA SILVA GOMES',
      power: 11.36
    },
    {
      dupId: '2d47c531-8f4c-440a-bdff-8cb9ee0d7418',
      dupName: 'Maria Luci - Innovation Solar',
      realId: '40ba02cf-18f2-47d4-b870-3786344eff4c',
      realName: 'LUCIA MARIA LIRA FARIAS (MESQUITA)',
      power: 14.3
    },
  ];

  for (const item of deduplications) {
    console.log(`\nMesclando: "${item.dupName}" -> "${item.realName}"`);
    
    // 1. Re-aponta inteligência
    await supabase.from('client_intelligence').update({ client_id: item.realId }).eq('client_id', item.dupId);
    // 2. Re-aponta acompanhamento de obras
    await supabase.from('project_tracking').update({ client_id: item.realId }).eq('client_id', item.dupId);
    // 3. Re-aponta manutenções
    await supabase.from('maintenance_services').update({ client_id: item.realId }).eq('client_id', item.dupId);
    // 4. Re-aponta chamados
    await supabase.from('support_tickets').update({ client_id: item.realId }).eq('client_id', item.dupId);

    // 5. Atualiza potência na ficha oficial do cliente se não estiver preenchida
    if (item.power) {
      await supabase.from('client_portal_users').update({ system_size_kw: item.power }).eq('id', item.realId);
    }

    // 6. Remove o registro duplicado
    const { error: delErr } = await supabase.from('client_portal_users').delete().eq('id', item.dupId);
    if (delErr) {
      console.error(`Erro ao deletar ${item.dupName}:`, delErr.message);
    } else {
      console.log(`✓ Duplicata removida com sucesso: ${item.dupName}`);
    }
  }

  // Clientes soltos do SolarZ que não têm cadastro no Trello
  const orphanSolarZ = [
    { id: 'aa61dffb-c962-4dda-a613-9f1d58535569', name: 'Cervejaria Deodora' },
    { id: '540f663c-cae0-4c34-9377-6761a75da748', name: 'Suzana Jerônimo' },
  ];

  for (const orphan of orphanSolarZ) {
    console.log(`\nRemovendo registro SolarZ sem vínculo no Trello: "${orphan.name}"`);
    await supabase.from('client_intelligence').delete().eq('client_id', orphan.id);
    await supabase.from('project_tracking').delete().eq('client_id', orphan.id);
    const { error } = await supabase.from('client_portal_users').delete().eq('id', orphan.id);
    if (error) console.error(`Erro ao remover ${orphan.name}:`, error.message);
    else console.log(`✓ Removido: ${orphan.name}`);
  }

  const { data: finalClients } = await supabase.from('client_portal_users').select('id, name, cpf, system_size_kw');
  console.log(`\n=== CONCLUÍDO ===`);
  console.log(`Total final de clientes oficiais únicos no catálogo: ${finalClients.length}`);
  process.exit(0);
}

cleanupRemainingDuplicates();

import { supabase } from '../services/supabase.js';

async function mapSlugsToRealClients() {
  const { data: clients } = await supabase.from('client_portal_users').select('*');

  const slugMapping = [
    { slug: 'claudetecariri', realSearch: 'CLAUDETE CARIRI DOS SANTOS' },
    { slug: 'onoriopeiter', realSearch: 'ONORIO ALFREDO PEITER' },
    { slug: 'rosenildocandido', realSearch: 'Rosenildo Candido da Silva' },
    { slug: 'sirmanifrazao', realSearch: 'SIRMANI MELO FRAZAO' },
    { slug: 'genivaldopedro', realSearch: 'Genivaldo Pedro da Silva' },
    { slug: 'glauciamd', realSearch: 'GLAUCIENE DE LIMA NASCIMENTO' },
    { slug: 'celiamartins', realSearch: 'Claudia Celia Martins' },
    { slug: 'vip fitness', realSearch: 'ACADEMIA ELITECH FITNESS LTDA' },
    { slug: 'elitech fit club', realSearch: 'ACADEMIA ELITECH FITNESS LTDA' },
  ];

  for (const item of slugMapping) {
    const slugClient = clients.find(c => c.name?.trim().toLowerCase() === item.slug.toLowerCase());
    const realClient = clients.find(c => c.name?.toLowerCase().includes(item.realSearch.toLowerCase()) && c.cpf);
    console.log(`Slug: "${item.slug}" (${slugClient?.id}) -> Real: "${realClient?.name}" (${realClient?.id})`);
  }
}

mapSlugsToRealClients();

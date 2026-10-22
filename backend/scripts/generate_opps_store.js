import fs from 'fs';

const raw = JSON.parse(fs.readFileSync('backend/data/crm_initial_opportunities.json', 'utf8'));

const opportunities = [];
let idCounter = 1;

for (const [stage, list] of Object.entries(raw)) {
  for (const item of list) {
    if (!item.name || item.name.length < 2) continue;
    
    // Parse price string e.g. "R$ 44k" or "R$ 138k" or "1000"
    let amount = 25000;
    if (item.price) {
      const p = item.price.replace('R$', '').trim().toLowerCase();
      if (p.includes('k')) {
        const num = parseFloat(p.replace('k', ''));
        if (!isNaN(num)) amount = num * 1000;
      } else {
        const num = parseFloat(p);
        if (!isNaN(num)) amount = num;
      }
    }

    // Format phone
    let phone = item.phone ? String(item.phone) : '';
    if (phone.startsWith('55') && phone.length >= 12) {
      phone = phone.substring(2);
    }

    // Clean city
    let city = item.city || 'Maceió';
    if (city === 'Cidade não informada' || city.includes('Farmácia') || city.includes('Açougue') || city.includes('Barbearia') || city.includes('Academia') || city.startsWith('"')) {
      city = 'Maceió';
    }

    const oppId = `opp_${String(idCounter++).padStart(4, '0')}`;
    opportunities.push({
      id: oppId,
      title: item.name.trim(),
      status: stage,
      amount: amount,
      phone: phone || null,
      city: city.trim(),
      services: ['solar'],
      source: 'CRM',
      temperature: stage === 'Ganho' ? 'quente' : stage === 'Proposta' ? 'quente' : 'morno',
      created_at: new Date('2026-10-15T10:00:00Z').toISOString(),
      updated_at: new Date().toISOString()
    });
  }
}

fs.writeFileSync('backend/data/opportunities_store.json', JSON.stringify(opportunities, null, 2));
console.log(`Generated ${opportunities.length} opportunities in backend/data/opportunities_store.json`);

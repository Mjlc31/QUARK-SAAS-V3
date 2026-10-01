import fs from 'fs';
let content = fs.readFileSync('src/hooks/useProposals.ts', 'utf8');

content = content.replace(
  /leadId: row\.lead_id,\n\s+version: row\.version \|\| 1,\n\s+clientName: row\.client_name,\n\s+cpfCnpj: row\.cpf_cnpj,\n\s+email: row\.email,\n\s+address: row\.address,\n\s+city: row\.city,\n\s+state: row\.state,\n\s+phone: row\.phone,\n\s+roofType: row\.roof_type,\n\s+systemSizeKw: row\.system_size_kw,\n\s+finalPrice: row\.final_price,\n\s+installationCost: row\.installation_cost,\n\s+status: row\.status,\n\s+\.\.\(row\.data \|\| \{\}\),\n\s+blocks: row\.blocks,\n\s+theme: row\.theme,\n\s+pdfUrl: row\.pdf_url,/g,
  `leadId: row.lead_id || row.data?.lead_id,
          version: row.version || row.data?.version || 1,
          clientName: row.client_name,
          cpfCnpj: row.cpf_cnpj || row.data?.cpf_cnpj,
          email: row.email || row.data?.email,
          address: row.address || row.data?.address,
          city: row.city,
          state: row.state || row.data?.state,
          phone: row.phone,
          roofType: row.roof_type || row.data?.roof_type,
          systemSizeKw: row.system_size_kw,
          finalPrice: row.final_price,
          installationCost: row.installation_cost || row.data?.installation_cost,
          status: row.status,
          ...(row.data || {}),
          blocks: row.blocks,
          theme: row.theme,
          pdfUrl: row.pdf_url || row.data?.pdf_url,`
);

fs.writeFileSync('src/hooks/useProposals.ts', content);

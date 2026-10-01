import fs from 'fs';
let content = fs.readFileSync('src/hooks/useProposals.ts', 'utf8');

content = content.replace(
  /const payload = \{\n\s+user_id: userAuth.user.id,\n\s+lead_id: leadId \|\| null,\n\s+client_name: clientName,\n\s+cpf_cnpj: cpfCnpj \|\| null,\n\s+email: email \|\| null,\n\s+address: address \|\| null,\n\s+city,\n\s+state: state \|\| null,\n\s+phone: phone \|\| null,\n\s+roof_type: roofType \|\| null,\n\s+system_size_kw: systemSizeKw,\n\s+final_price: finalPrice,\n\s+installation_cost: installationCost \|\| null,\n\s+status: status \|\| 'draft',\n\s+data: restData,\n\s+blocks,\n\s+theme,\n\s+pdf_url: pdfUrl \|\| null,\n\s+updated_at: new Date\(\)\.toISOString\(\),\n\s+\};/,
  `const payload = {
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
          pdf_url: pdfUrl || null
        },
        blocks,
        theme,
        updated_at: new Date().toISOString(),
      };`
);

content = content.replace(
  /cpf_cnpj: cpfCnpj \|\| null,\n\s+email: email \|\| null,\n\s+address: address \|\| null,\n\s+city,\n\s+state: state \|\| null,\n\s+phone: phone \|\| null,\n\s+roof_type: roofType \|\| null,\n\s+system_size_kw: systemSizeKw,\n\s+final_price: finalPrice,\n\s+installation_cost: installationCost \|\| null,\n\s+status: status \|\| 'draft',\n\s+data: restData,/,
  `city,
          phone: phone || null,
          system_size_kw: systemSizeKw,
          final_price: finalPrice,
          status: status || 'draft',
          data: {
            ...restData,
            cpf_cnpj: cpfCnpj || null,
            email: email || null,
            address: address || null,
            state: state || null,
            roof_type: roofType || null,
            installation_cost: installationCost || null
          },`
);

fs.writeFileSync('src/hooks/useProposals.ts', content);

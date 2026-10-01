const fs = require('fs');

let content = fs.readFileSync('src/hooks/useProposals.ts', 'utf8');

const regex = /\.insert\(\{\s*user_id: userAuth\.user\.id,\s*client_name: \`\$\{clientName\} \(Cópia\)\`,\s*cpf_cnpj: cpfCnpj \|\| null,\s*email: email \|\| null,\s*address: address \|\| null,\s*city,\s*state: state \|\| null,\s*phone: phone \|\| null,\s*roof_type: roofType \|\| null,\s*system_size_kw: systemSizeKw,\s*final_price: finalPrice,\s*installation_cost: installationCost \|\| null,\s*status: 'draft',\s*data: restData,\s*blocks,\s*theme,\s*created_at: new Date\(\)\.toISOString\(\),\s*updated_at: new Date\(\)\.toISOString\(\),\s*\}\)/;

const safeDupInsert = `.insert({
          user_id: userAuth.user.id,
          client_name: \`\${clientName} (Cópia)\`,
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
        })`;

content = content.replace(regex, safeDupInsert);

fs.writeFileSync('src/hooks/useProposals.ts', content);

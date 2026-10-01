const fs = require('fs');

let content = fs.readFileSync('src/hooks/useProposals.ts', 'utf8');

// 1. Remove version from root of insert/update, put in data
content = content.replace(/version: 1,/g, '');
content = content.replace(/\(payload as any\).version = currentVersion \+ 1;/g, 'payload.data.version = currentVersion + 1;');

// 2. Add version to payload.data
content = content.replace(/pdf_url: pdfUrl \|\| null/, "pdf_url: pdfUrl || null,\n          version: version || 1");

// 3. Fix proposal_versions insert to not crash if table doesn't exist
const versionsInsert = `await supabase.from('proposal_versions').insert({`;
const safeVersionsInsert = `try {
            await supabase.from('proposal_versions').insert({`;
content = content.replace(versionsInsert, safeVersionsInsert);

const versionsInsertEnd = `theme: (currentRow as any).theme,
          });`;
const safeVersionsInsertEnd = `theme: (currentRow as any).theme,
          });
          } catch (e) { console.warn('proposal_versions table might not exist yet', e); }`;
content = content.replace(versionsInsertEnd, safeVersionsInsertEnd);

// 4. Fix duplicateProposal to not use raw columns
const dupInsert = `.insert({
          user_id: userAuth.user.id,
          client_name: \`\${clientName} (Cópia)\`,
          cpf_cnpj: cpfCnpj || null,
          email: email || null,
          address: address || null,
          city,
          state: state || null,
          phone: phone || null,
          roof_type: roofType || null,
          system_size_kw: systemSizeKw,
          final_price: finalPrice,
          installation_cost: installationCost || null,
          status: 'draft',
          data: restData,
          blocks,
          theme,
          version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })`;

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
content = content.replace(dupInsert, safeDupInsert);

fs.writeFileSync('src/hooks/useProposals.ts', content);

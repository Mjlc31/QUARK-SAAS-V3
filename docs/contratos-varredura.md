# Varredura — Geração automática de contratos (2026-11-13)

Levantamento feito antes da implementação, direto no código e no banco (`sumydaewtszecrvdgoku`, via MCP `supabase_quark`, só leitura).

## 1. Módulo atual de contratos e assinatura digital

| Peça | Onde | O que faz |
|---|---|---|
| Tabela `documents` | Supabase | Procurações, aluguéis e contratos (`kind`), conteúdo em `data jsonb` (formato `ContratoData`), `status` `rascunho/enviado/assinado/cancelado`, `user_id`, `lead_id`, `opportunity_id`, `hash` |
| Tabela `document_signers` | Supabase | Um registro por assinante; `token` (default `encode(gen_random_bytes(16),'hex')`), `signed_at`, `signature` (imagem), `ip`, `user_agent` |
| RLS | Supabase | `admin_all_*` (is_admin), `*_team_access` (is_team_member), `*_auth_all` (dono) |
| RPCs públicas | Supabase | `get_public_document(p_token)`, `view_public_document`, `sign_public_document` (SECURITY DEFINER; quando todos assinam, marca `documents.status='assinado'` e `completed_at`) |
| Página `/contratos` | `src/pages/Contracts.tsx` + `src/hooks/useContracts.ts` | Lista/cria contratos montados à mão no editor (texto gerado por `contratoBlocks()` em `src/lib/documents.ts`) |
| Página `/assinar/:token` | `src/pages/PublicDocumentSign.tsx` + `src/components/docs/document-view.tsx` | Mostra o documento (`documentBlocks`) e coleta a assinatura (`signature-pad.tsx`) |

Fluxo atual: vendedor preenche o contrato no editor (dados redigitados) → `documents` + `document_signers` (CONTRATADA já assinada com `/brand/assinatura.png`) → link `/assinar/<token>` para o cliente → `sign_public_document`.

Observação: o texto do editor atual (`contratoBlocks`) **não** é o texto do contrato oficial em Word. Por isso o contrato gerado do template leva o próprio texto para a assinatura (ver relatório final, decisão D3).

## 2. Proposta, cliente e kit no Supabase

Proposta aprovada = `proposals.status = 'aceita'` (tipo `ProposalStatus` em `src/lib/types.ts`). Hoje há 1 proposta aceita no banco.

| Campo do gerador | Fonte | Situação |
|---|---|---|
| `cliente.nome` | `proposals.client_name` → `data.lead.name` → `opportunities.client_name/title` | existe |
| `cliente.documento` | `proposals.cpf_cnpj` → `opportunities.cpf_cnpj` | coluna existe, **quase sempre vazia** |
| `cliente.endereco` | `proposals.address` → `opportunities.address` (texto livre), `city`, `state` | parcial: sem CEP/bairro/número estruturados |
| `sistema.qtd_modulos` / `potencia_modulo_wp` | `proposals.inputs.moduleQty` / `modulePowerW` | existe |
| `sistema.qtd_inversores` / `inversor_marca` / `inversor_potencia_kw` | `inputs.inverterQty` / `inverterBrand` / `inverterPowerKw` | existe |
| `potencia_kwp` | `proposals.power_kwp` | existe (usado só para aviso de divergência) |
| `tipo_estrutura` | `inputs.structureType` (ex.: "Telhado cerâmico") | existe |
| `valor_total` | `proposals.final_price` | existe |
| `pagamentos[]` | `inputs.cardInstallments`, `paymentNotes` (opções oferecidas, não a escolhida) | **não existe estruturado** |
| `fornecedora`, garantias | — | **não existe** |
| `cliente.genero` | — | **não existe** |
| `data_assinatura` | — | hoje (America/Maceio) |

Relações: `proposals.opportunity_id` (uuid) e `proposals.lead_id` (texto, normalmente o mesmo uuid) → `opportunities.id`.

## 3. Campos que não existem e onde ficam

Decisão: **nenhuma coluna nova em `proposals`/`opportunities`**. Tudo que o banco não guarda (gênero, endereço estruturado, pagamentos, fornecedora, garantias) fica no `input_snapshot` de cada versão em `generated_contracts`, e a próxima geração da mesma proposta pré-preenche a partir da última versão. Motivo: não mexe no schema de tabelas centrais (CRM/propostas), o snapshot já é a fonte auditável do que foi assinado, e a 2ª geração em diante não pede nada de novo.

## 4. Backend em produção e DOCX → PDF

- O backend Express roda na máquina própria da Quark (`iniciar_sistema.sh`: `docker compose up -d` + `npm run server`, IP de LAN `192.168.0.149`, porta 3005 no `.env`). O frontend é estático (Vercel/Netlify). Não há Dockerfile do backend nem PaaS.
- LibreOffice (`soffice`) **não está instalado** nessa máquina; Docker Desktop está instalado.
- Escolha: **Gotenberg** (`gotenberg/gotenberg:8`) como serviço no `docker-compose.yml` que já sobe Evolution/n8n, exposto em `localhost:3010`, configurado por `GOTENBERG_URL`. É o LibreOffice empacotado com API HTTP: mesma fidelidade do `soffice`, sem instalar nada no host e sem processo `soffice` concorrente travando. Fallback: `soffice` local, se existir. Sem nenhum dos dois, o contrato sai só em DOCX e a versão registra o aviso (o DOCX é o documento-base; o PDF é conveniência).
- Banco/Storage: o backend **não tem** `SUPABASE_SERVICE_ROLE_KEY`; as rotas novas usam o JWT do próprio usuário (`supabaseAs(token)`), então a RLS vale exatamente como no frontend.

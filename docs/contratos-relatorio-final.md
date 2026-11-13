# Relatório final — Geração automática de contratos

Branch: `feat/contratos-automaticos` · Data: 2026-11-13 · Varredura: [contratos-varredura.md](contratos-varredura.md)

## O que foi feito

**Gerador** (`backend/contratos/`): código do `quark-contratos.zip` reaproveitado sem reescrever; template e texto jurídico intactos. Acréscimos:
- `lib/contrato.js`: `ErroValidacao` (vira HTTP 422), validação de endereço estruturado, pagamentos (valor > 0, parcelas inteiras ≥ 1, texto obrigatório), garantias, fornecedora, data e aviso de gênero ausente.
- `lib/adapter.js`: `mapearPropostaParaContrato(proposta, { oportunidade, anterior })` e `paraDocumentoAssinatura(...)`.
- `lib/pdf.js`: DOCX→PDF via Gotenberg (`GOTENBERG_URL`) → `soffice` local → só DOCX com aviso.
- `lib/texto.js`: extrai os parágrafos do DOCX (regressão e tela de assinatura).

**API** (`backend/routes/contratos.js`, montada em `/api/contratos` com `requireTeam`):

| Rota | Função |
|---|---|
| `GET /:propostaId/preview-dados` | dados pré-preenchidos + avisos + pendências + histórico de versões |
| `POST /:propostaId/previa` | campos renderizados (cláusula 3.1, kWp, extenso) para os dados do modal; 422 se inválidos |
| `POST /:propostaId/gerar` | gera DOCX (+PDF), sobe no bucket `contratos` e registra nova versão |
| `GET /:id/download?formato=docx\|pdf` | URL assinada de 2 minutos |
| `POST /:id/enviar-assinatura` | cria `documents` + `document_signers` no módulo de assinatura existente |

Proposta não aceita → 409; inexistente → 404; dados inválidos → 422 com a mensagem do gerador, **antes** de gravar qualquer coisa.

**Banco** (`supabase/migrations/20261113_generated_contracts.sql`, rollback em `supabase/rollback/`): tabela `generated_contracts` (snapshot `input_snapshot`, `fields` renderizados, `warnings`, `version` sequencial por proposta via trigger com advisory lock, `status` `rascunho|gerado|enviado_assinatura|assinado`, `created_by` = `auth.uid()`, `created_at`, caminhos dos arquivos, `document_id`). Trigger de imutabilidade: snapshot, versão, autoria e arquivos não mudam; gerar de novo cria versão nova. Trigger em `documents`: quando a assinatura completa, a versão vira `assinado`. RLS: `admin_all_generated_contracts` (is_admin = Arthur + Anderson) e `generated_contracts_team_*` (is_team_member) para select/insert/update; sem DELETE para `authenticated`. Bucket privado `contratos` (10 MB, só DOCX/PDF) com policies de equipe para ler/enviar e de admin para apagar.

**Frontend**: botão **Gerar contrato** no cabeçalho da proposta com status `aceita` (`src/components/proposal/editor.tsx`) → `src/components/contracts/GenerateContractModal.tsx` com seções Cliente (máscara e validação CPF/CNPJ, gênero só para PF, endereço estruturado), Sistema (kWp calculado ao vivo), Pagamento (PIX, transferência, cartão com parcelas/juros, boleto, financiamento com banco, texto livre; soma em tempo real e botão bloqueado se não bater), Avançado recolhido (fornecedora, garantias, data) e prévia da 3.1 vinda do próprio gerador. Depois de gerar: histórico de versões com status, download DOCX/PDF e **Enviar para assinatura** (link + WhatsApp). Estado só em memória; zero localStorage. `src/lib/documents.ts`: `contratoBlocks` usa `generatedBlocks` quando o documento veio do gerador, então `/assinar/:token` mostra o texto exato do contrato oficial.

**Infra**: serviço `gotenberg` no `docker-compose.yml` (porta 3010) e `GOTENBERG_URL` no `.env.example`.

## Testes

| Suíte | Comando | Resultado |
|---|---|---|
| Unitários + regressão + rotas + auth existente | `npm --prefix backend test` | 30/30 |
| E2E Playwright (modal real + rotas reais + Supabase falso) | `npx playwright test` | 2 passaram, 1 pulado (spec autenticada sem credenciais) |
| Tipos | `npx tsc --noEmit` | limpo nos arquivos desta branch (ver pendência 6) |
| Build | `npm run build` | ok |
| Migration | Postgres embutido (PGlite) com stubs de `auth`/`storage` | versão 1→2, imutabilidade, RLS equipe×cliente, sync `assinado`, reaplicação idempotente, rollback |

Cobertura pedida: extenso (1, 100, 101, 1.000, 1.100, 2.500, 33.867, 1.000.000, centavos), CPF/CNPJ, soma de pagamentos, inversor singular/plural, PF×PJ. Não há ESLint configurado no projeto (sem script `lint`).

**Regressão da Yulia**: o texto gerado é comparado com `backend/contratos/test/yulia.esperado.txt` e com o original em `referencia/`. As únicas diferenças aceitas são as correções do gerador:
1. Qualificação: "inscrita no CPF … residente e domiciliada no endereço" (original: "inscrito no comprovante de pessoa física … com sede").
2. Cláusula 1: "16,33 kWp" (vírgula), "módulos … de 710 Wp" (original "da  710"), "15 kW".
3. Cláusula 3: extenso sem "e" sobrando ("trinta e três mil oitocentos…").
4. Cláusula 3.1 montada pelo gerador ("…18 parcelas com juros; e o valor de R$ 10.000,00 … à vista, via PIX, …").
5. Linha "Maceió/AL, 13 de novembro de 2026." antes das assinaturas (o original não tinha data).
6. Bloco de assinatura do contratante: "CPF:" (original dizia "CNPJ:").

Formatação: estilos, numeração, cabeçalhos, rodapés, tema, fontes, timbrado e seções são equivalentes ao original; propriedades de todos os parágrafos idênticas (exceto o parágrafo novo da data). Pontos pendentes do jurídico continuam como no original: 8.2/8.4 "(vinte por cento)", Resolução ANEEL 482 e "Projeto:" sem numeração (o teste garante isso).

## Decisões tomadas sozinho

- **D1 — Tabela nova `generated_contracts`** em vez de reaproveitar `documents`: `documents` é o objeto de assinatura (editável, sem versão). A versão gerada é imutável e aponta para o `documents` criado ao enviar.
- **D2 — Campos ausentes no snapshot**, sem colunas novas em `proposals`/`opportunities` (detalhe na varredura §3).
- **D3 — Assinatura com o texto do DOCX**: o envio grava em `documents.data.generatedBlocks` os parágrafos do contrato gerado; a tela pública renderiza esse texto. Sem isso o cliente assinaria o texto do editor antigo, diferente do contrato oficial.
- **D4 — Backend usa o JWT do usuário** (`supabaseAs`), não a service role (que não existe no `.env` local). Vantagem: RLS e `auth.uid()` reais, autoria correta.
- **D5 — Gotenberg** para PDF; PDF opcional, DOCX obrigatório.
- **D6 — Valor do contrato editável**: se diferir do `final_price` aprovado, gera com aviso registrado na versão (não bloqueia: desconto de fechamento é comum).
- **D7 — kWp sempre calculado** de módulos × Wp; divergência com `proposals.power_kwp` vira aviso.
- **D8 — Pagamento padrão**: PIX do total (o banco não guarda a forma escolhida); da 2ª versão em diante reaproveita os pagamentos da anterior se ainda fecham com o total.
- **D9 — Migration validada em PGlite**, sem criar branch do Supabase (tem custo por hora) e sem tocar produção.
- **D10 — E2E sem credencial**: harness Vite (`e2e/harness/`, fora do build) com o modal real e as rotas Express reais sobre Supabase falso. A spec contra o app real (`e2e/contratos-real.spec.ts`) roda quando você der as variáveis.
- **D11 — Endereço estruturado** no modal (logradouro, número, complemento, CEP, bairro, cidade, UF) porque o banco só tem texto livre; CEP com 8 dígitos é obrigatório.
- **D12 — Pastas do Obsidian**: as notas foram em `⚙️ Backend`, `🎨 Frontend` e `🗄️ Banco de Dados` (nomes reais do cofre).

## Como testar passo a passo

1. Migration já aplicada. Suba o Gotenberg: `docker compose up -d gotenberg`; no `.env` do backend, `GOTENBERG_URL=http://localhost:3010`.
2. `npm --prefix backend install` e reinicie o backend (`npm run server`), que agora monta `/api/contratos`.
3. `npm --prefix backend test` → 30/30.
4. `npx playwright test` → E2E do harness.
5. No app (`http://127.0.0.1:5173`), abra uma proposta **aceita** → **Gerar contrato** → complete CPF, gênero e endereço → ajuste o pagamento até a soma ficar verde → confira a prévia da 3.1 → **Gerar contrato** → baixe DOCX/PDF → **Enviar para assinatura** → abra o link `/assinar/...` e confira o texto.
6. Gere de novo: deve aparecer "v2" e a v1 continua baixável.
7. E2E real: `E2E_BASE_URL=http://127.0.0.1:5173 QA_EMAIL=… QA_PASSWORD=… QA_PROPOSTA_ID=… npx playwright test e2e/contratos-real.spec.ts`.

## O que depende de você

1. ✅ **Migration aplicada em produção em 2026-11-13** com sua aprovação (`generated_contracts_20261113` + `generated_contracts_revoke_destructive_20261113`, que tira DELETE/TRUNCATE do `authenticated` herdados dos default privileges). Verificado: RLS ativa, 4 policies na tabela, 3 no Storage, 3 triggers, bucket privado, grants `INSERT,SELECT,UPDATE` para `authenticated` e nenhum para `anon`. Não rodei teste de escrita em produção.
2. 🛑 **Merge e deploy**: PR aberto, nada mergeado.
3. Subir o Gotenberg na máquina do backend e definir `GOTENBERG_URL` (sem isso, só DOCX).
4. Conta de equipe de teste para rodar `e2e/contratos-real.spec.ts` (não existe hoje).
5. Revisão do jurídico: 8.2/8.4, ANEEL 482, item "Projeto:" e as 6 correções da regressão acima (principalmente a nova redação da 3.1 e a linha de data).
6. Há alterações não commitadas de outra frente em `src/components/FinancialProlabore.tsx` e `src/services/storageService.ts` que hoje quebram o `tsc` (erros nesses arquivos, não nesta branch); também `CRM.tsx`, `Financial.tsx` e arquivos de proposta/pricing. Não toquei nem commitei.
7. `referencia/CONTRATO - YULIA AMARAL ALMEIDA.docx` e `exemplos/yulia.json` (vindos do zip) têm CPF e endereço reais de cliente e foram versionados como pediu o roteiro; se o repo não for privado, troque por dados fictícios.
8. Um documento gerado pelo sistema, se aberto no editor antigo de `/contratos`, continua mostrando o texto do DOCX (os campos editáveis do editor não alteram esse texto). Para mudar um contrato, gere uma nova versão.

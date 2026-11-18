# Especificação Técnica: Geração e Impressão Direta em PDF do Contrato Solar Quark

> **Arquivo:** `specs/looping.md`  
> **Status:** Pronta para `/build`  
> **Gerada em:** 2026-11-18 14:19

---

## 1. Objetivo
Permitir que operadores e consultores da Quark Energia preencham com total clareza e segurança todos os dados necessários de um contrato de energia solar em um formulário limpo e intuitivo na Central de Contratos (`/contratos`), gerando e baixando instantaneamente o documento oficial em **PDF** compilado com 100% de fidelidade ao modelo oficial da Quark (`templates/MODELO_CONTRATO_SOLAR_QUARK.docx`), sem resquícios de preenchimento manual (colchetes ou sublinhados), mantendo o histórico de contratos gerados disponível para novos downloads na plataforma.

## 2. Usuários-Alvo & Contexto
- **Usuários:** Vendedores, consultores comerciais e gestores da Quark Energia.
- **Contexto:** Rota `/contratos` (Central de Contratos) do Quark SaaS. O operador acessa a aba, clica em "Novo Contrato Solar", preenche os campos do zero e emite o PDF diretamente.

## 3. Requisitos Exatos

### 3.1 Requisitos Indispensáveis (P0 - Must-Have)
- [ ] **REQ-01 (Formulário Limpo do Zero):** O modal de "Novo Contrato Solar" em `src/pages/Contracts.tsx` deve abrir sempre como um formulário limpo e organizado com campos claros:
  1. *Contratante:* Nome Completo / Razão Social, Tipo (PF / PJ), Documento (CPF / CNPJ com máscara), Endereço estruturado (Logradouro, Número, Complemento, Bairro, CEP, Cidade, UF).
  2. *Sistema Solar:* Quantidade de Módulos, Potência do Módulo (Wp), Marca dos Módulos, Quantidade de Inversores, Potência do Inversor (kW), Marca do Inversor, Tipo de Estrutura de Fixação.
  3. *Valores e Pagamento:* Valor Total do Contrato (R$), Condição de Pagamento (Cláusula 3.1 em campo de texto livre com placeholder/sugestão).
  4. *Garantias e Fornecedora:* Fornecedora dos Equipamentos (ex: FORTLEV SOLAR, SOU ENERGY, ALDO).
  5. *Foro e Concessionária:* Concessionária Local (padrão: Equatorial AL), Cidade do Foro (padrão: Maceió), Estado do Foro (padrão: Alagoas), Data de Assinatura (padrão: data atual).
- [ ] **REQ-02 (Cálculos e Extensos Automáticos):**
  - O sistema deve calcular automaticamente a potência total instalada em kWp (`(Qtd Módulos × Potência Módulo Wp) / 1000`).
  - O sistema deve gerar automaticamente os valores por extenso: quantidade de módulos por extenso, quantidade de inversores por extenso, valor total em reais por extenso e data por extenso, mantendo campos editáveis se o usuário desejar ajustar.
- [ ] **REQ-03 (Eliminação de Colchetes e Linhas Sublinhadas):** O modelo digital e o documento gerado devem estar 100% limpos, sem os colchetes e linhas sublinhadas manuais do template original (ex: remover `[ _____ ]`), gerando texto corrido, executivo e contínuo.
- [ ] **REQ-04 (Geração e Download Direto do PDF):** Ao clicar no botão de ação principal **"Gerar e Baixar PDF"**, o sistema deve:
  1. Validar campos mínimos obrigatórios (Nome, Documento, Endereço, Equipamentos, Valor).
  2. Gerar o arquivo PDF oficial com a tipografia, timbrado e formatação idênticos ao modelo Word.
  3. Disparar o download imediato do arquivo `.pdf` no navegador com o nome padronizado: `CONTRATO - [NOME DO CLIENTE].pdf`.
- [ ] **REQ-05 (Persistência no Histórico da Central de Contratos):** O contrato gerado deve ser salvo no banco de dados (`documents` / `generated_contracts`), passando a ser exibido na lista da aba de contratos.
- [ ] **REQ-06 (Botão Baixar PDF na Listagem):** Cada card/linha de contrato na lista de contratos deve exibir um botão proeminente **"Baixar PDF"**, permitindo baixar novamente o PDF oficial a qualquer momento com apenas 1 clique.

### 3.2 O que NÃO fazer (Fora de Escopo)
- Não exigir proposta aprovada prévia no banco de dados para conseguir emitir o contrato (o preenchimento pode ser manual e autônomo).
- Não exigir login em serviços externos ou ferramentas que dependam de servidores ausentes (a geração do PDF deve funcionar de forma resiliente e garantida no navegador/backend do sistema).
- Não criar botões ou fluxos complexos não solicitados. Foco estrito: preencher dados necessários -> gerar e baixar PDF limpo e perfeito.

## 4. Fluxos de Usuário & Telas
1. **Passo 1:** O operador acessa a aba **Contratos** no menu lateral (`/contratos`) e clica em **"Novo Contrato Solar"**.
2. **Passo 2:** Abre o modal com formulário limpo, com valores padrão inteligentes (Maceió/AL, Equatorial AL, data de hoje).
3. **Passo 3:** O operador preenche os dados do cliente, kit solar e valor. Os extensos e kWp são calculados na hora. O operador redige as condições de pagamento na Cláusula 3.1 com liberdade.
4. **Passo 4:** O operador clica no botão **"Gerar e Baixar PDF"** (com feedback de loading).
5. **Passo 5:** O PDF é baixado automaticamente pelo navegador. O modal se fecha e o novo contrato aparece imediatamente na listagem de contratos com o botão **"Baixar PDF"**.

## 5. Casos Extremos & Tratamento de Erros (Edge Cases)

| Cenário / Falha | Comportamento Esperado |
| :--- | :--- |
| Nome ou valor do contrato não informados | Botão "Gerar e Baixar PDF" fica bloqueado ou emite toast explicativo impedindo envio vazio |
| Documento CPF com menos de 11 dígitos ou CNPJ com menos de 14 dígitos | Emite aviso visual no campo indicando que o documento está incompleto |
| Docker ou Gotenberg desligados no host local | O sistema gera o PDF fielmente via renderização de alta fidelidade e impressão/download nativo do navegador (PDF client-side / Puppeteer) garantindo que o download nunca falhe |
| Cliente Pessoa Jurídica (CNPJ) | Altera automaticamente a qualificação para "inscrita no CNPJ sob o nº... com sede em..." em vez de "residente e domiciliado" |
| Caracteres especiais ou aspas no texto de pagamento | Sanitizado adequadamente sem quebrar o motor de templates nem o gerador de PDF |

## 6. Restrições Técnicas & Arquitetura
- **Stack:** React, TypeScript, Tailwind CSS, Supabase, Express.
- **Arquivos-Chave a Modificar:**
  - `src/pages/Contracts.tsx`: Atualizar modal com novos campos claros, cálculos automáticos de extensos, ação de gerar/baixar PDF e botão de download do PDF na listagem.
  - `src/lib/documents.ts`: Alinhar o gerador de blocos e texto do contrato (`contratoBlocks`) com o texto 100% fiel e limpo do `MODELO_CONTRATO_SOLAR_QUARK.docx`, garantindo que não existam colchetes ou sublinhados manuais.
  - `src/components/docs/document-view.tsx` ou motor de impressão PDF: Garantir que a renderização A4 do contrato tenha o timbrado, cabeçalho, rodapé e quebras de página perfeitas para geração de PDF com alta fidelidade.
  - `backend/routes/contratos.js` e `backend/contratos/`: Assegurar que a rota de geração aceite preenchimento direto e devolva o documento limpo.

## 7. Definição Concreta de "Concluído" (Definition of Done)
Checklist rigoroso de verificação para o `/review`:
- [ ] O formulário na aba de contratos abre limpo, sem erros no console, com todos os campos necessários mapeados.
- [ ] O cálculo de kWp e os textos por extenso (módulos, inversores, valor em reais e data) são preenchidos automaticamente e com precisão gramatical.
- [ ] A geração do PDF produz um documento com o texto exato do modelo oficial da Quark, sem marcas de colchetes `[ _____ ]`.
- [ ] O download do PDF é disparado e o arquivo é baixado no computador com sucesso.
- [ ] O contrato gerado aparece registrado na lista da página `/contratos` com título, cliente, valor, kWp e o botão de **Baixar PDF** ativo.
- [ ] A compilação do TypeScript e o build do projeto passam limpos sem quebras.

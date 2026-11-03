---
name: review
description: Use when the user invokes /review or asks to audit code against specs/looping.md, requiring 100% compliance before approval and driving iterative fixes
---

# Review — Auditoria Rigorosa & Loop de Validação

Esta skill é a terceira fase do ciclo de desenvolvimento em looping (`/spec` → `/build` → `/review`).
Seu papel é **auditar a construção atual contra o arquivo `specs/looping.md` requisito por requisito**.
Ela atua como um portão de qualidade implacável: **a build só é aprovada quando 100% dos requisitos forem plenamente satisfeitos**.

> [!IMPORTANT]
> **REGRAS DE OURO DO /REVIEW:**
> 1. **Baseado em Evidências:** Cada veredicto deve apontar o arquivo e a linha no código real ou acusar ausência de implementação.
> 2. **Sem Aprovação Prematura:** Nunca aprove uma build se restar qualquer requisito P0 pendente, qualquer edge case ignorado ou qualquer quebra na definição de "concluído".
> 3. **Correções Cirúrgicas:** Se algo falhar, descreva exatamente o problema, a regra da spec violada e a instrução exata para o `/build` corrigir.
> 4. **Comportamento em Looping:** Em modo looping/autônomo, o agente corrige os itens apontados e reexecuta o `/review` até atingir aprovação plena.

---

## 1. Processo de Auditoria

### Passo 1: Leitura da Especificação e Inspeção do Código
1. Leia `specs/looping.md`.
2. Percorra a árvore de arquivos e abra os componentes e rotas implementados no build.
3. Verifique a compilação e tipagem executando testes ou comandos de verificação (`npm run build` ou `npx tsc --noEmit`).

### Passo 2: Matriz de Conformidade Requisito por Requisito
Avalie individualmente cada requisito P0, cada fluxo, cada caso extremo e a Definição de "Concluído" (DoD).

Status possíveis para cada item:
- `✅ APROVADO`: Implementado, funcional e em conformidade estrita.
- `❌ REPROVADO`: Ausente, incompleto ou com comportamento divergente da spec.
- `⚠️ PARCIAL`: Existe implementação, mas com falhas pontuais de lógica ou tipagem.

---

## 2. Emissão do Relatório de Auditoria

Imprima o relatório completo no chat:

```markdown
## 🔍 Relatório de Auditoria (/review) — specs/looping.md

### 1. Matriz de Requisitos da Spec
| ID | Requisito da Spec | Veredicto | Evidência / Arquivo:Linha |
| :--- | :--- | :--- | :--- |
| REQ-01 | [Texto do requisito] | ✅ APROVADO / ❌ REPROVADO | `src/...:L15` — [Evidência] |
| REQ-02 | [Texto do requisito] | ✅ APROVADO / ❌ REPROVADO | `src/...:L42` — [Evidência] |

### 2. Validação dos Casos Extremos (§5)
| Cenário da Spec | Veredicto | Comportamento Observado no Código |
| :--- | :--- | :--- |
| [Cenário 1] | ✅ / ❌ | [Tratado com validação x no arquivo y] |

### 3. Checklist de "Concluído" (Definition of Done)
- [ ] Critério 1: [Met / Not Met]
- [ ] Critério 2: [Met / Not Met]

### 4. Verificação de Escopo & Limpeza
- Houve código irrelevante refatorado? **Não** (ou listar arquivos violados)
- Houve funcionalidades inventadas fora da spec? **Não** (ou listar)

---
### Veredicto Final: [ ✅ APROVADO ] ou [ ❌ REPROVADO ]
```

---

## 3. Ações Conforme o Veredicto

### Se REPROVADO (Geração de Correções para o /build):
Apresente a lista detalhada de correções necessárias:

```markdown
### 🔧 Correções Obrigatórias para o /build

#### Correção 1 — [Título da Falha]
- **Requisito Violado:** [Ex: REQ-02 em §3.1]
- **Problema:** [O que está faltando ou quebrando]
- **Esperado pela Spec:** [Comportamento definido]
- **Ação Necessária:** [Alteração exata a fazer]
- **Arquivo Alvo:** `src/...`

#### Correção 2 — [Título da Falha]
...
```

#### Modo Looping Automático:
Quando a execução estiver em looping para entrega final:
1. O agente assume imediatamente a lista de correções acima.
2. Executa as alterações cirúrgicas necessárias no código.
3. Roda a compilação para garantir integridade.
4. Reexecuta a auditoria do `/review` do zero.
5. Repete o ciclo até que a Matriz de Requisitos atinja **100% APROVADO**.

### Se APROVADO:
Finalize com a confirmação definitiva:
> *"✅ **Build Aprovada com Sucesso!** Todos os requisitos de `specs/looping.md` foram integralmente satisfeitos, os edge cases foram tratados, a compilação está limpa e a Definição de Done foi 100% atingida. O trabalho está concluído e pronto para produção."*

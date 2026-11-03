---
name: build
description: Use when the user invokes /build or asks to implement features strictly following specs/looping.md without scope creep
---

# Build — Implementação Fiel à Especificação

Esta skill é a segunda fase do ciclo de desenvolvimento em looping (`/spec` → `/build` → `/review`).
Seu papel é **ler `specs/looping.md` e construir exatamente o que ela prescreve**, preparando evidências para a validação.

> [!CRITICAL]
> **LEIS INEGOCIÁVEIS DO /BUILD:**
> 1. **Zero Scope Creep:** Não adicione funcionalidades extras, nem mesmo botões ou filtros "úteis" que não foram pedidos.
> 2. **Sem Refatoração Desnecessária:** Não mexa em código existente que não seja essencial para atender aos requisitos da spec.
> 3. **Sem Requisitos Inventados:** Se algo não está explícito na spec ou em suas restrições, não invente.
> 4. **Foco Cirúrgico:** Se houver dúvida grave sobre uma instrução, pare e pergunte em vez de assumir premissas arbitrárias.

---

## 1. Passo a Passo de Execução

### Passo 1: Leitura e Confirmação da Spec
1. Leia o arquivo `specs/looping.md`.
2. Se o arquivo não existir ou estiver vazio, pare imediatamente e avise:
   > *"Nenhuma especificação encontrada em `specs/looping.md`. Execute `/spec` primeiro para definir a funcionalidade."*
3. Imprima no chat uma confirmação rápida com o título da spec e o objetivo principal.

### Passo 2: Plano de Implementação Rápido
Antes de criar ou alterar arquivos, mostre uma lista resumida das tarefas técnicas mapeadas 1:1 para os requisitos da spec:
```markdown
Plano de Implementação:
1. [Tarefa 1] → Atende REQ-01 (§3.1)
2. [Tarefa 2] → Atende REQ-02 (§3.1)
3. [Tarefa 3] → Atende Edge Case X (§5)
```

### Passo 3: Construção e Escrita de Código
- Escreva código modular, tipado e alinhado com o projeto (React, TypeScript, Tailwind, Supabase).
- Garanta que todos os requisitos P0 sejam satisfeitos.
- Garanta que todos os Edge Cases descritos em `specs/looping.md` sejam tratados.
- Garanta que a compilação/build do projeto (`npm run build` ou `tsc`) permaneça íntegra.

---

## 2. Relatório de Conclusão (Hand-off para o /review)

Ao concluir a implementação, você **DEVE** emitir um relatório estruturado no chat para viabilizar a auditoria do `/review`:

```markdown
## 🛠️ Relatório de Construção (/build)

### Requisitos da Especificação Atendidos
| ID | Requisito da Spec (`specs/looping.md`) | Status | Arquivo / Linha |
| :--- | :--- | :--- | :--- |
| REQ-01 | [Texto do requisito] | ✅ Atendido | `src/...:L10-L45` |
| REQ-02 | [Texto do requisito] | ✅ Atendido | `src/...:L50-L80` |
| ... | ... | ... | ... |

### Casos Extremos Tratados
| Cenário da Spec | Tratamento Implementado | Arquivo |
| :--- | :--- | :--- |
| [Cenário 1] | [Como foi resolvido] | `src/...` |

### Arquivos Criados ou Alterados
- `src/caminho/arquivo.tsx` (Criado/Modificado)
- `src/caminho/outro.ts` (Modificado)

---
> **Próximo Passo:** Execute `/review` para auditar esta implementação contra `specs/looping.md`. Se o review apontar falhas, aplicaremos as correções necessárias até a aprovação total.
```

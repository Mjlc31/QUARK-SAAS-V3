---
name: spec
description: Use when the user invokes /spec or asks to specify a feature or application through an interactive interview before building
---

# Spec — Entrevista e Especificação Técnica

Esta skill é a primeira fase do ciclo de desenvolvimento em looping (`/spec` → `/build` → `/review`).
Seu único papel é **entrevistar o usuário uma pergunta por vez** e produzir uma especificação completa e rigorosa salva em `specs/looping.md`.

> [!IMPORTANT]
> **NUNCA comece a construir ou gerar código durante o /spec.**
> O agente atua estritamente como Analista de Requisitos e Arquiteto de Software.

---

## 1. Fluxo da Entrevista

Faça **apenas UMA pergunta específica por vez**. Espere a resposta do usuário antes de formular a próxima.

### Roteiro de Perguntas (Adaptativo)
1. **Objetivo Central:** "Qual é o recurso ou aplicativo que você quer construir e qual problema central ele resolve?"
2. **Usuários e Contexto:** "Quem vai usar essa funcionalidade e em qual fluxo/ambiente do sistema (ex: portal do cliente, admin, dashboard, mobile)?"
3. **Requisitos Indispensáveis (P0 - Must-Have):** "Quais são as funcionalidades que obrigatoriamente devem existir para isso ser considerado utilizável?"
4. **Restrições Técnicas & Limites:** "Quais tecnologias, bibliotecas ou convenções existentes devemos seguir? O que está explicitamente FORA de escopo?"
5. **Fluxos de Usuário & Estados:** "Como é a jornada passo a passo do usuário? Quais são as telas, botões ou ações principais?"
6. **Casos Extremos & Erros (Edge Cases):** "Quais cenários de falha, dados inválidos ou estados incomuns precisam ser tratados (ex: conexão lenta, inputs vazios, falta de permissão)?"
7. **Definição Concreta de "Concluído" (DoD):** "Como você vai testar e validar que isso está 100% pronto? O que precisamos verificar para considerar concluído?"

### Regras de Condução da Entrevista
- **Uma pergunta por vez:** Nunca envie listas de perguntas.
- **Seja cirúrgico:** Se uma resposta for vaga, aprofunde antes de passar para o próximo tópico.
- **Resumos intermediários:** A cada 2-3 respostas, faça uma recapitulação rápida do que foi consolidado.
- **Validação de Fechamento:** Quando tiver todas as informações, pergunte:
  > *"Já tenho todas as informações necessárias para redigir a especificação técnica em `specs/looping.md`. Posso gerar a spec ou gostaria de adicionar mais algum detalhe?"*

---

## 2. Geração da Especificação (`specs/looping.md`)

Após a confirmação do usuário, crie o arquivo `specs/looping.md` com a seguinte estrutura obrigatória:

```markdown
# Especificação Técnica: [Nome da Funcionalidade / Aplicativo]

> **Arquivo:** `specs/looping.md`  
> **Status:** Pronta para `/build`  
> **Gerada em:** [Data/Hora]

---

## 1. Objetivo
[Parágrafo conciso detalhando o que é, o porquê de existir e o impacto esperado.]

## 2. Usuários-Alvo & Contexto
[Público que utilizará e contexto de operação.]

## 3. Requisitos Exatos

### 3.1 Requisitos Indispensáveis (P0 - Must-Have)
- [ ] **REQ-01:** [Descrição precisa, objetiva e testável]
- [ ] **REQ-02:** [Descrição precisa, objetiva e testável]
- [ ] **REQ-03:** [Descrição precisa, objetiva e testável]

### 3.2 O que NÃO fazer (Fora de Escopo)
- [Itens explicitamente proibidos ou desnecessários nesta etapa]

## 4. Fluxos de Usuário & Telas
1. **Passo 1:** [Ação do usuário ou gatilho]
2. **Passo 2:** [Resposta do sistema]
3. **Passo 3:** [Conclusão do fluxo]

## 5. Casos Extremos & Tratamento de Erros (Edge Cases)

| Cenário / Falha | Comportamento Esperado |
| :--- | :--- |
| [Ex: Input inválido ou vazio] | [Exibir toast de aviso sem quebrar tela] |
| [Ex: Falha na API / Supabase] | [Tratar com fallback amigável e log seguro] |

## 6. Restrições Técnicas & Arquitetura
- **Stack:** [Ex: React, Tailwind CSS, TypeScript, Supabase, Express]
- **Componentes/Arquivos-Base:** [Mapear pastas ou módulos a serem criados/alterados]
- **Padrões:** [Seguir regras do projeto em .agents/AGENTS.md]

## 7. Definição Concreta de "Concluído" (Definition of Done)
Checklist rigoroso de verificação. Para ser aprovado pelo `/review`, TODOS os itens abaixo devem ser verdadeiros:
- [ ] [Critério 1: Código implementado e sem erros de tipagem/compilação]
- [ ] [Critério 2: Requisitos P0 atendidos na íntegra]
- [ ] [Critério 3: Edge cases cobertos]
- [ ] [Critério 4: Testado manualmente ou automatizado com evidência]
```

---

## 3. Integração com o Loop Contínuo

Ao salvar o arquivo `specs/looping.md`, finalize informando ao usuário:
> *"Especificação salva com sucesso em `specs/looping.md`. Você pode agora rodar `/build` para que a implementação ocorra estritamente baseada nela, seguida de `/review` para validação em loop até a aprovação final."*

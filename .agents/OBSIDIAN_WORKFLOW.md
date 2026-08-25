---
description: Regra de workflow para manter o Second Brain (Obsidian) sempre atualizado.
trigger: always_on
---

# 🧠 Atualização Contínua do Second Brain (Obsidian)

**REGRA ABSOLUTA:** Toda e qualquer alteração de código, nova funcionalidade, bugfix, decisão arquitetural ou modificação no projeto Quark SaaS DEVE ser obrigatoriamente documentada no cofre do Obsidian do usuário.

**Caminho do Cofre:** `/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/`

**Passos Obrigatórios ao Finalizar uma Tarefa:**
1. Crie ou atualize as notas Markdown correspondentes na estrutura de pastas correta (Frontend, Backend, DB, etc).
2. Sempre mantenha o padrão de YAML Frontmatter (tags, aliases, area).
3. Utilize Wikilinks `[[ ]]` para interligar novos conceitos aos existentes.
4. Registre um resumo das mudanças no arquivo `📋 Changelog/Changelog.md`.

---
description: Regra de workflow para manter o Second Brain (Obsidian) sempre atualizado e consultado.
trigger: always_on
---

# 🧠 Atualização e Consulta Contínua do Second Brain (Obsidian)

> [!IMPORTANT] Diretriz Suprema de Memória Contínua
> O cofre do Obsidian localizado em `/Users/arthurdemoraespd/Documents/obsidian/second brain/Quark SaaS/` é a memória viva e permanente de todo o ecossistema QUARK OS.

## 🔄 Ciclo Operacional em Toda Sessão

### 1. Início de Tarefa (Consulta de Contexto)
- Antes de iniciar qualquer modificação complexa, consulte o cofre no Obsidian para verificar:
  - As decisões arquiteturais existentes (`💡 Decisões/`).
  - O schema e as migrações vigentes (`🗄️ Banco de Dados/`).
  - O fluxo de dados e os contratos de interface (`🎨 Frontend/` e `⚙️ Backend/`).

### 2. Finalização de Tarefa (Persistência e Expansão)
Toda alteração de código, nova funcionalidade, bugfix, refatoração ou migração de banco DEVE ser documentada no cofre:
1. **Notas Atômicas:** Crie ou atualize as notas nas pastas temáticas (`🎨 Frontend`, `⚙️ Backend`, `🗄️ Banco de Dados`, etc.).
2. **YAML Frontmatter:** Inclua sempre `tags`, `aliases`, `created`, `updated`, `status`, `area` e `version`.
3. **Wikilinks Bidirecionais:** Interligue novos conceitos aos existentes usando `[[Nome da Nota]]`.
4. **Diagramas:** Use diagramas `mermaid` para fluxos de dados, máquinas de estado e relacionamentos ER.
5. **Changelog & MOCs:** Registre a entrega com a data no arquivo `📋 Changelog/Changelog.md` e mantenha os Mapas de Conteúdo (`MOC Frontend.md`, `MOC Backend.md`, `MOC Database.md`, `🏠 Home.md`) devidamente atualizados.

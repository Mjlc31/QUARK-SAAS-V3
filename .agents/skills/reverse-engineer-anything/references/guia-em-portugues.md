# Guia Prático de Engenharia Reversa com REA (pt-BR)

Este guia sintetiza as capacidades e fluxos de trabalho do REA (**Reverse Engineer Anything**) para uso pelos agentes e desenvolvedores no projeto.

---

## 1. O que é o REA?

O **REA** é um framework unificado (CLI e servidor MCP local) voltado para **engenharia reversa ética e reconstrução funcional de software**. Ele permite inspecionar aplicações compiladas ou empacotadas sem necessidade do código-fonte original, extraindo:
- Módulos, rotas, chamadas IPC e grafos de dependência em apps JavaScript / Electron (ASAR ou diretório descompactado).
- Pseudocódigo, assembly, símbolos, strings e referências cruzadas em binários nativos (via Ghidra, Hopper ou IDA).
- Estrutura de manifesto, classes, métodos e referências em APKs Android (via JADX headless).
- Inspeção estática de assemblies .NET (PE/CLI).
- Tráfego de rede gravado (HAR e mitmproxy) sem reenviar requisições reais.
- Mapeamento de recursos da Apple (plists, asset catalogs, Interface Builder nibs/storyboards).
- Metadados de compilação em binários Go.

---

## 2. Instalação e Execução da CLI

### Execução Imediata via NPX (sem instalação prévia)
```bash
# Analisar aplicativo Electron / JavaScript descompactado ou arquivo ASAR
npx -y rea-agents@latest analyze-javascript-application /caminho/para/app --json

# Inspecionar binário Go (ELF, PE, Mach-O)
npx -y rea-agents@latest inspect-go-binary /caminho/para/binario --json

# Inspecionar pacote de rede HAR
npx -y rea-agents@latest inspect-web-network-capture /caminho/para/arquivo.har --json
```

### Instalação Global da CLI
```bash
npm install --global rea-agents
rea --help
```

### Configuração Automática de Agentes
```bash
npx rea-agents setup
```

---

## 3. Principais Fluxos de Investigação

### A. Aplicativos Electron e JavaScript (ASAR / Web)
1. **Ponto de Partida**: Inspecione o pacote ASAR ou diretório com `analyze_javascript_application`.
2. **Resumo Primeiro**: Use `"detail": "summary"` para evitar sobrecarregar o contexto com megabytes de JSON.
3. **Paginação de Módulos**: Use `inspect_analysis_view` com o `evidence_id` retornado para folhear módulos específicos (`modules`, `offset`, `limit`).
4. **Rastreamento de Funcionalidades**: Localize a funcionalidade desejada (ex: busca, IPC, integração) com `trace_application_feature`, passando uma semente literal (nome de evento, canal IPC, rota ou string).
5. **Rastreamento Semântico**: Use `trace_javascript_semantics` para entender o fluxo de dados e mutações de estado sem executar o código.

### B. Binários Nativos (Mach-O, ELF, PE)
1. **Abertura de Sessão**: Use `open_binary` com o caminho local do binário.
2. **Visão Geral**: Chame `binary_overview` para mapear seções, bibliotecas vinculadas e símbolos exportados.
3. **Análise de Funções**: Use `analyze_function` informando o endereço ou símbolo da função de interesse para obter pseudocódigo descompilado e grafo de chamadas.
4. **Encerramento**: Sempre finalize a sessão com `close_binary`.

### C. APKs Android
1. **Pacote e Manifesto**: Inicie com `inspect_android_package` para obter declarações de atividades, permissões e serviços.
2. **Busca de Classes**: `search_android_classes` para filtrar classes candidatas.
3. **Descompilação**: `inspect_android_method` para visualizar a implementação de métodos específicos em Java.

---

## 4. Princípios Fundamentais do REA

1. **Evidência como Autoridade**: Toda conclusão deve citar o `evidence_id` correspondente retornado pelas ferramentas.
2. **Distinção Rigorosa**:
   - **Observação**: Fatos lidos diretamente dos bytes/arquivos (ex: strings, assinaturas, offsets).
   - **Inferência**: Relações estáticas deduzidas (ex: resolved import, call candidate).
   - **Incógnita (Unknown)**: O que não pôde ser determinado estaticamente (deve ser registrado com `record_unknown`).
3. **Reconstrução Limpa (Clean-Room)**: Use o conhecimento adquirido para escrever implementações originais, bem arquitetadas e tipadas em TypeScript/React/Node, sem copiar artefatos protegidos.

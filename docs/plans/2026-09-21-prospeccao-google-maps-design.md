# Design: Aba de Prospecção com Google Maps

## Objetivo
Criar uma nova funcionalidade no sistema Quark Energia focada na prospecção ativa de clientes. A aba permitirá aos usuários buscar leads no Google Maps baseado em segmentos e localização, com a capacidade de verificar manualmente a existência de painéis solares via imagens de satélite e adicionar os leads diretamente ao CRM.

## Decisões Arquiteturais

1. **Extração de Dados**:
   - Utilizaremos o `google-maps-scraper-kit` (Docker) hospedado no backend para extrair dados públicos do Google Maps.
   - Isso evita custos por requisição da API oficial do Google e contorna as limitações de scraping direto pelo Frontend.

2. **Fluxo de Integração (Frontend <-> Backend <-> Scraper)**:
   - O Frontend não se comunica com o Scraper.
   - A comunicação ocorre via Backend (Node.js/Express). O Backend receberá a requisição de busca, criará um *job* no Scraper local (`http://localhost:8080`), fará o *polling* do resultado, limpará os dados e os retornará estruturados para o Frontend.

3. **Verificação de Painel Solar**:
   - Optou-se pela **verificação manual** para manter a solução simples e econômica.
   - A interface terá um atalho "Ver Telhado" que redireciona o usuário para o Google Maps em visão de satélite na exata localização do *lead*.

## Design da Interface (UI/UX)

A aba "Prospecção" terá duas áreas:

### 1. Barra de Busca
- **Input Segmento**: Ex: "Padarias", "Supermercados".
- **Input Localização**: O usuário define a base da busca manualmente (Ex: "Centro, São Paulo").
- **Filtro**: Checkbox para retornar apenas locais abertos no momento.
- **Botão Buscar**: Aciona a busca com *feedback* visual (Loading/Spinner).

### 2. Tabela/Lista de Resultados
Colunas/Informações exibidas por lead:
- Nome da Empresa
- Avaliação (Rating / Número de Reviews)
- Endereço Completo
- Telefone
- **Ações**:
  - `👁️ Ver Telhado`: Abre `https://www.google.com/maps/search/?api=1&query={lat},{lng}` (ou URL equivalente com a query do endereço) em nova aba, focando no satélite.
  - `➕ Adicionar ao CRM`: Insere o lead na tabela de oportunidades/clientes do Supabase.

## Considerações Técnicas e Segurança
- **Rate Limit**: O Backend precisará lidar com possíveis falhas ou lentidões do Scraper, já que buscar no Google Maps pode demorar dependendo da "profundidade" (depth) da busca.
- O scraper deve rodar em um container isolado.

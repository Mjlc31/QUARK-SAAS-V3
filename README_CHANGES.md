## O que foi corrigido

1. **Seleção e Criação de Leads no Editor:**
   - O seletor de leads na aba de propostas agora puxa todos os dados diretamente do CRM real (tabela `opportunities`).
   - O botão "Cadastrar novo lead" agora abre um modal na própria tela de propostas. Ao preencher, ele cadastra a oportunidade direto no CRM e já seleciona o cliente para você seguir com a proposta.

2. **Atalho no CRM para Propostas:**
   - Ao abrir um lead/oportunidade no CRM, agora há um botão verde logo abaixo do nome do cliente escrito "Criar / Ver Proposta". Ele vai te levar direto pra página de propostas com o cliente já selecionado!

3. **Correção do UI de Economia (Imagem 2):**
   - O card que mostra a "Conta Hoje" vs "Conta com energia solar" e "Economia estimada" estava claro no modo escuro. Transformei ele em um card dark lindo, com gradiente sutil verde `emerald` que combina perfeitamente com a estética do sistema.

4. **Salvamento de Imagens e Equipamentos (Imagem 3):**
   - Havia duas falhas que impediam a persistência das imagens:
     - O bucket `media` (onde as fotos são guardadas) não estava configurado no seu banco de dados. Eu criei o bucket no seu Supabase e abri as permissões de acesso público e salvamento pra funcionar lindamente.
     - O conversor de PDF estava ignorando o link do inversor e módulo, o que impedia de exportá-los. Isso foi corrigido no código e as imagens agora fluirão perfeitamente na visualização e na impressão da proposta.

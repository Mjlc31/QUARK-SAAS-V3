import { jsPDF } from 'jspdf';
import { formatBrl } from './receipt';

export interface ContractPdfData {
  clientName: string;
  clientDoc: string;
  clientDocType: 'CPF' | 'CNPJ';
  clientAddress: string;
  powerKwp: number | string;
  moduleQty: number;
  moduleQtyExtenso: string;
  modulePowerWp: number;
  moduleBrand?: string;
  inverterQty: number;
  inverterQtyExtenso: string;
  inverterBrand: string;
  inverterPowerKw: number | string;
  structureType: string;
  utilityName: string;
  totalPrice: number;
  totalPriceExtenso: string;
  paymentConditionText: string;
  supplierName: string;
  forumCity: string;
  forumState: string;
  contractDateText: string;
}

/**
 * Gera e dispara o download do PDF oficial do Contrato Solar Quark
 * Diagramado para papel A4 com margens executivas, cabeçalho institucional,
 * texto justificado e assinaturas com validade jurídica.
 */
export function generateContractPdf(data: ContractPdfData): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginLeft = 20;
  const marginRight = 20;
  const contentWidth = pageWidth - marginLeft - marginRight; // 170mm
  const marginTop = 25;
  const marginBottom = 22;

  let y = marginTop;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
      drawHeaderFooter();
    }
  };

  const drawHeaderFooter = () => {
    const pageNum = doc.getNumberOfPages();
    // Cabeçalho institucional discreto a partir da página 2
    if (pageNum > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('QUARK ENERGIA • CONTRATO DE PRESTAÇÃO DE SERVIÇOS', marginLeft, 14);
      doc.setFont('helvetica', 'normal');
      doc.text(data.clientName ? data.clientName.toUpperCase() : 'CLIENTE', pageWidth - marginRight, 14, { align: 'right' });
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(marginLeft, 16, pageWidth - marginRight, 16);
    }

    // Rodapé institucional em todas as páginas
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, pageHeight - 14, pageWidth - marginRight, pageHeight - 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(
      'Quark Energia • CNPJ 55.138.256/0001-51 • Tel/WhatsApp: (82) 99424-1835 • projetos@quarkenergia.com.br',
      marginLeft,
      pageHeight - 9
    );
    doc.text(`Página ${pageNum}`, pageWidth - marginRight, pageHeight - 9, { align: 'right' });
  };

  const printParagraph = (text: string, options?: { isBold?: boolean; fontSize?: number; spaceAfter?: number; align?: 'left' | 'center' | 'justify' }) => {
    const fontSize = options?.fontSize ?? 9.5;
    const spaceAfter = options?.spaceAfter ?? 3.5;
    const isBold = options?.isBold ?? false;

    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);

    const lines = doc.splitTextToSize(text, contentWidth);
    const lineHeight = fontSize * 0.42;
    const totalHeight = lines.length * lineHeight;

    checkPageBreak(totalHeight + spaceAfter);

    if (options?.align === 'center') {
      lines.forEach((line: string) => {
        doc.text(line, pageWidth / 2, y, { align: 'center' });
        y += lineHeight;
      });
    } else {
      lines.forEach((line: string) => {
        doc.text(line, marginLeft, y);
        y += lineHeight;
      });
    }

    y += spaceAfter;
  };

  const printHeading = (title: string) => {
    checkPageBreak(12);
    y += 1.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(title, marginLeft, y);
    y += 5.5;
  };

  const printListItem = (bullet: string, text: string) => {
    const fontSize = 9;
    const lineHeight = fontSize * 0.42;
    const bulletWidth = 8;
    const textWidth = contentWidth - bulletWidth;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(fontSize);
    doc.setTextColor(30, 30, 30);

    const lines = doc.splitTextToSize(text, textWidth);
    const totalHeight = lines.length * lineHeight;

    checkPageBreak(totalHeight + 2);

    doc.text(bullet, marginLeft, y);
    doc.setFont('helvetica', 'normal');

    let currentY = y;
    lines.forEach((line: string) => {
      doc.text(line, marginLeft + bulletWidth, currentY);
      currentY += lineHeight;
    });

    y = currentY + 2;
  };

  // ── PÁGINA 1: Topo Institucional Timbrado ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(16, 185, 129); // Quark Green
  doc.text('QUARK ENERGIA', pageWidth / 2, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('CNPJ: 55.138.256/0001-51 • Engenharia & Soluções Fotovoltaicas', pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.8);
  doc.line(marginLeft, y, pageWidth - marginRight, y);
  y += 6;

  // Título do Contrato
  printParagraph(
    'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE FORNECIMENTO DE PROJETO DE ENGENHARIA, INSTALAÇÃO E COMISSIONAMENTO DE KIT DE MICROGERAÇÃO SOLAR CONECTADO À REDE.',
    { isBold: true, fontSize: 10, align: 'center', spaceAfter: 6 }
  );

  // Qualificação das Partes
  printParagraph(
    'CONTRATADA: QUARK ENERGIA, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 55.138.256/0001-51 localizada na Rua Paulo Henrique Mendes, CEP 57.081-520, neste ato representada por seu Diretor Técnico José Anderson da Silva Alves, brasileiro, inscrito no CPF sob o número: 084.960.164-98.',
    { spaceAfter: 3 }
  );

  const clientQualifier =
    data.clientDocType === 'CNPJ'
      ? `inscrita no CNPJ sob o nº ${data.clientDoc || '____________________'}, com sede na ${data.clientAddress || '____________________'}`
      : `inscrito(a) no CPF sob o nº ${data.clientDoc || '____________________'}, com residência na ${data.clientAddress || '____________________'}`;

  printParagraph(
    `CONTRATANTE: ${(data.clientName || '____________________').toUpperCase()}, ${clientQualifier}.`,
    { spaceAfter: 5 }
  );

  // Cláusula Primeira - Do Objeto
  printHeading('CLÁUSULA PRIMEIRA - DO OBJETO');
  const kwpStr = typeof data.powerKwp === 'number' ? data.powerKwp.toFixed(2).replace('.', ',') : String(data.powerKwp || '0,00');
  const valorNumStr = formatBrl(data.totalPrice).replace('R$', '').trim();

  const objText = `1. O presente contrato tem como objetivo o fornecimento do projeto técnico fotovoltaico, conforme resolução 482 da ANEEL, tratando-se de um sistema com potência instalada de ${kwpStr} kWp, sendo ${data.moduleQty} (${data.moduleQtyExtenso}) módulos fotovoltaicos de ${data.modulePowerWp} Wp e ${data.inverterQty} (${data.inverterQtyExtenso}) Inversor ${data.inverterBrand} de ${data.inverterPowerKw} kW, além de estrutura de fixação para ${data.structureType.toLowerCase()}, o registro, acompanhamento e aprovação do projeto junto à concessionária local ${data.utilityName}. Ademais, inclui-se o acompanhamento do procedimento de acesso, testes elétricos, primeira utilização e visita técnica para coleta dos dados necessários para início do projeto.`;
  printParagraph(objText, { spaceAfter: 5 });

  // Cláusula Segunda - Dos Serviços
  printHeading('CLÁUSULA SEGUNDA - DOS SERVIÇOS');
  printParagraph('2. É de competência da CONTRATADA a prestação dos seguintes serviços:', { spaceAfter: 3 });

  const services = [
    'Memorial descritivo;',
    'Diagrama unifilar e/ou trifilar;',
    'Troca do tipo de fornecimento da unidade geradora junto a concessionária;',
    'Layout da cobertura;',
    'Layout do inversor;',
    'Layout de montagem da String Box;',
    'Planta de localização;',
    'Emissão de ART do projeto;',
    'Parecer da visita técnica;',
    'Manutenção, monitoramento e limpeza gratuita por 1 ano;',
    'Fornecimento e instalação de materiais elétricos (Quadro CC e Quadro CA);',
    'Fornecimento e instalação de estrutura para suporte dos módulos fotovoltaicos;',
    'Fornecimento e instalação de componentes elétricos para conexão dos módulos FV, quadros CC, inversores e quadro baixa tensão;',
    'Teste de funcionalidade e entrega de conformidade da usina;',
    `Fornecimento de ${data.moduleQty} módulos fotovoltaicos;`,
    `Fornecimento de ${data.inverterQty} Inversor(es).`,
  ];

  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
  services.forEach((srv, idx) => {
    printListItem(`${letters[idx]}.`, srv);
  });
  y += 2;

  // Cláusula Terceira - Dos Valores e Forma de Pagamento
  printHeading('CLÁUSULA TERCEIRA - DOS VALORES E FORMA DE PAGAMENTO');
  printParagraph(
    `3. Pela prestação dos serviços, o CONTRATANTE pagará à CONTRATADA a quantia total de R$ ${valorNumStr} (${data.totalPriceExtenso}), na seguinte condição:`,
    { spaceAfter: 3 }
  );

  const condPag = data.paymentConditionText.trim()
    ? data.paymentConditionText.trim().replace(/\.?$/, '.')
    : `O CONTRATANTE pagará o valor de R$ ${valorNumStr} (${data.totalPriceExtenso}) à vista, via PIX, diretamente para a CONTRATADA, no ato da assinatura deste contrato.`;
  printParagraph(`3.1. ${condPag}`, { spaceAfter: 5 });

  // Cláusula Quarta - Dos Prazos
  printHeading('CLÁUSULA QUARTA – DOS PRAZOS');
  printParagraph('4. Com a assinatura do presente contrato, atribuem-se os seguintes prazos:', { spaceAfter: 3 });

  printListItem(
    'i.',
    'Fornecimento: a aquisição do kit fotovoltaico será feita em até 5 (cinco) dias úteis após a assinatura do contrato. O prazo para entrega é de até 20 (vinte) dias úteis a partir da confirmação do pedido.'
  );
  printListItem('•', 'Projeto: Até 5 (cinco) dias úteis a contar da data de assinatura do contrato;');
  printListItem(
    'ii.',
    `Formalização: A solicitação de acesso ao sistema de distribuição da concessionária local (${data.utilityName}) será feita e o parecer de acesso será aprovado, sendo obtido perante a concessionária local, dando direito à execução do projeto. Dessa forma, a autorização para o início da execução dos serviços (Parecer de Acesso) é ato exclusivo da concessionária local que, de acordo com a Resolução nº 482/2012 da ANEEL, é de até 15 (quinze) dias após o recebimento de acesso, para central geradora classificada como microgeração distribuída, quando não houver necessidade de melhorias ou reforços no sistema de distribuição acessado. Quando houver necessidade de execução de obras de melhoria ou reforço no sistema de distribuição, o prazo para emissão do Parecer de Acesso é de até 30 (trinta) dias após o recebimento da solicitação de acesso.`
  );
  printListItem(
    'iii.',
    'Instalação e Comissionamento: em 15 (quinze) dias, a contar da entrega do kit fotovoltaico no local de execução da instalação, salvo condições climáticas adversas que impeçam ou dificultem os serviços.'
  );
  printListItem(
    'iv.',
    `Vistoria das instalações de conexão: em até 7 (sete) dias contados da data de solicitação formal junto à Concessionária. A solicitação da vistoria será feita após a aprovação do projeto, emissão do Parecer de Acesso pela ${data.utilityName}, conclusão da instalação e realização de todos os testes e comissionamento;`
  );
  printListItem(
    'v.',
    `Documentação: em até 5 (cinco) dias úteis após a aprovação da vistoria e liberação para funcionamento pela ${data.utilityName}.`
  );

  printParagraph(
    'Parágrafo único. O fornecimento do equipamento objeto deste contrato ocorrerá em sincronia com os prazos de realização dos serviços.',
    { spaceAfter: 2 }
  );
  printParagraph(
    '*Os prazos acima descritos serão atendidos, salvo se no local da instalação não estiver atendendo aos padrões de entrada da Concessionária de Energia.',
    { spaceAfter: 5 }
  );

  // Cláusula Quinta - Das Garantias
  printHeading('CLÁUSULA QUINTA - DAS GARANTIAS');
  printParagraph(
    '5. As garantias dos módulos fotovoltaicos e dos inversores/micro inversores ficarão sob responsabilidade da empresa FORNECEDORA, a Nota Fiscal de compra terá validade como garantia dos materiais e equipamentos descritos no Anexo I, estabelecido e listado na sua proposta. Havendo defeitos de fábrica que interfiram no seu bom funcionamento, a FORNECEDORA será responsável pela reposição dos equipamentos e/ou componentes nos locais indicados para a instalação, dentro dos prazos de garantias autorizadas pelo fabricante.',
    { spaceAfter: 3 }
  );

  printParagraph(
    `5.1 A FORNECEDORA (${data.supplierName}), através do fabricante, oferecerá garantia dos módulos solares fotovoltaicos pelo prazo de 15 (quinze) anos contra defeitos de fabricação e garantia linear de produção de 25 (vinte e cinco) anos com entrega mínima de 84% (oitenta e quatro por cento) da capacidade total do módulo.`,
    { spaceAfter: 3 }
  );

  printParagraph(
    `5.2 A FORNECEDORA (${data.supplierName}), através do fabricante, oferecerá a garantia do inversor de 10 (dez) anos contra defeitos de fabricação.`,
    { spaceAfter: 3 }
  );

  printParagraph(
    '5.3 As garantias das estruturas de fixação em alumínio são de 15 (quinze) anos. Por sua vez, os cabos solares e conectores possuem garantia de 5 (cinco) anos e a caixa de proteção tem garantia de 1 (um) ano contra defeitos de fabricação, por parte dos fabricantes.',
    { spaceAfter: 3 }
  );

  printParagraph(
    '5.4 Os serviços de instalação do sistema têm garantia de 1 (um) ano por parte da CONTRATADA.',
    { spaceAfter: 3 }
  );

  printParagraph(
    '5.5 Ocorrerá anulação das garantias se houver intervenção no sistema fotovoltaico pela CONTRATANTE ou por terceiros (sendo eles profissionais ou não) que não forem indicados pela CONTRATADA para instalação do sistema.',
    { spaceAfter: 5 }
  );

  // Cláusula Sexta - Das Obrigações da Contratada
  printHeading('CLÁUSULA SEXTA - DAS OBRIGAÇÕES DA CONTRATADA');
  printParagraph('6. A contratada se vincula aos seguintes termos:', { spaceAfter: 3 });
  printListItem('a.', 'A CONTRATADA se compromete a fornecer os equipamentos e executar a instalação dos itens contidos na Cláusula 1ª deste contrato.');
  printListItem('b.', 'Utilizar equipamentos adequados à realização dos serviços e pessoal qualificado, assumindo plena e exclusiva responsabilidade por sua contratação, eximindo a CONTRATANTE de qualquer responsabilidade.');
  printListItem('c.', 'Executar as atividades necessárias à implantação do empreendimento de modo a não interferir desnecessária ou indevidamente com instalações ou serviços já existentes.');
  printListItem('d.', 'Prestar informação adequada e clara ao CONTRATANTE sobre os produtos e serviços.');
  printListItem('e.', 'A CONTRATADA fornecerá consultoria e assessoria jurídica ao CONTRATANTE através de seu procurador judicial para questões jurídicas relativas à relação entre o CONTRATANTE e a concessionária de Energia Elétrica responsável pela região, sem custos adicionais.');
  y += 2;

  // Cláusula Sétima - Das Obrigações do Contratante
  printHeading('CLÁUSULA SÉTIMA - DAS OBRIGAÇÕES DO CONTRATANTE');
  printParagraph('7. O contratante possui as seguintes obrigações:', { spaceAfter: 3 });
  printListItem('a.', 'Efetuar os pagamentos à CONTRATADA, de forma tempestiva, nos termos deste Contrato.');
  printListItem('b.', 'Fornecer à CONTRATADA todas as informações solicitadas para o cumprimento integral do presente contrato, estando ciente de que a omissão de quaisquer informações poderá comprometer a qualidade do resultado do projeto;');
  printListItem('c.', 'Pagar os custos do projeto advindos do atraso ocorrido por ação sua, a exemplo de cancelamento de visitas, atraso na entrega de documentos solicitados ou mudanças não programadas no planejamento do presente contrato;');
  printListItem('d.', 'Liberar a entrada dos profissionais para a execução dos serviços de instalação nas áreas do imóvel para isso necessárias.');
  printListItem('e.', 'Providenciar a disponibilização dos pontos de energia.');
  printListItem('f.', 'Receber e armazenar os equipamentos entregues pela CONTRATADA de forma segura durante a etapa de instalação, zelando pela sua guarda e respondendo por eventuais perdas e danos. Eventuais restrições implicam atrasos consideráveis de responsabilidade do CONTRATANTE.');
  printListItem('g.', 'Garantir que o local do serviço não possua nenhuma inconformidade na instalação elétrica que interfira ou impeça a instalação, ou que danifique o equipamento de energia solar. Caso contrário a CONTRATANTE deverá readequar as instalações a pedido da CONTRATADA;');
  printListItem('h.', 'Quaisquer necessidades de obras de reforço estrutural ou adequação de infraestrutura serão apontadas pela CONTRATADA, durante a visita técnica, devendo ser sanadas pela CONTRATANTE. Tendo em vista, como exposto na proposta contratual, que o pré-orçamento não cobre essas necessidades.');
  printListItem('i.', 'Na indisponibilidade de local no imóvel do CONTRATANTE para receber e armazenar em segurança os equipamentos, materiais e componentes do sistema gerador, a partir da data estabelecida para a instalação, este deverá providenciar depósito alternativo para entrega imediata, cabendo-lhe os ônus respectivos, bem como a obrigação de transportar para o local da instalação posteriormente;');

  printParagraph('7.1 Não compete à CONTRATADA:', { isBold: true, spaceAfter: 3 });
  printListItem('I.', 'Realizar mais que 1 (uma) modificação ao final da elaboração do projeto fotovoltaico; a) Caso a CONTRATANTE deseje mais modificações que o previsto, esta estará ciente que poderá acarretar acréscimos de prazo e preço do projeto, sendo de inteira e única responsabilidade do próprio.');
  printListItem('II.', 'Realizar o processo de legalização da obra ou do empreendimento perante qualquer instância.');
  printListItem('III.', 'Fornecimento de telha;');
  printListItem('IV.', 'Obras de transmissão de energia em linha aérea;');
  printListItem('V.', 'Estrutura mecânica de reforço de telhado;');
  printListItem('VI.', 'Reforma no padrão de entrada da unidade consumidora;');
  printListItem('VII.', 'Instalação de internet no local para ser estabelecido o monitoramento da Usina;');
  printListItem('VIII.', 'Obras civis.');
  y += 2;

  // Cláusula Oitava - Da Extinção Contratual
  printHeading('CLÁUSULA OITAVA - DA EXTINÇÃO CONTRATUAL');
  printParagraph('8. É assegurado às partes rescindir o presente contrato antes do término do prazo.', { spaceAfter: 3 });
  printParagraph('8.1 Em caso de inadimplemento por parte do CONTRATANTE quanto ao pagamento dos produtos fornecidos e serviços prestados, deverá incidir, sobre o valor do presente instrumento, multa moratória de 2% (dois por cento), juros de mora de 1% (um por cento) ao mês, além de correção monetária.', { spaceAfter: 3 });
  printParagraph('8.2 Em caso de cobrança extrajudicial, devem ser acrescidas custas processuais e 20% (vinte por cento) de honorários advocatícios.', { spaceAfter: 3 });
  printParagraph('8.3 A parte que descumprir qualquer cláusula estabelecida neste instrumento, exceto aquelas relativas ao preço e condições de pagamento, se responsabilizará por multa de 2% (dois por cento) do valor total do presente contrato.', { spaceAfter: 3 });
  printParagraph('8.4 Em caso de ação judicial, devem ser acrescidas custas processuais e 20% (vinte por cento) de honorários advocatícios.', { spaceAfter: 5 });

  // Cláusula Nona - Das Disposições Gerais
  printHeading('CLÁUSULA NONA - DAS DISPOSIÇÕES GERAIS');
  printParagraph('9. O presente contrato é celebrado em caráter irrevogável e irretratável e obriga as partes e seus eventuais sucessores de qualquer título.', { spaceAfter: 3 });
  printParagraph('9.1 A CONTRATADA é pessoa jurídica de direito privado formalmente constituída, de modo que inexiste qualquer espécie de vínculo, inclusive trabalhista, entre os diretores e/ou os funcionários e prepostos das CONTRATADAS e da CONTRATANTE.', { spaceAfter: 3 });
  printParagraph('9.2 Os direitos e obrigações decorrentes do presente contrato não poderão ser cedidos ou transferidos, total ou parcialmente, a terceiros, a qualquer título, salvo por concordância prévia e expressa da outra parte.', { spaceAfter: 3 });
  printParagraph('9.3 É vedado à CONTRATADA utilizar o presente objeto contratual em garantias para transações, inclusive bancárias e/ou financeiras de qualquer espécie, efetuarem operação de desconto, negociarem, repassarem ou de qualquer forma cederem os créditos decorrentes da execução desse a bancos, empresas de “factoring” ou terceiros, sem prévia autorização por escrito da CONTRATANTE.', { spaceAfter: 3 });
  printParagraph('9.4 Se qualquer disposição deste contrato for declarada ou considerada ilegal, inexequível ou nula, as partes deverão, de comum acordo, alterar este contrato, modificando a referida disposição para torná-la legal e exequível devendo preservar o seu objetivo, ou, se não for possível, substituí-la por outra disposição que seja legal e exequível e atinja objetivo semelhante.', { spaceAfter: 3 });
  printParagraph('9.5 O presente contrato não poderá ser, em todo ou em qualquer parte, alterado, modificado ou rescindido oralmente. Qualquer alteração, modificação, rescisão ou renúncia relativa a este contrato, deverá ser feita apenas por instrumento escrito e assinado pelas partes, o qual será parte integrante e inseparável deste contrato.', { spaceAfter: 3 });
  printParagraph('9.6 Este instrumento de contrato serve como título executivo extrajudicial, nos termos do inciso III, art. 784, do Código de Processo Civil de 2015.', { spaceAfter: 3 });
  printParagraph('9.7 Em caso de ocorrência de fatos não previstos neste contrato, a solução do impasse será dada através da aplicação de lei ou princípio que regule o caso, não sendo configurada a presente relação como de consumo.', { spaceAfter: 5 });

  // Cláusula Décima - Do Foro e Assinaturas
  printHeading('CLÁUSULA DÉCIMA - DO FORO');
  printParagraph(
    `10. As partes elegem o foro da Comarca de ${data.forumCity} no Estado de ${data.forumState}, para nele serem dirimidas todas e quaisquer dúvidas ou questões oriundas do presente contrato, renunciando a qualquer outro, por mais especial e privilegiado que seja.`,
    { spaceAfter: 3 }
  );

  printParagraph('Por estarem assim justos e contratados, firmam o presente instrumento, em 3 (três) vias de igual teor.', { spaceAfter: 4 });

  printParagraph(`${data.forumCity} - ${data.forumState}, ${data.contractDateText}.`, { spaceAfter: 12 });

  // Bloco de Assinaturas (evita quebrar no rodapé)
  checkPageBreak(40);

  const signWidth = 75;
  const col1Left = marginLeft + 5;
  const col2Left = pageWidth - marginRight - signWidth - 5;

  // Linhas das assinaturas
  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.4);
  doc.line(col1Left, y, col1Left + signWidth, y);
  doc.line(col2Left, y, col2Left + signWidth, y);
  y += 4.5;

  // Texto da assinatura do Contratante
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 20, 20);
  doc.text('CONTRATANTE', col1Left + signWidth / 2, y, { align: 'center' });
  doc.text('CONTRATADA', col2Left + signWidth / 2, y, { align: 'center' });
  y += 4;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(40, 40, 40);
  doc.text((data.clientName || 'CONTRATANTE').toUpperCase(), col1Left + signWidth / 2, y, { align: 'center' });
  doc.text('QUARK ENERGIA', col2Left + signWidth / 2, y, { align: 'center' });
  y += 3.5;

  doc.text(`${data.clientDocType}: ${data.clientDoc || '____________________'}`, col1Left + signWidth / 2, y, { align: 'center' });
  doc.text('CNPJ: 55.138.256/0001-51', col2Left + signWidth / 2, y, { align: 'center' });
  y += 3.5;

  doc.text('Por seu Diretor Técnico: José Anderson da Silva Alves', col2Left + signWidth / 2, y, { align: 'center' });

  // Desenha rodapés em todas as páginas criadas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawHeaderFooter();
  }

  return doc;
}

/**
 * Dispara o download imediato do PDF no navegador
 */
export function downloadContractPdf(data: ContractPdfData, filename?: string): void {
  const doc = generateContractPdf(data);
  const cleanName = data.clientName ? data.clientName.trim().toUpperCase().replace(/[^\w\s-]/g, '') : 'CLIENTE';
  const name = filename || `CONTRATO - ${cleanName}.pdf`;
  doc.save(name);
}

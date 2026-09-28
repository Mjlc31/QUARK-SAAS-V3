import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, ClientInfoContent, HowItWorksContent, TechSpecsContent,
  GenerationChartContent, EconomyContent, ROIContent, SocialProofContent, ContactContent
} from './types';

Font.registerHyphenationCallback((word) => [word]);

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtNum(v: number, dec = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

function getPdfFont(isBold: boolean = false) {
  return isBold ? 'Times-Bold' : 'Times-Roman';
}

function getSansFont(isBold: boolean = false) {
  return isBold ? 'Helvetica-Bold' : 'Helvetica';
}

const getStyles = (isDark: boolean, pri: string) => {
  const BG = isDark ? '#09090b' : '#ffffff';
  const SURFACE = isDark ? '#18181b' : '#f8fafc';
  const BORDER = isDark ? '#27272a' : '#e2e8f0';
  const TEXT_H = isDark ? '#ffffff' : '#0f172a';
  const MUTED = isDark ? '#a1a1aa' : '#64748b';

  return StyleSheet.create({
    page: { backgroundColor: BG, color: TEXT_H, paddingTop: 0, paddingBottom: 0 },
    section: { padding: '60 50' },
    sectionTag: { fontSize: 8, fontFamily: getSansFont(true), letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase', color: pri },
    sectionH2: { fontSize: 32, fontFamily: getPdfFont(true), color: TEXT_H, marginBottom: 12, lineHeight: 1.2 },
    sectionSub: { fontSize: 11, fontFamily: getSansFont(), color: MUTED, lineHeight: 1.6, marginBottom: 32, maxWidth: 450 },
    kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 24 },
    kpiCard: { flex: 1, minWidth: '45%', backgroundColor: SURFACE, padding: 20, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: pri },
    kpiLabel: { fontSize: 8, fontFamily: getSansFont(true), color: MUTED, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    kpiValue: { fontSize: 20, fontFamily: getPdfFont(true), color: TEXT_H },
    table: { width: '100%', marginTop: 24 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
    tableHeaderRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER, backgroundColor: SURFACE },
    tableCell: { flex: 1, fontSize: 10, fontFamily: getSansFont(), color: TEXT_H, paddingHorizontal: 8 },
    tableHeaderCell: { flex: 1, fontSize: 9, fontFamily: getSansFont(true), color: MUTED, textTransform: 'uppercase', paddingHorizontal: 8 },
    coverBody: { padding: '80 50', flex: 1, justifyContent: 'center' },
    coverTitle: { fontSize: 48, fontFamily: getPdfFont(true), color: TEXT_H, lineHeight: 1.1, marginBottom: 24 },
    coverTagline: { fontSize: 10, fontFamily: getSansFont(true), color: pri, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 40 },
    coverCard: { backgroundColor: SURFACE, padding: 30, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: pri },
    contactBox: { marginTop: 40, backgroundColor: SURFACE, padding: 24, borderRadius: 4 },
    contactRow: { flexDirection: 'row', marginBottom: 12 },
    contactLabel: { width: 100, fontSize: 10, fontFamily: getSansFont(true), color: MUTED },
    contactValue: { flex: 1, fontSize: 10, fontFamily: getSansFont(), color: TEXT_H },
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    imageCard: { flex: 1, minWidth: '45%', backgroundColor: SURFACE, padding: 12, borderRadius: 4 },
    imageStyle: { width: '100%', height: 180, objectFit: 'cover', borderRadius: 4, marginBottom: 12 },
    imageCaption: { fontSize: 10, fontFamily: getSansFont(true), color: TEXT_H, textAlign: 'center' },
  });
};

const PDFCover = ({ content, styles, theme }: { content: CoverContent, styles: any, theme: ProposalTheme }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverBody}>
      {theme.logoUrl && <Image src={theme.logoUrl} style={{ width: 120, height: 60, objectFit: 'contain', marginBottom: 20 }} />}
      <Text style={styles.coverTagline}>{content.tagline || 'Proposta Comercial'}</Text>
      <Text style={styles.coverTitle}>Proposta de Energia Solar</Text>
      
      <View style={styles.coverCard}>
        <Text style={{ fontSize: 12, fontFamily: getSansFont(true), color: styles.sectionTag.color, marginBottom: 16 }}>DADOS DO CLIENTE</Text>
        <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: styles.page.color, marginBottom: 8 }}>{content.clientName}</Text>
        <Text style={{ fontSize: 12, fontFamily: getSansFont(), color: styles.sectionSub.color }}>{content.city} • {content.date}</Text>
      </View>

      <View style={[styles.kpiGrid, { marginTop: 40 }]}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Potência do Sistema</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.systemSizeKw)} kWp</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Investimento</Text>
          <Text style={styles.kpiValue}>{fmtCurrency(content.finalPrice)}</Text>
        </View>
      </View>
    </View>
  </Page>
);

const PDFClientInfo = ({ content, styles }: { content: ClientInfoContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Informações Gerais</Text>
      <Text style={styles.sectionH2}>Dados do Cliente</Text>
      <Text style={styles.sectionSub}>Detalhes do titular e local da instalação.</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Nome</Text>
          <Text style={styles.kpiValue}>{content.clientName}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Cidade</Text>
          <Text style={styles.kpiValue}>{content.city}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Consumo Médio</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.consumption, 0)} kWh/mês</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Conexão</Text>
          <Text style={styles.kpiValue}>{content.connectionType?.toUpperCase() || 'TRI'}</Text>
        </View>
      </View>
    </View>
  </Page>
);

const PDFHowItWorks = ({ content, styles }: { content: HowItWorksContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Processo</Text>
      <Text style={styles.sectionH2}>{content.title}</Text>
      <Text style={styles.sectionSub}>{content.subtitle}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Etapa</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Prazo</Text>
        </View>
        {content.steps.map((step, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 2, fontFamily: getSansFont(true) }]}>{i + 1}. {step.label}</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: styles.sectionSub.color }]}>{step.duration}</Text>
          </View>
        ))}
      </View>
    </View>
  </Page>
);

const PDFTechSpecs = ({ content, styles }: { content: TechSpecsContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Engenharia</Text>
      <Text style={styles.sectionH2}>Ficha Técnica</Text>
      <Text style={styles.sectionSub}>Especificações dos equipamentos dimensionados para a sua unidade consumidora.</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Módulos</Text>
          <Text style={styles.kpiValue}>{content.modulesCount}x {content.modulePower}W</Text>
          <Text style={{ fontSize: 9, color: styles.sectionSub.color, marginTop: 4 }}>{content.moduleBrand}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Inversor</Text>
          <Text style={styles.kpiValue}>{content.inverterCount}x {content.inverterPower}kW</Text>
          <Text style={{ fontSize: 9, color: styles.sectionSub.color, marginTop: 4 }}>{content.inverterBrand}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Potência Total</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.systemSizeKw)} kWp</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Área Necessária</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.roofArea, 0)} m²</Text>
        </View>
      </View>
    </View>
  </Page>
);

const PDFGenerationChart = ({ content, styles }: { content: GenerationChartContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Energia</Text>
      <Text style={styles.sectionH2}>{content.title}</Text>
      <Text style={styles.sectionSub}>{content.subtitle || 'Projeção de geração, consumo e saldo.'}</Text>

      <View style={styles.table}>
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Mês</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Geração</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Consumo</Text>
          <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Saldo</Text>
        </View>
        {content.data.map((row, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[styles.tableCell, { flex: 1, fontFamily: getPdfFont(true) }]}>{row.month}</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{fmtNum(row.generation, 0)} kWh</Text>
            <Text style={[styles.tableCell, { flex: 1.5 }]}>{fmtNum(row.consumption, 0)} kWh</Text>
            <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: row.balance >= 0 ? '#10b981' : '#ef4444' }]}>
              {row.balance > 0 ? '+' : ''}{fmtNum(row.balance, 0)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  </Page>
);

const PDFEconomy = ({ content, styles }: { content: EconomyContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Viabilidade</Text>
      <Text style={styles.sectionH2}>Economia Gerada</Text>
      <Text style={styles.sectionSub}>Resumo financeiro de quanto você deixará de pagar à concessionária.</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Fatura Atual (Média)</Text>
          <Text style={styles.kpiValue}>{fmtCurrency(content.currentBill)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Nova Fatura Estimada</Text>
          <Text style={styles.kpiValue}>{fmtCurrency(content.newBill)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.kpiLabel}>Economia Mensal</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{fmtCurrency(content.monthlySavings)}</Text>
        </View>
        <View style={[styles.kpiCard, { borderLeftColor: '#10b981' }]}>
          <Text style={styles.kpiLabel}>Economia Anual</Text>
          <Text style={[styles.kpiValue, { color: '#10b981' }]}>{fmtCurrency(content.annualSavings)}</Text>
        </View>
      </View>

      <View style={[styles.coverCard, { marginTop: 24, borderLeftColor: '#10b981' }]}>
        <Text style={{ fontSize: 12, fontFamily: getSansFont(true), color: styles.sectionSub.color, marginBottom: 8, textTransform: 'uppercase' }}>
          Economia Total em 25 Anos
        </Text>
        <Text style={{ fontSize: 32, fontFamily: getPdfFont(true), color: '#10b981' }}>
          {fmtCurrency(content.totalSavings25Years)}
        </Text>
      </View>
    </View>
  </Page>
);

const PDFROI = ({ content, styles }: { content: ROIContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Investimento</Text>
      <Text style={styles.sectionH2}>Retorno e Sustentabilidade</Text>
      <Text style={styles.sectionSub}>Análise de investimento e impacto ambiental do seu gerador solar.</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Payback (Retorno)</Text>
          <Text style={styles.kpiValue}>{content.paybackYears} anos</Text>
          <Text style={{ fontSize: 9, color: styles.sectionSub.color, marginTop: 4 }}>e {content.paybackMonths} meses</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Taxa Interna de Retorno</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.tir, 1)}%</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Árvores Salvas (25 anos)</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.treesEquivalent, 0)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>CO2 Evitado (Ton)</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.co2EvitedTon25Years, 1)} t</Text>
        </View>
      </View>
    </View>
  </Page>
);

const PDFSocialProof = ({ content, styles, theme }: { content: SocialProofContent, styles: any, theme: ProposalTheme }) => {
  const metrics = theme.socialMetrics || content.metrics || [
    { label: '+500', sub: 'Projetos Entregues' },
    { label: '100%', sub: 'Satisfação' },
    { label: '25 Anos', sub: 'Garantia de Geração' },
  ];

  return (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Nossa Qualidade</Text>
      <Text style={styles.sectionH2}>{content.headline}</Text>
      <Text style={styles.sectionSub}>{content.subheadline}</Text>

      <View style={[styles.kpiGrid, { marginBottom: 30 }]}>
        {metrics.map((m: any, i: number) => (
          <View key={i} style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{m.label}</Text>
            <Text style={styles.kpiLabel}>{m.sub}</Text>
          </View>
        ))}
      </View>

      {content.images && content.images.length > 0 && (
        <View style={styles.imageGrid}>
          {content.images.slice(0, 4).map((img, i) => (
            <View key={i} style={styles.imageCard}>
              <Image src={img.url} style={styles.imageStyle} />
              <Text style={styles.imageCaption}>{img.caption}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  </Page>
)};

const PDFContact = ({ content, styles, theme }: { content: ContactContent, styles: any, theme: ProposalTheme }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Vamos em frente?</Text>
      <Text style={styles.sectionH2}>Contato</Text>
      <Text style={styles.sectionSub}>Fale com a gente para darmos o próximo passo.</Text>

      <View style={styles.contactBox}>
        <Text style={{ fontSize: 16, fontFamily: getPdfFont(true), color: styles.page.color, marginBottom: 16 }}>{theme.companyName || content.companyName || 'QUARK ENERGIA'}</Text>
        
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>Telefone / WhatsApp</Text>
          <Text style={styles.contactValue}>{theme.companyPhone || content.companyPhone || '(00) 00000-0000'}</Text>
        </View>
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>E-mail</Text>
          <Text style={styles.contactValue}>{theme.companyEmail || content.companyEmail || 'contato@quarkenergia.com.br'}</Text>
        </View>
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>Endereço</Text>
          <Text style={styles.contactValue}>{theme.companyAddress || content.companyAddress || 'Av. Principal, 1000 - Centro'}</Text>
        </View>
        <View style={styles.contactRow}>
          <Text style={styles.contactLabel}>CNPJ</Text>
          <Text style={styles.contactValue}>{theme.companyCnpj || content.companyCnpj || '00.000.000/0001-00'}</Text>
        </View>
        
        <View style={{ marginTop: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: styles.tableRow.borderBottomColor }}>
          <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: styles.sectionSub.color, marginBottom: 8, textTransform: 'uppercase' }}>Condições</Text>
          <Text style={{ fontSize: 10, fontFamily: getSansFont(), color: styles.page.color }}>Proposta válida por {content.validityDays} dias a partir da data de emissão.</Text>
        </View>
      </View>
    </View>
  </Page>
);

interface ProposalPDFProps {
  blocks: ProposalBlock[];
  theme: ProposalTheme;
  clientName?: string;
}

export default function ProposalPDF({ blocks, theme, clientName: propClientName }: ProposalPDFProps) {
  const isDark = theme.mode === 'dark';
  const pri = theme.primaryColor || '#a3e635';
  const styles = getStyles(isDark, pri);

  // Busca nome do cliente para o título, se possível.
  const coverBlock = blocks.find(b => b.type === 'cover');
  const clientName = propClientName || (coverBlock ? (coverBlock.content as CoverContent).clientName : 'Cliente');

  return (
    <Document
      title={`Proposta Comercial — ${clientName}`}
      author="Quark Energia"
      subject="Proposta de Energia Solar"
      creator="Quark OS"
    >
      {blocks.map((block) => {
        switch (block.type) {
          case 'cover':
            return <PDFCover key={block.id} content={block.content as CoverContent} styles={styles} theme={theme} />;
          case 'client_info':
            return <PDFClientInfo key={block.id} content={block.content as ClientInfoContent} styles={styles} />;
          case 'how_it_works':
            return <PDFHowItWorks key={block.id} content={block.content as HowItWorksContent} styles={styles} />;
          case 'tech_specs':
            return <PDFTechSpecs key={block.id} content={block.content as TechSpecsContent} styles={styles} />;
          case 'generation_chart':
            return <PDFGenerationChart key={block.id} content={block.content as GenerationChartContent} styles={styles} />;
          case 'economy':
            return <PDFEconomy key={block.id} content={block.content as EconomyContent} styles={styles} />;
          case 'roi':
            return <PDFROI key={block.id} content={block.content as ROIContent} styles={styles} />;
          case 'social_proof':
            return <PDFSocialProof key={block.id} content={block.content as SocialProofContent} styles={styles} theme={theme} />;
          case 'contact':
            return <PDFContact key={block.id} content={block.content as ContactContent} styles={styles} theme={theme} />;
          default:
            return null;
        }
      })}
    </Document>
  );
}

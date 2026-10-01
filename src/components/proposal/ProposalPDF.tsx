import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, Font
} from '@react-pdf/renderer';
import {
  ProposalBlock, ProposalTheme, FontFamily,
  CoverContent, ClientInfoContent, HowItWorksContent, TechSpecsContent,
  GenerationChartContent, EconomyContent, ROIContent, SocialProofContent, ContactContent,
  ROOF_TYPE_LABELS
} from './types';

// ── Google Fonts Registration for PDF ─────────────────────────
// Each font is registered twice: 'FontName' (regular) + 'FontNameB' (bold)
// This preserves backward compat with getPdfFont(true) / getSansFont(true)
const FONT_CDN = 'https://cdn.jsdelivr.net/npm/@fontsource';
const PDF_FONTS: Array<{ id: string; pkg: string }> = [
  { id: 'Inter', pkg: 'inter' },
  { id: 'Montserrat', pkg: 'montserrat' },
  { id: 'Poppins', pkg: 'poppins' },
  { id: 'Raleway', pkg: 'raleway' },
  { id: 'DMSans', pkg: 'dm-sans' },
  { id: 'Playfair', pkg: 'playfair-display' },
  { id: 'SpaceGrotesk', pkg: 'space-grotesk' },
];

PDF_FONTS.forEach(({ id, pkg }) => {
  Font.register({ family: id, src: `${FONT_CDN}/${pkg}@5/files/${pkg}-latin-400-normal.woff` });
  Font.register({ family: `${id}B`, src: `${FONT_CDN}/${pkg}@5/files/${pkg}-latin-700-normal.woff` });
});

Font.registerHyphenationCallback((word) => [word]);

// Map theme FontFamily → registered PDF font ID
const THEME_FONT_MAP: Record<string, string> = {
  'inter': 'Inter', 'playfair': 'Playfair', 'dm-sans': 'DMSans',
  'montserrat': 'Montserrat', 'raleway': 'Raleway', 'poppins': 'Poppins',
  'space-grotesk': 'SpaceGrotesk',
};

function fmtCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function fmtNum(v: number, dec = 2) {
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
}

// Font helpers — now theme-aware (set by main component before render)
let _activeFont = 'Inter';

function getPdfFont(isBold: boolean = false) {
  return isBold ? `${_activeFont}B` : _activeFont;
}

function getSansFont(isBold: boolean = false) {
  return isBold ? `${_activeFont}B` : _activeFont;
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
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Image src="https://images.unsplash.com/photo-1508514177221-188b1c8d40e7?q=80&w=2070&auto=format&fit=crop" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.2 }} />
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: styles.page.backgroundColor, opacity: 0.9 }} />
    </View>
    <View style={[styles.coverBody, { position: 'relative', zIndex: 10, justifyContent: 'space-between', padding: '60 50' }]}>
      
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {theme.logoUrl ? (
          <Image src={theme.logoUrl} style={{ width: 120, height: 60, objectFit: 'contain' }} />
        ) : (
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: theme.primaryColor || '#a3e635' }}>{theme.companyName || 'QUARK ENERGIA'}</Text>
        )}
        <View style={{ backgroundColor: '#a3e6351a', border: '1pt solid #a3e63533', padding: '6 12', borderRadius: 20 }}>
          <Text style={{ color: '#a3e635', fontSize: 10, fontFamily: getSansFont(true) }}>{content.categoryLabel || 'Proposta Comercial'}</Text>
        </View>
      </View>

      <View>
        <Text style={{ fontSize: 54, fontFamily: getPdfFont(true), color: styles.page.color, lineHeight: 1.1, marginBottom: 30 }}>
          {content.headlineLine1 || 'Seu Projeto de Energia Solar'}
        </Text>
        
        <View style={{ marginBottom: 40 }}>
          <Text style={{ fontSize: 14, fontFamily: getSansFont(), color: styles.sectionSub.color, marginBottom: 4 }}>Preparado para:</Text>
          <Text style={{ fontSize: 28, fontFamily: getPdfFont(true), color: styles.page.color, marginBottom: 4 }}>{content.clientName}</Text>
          <Text style={{ fontSize: 14, fontFamily: getSansFont(), color: styles.sectionSub.color }}>{content.city} • {content.date}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 24, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
            <Text style={styles.kpiLabel}>Potência do Sistema</Text>
            <Text style={{ fontSize: 28, fontFamily: getPdfFont(true), color: theme.primaryColor || '#a3e635' }}>{fmtNum(content.systemSizeKw)} kWp</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 24, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
            <Text style={styles.kpiLabel}>Nova Conta Estimada</Text>
            <Text style={{ fontSize: 28, fontFamily: getPdfFont(true), color: theme.primaryColor || '#a3e635' }}>{fmtCurrency(content.newBill || 0)}</Text>
          </View>
        </View>
      </View>
    </View>
  </Page>
);

const PDFClientInfo = ({ content, styles }: { content: ClientInfoContent, styles: any }) => {
  const fields = [
    { label: 'Cliente', value: content.clientName },
    { label: 'CPF/CNPJ', value: content.cpfCnpj },
    { label: 'Telefone', value: content.phone },
    { label: 'Email', value: content.email },
    { label: 'Endereço', value: content.address },
    { label: 'Cidade/UF', value: `${content.city || '-'}${content.state ? ` - ${content.state}` : ''}` },
    { label: 'Concessionária', value: content.concessionaria },
    { label: 'Consumo Médio', value: `${content.consumption || 0} kWh/mês` },
    { label: 'Tipo de Ligação', value: content.connectionType ? content.connectionType.toUpperCase() : '-' },
    { label: 'Tipo de Telhado', value: content.roofType ? (ROOF_TYPE_LABELS as any)[content.roofType] || content.roofType : '-' },
  ];

  return (
    <View style={{ marginBottom: 40 }}>
      <View style={styles.section}>
        <Text style={styles.sectionTag}>Informações Gerais</Text>
        <Text style={styles.sectionH2}>Dados do Cliente</Text>
        <Text style={styles.sectionSub}>Informações cadastrais e detalhes da instalação.</Text>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
          {fields.map((f, i) => (
            <View key={i} style={{ flex: 1, minWidth: '45%', backgroundColor: styles.kpiCard.backgroundColor, padding: 16, borderRadius: 8, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
              <Text style={{ fontSize: 8, fontFamily: getSansFont(true), color: styles.sectionSub.color, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</Text>
              <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.page.color }}>{f.value || 'N/A'}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const PDFHowItWorks = ({ content, styles }: { content: HowItWorksContent, styles: any }) => (
  <View style={{ marginBottom: 40 }}>
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
  </View>
);

const PDFTechSpecs = ({ content, styles }: { content: TechSpecsContent, styles: any }) => (
  <View style={{ marginBottom: 40 }}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Engenharia</Text>
      <Text style={styles.sectionH2}>Especificações Técnicas</Text>
      <Text style={styles.sectionSub}>Detalhes dos equipamentos e dimensionamento (Turn-Key Completo).</Text>

      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Potência Total</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.systemSizeKw)} kWp</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Consumo Atendido</Text>
          <Text style={styles.kpiValue}>{content.consumption || 0} kWh/mês</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Área Necessária</Text>
          <Text style={styles.kpiValue}>{fmtNum(content.roofArea, 0)} m²</Text>
        </View>
      </View>

      <View style={{ marginTop: 24, border: `1pt solid ${styles.tableRow.borderBottomColor}`, borderRadius: 8, overflow: 'hidden' }}>
        <View style={{ backgroundColor: styles.tableHeaderRow.backgroundColor, padding: 12, borderBottom: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.page.color }}>Lista de Materiais</Text>
        </View>
        <View style={{ padding: 16 }}>
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: styles.sectionSub.color, textTransform: 'uppercase' }}>Módulos Fotovoltaicos</Text>
              <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: styles.sectionSub.color, textTransform: 'uppercase' }}>Quantidade: {content.modulesCount || 0}x</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: styles.kpiCard.backgroundColor, padding: 12, borderRadius: 6 }}>
              {content.moduleImageUrl && (
                <Image src={content.moduleImageUrl} style={{ width: 40, height: 40, objectFit: 'contain', marginRight: 12, borderRadius: 4 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.page.color }}>{content.moduleBrand || 'Marca do Módulo'}</Text>
                <Text style={{ fontSize: 10, color: styles.sectionSub.color }}>Painel Fotovoltaico</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.sectionTag.color }}>{content.modulePower || 0}W</Text>
            </View>
          </View>

          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: styles.sectionSub.color, textTransform: 'uppercase' }}>Inversores</Text>
              <Text style={{ fontSize: 9, fontFamily: getSansFont(true), color: styles.sectionSub.color, textTransform: 'uppercase' }}>Quantidade: {content.inverterCount || 0}x</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: styles.kpiCard.backgroundColor, padding: 12, borderRadius: 6 }}>
              {content.inverterImageUrl && (
                <Image src={content.inverterImageUrl} style={{ width: 40, height: 40, objectFit: 'contain', marginRight: 12, borderRadius: 4 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.page.color }}>{content.inverterBrand || 'Marca do Inversor'}</Text>
                <Text style={{ fontSize: 10, color: styles.sectionSub.color }}>Inversor Solar</Text>
              </View>
              <Text style={{ fontSize: 12, fontFamily: getPdfFont(true), color: styles.sectionTag.color }}>{content.inverterPower || 0}kW</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  </View>
);

const PDFGenerationChart = ({ content, styles }: { content: GenerationChartContent, styles: any }) => (
  <View style={{ marginBottom: 40 }}>
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
  </View>
);

const PDFEconomy = ({ content, styles }: { content: EconomyContent, styles: any }) => (
  <View style={{ marginBottom: 40 }}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Viabilidade</Text>
      <Text style={styles.sectionH2}>Sua Economia</Text>
      <Text style={styles.sectionSub}>Veja o impacto financeiro do seu projeto solar.</Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 40 }}>
        <View style={{ flex: 1, backgroundColor: '#fef2f2', border: '1pt solid #fecaca', padding: 24, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontFamily: getSansFont(true), color: '#ef4444', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Conta Atual</Text>
          <Text style={{ fontSize: 32, fontFamily: getPdfFont(true), color: '#ef4444', textDecoration: 'line-through', opacity: 0.8 }}>{fmtCurrency(content.currentBill)}</Text>
        </View>
        <Text style={{ marginHorizontal: 20, fontSize: 24, color: styles.sectionSub.color }}>➔</Text>
        <View style={{ flex: 1, backgroundColor: '#ecfccb', border: '1pt solid #d9f99d', padding: 24, borderRadius: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 10, fontFamily: getSansFont(true), color: '#65a30d', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 }}>Nova Conta</Text>
          <Text style={{ fontSize: 32, fontFamily: getPdfFont(true), color: '#65a30d' }}>{fmtCurrency(content.newBill)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>Economia Mensal</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#10b981' }}>{fmtCurrency(content.monthlySavings)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>Economia Anual</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#10b981' }}>{fmtCurrency(content.annualSavings)}</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>Em 25 Anos</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#10b981' }}>{fmtCurrency(content.totalSavings25Years)}</Text>
        </View>
      </View>
    </View>
  </View>
);

const PDFROI = ({ content, styles }: { content: ROIContent, styles: any }) => (
  <View style={{ marginBottom: 40 }}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Investimento</Text>
      <Text style={styles.sectionH2}>Retorno do Investimento</Text>
      <Text style={styles.sectionSub}>Análise financeira e impacto ambiental do seu gerador solar.</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 40 }}>
        <View style={{ flex: 1, minWidth: '45%', backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>Payback (Retorno)</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#a3e635' }}>{(content.paybackYears || 0).toFixed(1)} anos</Text>
        </View>
        <View style={{ flex: 1, minWidth: '45%', backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>ROI</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#a3e635' }}>{(content.roi || 0).toFixed(1)}%</Text>
        </View>
        <View style={{ flex: 1, minWidth: '45%', backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>TIR (a.a.)</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#a3e635' }}>{(content.tir || 0).toFixed(1)}%</Text>
        </View>
        <View style={{ flex: 1, minWidth: '45%', backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
          <Text style={styles.kpiLabel}>VPL</Text>
          <Text style={{ fontSize: 24, fontFamily: getPdfFont(true), color: '#a3e635' }}>{fmtCurrency(content.vpl || 0)}</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 16 }}>
        <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}`, flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Text style={styles.kpiLabel}>CO₂ Evitado (25 anos)</Text>
            <Text style={styles.kpiValue}>{(content.co2EvitedTon25Years || 0).toFixed(1)} toneladas</Text>
          </View>
        </View>
        <View style={{ flex: 1, backgroundColor: styles.kpiCard.backgroundColor, padding: 20, borderRadius: 12, border: `1pt solid ${styles.tableRow.borderBottomColor}`, flexDirection: 'row', alignItems: 'center' }}>
          <View>
            <Text style={styles.kpiLabel}>Árvores Equivalentes</Text>
            <Text style={styles.kpiValue}>{Math.round(content.treesEquivalent || 0)} árvores</Text>
          </View>
        </View>
      </View>
    </View>
  </View>
);

const PDFFinancing = ({ content, styles, theme }: { content: any, styles: any, theme: ProposalTheme }) => (
  <View style={{ marginBottom: 40 }}>
    <View style={styles.section}>
      <Text style={styles.sectionTag}>Investimento</Text>
      <Text style={styles.sectionH2}>Opções de Financiamento</Text>
      <Text style={styles.sectionSub}>Escolha a melhor linha de crédito para o seu projeto.</Text>

      <View style={{ marginTop: 20 }}>
        {content.options && content.options.map((opt: any, i: number) => (
          <View key={i} style={{ backgroundColor: styles.kpiCard.backgroundColor, borderRadius: 8, padding: 24, marginBottom: 16, border: `1pt solid ${styles.tableRow.borderBottomColor}` }}>
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 16, fontFamily: getPdfFont(true), color: theme.primaryColor || '#a3e635', marginBottom: 4 }}>{opt.label}</Text>
              <Text style={{ fontSize: 10, fontFamily: getSansFont(), color: styles.sectionSub.color }}>{opt.description}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: styles.tableRow.borderBottomColor, paddingTop: 16 }}>
              <View>
                <Text style={styles.kpiLabel}>Parcelas</Text>
                <Text style={{ fontSize: 14, fontFamily: getPdfFont(true), color: styles.page.color }}>{opt.installments}x</Text>
              </View>
              <View>
                <Text style={styles.kpiLabel}>Taxa (a.m.)</Text>
                <Text style={{ fontSize: 14, fontFamily: getPdfFont(true), color: styles.page.color }}>{opt.monthlyRate.toFixed(2)}%</Text>
              </View>
              <View>
                <Text style={styles.kpiLabel}>Valor da Parcela</Text>
                <Text style={{ fontSize: 18, fontFamily: getPdfFont(true), color: theme.primaryColor || '#a3e635' }}>{fmtCurrency(opt.installmentValue)}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  </View>
);

const PDFSocialProof = ({ content, styles, theme }: { content: SocialProofContent, styles: any, theme: ProposalTheme }) => {
  const metrics = theme.socialMetrics || content.metrics || [
    { label: '+500', sub: 'Projetos Entregues' },
    { label: '100%', sub: 'Satisfação' },
    { label: '25 Anos', sub: 'Garantia de Geração' },
  ];

  return (
  <View style={{ marginBottom: 40 }}>
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
  </View>
)};

const PDFContact = ({ content, styles, theme }: { content: ContactContent, styles: any, theme: ProposalTheme }) => (
  <View style={{ marginBottom: 40 }}>
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
  </View>
);

interface ProposalPDFProps {
  blocks: ProposalBlock[];
  theme: ProposalTheme;
  clientName?: string;
}


export default function ProposalPDF({ blocks, theme, clientName: propClientName }: ProposalPDFProps) {
  _activeFont = THEME_FONT_MAP[theme.fontFamily || "inter"] || "Inter";
  const isDark = theme.mode === "dark";
  const pri = theme.primaryColor || "#a3e635";
  const styles = getStyles(isDark, pri);
  const coverBlock = blocks.find(b => b.type === "cover");
  const clientName = propClientName || (coverBlock ? (coverBlock.content as CoverContent).clientName : "Cliente");
  const otherBlocks = blocks.filter(b => b.type !== "cover");

  return (
    <Document title={`Proposta Comercial — ${clientName}`} author="Quark Energia" subject="Proposta de Energia Solar" creator="Quark OS">
      {coverBlock && <PDFCover key={coverBlock.id} content={coverBlock.content as CoverContent} styles={styles} theme={theme} />}
      
      <Page size="A4" wrap style={{ ...styles.page, paddingVertical: 40 }}>
        {otherBlocks.map((block) => {
          switch (block.type) {
            case "client_info": return <PDFClientInfo key={block.id} content={block.content as ClientInfoContent} styles={styles} />;
            case "how_it_works": return <PDFHowItWorks key={block.id} content={block.content as HowItWorksContent} styles={styles} />;
            case "tech_specs": return <PDFTechSpecs key={block.id} content={block.content as TechSpecsContent} styles={styles} />;
            case "generation_chart": return <PDFGenerationChart key={block.id} content={block.content as GenerationChartContent} styles={styles} />;
            case "economy": return <PDFEconomy key={block.id} content={block.content as EconomyContent} styles={styles} />;
            case "roi": return <PDFROI key={block.id} content={block.content as ROIContent} styles={styles} />;
            case "financing": return <PDFFinancing key={block.id} content={block.content as any} styles={styles} theme={theme} />;
            case "social_proof": return <PDFSocialProof key={block.id} content={block.content as SocialProofContent} styles={styles} theme={theme} />;
            case "contact": return <PDFContact key={block.id} content={block.content as ContactContent} styles={styles} theme={theme} />;
            default: return null;
          }
        })}
      </Page>
    </Document>
  );
}

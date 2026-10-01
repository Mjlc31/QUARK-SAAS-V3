const fs = require('fs');
let content = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');

content = content.replace(
  `const PDFCover = ({ content, styles }: { content: CoverContent, styles: any }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverBody}>
      <Text style={styles.coverTagline}>{content.tagline || 'Proposta Comercial'}</Text>`,
  `const PDFCover = ({ content, styles, theme }: { content: CoverContent, styles: any, theme: ProposalTheme }) => (
  <Page size="A4" style={styles.page}>
    <View style={styles.coverBody}>
      {theme.logoUrl && (
        <Image src={theme.logoUrl} style={{ width: 120, height: 60, objectFit: 'contain', marginBottom: 20 }} />
      )}
      <Text style={styles.coverTagline}>{content.tagline || 'Proposta Comercial'}</Text>`
);

content = content.replace(
  `return <PDFCover key={block.id} content={block.content as CoverContent} styles={styles} />;`,
  `return <PDFCover key={block.id} content={block.content as CoverContent} styles={styles} theme={theme} />;`
);

fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', content);

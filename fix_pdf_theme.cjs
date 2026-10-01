const fs = require('fs');

let pdf = fs.readFileSync('src/components/proposal/ProposalPDF.tsx', 'utf8');

// Fix PDFSocialProof
pdf = pdf.replace(
  "const PDFSocialProof = ({ content, styles }: { content: SocialProofContent, styles: any }) => {",
  "const PDFSocialProof = ({ content, styles, theme }: { content: SocialProofContent, styles: any, theme: ProposalTheme }) => {"
);
pdf = pdf.replace(
  "<PDFSocialProof key={block.id} content={block.content as SocialProofContent} styles={styles} />",
  "<PDFSocialProof key={block.id} content={block.content as SocialProofContent} styles={styles} theme={theme} />"
);

// Fix PDFContact
pdf = pdf.replace(
  "const PDFContact = ({ content, styles }: { content: ContactContent, styles: any }) => (",
  "const PDFContact = ({ content, styles, theme }: { content: ContactContent, styles: any, theme: ProposalTheme }) => ("
);
pdf = pdf.replace(
  "<PDFContact key={block.id} content={block.content as ContactContent} styles={styles} />",
  "<PDFContact key={block.id} content={block.content as ContactContent} styles={styles} theme={theme} />"
);

// Fix PDFCover if necessary
if (pdf.includes("PDFCover = ({ content, styles }")) {
  pdf = pdf.replace(
    "const PDFCover = ({ content, styles }: { content: CoverContent, styles: any }) =>",
    "const PDFCover = ({ content, styles, theme }: { content: CoverContent, styles: any, theme: ProposalTheme }) =>"
  );
  pdf = pdf.replace(
    "<PDFCover key={block.id} content={block.content as CoverContent} styles={styles} />",
    "<PDFCover key={block.id} content={block.content as CoverContent} styles={styles} theme={theme} />"
  );
  // Wait, did I change QUARK ENERGIA in PDFCover?
  // I only did it via a generic replace earlier.
  pdf = pdf.replace(/QUARK ENERGIA/g, "{theme.companyName || 'QUARK ENERGIA'}");
  // Wait, if I replace all QUARK ENERGIA, it might break strings.
}

fs.writeFileSync('src/components/proposal/ProposalPDF.tsx', pdf);

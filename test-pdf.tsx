import { renderToFile } from '@react-pdf/renderer';
import React from 'react';
import ProposalPDF from './src/components/proposal/ProposalPDF';
import { buildInitialBlocks } from './src/components/proposal/catalog';

async function test() {
  const blocks = buildInitialBlocks({});
  const theme = {
    primaryColor: '#a3e635',
    fontFamily: 'inter',
    mode: 'dark' as const
  };

  try {
    await renderToFile(
      React.createElement(ProposalPDF, { blocks, theme }),
      'test.pdf'
    );
    console.log("SUCCESS");
  } catch(e) {
    console.error("ERROR", e);
  }
}

test();

const fs = require('fs');

let types = fs.readFileSync('src/components/proposal/types.ts', 'utf8');

// Manual replacement exactly
const target = `export interface SocialProofContent {
  images: Array<{ id: string; url: string; caption: string   metrics?: { label: string; sub: string }[];
>;
  headline: string;
  subheadline: string;
}`;

// wait, let me just read what is there now and fix it

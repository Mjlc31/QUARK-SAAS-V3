const fs = require('fs');

let types = fs.readFileSync('src/components/proposal/types.ts', 'utf8');
const badBlock = `export interface SocialProofContent {
  images: Array<{ id: string; url: string; caption: string   metrics?: { label: string; sub: string }[];
>;
  headline: string;
  subheadline: string;
}`;
const goodBlock = `export interface SocialProofContent {
  images: Array<{ id: string; url: string; caption: string }>;
  headline: string;
  subheadline: string;
  metrics?: { label: string; sub: string }[];
}`;

types = types.replace(badBlock, goodBlock);
fs.writeFileSync('src/components/proposal/types.ts', types);

// ============================================================
// PROPOSAL ENGINE — BLOCK RENDERER v2.0
// Passa o theme para cada bloco
// ============================================================
import React from 'react';
import {
  ProposalBlock, ProposalTheme,
  CoverContent, SocialProofContent, TechSpecsContent, FinancialContent, TextContent,
} from './types';
import { BlockCover } from './blocks/BlockCover';
import { BlockHowItWorks } from './blocks/BlockHowItWorks';
import { BlockGenerationChart } from './blocks/BlockGenerationChart';
import { BlockSocialProof } from './blocks/BlockSocialProof';
import { BlockTechSpecs } from './blocks/BlockTechSpecs';
import { BlockFinancial } from './blocks/BlockFinancial';
import { BlockText } from './blocks/BlockText';

interface BlockRendererProps {
  block: ProposalBlock;
  onUpdate: (content: Partial<ProposalBlock['content']>) => void;
  theme: ProposalTheme;
}

export function BlockRenderer({ block, onUpdate, theme }: BlockRendererProps) {
  switch (block.type) {
    case 'cover':
      return (
        <BlockCover
          content={block.content as CoverContent}
          onUpdate={onUpdate as (c: Partial<CoverContent>) => void}
          theme={theme}
        />
      );
    case 'how_it_works':
      return (
        <BlockHowItWorks
          content={block.content as any}
          onUpdate={onUpdate as any}
          theme={theme}
        />
      );
    case 'generation_chart':
      return (
        <BlockGenerationChart
          content={block.content as any}
          onUpdate={onUpdate as any}
          theme={theme}
        />
      );
    case 'social_proof':
      return (
        <BlockSocialProof
          content={block.content as SocialProofContent}
          onUpdate={onUpdate as (c: Partial<SocialProofContent>) => void}
          theme={theme}
        />
      );
    case 'tech_specs':
      return (
        <BlockTechSpecs
          content={block.content as TechSpecsContent}
          onUpdate={onUpdate as (c: Partial<TechSpecsContent>) => void}
          theme={theme}
        />
      );
    case 'financial':
      return (
        <BlockFinancial
          content={block.content as FinancialContent}
          onUpdate={onUpdate as (c: Partial<FinancialContent>) => void}
          theme={theme}
        />
      );
    case 'text':
      return (
        <BlockText
          content={block.content as TextContent}
          onUpdate={onUpdate as (c: Partial<TextContent>) => void}
          theme={theme}
        />
      );
    default:
      return (
        <div style={{ padding: '24px 40px', background: '#fff', color: '#94a3b8', fontSize: '13px' }}>
          Tipo de bloco desconhecido: {(block as any).type}
        </div>
      );
  }
}

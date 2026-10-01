const fs = require('fs');
const path = 'src/components/proposals/steps/StepPreview.tsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  `  useEffect(() => {
    if (blocks.length === 0 && data.clientName) {
      const initial = buildInitialBlocks(data as ProposalData);
      onUpdateBlocks(initial);
    }
  }, [blocks, data, onUpdateBlocks]);`,
  `  useEffect(() => {
    // Regenerate blocks whenever data changes so previews stay in sync with latest values
    if (data.clientName) {
      const freshBlocks = buildInitialBlocks(data as ProposalData);
      // We only update if the content has functionally changed (prevent infinite loops)
      // Simplest way is just stringify and compare
      if (JSON.stringify(freshBlocks) !== JSON.stringify(blocks)) {
        onUpdateBlocks(freshBlocks);
      }
    }
  }, [data, blocks, onUpdateBlocks]);`
);

fs.writeFileSync(path, content);

import fs from 'fs';
let content = fs.readFileSync('src/components/proposal/catalog.ts', 'utf8');

// The blocks are generated in order. We can replace id: `block-${Math.random...}` with deterministic ids.
let count = 0;
content = content.replace(/id: `block-\$\{Math\.random\(\)\.toString\(36\)\.substr\(2, 9\)\}`/g, (match) => {
  count++;
  return `id: 'block-' + '${count}'`;
});

// Also remove nanoid import if it's unused, but it might be used elsewhere.

fs.writeFileSync('src/components/proposal/catalog.ts', content);

const fs = require('fs');
let content = fs.readFileSync('src/components/proposals/ProposalWizard.tsx', 'utf8');

const targetStr = `const initialState: WizardState = {
  proposalData: { status: 'draft' },
  theme: DEFAULT_THEME,`;

const replacementStr = `
const loadSavedTheme = () => {
  try {
    const saved = localStorage.getItem('@quark:savedTheme');
    if (saved) return { ...DEFAULT_THEME, ...JSON.parse(saved) };
  } catch(e) {}
  return DEFAULT_THEME;
};

const initialState: WizardState = {
  proposalData: { status: 'draft' },
  theme: loadSavedTheme(),`;

content = content.replace(targetStr, replacementStr);

const actionStr = `    case 'SET_THEME':       
      return { ...state, theme: { ...state.theme, ...action.payload } };`;

const actionReplacement = `    case 'SET_THEME': {
      const newTheme = { ...state.theme, ...action.payload };
      try { localStorage.setItem('@quark:savedTheme', JSON.stringify(newTheme)); } catch(e) {}
      return { ...state, theme: newTheme };
    }`;

content = content.replace(actionStr, actionReplacement);
fs.writeFileSync('src/components/proposals/ProposalWizard.tsx', content);

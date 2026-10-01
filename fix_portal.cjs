const fs = require('fs');
let content = fs.readFileSync('src/contexts/PortalContext.tsx', 'utf8');

// remove duplicate signUp in interface
content = content.replace('  logout: () => Promise<void>;\n  signUp: (name: string, email: string, password: string, cpf: string) => Promise<void>;', '  logout: () => Promise<void>;');

// remove duplicate signUp function
content = content.replace(/  const signUp = async \(name: string, email: string, password: string, cpf\?: string\) => \{[\s\S]*?^  const logout/m, '  const logout');

// remove duplicate signUp in return
content = content.replace('        signUp,\n        logout,\n        signUp,', '        signUp,\n        logout,');

fs.writeFileSync('src/contexts/PortalContext.tsx', content);

const fs = require('fs');

let content = fs.readFileSync('src/pages/ClientCatalog.tsx', 'utf8');

// Add User import if missing
if (!content.includes('User,')) {
  content = content.replace('Users, Plus, Search, MapPin, Building, Activity', 'Users, Plus, Search, MapPin, Building, Activity, User');
}
content = content.replace(/client\.auth_user_id/g, '(client as any).auth_user_id');

fs.writeFileSync('src/pages/ClientCatalog.tsx', content);

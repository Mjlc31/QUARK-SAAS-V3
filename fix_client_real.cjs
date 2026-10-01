const fs = require('fs');
let client = fs.readFileSync('src/pages/ClientCatalog.tsx', 'utf8');
client = client.replace(
  "import { Users, Plus, Search, MapPin, Zap, X, ShieldCheck, Mail, Phone, Calendar } from 'lucide-react';",
  "import { Users, Plus, Search, MapPin, Zap, X, ShieldCheck, Mail, Phone, Calendar, User } from 'lucide-react';"
);
fs.writeFileSync('src/pages/ClientCatalog.tsx', client);

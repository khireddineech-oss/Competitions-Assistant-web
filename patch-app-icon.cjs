const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');
app = app.replace(/import \{([^}]+)\} from 'lucide-react';/, "import { $1, TrendingUp } from 'lucide-react';");

// Replace PlayCircle in the logo area (near text-2xl and text-xl)
app = app.replace(/<PlayCircle className="text-white w-6 h-6" \/>/g, '<TrendingUp className="text-white w-6 h-6" />');
app = app.replace(/<PlayCircle className="text-white w-5 h-5" \/>/g, '<TrendingUp className="text-white w-5 h-5" />');

// Check AddAccounts.tsx for any channels terminology
let addAccs = fs.readFileSync('src/components/AddAccounts.tsx', 'utf8');
addAccs = addAccs.replace(/قناة/g, 'حساب');
addAccs = addAccs.replace(/قنوات/g, 'حسابات');
fs.writeFileSync('src/components/AddAccounts.tsx', addAccs);

fs.writeFileSync('src/App.tsx', app);

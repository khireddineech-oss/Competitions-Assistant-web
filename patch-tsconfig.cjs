const fs = require('fs');
let code = fs.readFileSync('tsconfig.json', 'utf8');
const parsed = JSON.parse(code);
parsed.compilerOptions.esModuleInterop = true;
fs.writeFileSync('tsconfig.json', JSON.stringify(parsed, null, 2));

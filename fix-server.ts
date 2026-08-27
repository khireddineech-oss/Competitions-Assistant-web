import fs from 'fs';

const content = fs.readFileSync('server.ts', 'utf8');

const dbMiddlewareRegex = /\/\/ --- Initialization & Server Start ---\n\nlet dbInitialized = false;\nlet dbInitPromise: Promise<void> \| null = null;\n\n\/\/ Ensure database is initialized before any request is processed\napp\.use\(async \(req, res, next\) => \{\n  if \(\!dbInitialized\) \{\n    if \(\!dbInitPromise\) \{\n      dbInitPromise = initDb\(\)\.then\(\(\) => \{\n        dbInitialized = true;\n      \}\)\.catch\(err => \{\n        console\.error\("Critical DB Init Error:", err\);\n        dbInitPromise = null;\n      \}\);\n    \}\n    try \{\n      await dbInitPromise;\n    \} catch \(err\) \{\n      return res\.status\(500\)\.json\(\{ error: 'Database initialization failed' \}\);\n    \}\n  \}\n  next\(\);\n\}\);/g;

const match = content.match(dbMiddlewareRegex);
if (!match) {
  console.log("Not found");
  process.exit(1);
}

let newContent = content.replace(match[0], '');

newContent = newContent.replace('app.use(express.json());', `app.use(express.json());\n\n${match[0]}`);

fs.writeFileSync('server.ts', newContent);
console.log("Fixed");

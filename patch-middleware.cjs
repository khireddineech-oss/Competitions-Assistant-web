const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const oldMiddleware = `
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await initDb();
      dbInitialized = true;
    } catch (err) {
      console.error("Database initialization failed:", err);
    }
  }
  next();
});
`;

const newMiddleware = `
let dbInitialized = false;
let dbInitPromise = null;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    if (!dbInitPromise) {
      dbInitPromise = initDb().then(() => {
        dbInitialized = true;
      }).catch(err => {
        console.error("Database initialization failed:", err);
        dbInitPromise = null;
      });
    }
    await dbInitPromise;
  }
  next();
});
`;

code = code.replace(oldMiddleware, newMiddleware);
fs.writeFileSync('server.ts', code);

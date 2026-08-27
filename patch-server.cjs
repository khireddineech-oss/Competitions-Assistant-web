const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Remove static import of vite
code = code.replace(/import \{ createServer as createViteServer \} from 'vite';\n?/, '');

// 2. Add db initialization middleware at the top after app definitions
const middleware = `
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
code = code.replace(/app\.use\(cookieParser\(\)\);/, "app.use(cookieParser());\n" + middleware);

// 3. Update startServer and conditionally call it
const startServerBlock = `
async function startServer() {
  await initDb();
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(\`Server running on http://localhost:\${PORT}\`));
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
`;
code = code.replace(/async function startServer\(\) \{[\s\S]*startServer\(\);/, startServerBlock);

fs.writeFileSync('server.ts', code);

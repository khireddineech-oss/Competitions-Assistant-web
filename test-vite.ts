import { createServer } from 'vite';
async function run() {
  try {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    console.log("Vite server created");
    process.exit(0);
  } catch(e) {
    console.error("Vite server error:", e);
    process.exit(1);
  }
}
run();

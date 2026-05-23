const path = require("node:path");
const { buildApp } = require("./app");

async function start() {
  const port = Number(process.env.PORT) || 3000;
  const dbPath = process.env.DB_PATH || path.join(__dirname, "..", "data", "db.json");

  const app = await buildApp({ dbPath });
  app.listen(port, () => {
    console.log(`AquaBloom server running on http://localhost:${port}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

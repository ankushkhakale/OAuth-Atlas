import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync, spawn } from "node:child_process";
import path from "node:path";
const root = process.cwd();
const source = path.join(root, "dist/server/wrangler.json");
let config;
try {
  config = JSON.parse(readFileSync(source, "utf8"));
} catch {
  console.error("Build first with pnpm build.");
  process.exit(1);
}
config.d1_databases = config.d1_databases.map((db) => ({
  ...db,
  migrations_dir: path.join(root, "drizzle"),
}));
config.vars = {
  ...config.vars,
  ...(process.env.OLLAMA_URL
    ? {
        OLLAMA_URL: process.env.OLLAMA_URL,
        OLLAMA_MODEL: process.env.OLLAMA_MODEL || "qwen2.5:1.5b",
      }
    : {}),
};
if (process.env.SEARXNG_URL) config.vars.SEARXNG_URL = process.env.SEARXNG_URL;
config.observability = { enabled: false };
const localConfig = path.join(root, "dist/server/wrangler.local.json");
writeFileSync(localConfig, JSON.stringify(config));
const persist =
  process.env.ATLAS_DATA_DIR || path.join(root, ".wrangler/state");
mkdirSync(persist, { recursive: true });
const wrangler = path.join(root, "node_modules/wrangler/bin/wrangler.js");
const migrate = spawnSync(
  process.execPath,
  [
    wrangler,
    "d1",
    "migrations",
    "apply",
    "DB",
    "--local",
    "--config",
    localConfig,
    "--persist-to",
    persist,
  ],
  { stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false" } },
);
if (migrate.status !== 0) process.exit(migrate.status || 1);
const args = [
  wrangler,
  "dev",
  "--config",
  localConfig,
  "--local",
  "--persist-to",
  persist,
  "--ip",
  process.env.ATLAS_BIND || "127.0.0.1",
  "--port",
  process.env.PORT || "8080",
  "--inspector-port",
  "0",
];
const child = spawn(process.execPath, args, {
  stdio: "inherit",
  env: { ...process.env, WRANGLER_SEND_METRICS: "false" },
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code || 0));

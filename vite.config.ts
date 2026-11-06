import vinext from "vinext";
import {defineConfig} from "vite";
import {cloudflare} from "@cloudflare/vite-plugin";
import "./scripts/runtime-env.mjs";

export default defineConfig({
  plugins: [vinext(), cloudflare({
    viteEnvironment: {name: "rsc", childEnvironments: ["ssr"]},
    inspectorPort: false,
    config: {name: "oauth-atlas", main: "./worker/index.ts", compatibility_date: "2026-05-15", compatibility_flags: ["nodejs_compat"]},
  })],
});

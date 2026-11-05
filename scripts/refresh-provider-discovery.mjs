import { load, JSON_SCHEMA } from "js-yaml";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const source =
  "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/providers/providers.yaml";
const fileIndex = process.argv.indexOf("--from-file");
const text =
  fileIndex >= 0
    ? await readFile(process.argv[fileIndex + 1], "utf8")
    : await (async () => {
        const r = await fetch(source, { signal: AbortSignal.timeout(30000) });
        if (!r.ok) throw new Error(`Registry HTTP ${r.status}`);
        return r.text();
      })();
if (Buffer.byteLength(text) > 2_000_000)
  throw new Error("Registry exceeds the metadata limit.");
const original = load(text, { schema: JSON_SCHEMA });
const providers = {};
for (const [key, row] of Object.entries(original)) {
  if (!row || typeof row !== "object") continue;
  const result = {};
  for (const field of ["display_name", "docs", "setup_guide_url", "alias"])
    if (typeof row[field] === "string") result[field] = row[field];
  result.origins = [
    ...new Set(
      [row.authorization_url, row.token_url, row.proxy?.base_url].flatMap(
        (value) => {
          try {
            return typeof value === "string" &&
              !value.includes("${") &&
              value.startsWith("https://")
              ? [new URL(value).origin + "/"]
              : [];
          } catch {
            return [];
          }
        },
      ),
    ),
  ];
  if (result.docs || result.setup_guide_url || result.alias)
    providers[key] = result;
}
await mkdir("data", { recursive: true });
await writeFile(
  "data/provider-discovery.json",
  JSON.stringify({
    source,
    capturedAt: new Date().toISOString(),
    sourceSha256: createHash("sha256").update(text).digest("hex"),
    purpose:
      "Public names and URLs for discovery only. Not OAuth evidence or prewritten guides.",
    providers,
  }) + "\n",
);
console.log(
  `Saved ${Object.keys(providers).length} provider discovery records.`,
);

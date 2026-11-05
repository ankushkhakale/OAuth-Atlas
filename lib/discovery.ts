import { load, JSON_SCHEMA } from "js-yaml";
import snapshot from "../data/provider-discovery.json" with { type: "json" };
import {
  type Transport,
  type Attempt,
  publicURL,
  siteDomain,
  readBounded,
  decodeHTML,
} from "./research-fetch.ts";
const REGISTRY =
  "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/providers/providers.yaml";
type RegistryRow = {
  display_name?: string;
  docs?: string;
  setup_guide_url?: string;
  authorization_url?: string;
  token_url?: string;
  proxy?: { base_url?: string };
  alias?: string;
  origins?: string[];
};
let registryCache:
  { expires: number; rows: Record<string, RegistryRow> } | undefined;
const normalized = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9]/g, "");
export async function registryHints(
  input: string,
  transport: Transport,
  signal: AbortSignal,
  attempts: Attempt[],
) {
  try {
    let rows =
      transport === fetch && registryCache && registryCache.expires > Date.now()
        ? registryCache.rows
        : (snapshot.providers as Record<string, RegistryRow>);
    const token = normalized(input);
    const isURL = /^https:\/\//.test(input);
    const domain = isURL ? siteDomain(input) : "";
    const matchesRow = ([key, row]: [string, RegistryRow]) => {
      if (!row || typeof row !== "object") return false;
      if (!isURL)
        return (
          normalized(key) === token ||
          normalized(row.display_name || "") === token
        );
      return [
        ...(row.origins || []),
        row.authorization_url,
        row.token_url,
        row.proxy?.base_url,
      ].some((value) => {
        try {
          return value && !value.includes("${") && siteDomain(value) === domain;
        } catch {
          return false;
        }
      });
    };
    let origin =
      "Bundled public discovery metadata from " +
      snapshot.capturedAt.slice(0, 10);
    if (!Object.entries(rows).some(matchesRow)) {
      try {
        const r = await transport(REGISTRY, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
        });
        if (!r.ok) throw new Error();
        const live = load(await readBounded(r, 2_000_000), {
          schema: JSON_SCHEMA,
        }) as Record<string, RegistryRow>;
        if (!live || typeof live !== "object") throw new Error();
        rows = live;
        origin = "Live public registry metadata";
        if (transport === fetch)
          registryCache = { rows, expires: Date.now() + 600_000 };
      } catch {
        attempts.push({
          url: REGISTRY,
          kind: "registry",
          status: "unavailable",
          detail:
            "Live registry unavailable; bundled discovery metadata remains usable.",
        });
      }
    }
    attempts.push({
      url: REGISTRY,
      kind: "registry",
      status: "ok",
      detail: origin + "; not OAuth evidence.",
    });
    const matches = Object.entries(rows).filter(matchesRow).slice(0, 4);
    return matches.flatMap(([key, row]) => {
      const resolved = row.alias ? rows![row.alias] || row : row;
      const urls = [row.setup_guide_url, row.docs, resolved.docs];
      const sourceDocs = urls.flatMap((value) => {
        try {
          if (!value) return [];
          const u = new URL(value);
          if (!/(^|\.)nango\.dev$/.test(u.hostname)) return [];
          const path = u.pathname.replace(/^\/docs\//, "/").replace(/\/$/, "");
          return [
            "https://raw.githubusercontent.com/NangoHQ/nango/master/docs" +
              path +
              ".mdx",
          ];
        } catch {
          return [];
        }
      });
      const origins = [
        ...(resolved.origins || []),
        resolved.authorization_url,
        resolved.token_url,
        resolved.proxy?.base_url,
      ].flatMap((value) => {
        try {
          return value && !value.includes("${")
            ? [new URL(publicURL(value).origin).href]
            : [];
        } catch {
          return [];
        }
      });
      return [
        ...new Set(
          [...sourceDocs, ...urls, ...origins].filter(
            (u): u is string =>
              typeof u === "string" && u.startsWith("https://"),
          ),
        ),
      ].map((url) => ({
        url,
        label: row.display_name || key,
        provenance:
          url.includes("nango.dev") ||
          url.includes("raw.githubusercontent.com/NangoHQ/nango/")
            ? "Public registry discovery link"
            : "Provider origin from public discovery metadata",
      }));
    });
  } catch {
    attempts.push({
      url: REGISTRY,
      kind: "registry",
      status: signal.aborted ? "timeout" : "unavailable",
      detail:
        "Registry lookup unavailable; continuing with other discovery paths.",
    });
    return [];
  }
}
export function scoreLink(value: string) {
  if (/\.(?:png|jpe?g|gif|svg|css|js|zip|gz|pdf)(?:$|\?)/i.test(value))
    return -100;
  if (
    /\/(?:login|signin|sign-in|logout|signup|sign-up)(?:\/|$|\?)/i.test(
      value,
    ) &&
    !/docs|guide|developer|help/.test(value)
  )
    return -50;
  return (
    (/oauth|authorization[-_/ ]?code|oauth2[-_/ ]?provider|register.{0,20}(app|client)/i.test(
      value,
    )
      ? 35
      : 0) +
    (/authentication|authorization|app.registration|custom.app|create.an.app|developer.app/i.test(
      value,
    )
      ? 23
      : 0) +
    (/scope|permission|verification|app.review|distribution/i.test(value)
      ? 12
      : 0) +
    (/developer|\/docs|\/guides|documentation|\/api|help\./i.test(value)
      ? 7
      : 0) +
    (/llms\.txt|sitemap/i.test(value) ? 18 : 0) -
    (/blog|changelog|release|community|youtube|twitter|linkedin/i.test(value)
      ? 20
      : 0)
  );
}
export function searchCandidates(
  body: string,
  engine: "bing" | "duckduckgo" | "searxng",
): { url: string; label: string }[] {
  if (engine === "searxng") {
    try {
      return (JSON.parse(body).results || []).flatMap(
        (r: { url?: string; title?: string }) =>
          r.url ? [{ url: r.url, label: r.title || "" }] : [],
      );
    } catch {
      return [];
    }
  }
  if (engine === "bing")
    return [
      ...body.matchAll(
        /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<\/item>/g,
      ),
    ].map((m) => ({ url: decodeHTML(m[2]), label: decodeHTML(m[1]) }));
  return [
    ...body.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/g),
  ].flatMap((m) => {
    try {
      const u = new URL(decodeHTML(m[1]), "https://html.duckduckgo.com");
      return [
        {
          url: u.searchParams.get("uddg") || u.href,
          label: decodeHTML(m[2].replace(/<[^>]*>/g, " ")),
        },
      ];
    } catch {
      return [];
    }
  });
}
export async function searchDocs(
  query: string,
  transport: Transport,
  signal: AbortSignal,
  attempts: Attempt[],
  searxngURL?: string,
  accept?: (candidate: { url: string; label: string }) => boolean,
) {
  const q = encodeURIComponent(query);
  const adapters: { engine: "bing" | "duckduckgo" | "searxng"; url: string }[] =
    [];
  if (searxngURL) {
    const u = new URL("/search", searxngURL);
    u.searchParams.set("q", query);
    u.searchParams.set("format", "json");
    adapters.push({ engine: "searxng", url: u.href });
  } else
    adapters.push(
      { engine: "duckduckgo", url: `https://html.duckduckgo.com/html/?q=${q}` },
      { engine: "bing", url: `https://www.bing.com/search?format=rss&q=${q}` },
    );
  for (const { engine, url } of adapters) {
    try {
      const r = await transport(url, {
        headers: { "User-Agent": "OAuthAtlas/2.0" },
        signal: AbortSignal.any([signal, AbortSignal.timeout(7000)]),
      });
      if (!r.ok) {
        await r.body?.cancel();
        throw new Error(`HTTP ${r.status}`);
      }
      const body = await readBounded(r, 800_000);
      if (/anomaly.js|bots use DuckDuckGo|challenge-form/i.test(body)) {
        attempts.push({
          url: new URL(url).origin,
          kind: "search",
          status: "blocked",
          detail: "Search engine challenge; no bypass attempted.",
        });
        continue;
      }
      const hits = searchCandidates(body, engine).flatMap((c) => {
        try {
          const u = publicURL(c.url);
          if (
            /(^|\.)(bing.com|duckduckgo.com|youtube.com|reddit.com|facebook.com|linkedin.com)$/.test(
              u.hostname,
            )
          )
            return [];
          return [{ url: u.href, label: c.label }];
        } catch {
          return [];
        }
      });
      const bounded = hits.slice(0, 40);
      const accepted = accept ? bounded.filter(accept) : bounded;
      attempts.push({
        url: new URL(url).origin,
        kind: "search",
        status: "ok",
        detail: `${hits.length} search candidates; ${accepted.length} relevant candidates for ${query}. Candidates are not OAuth evidence.`,
      });
      // Irrelevant results must not prevent trying the next search adapter.
      if (accepted.length) return accepted;
    } catch (error) {
      attempts.push({
        url: new URL(url).origin,
        kind: "search",
        status: signal.aborted ? "timeout" : "unavailable",
        detail: `Search unavailable for ${query}: ${error instanceof Error ? error.message.slice(0, 120) : "network failure"}.`,
      });
    }
  }
  return [];
}
export function identityMatches(
  input: string,
  candidate: { url: string; label: string },
) {
  const token = normalized(input);
  const domain = normalized(siteDomain(candidate.url).split(".")[0]);
  const label = normalized(candidate.label);
  return (
    token.length > 1 &&
    (domain === token ||
      label.startsWith(token) ||
      label.includes(token + "api") ||
      label.includes(token + "developer"))
  );
}

export type ProviderSuggestion = {
  name: string;
  input: string;
  url?: string;
  reason: string;
};

// Optimal-string-alignment distance includes adjacent transpositions. It only
// proposes identities; it never silently changes the requested provider.
function spellingDistance(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => i ? (j ? 0 : i) : j),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
        d[i - 1][j - 1] + Number(a[i - 1] !== b[j - 1]));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
function similarName(input: string, candidate: string) {
  const a = normalized(input), b = normalized(candidate);
  return a.length >= 5 && b.length >= 5 && a !== b &&
    Math.abs(a.length - b.length) <= 2 &&
    spellingDistance(a, b) <= (a.length >= 9 ? 2 : 1);
}
export function providerSuggestions(
  input: string,
  hits: { url: string; label: string }[] = [],
  includeBundled = true,
): ProviderSuggestion[] {
  if (/[:/.]/.test(input) || normalized(input).length > 80) return [];
  const suggestions: ProviderSuggestion[] = [];
  for (const [key, row] of (includeBundled ? Object.entries(snapshot.providers).sort(([a], [b]) => a.length - b.length) : [])) {
    if (!similarName(input, key) && !similarName(input, row.display_name || "")) continue;
    suggestions.push({ name: (row.display_name || key).replace(/\([^)]*\)/g, "").trim(), input: key,
      reason: "Similar name in discovery metadata; confirm the intended provider." });
  }
  for (const hit of hits) {
    try {
      const url = publicURL(hit.url);
      const domain = siteDomain(url.href).split(".")[0];
      if (!similarName(input, domain)) continue;
      // A matching title and domain reduce unrelated near-name suggestions.
      if (!normalized(hit.label).includes(normalized(domain))) continue;
      const name = hit.label.match(/^[\p{L}\p{N} -]+/u)?.[0]?.trim() || domain;
      suggestions.push({ name: name.slice(0, 70), input: url.href, url: url.href,
        reason: "Similar name in a search result; website ownership and OAuth support are unverified." });
    } catch {}
  }
  const distinct = new Map<string, ProviderSuggestion>();
  for (const suggestion of suggestions) {
    const key = suggestion.url ? siteDomain(suggestion.url) : normalized(suggestion.name);
    if (!distinct.has(key)) distinct.set(key, suggestion);
  }
  return [...distinct.values()].slice(0, 3);
}

// Independent, open-data identity fallback. These records locate a possible
// website; neither Wikipedia text nor Wikidata claims become OAuth evidence.
export async function knowledgeSuggestions(
  input: string, transport: Transport, signal: AbortSignal, attempts: Attempt[],
): Promise<ProviderSuggestion[]> {
  if (normalized(input).length > 80) return [];
  const readJSON = async (url: URL) => {
    const response = await transport(url.href, {
      headers: { "User-Agent": "OAuthAtlas/2.1 (https://github.com/ankushkhakale/OAuth-Atlas)" },
      signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`); }
    return JSON.parse(await readBounded(response, 800_000));
  };
  try {
    const searchURL = new URL("https://en.wikipedia.org/w/api.php");
    searchURL.search = new URLSearchParams({action: "query", list: "search", srsearch: input,
      srinfo: "suggestion", format: "json", srlimit: "3"}).toString();
    const search = await readJSON(searchURL) as {query?: {search?: {title?: string}[]}};
    const titles = (search.query?.search || []).flatMap(row =>
      typeof row.title === "string" && row.title.length <= 100 &&
      (normalized(row.title) === normalized(input) || similarName(input, row.title)) ? [row.title] : []);
    attempts.push({url: searchURL.origin, kind: "identity", status: "ok",
      detail: `${titles.length} possible identity matches from Wikipedia; not OAuth evidence.`});
    if (!titles.length) return [];
    const entitiesURL = new URL("https://www.wikidata.org/w/api.php");
    entitiesURL.search = new URLSearchParams({action: "wbgetentities", sites: "enwiki", titles: titles.join("|"),
      props: "labels|claims", languages: "en", format: "json"}).toString();
    type Entity = {labels?: {en?: {value?: string}}; claims?: {P856?: {
      rank?: string; qualifiers?: {P582?: unknown}; mainsnak?: {datavalue?: {value?: unknown}};
    }[]}};
    const data = await readJSON(entitiesURL) as {entities?: Record<string, Entity>};
    const candidates: ProviderSuggestion[] = [];
    for (const [id, entity] of Object.entries(data.entities || {})) {
      const label = entity.labels?.en?.value;
      if (!/^Q\d+$/.test(id) || !label ||
        !(normalized(label) === normalized(input) || similarName(input, label))) continue;
      for (const claim of [...(entity.claims?.P856 || [])].sort((a, b) => Number(b.rank === "preferred") - Number(a.rank === "preferred"))) {
        const value = claim.mainsnak?.datavalue?.value;
        if (claim.rank === "deprecated" || claim.qualifiers?.P582 || typeof value !== "string") continue;
        try {
          const url = publicURL(value).href;
          candidates.push({name: label, input: url, url,
            reason: "Website listed in Wikidata. Confirm the intended provider; this is not proof of OAuth support."});
        } catch {}
      }
    }
    attempts.push({url: entitiesURL.origin, kind: "identity", status: "ok",
      detail: `${candidates.length} candidate websites from public Wikidata records; not OAuth evidence.`});
    const unique = new Map<string, ProviderSuggestion>();
    for (const candidate of candidates) {
      const domain = siteDomain(candidate.url!);
      if (!unique.has(domain)) unique.set(domain, candidate);
    }
    return [...unique.values()].slice(0, 3);
  } catch (error) {
    attempts.push({url: "https://en.wikipedia.org", kind: "identity",
      status: signal.aborted ? "timeout" : "unavailable",
      detail: `Open-data identity discovery unavailable: ${error instanceof Error ? error.message.slice(0, 120) : "network failure"}.`});
    return [];
  }
}

import { parseHTML } from "linkedom";
import { getDomain } from "tldts";

export class ResearchError extends Error {
  status: number;
  constructor(message: string, status = 422) {
    super(message);
    this.status = status;
  }
}
export type ResearchPage = {
  url: string;
  title: string;
  text: string;
  html?: string;
  links?: { url: string; label: string }[];
  format?: "html" | "markdown" | "json" | "index";
  provenance?: string;
  metadata?: Record<string, unknown>;
};
export type Attempt = {
  url: string;
  kind: "document" | "index" | "search" | "registry" | "identity";
  status: "ok" | "blocked" | "unavailable" | "timeout" | "skipped";
  detail?: string;
};
export type Transport = typeof fetch;
export function publicURL(value: string): URL {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new ResearchError(
      "Enter an app name or a valid public HTTPS website.",
      400,
    );
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !host.includes(".") ||
    host.includes(":") ||
    /^[\d.]+$/.test(host) ||
    /\.(local|internal|localhost|test|invalid|onion)$/.test(host) ||
    /(^|\.)localhost$/.test(host)
  )
    throw new ResearchError(
      "Use a public HTTPS website without credentials or a custom port.",
      400,
    );
  u.search = "";
  u.hash = "";
  u.hostname = host;
  return u;
}
export function siteDomain(value: string) {
  const host = new URL(value).hostname;
  return getDomain(host, { allowPrivateDomains: true }) || host;
}
export function publicIP(ip: string): boolean {
  if (ip.includes(":"))
    return /^(2|3)/i.test(ip) && !/^2001:(db8|0:)/i.test(ip);
  const a = ip.split(".").map(Number);
  if (a.length !== 4 || a.some((n) => !Number.isInteger(n) || n < 0 || n > 255))
    return false;
  return !(
    a[0] === 0 ||
    a[0] === 10 ||
    a[0] === 127 ||
    a[0] >= 224 ||
    (a[0] === 169 && a[1] === 254) ||
    (a[0] === 172 && a[1] >= 16 && a[1] <= 31) ||
    (a[0] === 192 && (a[1] === 168 || a[1] === 0 || a[1] === 2)) ||
    (a[0] === 100 && a[1] >= 64 && a[1] <= 127) ||
    (a[0] === 198 && (a[1] === 18 || a[1] === 19 || a[1] === 51)) ||
    (a[0] === 203 && a[1] === 0 && a[2] === 113)
  );
}
export function decodeHTML(s: string) {
  return (
    parseHTML(
      `<html><body><textarea>${s.replace(/<\/textarea/gi, "&lt;/textarea")}</textarea></body></html>`,
    ).document.querySelector("textarea")?.textContent || s
  );
}
function documentFor(html: string) {
  return parseHTML(
    html.includes("<html") ? html : `<html><body>${html}</body></html>`,
  ).document;
}
export function textFromHTML(html: string) {
  const doc = documentFor(html);
  for (const n of doc.querySelectorAll(
    "script,style,nav,header,footer,aside,noscript,svg,form",
  ))
    n.remove();
  const articles = [...doc.querySelectorAll("article")];
  const roots = articles.length
    ? articles
    : [doc.querySelector("main") || doc.body];
  for (const root of roots)
    for (const n of root.querySelectorAll(
      "h1,h2,h3,h4,h5,h6,p,div,li,tr,section,pre,br",
    ))
      n.append("\n");
  return roots
    .map((r) => r.textContent || "")
    .join("\n")
    .split("\n")
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
export function linksFromHTML(html: string, base: string) {
  const doc = documentFor(html);
  const links: { url: string; label: string }[] = [];
  for (const a of doc.querySelectorAll(
    'a[href],link[rel="alternate"],link[rel="describedby"]',
  )) {
    try {
      const url = publicURL(
        new URL(a.getAttribute("href") || "", base).href,
      ).href;
      links.push({
        url,
        label: (
          a.textContent ||
          a.getAttribute("type") ||
          a.getAttribute("rel") ||
          ""
        )
          .replace(/\s+/g, " ")
          .slice(0, 180),
      });
    } catch {
      /* Not a public documentation target. */
    }
  }
  return links;
}
export function linksFromText(text: string, base: string) {
  const links: { url: string; label: string }[] = [];
  for (const m of text.matchAll(
    /\[([^\]]{1,240})\]\(([^\s)]+)(?:\s+[^)]*)?\)|<loc>\s*([^<]+)\s*<\/loc>|^Sitemap:\s*(\S+)/gim,
  )) {
    try {
      const url = publicURL(
        new URL(decodeHTML(m[2] || m[3] || m[4]), base).href,
      ).href;
      links.push({ url, label: m[1] || new URL(url).pathname });
    } catch {}
  }
  for (const m of text.matchAll(/href=["'](https:\/\/[^"']+)["']/g)) {
    try {
      links.push({
        url: publicURL(m[1]).href,
        label: "Linked developer documentation",
      });
    } catch {}
  }
  return links;
}
export async function readBounded(r: Response, maxBytes = 2_500_000) {
  if (Number(r.headers.get("content-length")) > maxBytes) {
    await r.body?.cancel();
    throw new ResearchError("Page exceeds the research size limit.");
  }
  const reader = r.body?.getReader();
  if (!reader) return "";
  let n = 0;
  let text = "";
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.length;
      if (n > maxBytes)
        throw new ResearchError("Page exceeds the research size limit.");
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => {});
  }
}
export function parsePage(
  url: string,
  body: string,
  contentType: string,
): ResearchPage {
  const path = new URL(url).pathname;
  const isIndex =
    /<(?:urlset|sitemapindex)\b/i.test(body) ||
    /(?:^|\/)(?:llms(?:-full)?\.txt|sitemap[^/]*\.xml|robots\.txt)$/.test(path);
  if (contentType.includes("json") || /^\s*[{[]/.test(body)) {
    let metadata: Record<string, unknown> | undefined;
    try {
      const j = JSON.parse(body);
      if (j && typeof j === "object" && !Array.isArray(j)) metadata = j;
    } catch {}
    return {
      url,
      title: new URL(url).hostname + " · " + path,
      text: body.slice(0, 90000),
      links: [],
      format: "json",
      metadata,
    };
  }
  if (
    !/text\/html|xhtml/i.test(contentType) &&
    !/<(?:html|body|main|article)\b/i.test(body)
  )
    return {
      url,
      title:
        body.match(/^#\s+(.+)/m)?.[1]?.slice(0, 180) ||
        new URL(url).hostname + " · " + path,
      text: body.slice(0, 90000),
      links: linksFromText(body, url),
      format: isIndex ? "index" : "markdown",
    };
  return {
    url,
    title: (
      documentFor(body).querySelector("title")?.textContent ||
      new URL(url).hostname
    )
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180),
    text: textFromHTML(body).slice(0, 90000),
    links: linksFromHTML(body, url),
    format: "html",
  };
}
export function createPageReader(
  transport: Transport,
  signal: AbortSignal,
  attempts: Attempt[],
) {
  const dns = new Map<string, Promise<void>>();
  async function checkDNS(host: string, requestSignal: AbortSignal) {
    if (!dns.has(host))
      dns.set(
        host,
        (async () => {
          const replies = await Promise.all(
            ["A", "AAAA"].map(async (type) => {
              const r = await transport(
                `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
                {
                  headers: { accept: "application/dns-json" },
                  signal: requestSignal,
                },
              );
              if (!r.ok)
                throw new ResearchError("Public DNS verification unavailable.");
              const j = (await r.json()) as {
                Answer?: { type: number; data: string }[];
              };
              return (j.Answer || [])
                .filter((a) => a.type === 1 || a.type === 28)
                .map((a) => a.data);
            }),
          );
          const ips = replies.flat();
          if (!ips.length || ips.some((ip) => !publicIP(ip)))
            throw new ResearchError(
              "Target does not resolve exclusively to public internet addresses.",
            );
        })(),
      );
    await dns.get(host);
  }
  return async (
    value: string,
    kind: Attempt["kind"] = "document",
  ): Promise<ResearchPage> => {
    const target = publicURL(value);
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(20000)]);
    let u = target;
    try {
      for (let redirect = 0; redirect < 4; redirect++) {
        await checkDNS(u.hostname, requestSignal);
        const r = await transport(u.href, {
          redirect: "manual",
          headers: {
            "User-Agent": "OAuthAtlas/2.0 (public documentation research)",
            accept:
              "text/html,text/markdown,text/plain,application/json,application/xml;q=0.9",
          },
          signal: requestSignal,
        });
        if (r.status >= 300 && r.status < 400) {
          const location = r.headers.get("location");
          await r.body?.cancel();
          if (!location)
            throw new ResearchError("Redirect without a destination.");
          u = publicURL(new URL(location, u).href);
          continue;
        }
        if (!r.ok) {
          await r.body?.cancel();
          throw new ResearchError(`HTTP ${r.status}`, r.status);
        }
        const ct = r.headers.get("content-type") || "";
        if (!/text\/|json|xml/i.test(ct)) {
          await r.body?.cancel();
          throw new ResearchError("Unsupported documentation format.");
        }
        const body = await readBounded(r);
        if (
          /<(?:title|h1)[^>]*>[^<]*(?:verify you are human|just a moment|access denied)/i.test(
            body,
          ) ||
          /cf-chl-|captcha-delivery\.com/i.test(body)
        )
          throw new ResearchError(
            "Provider requires browser verification.",
            403,
          );
        const page = parsePage(u.href, body, ct);
        attempts.push({ url: target.href, kind, status: "ok" });
        return page;
      }
      throw new ResearchError("Redirect limit reached.");
    } catch (e) {
      const detail =
        e instanceof ResearchError
          ? e.message
          : requestSignal.aborted
            ? "Request timed out."
            : "Network request failed.";
      attempts.push({
        url: target.href,
        kind,
        status: requestSignal.aborted
          ? "timeout"
          : e instanceof ResearchError && [401, 403, 429].includes(e.status)
            ? "blocked"
            : "unavailable",
        detail,
      });
      throw e;
    }
  };
}

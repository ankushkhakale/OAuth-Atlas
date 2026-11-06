import test from "node:test";
import assert from "node:assert/strict";
import { investigate, evidenceFor } from "../lib/research.ts";
import { searchCandidates, identityMatches } from "../lib/discovery.ts";
import { parsePage, siteDomain } from "../lib/research-fetch.ts";

type Fixture = { body: string; type?: string; status?: number };
function transport(
  fixtures: Record<string, Fixture>,
  requests: string[] = [],
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    requests.push(url);
    if (url.startsWith("https://cloudflare-dns.com/dns-query"))
      return Response.json({ Answer: [{ type: 1, data: "1.1.1.1" }] });
    const fixture = fixtures[url];
    return new Response(fixture?.body || "Not found", {
      status: fixture?.status || (!fixture ? 404 : 200),
      headers: { "Content-Type": fixture?.type || "text/html" },
    });
  }) as typeof fetch;
}
const oauth =
  "<article><h1>OAuth 2.0 apps</h1><p>Register a new OAuth application. Configure its client_id, redirect_uri, and permissions. Ask the administrator about app review requirements.</p></article>";
const opts = { maxRequests: 24, maxDocuments: 12 };
test("homepage → external documentation → llms index → OAuth guide works without an app map", async () => {
  const fixtures: Record<string, Fixture> = {
    "https://little-app.example.com/": {
      body: '<a href="https://tenant.docs-host.net/docs">Developer documentation</a>',
    },
    "https://tenant.docs-host.net/docs": {
      body: "<main><h1>Product documentation</h1><p>Welcome to our API documentation.</p></main>",
    },
    "https://tenant.docs-host.net/llms.txt": {
      type: "text/plain",
      body: "# Product docs\n- [Register OAuth clients](https://tenant.docs-host.net/handbook/auth-clients.md)",
    },
    "https://tenant.docs-host.net/handbook/auth-clients.md": {
      type: "text/markdown",
      body: "# OAuth applications\nRegister an OAuth application. Set client_id and redirect_uri. Select scopes and confirm app review requirements.",
    },
  };
  const g = await investigate(
    "https://little-app.example.com",
    () => {},
    AbortSignal.timeout(5000),
    { ...opts, fetcher: transport(fixtures) },
  );
  assert.equal(g.research?.status, "oauth_documented");
  assert.ok(g.sources.some((s) => s.url.endsWith("/handbook/auth-clients.md")));
  assert.ok(g.sources.every((s) => !s.url.endsWith("llms.txt")));
  assert.ok(g.research?.coverage.registration);
});
test("a fourth queued documentation link is not accidentally marked visited before it is fetched", async () => {
  const requests: string[] = [];
  const fixtures: Record<string, Fixture> = {
    "https://tiny.example.com/": {
      body: [1, 2, 3, 4]
        .map((n) => `<a href="/docs/${n}">OAuth setup ${n}</a>`)
        .join(""),
    },
  };
  for (const n of [1, 2, 3, 4])
    fixtures[`https://tiny.example.com/docs/${n}`] = {
      body: n === 4 ? oauth : "<main>Other product documentation.</main>",
    };
  const g = await investigate(
    "https://tiny.example.com",
    () => {},
    AbortSignal.timeout(5000),
    { ...opts, fetcher: transport(fixtures, requests) },
  );
  assert.ok(requests.includes("https://tiny.example.com/docs/4"));
  assert.equal(g.research?.status, "oauth_documented");
});
test("an arbitrary new app name can resolve through the configured free search adapter", async () => {
  const fixtures: Record<string, Fixture> = {
    "https://search.example.net/search?q=NovelWidget+API+OAuth+app+registration+documentation&format=json":
      {
        type: "application/json",
        body: JSON.stringify({
          results: [
            {
              url: "https://developers.novel-widget.example.org/oauth",
              title: "NovelWidget developer documentation",
            },
          ],
        }),
      },
    "https://developers.novel-widget.example.org/oauth": { body: oauth },
  };
  const g = await investigate(
    "NovelWidget",
    () => {},
    AbortSignal.timeout(5000),
    {
      ...opts,
      searxngURL: "https://search.example.net",
      fetcher: transport(fixtures),
    },
  );
  assert.equal(g.research?.status, "oauth_documented");
  assert.equal(g.name, "NovelWidget");
});
test("API-key documentation and access failures remain distinct from unsupported OAuth", async () => {
  const g = await investigate(
    "https://api-key.example.com",
    () => {},
    AbortSignal.timeout(5000),
    {
      ...opts,
      fetcher: transport({
        "https://api-key.example.com/": {
          body: "<article><h1>API authentication</h1><p>Create an API key for server-to-server requests. Keep your API key private.</p></article>",
        },
      }),
    },
  );
  assert.equal(g.research?.status, "authentication_alternative");
  assert.equal(g.supported, "unconfirmed");
  assert.match(g.summary, /still unconfirmed/);
  assert.ok(g.research?.attempts.some((a) => a.status === "unavailable"));
  const blocked = await investigate(
    "https://locked.example.com",
    () => {},
    AbortSignal.timeout(5000),
    {
      ...opts,
      fetcher: transport({
        "https://locked.example.com/": { body: "Forbidden", status: 403 },
      }),
    },
  );
  assert.equal(blocked.research?.status, "unreachable");
  assert.ok(blocked.research?.attempts.some((a) => a.status === "blocked"));
  assert.equal(blocked.supported, "unconfirmed");
});
test("indexes and social-login references do not establish third-party app registration", () => {
  const index = parsePage(
    "https://example.com/llms.txt",
    "# API docs\n- [OAuth app creation](https://example.com/oauth)",
    "text/plain",
  );
  assert.equal(evidenceFor(index).oauth, false);
  assert.equal(
    evidenceFor({
      url: "https://example.com/sso",
      title: "Sign-in",
      text: "Configure social login with Google OAuth. Create an application in Google and supply its client_id and redirect_uri.",
    }).setup,
    false,
  );
  const metadata = parsePage(
    "https://example.com/.well-known/openid-configuration",
    JSON.stringify({
      authorization_endpoint: "https://example.com/authorize",
      token_endpoint: "https://example.com/token",
    }),
    "application/json",
  );
  assert.equal(evidenceFor(metadata).oauth, true);
  assert.equal(evidenceFor(metadata).setup, false);
});
test("public suffixes and malformed search output do not silently broaden identity", () => {
  assert.equal(siteDomain("https://docs.vendor.co.uk/"), "vendor.co.uk");
  assert.equal(siteDomain("https://other.co.uk/"), "other.co.uk");
  assert.deepEqual(searchCandidates("{broken", "searxng"), []);
});
test("caller cancellation remains cancellation instead of a completed report", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () =>
      investigate("https://example.com", () => {}, controller.signal, {
        fetcher: transport({}),
      }),
    { name: "AbortError" },
  );
});

test("shared integration catalogs cannot turn another product into OAuth evidence", async () => {
  const registry =
    "https://raw.githubusercontent.com/NangoHQ/nango/master/packages/providers/providers.yaml";
  const fixtures: Record<string, Fixture> = {
    [registry]: {
      type: "text/plain",
      body: "mystery:\n  display_name: Mystery\n  docs: https://nango.dev/docs/integrations/all/mystery\n",
    },
    "https://raw.githubusercontent.com/NangoHQ/nango/master/docs/integrations/all/mystery.mdx":
      {
        type: "text/plain",
        body: "# Mystery\nNo public setup guide yet.\n- [Other OAuth app](https://nango.dev/docs/integrations/all/unrelated-oauth)",
      },
    "https://nango.dev/docs/integrations/all/mystery": {
      body: '<a href="/docs/integrations/all/unrelated-oauth">Unrelated OAuth app registration</a>',
    },
    "https://nango.dev/docs/integrations/all/unrelated-oauth": { body: oauth },
  };
  const requests: string[] = [];
  const g = await investigate("Mystery", () => {}, AbortSignal.timeout(5000), {
    ...opts,
    fetcher: transport(fixtures, requests),
  });
  assert.equal(g.supported, "unconfirmed");
  assert.ok(
    !requests.includes(
      "https://nango.dev/docs/integrations/all/unrelated-oauth",
    ),
  );
  assert.ok(g.sources.every((s) => !s.url.includes("unrelated-oauth")));
});

test("nested sitemap filenames remain discovery indexes, never OAuth evidence", () => {
  const page = parsePage(
    "https://example.com/maps/developer-pages.xml",
    "<urlset><url><loc>https://example.com/oauth/register</loc></url></urlset>",
    "application/xml",
  );
  assert.equal(page.format, "index");
  assert.equal(evidenceFor(page).oauth, false);
  assert.equal(page.links?.[0]?.url, "https://example.com/oauth/register");
});

test("bundled name hints still work when the live registry and search services are unavailable", async () => {
  const requests: string[] = [];
  const { registryHints } = await import("../lib/discovery.ts");
  const attempts: import("../lib/research-fetch.ts").Attempt[] = [];
  const hints = await registryHints(
    "Front",
    transport({}, requests),
    AbortSignal.timeout(5000),
    attempts,
  );
  assert.ok(hints.some((h) => h.url.endsWith("/front.mdx")));
  assert.equal(requests.length, 0);
  assert.match(attempts[0].detail || "", /Bundled public discovery metadata/);
});

test("misspelled unknown names suggest search-discovered providers without silently crawling them", async () => {
  const requests: string[] = [];
  const fixtures: Record<string, Fixture> = {};
  for (const query of ["NebluaDesk API OAuth app registration documentation", "NebluaDesk official website"])
    fixtures[`https://search.example.net/search?q=${new URLSearchParams({q: query}).toString().slice(2)}&format=json`] = {
      type: "application/json", body: JSON.stringify({ results: [{ url: "https://nebuladesk.example/", title: "NebulaDesk official website" }] }),
    };
  const g = await investigate("NebluaDesk", () => {}, AbortSignal.timeout(5000), {
    ...opts, searxngURL: "https://search.example.net", fetcher: transport(fixtures, requests),
  });
  assert.equal(g.research?.status, "provider_unresolved");
  assert.equal(g.research?.requests, 0);
  assert.equal(g.research?.suggestions?.[0]?.input, "https://nebuladesk.example/");
  assert.ok(!requests.includes("https://nebuladesk.example/"));
  assert.equal(g.sources.length, 0);
  assert.equal(g.steps.length, 1);
});

test("a general homepage search resolves an unknown provider when the OAuth query has no matches", async () => {
  const fixtures: Record<string, Fixture> = {
    "https://search.example.net/search?q=NewOrbit+API+OAuth+app+registration+documentation&format=json": {
      type: "application/json", body: JSON.stringify({results: []}),
    },
    "https://search.example.net/search?q=NewOrbit+official+website&format=json": {
      type: "application/json", body: JSON.stringify({results: [{url: "https://neworbit.example.org/", title: "NewOrbit"}]}),
    },
    "https://neworbit.example.org/": {body: '<a href="/developers/authorization">OAuth developer documentation</a>'},
    "https://neworbit.example.org/developers/authorization": {body: oauth},
  };
  const g = await investigate("NewOrbit", () => {}, AbortSignal.timeout(5000), {
    ...opts, searxngURL: "https://search.example.net", fetcher: transport(fixtures),
  });
  assert.equal(g.research?.status, "oauth_documented");
  assert.ok(g.sources.some(s => s.url.endsWith("/developers/authorization")));
});

test("a blocked search is reported as discovery failure, not unreachable documentation", async () => {
  const g = await investigate("TotallyNewProduct", () => {}, AbortSignal.timeout(5000), {
    ...opts, fetcher: transport({}),
  });
  assert.equal(g.research?.status, "discovery_unavailable");
  assert.equal(g.research?.requests, 0);
  assert.ok(g.research?.attempts.filter(a => a.kind === "search").length >= 2);
  assert.match(g.summary, /No provider documentation was requested/);
  const {guideMarkdown} = await import("../lib/guide.ts");
  assert.match(guideMarkdown(g), /Research report/);
  assert.doesNotMatch(guideMarkdown(g), /— OAuth setup guide/);
});

test("near spelling suggestions are generic, and short or unrelated names are rejected", async () => {
  const {providerSuggestions} = await import("../lib/discovery.ts");
  assert.ok(providerSuggestions("githbu").some(s => /github/i.test(s.name)));
  assert.equal(providerSuggestions("app", [{url:"https://apt.example.com/", label:"Apt"}]).length, 0);
  assert.equal(providerSuggestions("NebluaDesk", [{url:"https://unrelated.example.com/", label:"NebulaDesk"}]).length, 0);
});

test("a transposed search-discovered name is proposed only as an unverified identity", async () => {
  const {providerSuggestions, identityMatches} = await import("../lib/discovery.ts");
  const hit = {url: "https://www.duolingo.com/", label: "Duolingo"};
  assert.equal(identityMatches("doulingo", hit), false);
  const suggestions = providerSuggestions("doulingo", [hit]);
  assert.equal(suggestions[0]?.name, "Duolingo");
  assert.match(suggestions[0]?.reason || "", /unverified/);
});

test("unrelated first-engine hits do not suppress a matching fallback search result", async () => {
  const {searchDocs, identityMatches} = await import("../lib/discovery.ts");
  const query = "NewOrbit official website";
  const attempts: import("../lib/research-fetch.ts").Attempt[] = [];
  const hits = await searchDocs(query, transport({
    [`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`]: {
      body: '<a href="https://unrelated.example/">Other product</a>',
    },
    [`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`]: {
      type: "application/rss+xml", body: '<rss><channel><item><title>NewOrbit</title><link>https://neworbit.example/</link></item></channel></rss>',
    },
  }), AbortSignal.timeout(5000), attempts, undefined, h => identityMatches("NewOrbit", h));
  assert.equal(hits[0]?.url, "https://neworbit.example/");
  assert.equal(attempts.length, 2);
});

test("open-data identity fallback finds a provider website without treating metadata as OAuth proof", async () => {
  const fixtures: Record<string, Fixture> = {
    "https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=NebluaDesk&srinfo=suggestion&format=json&srlimit=3": {
      type: "application/json", body: JSON.stringify({query: {search: [{title:"NebulaDesk"}]}}),
    },
    "https://www.wikidata.org/w/api.php?action=wbgetentities&sites=enwiki&titles=NebulaDesk&props=labels%7Cclaims&languages=en&format=json": {
      type: "application/json", body: JSON.stringify({entities: {Q123: {
        labels:{en:{value:"NebulaDesk"}}, claims:{P856:[{rank:"normal",mainsnak:{datavalue:{value:"https://nebuladesk.example/"}}}]},
      }}}),
    },
  };
  const requests: string[] = [];
  const g = await investigate("NebluaDesk", () => {}, AbortSignal.timeout(5000), {
    ...opts, fetcher: transport(fixtures, requests),
  });
  assert.equal(g.research?.status, "provider_unresolved");
  assert.equal(g.research?.suggestions?.[0]?.name, "NebulaDesk");
  assert.equal(g.sources.length, 0);
  assert.equal(g.research?.requests, 0);
  assert.ok(!requests.includes("https://nebuladesk.example/"));
});

test('native-script provider names retain their identity instead of collapsing to empty text',()=>{
 assert.equal(identityMatches('भारत ऐप',{url:'https://example.in',label:'भारत ऐप developer documentation'}),true);
 assert.equal(identityMatches('भारत ऐप',{url:'https://example.in',label:'Unrelated developer documentation'}),false);
});

test('linked OAuth protocol tutorials cannot establish provider registration support',async()=>{
 const requests:string[]=[];
 const g=await investigate('https://novel.example.com',()=>{},AbortSignal.timeout(5000),{...opts,fetcher:transport({
 'https://novel.example.com/':{body:'<main><h1>Novel product</h1><p>API documentation coming soon.</p><a href="https://www.oauth.com/oauth2-servers/client-registration/registering-new-application/">Registering OAuth applications tutorial</a></main>'},
 'https://www.oauth.com/oauth2-servers/client-registration/registering-new-application/':{body:oauth}
 },requests)});
 assert.equal(g.supported,'unconfirmed');assert.equal(g.research?.coverage.registration,false);assert.ok(g.sources.every(s=>!s.url.includes('oauth.com')));
});

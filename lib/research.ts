import type { Guide, Source, Step } from "./guide";
import {
  createPageReader,
  publicURL,
  siteDomain,
  type ResearchPage as Page,
  type Attempt,
  type Transport,
  ResearchError,
} from "./research-fetch.ts";
import {
  registryHints,
  searchDocs,
  scoreLink,
  identityMatches,
  providerSuggestions,
  knowledgeSuggestions,
  type ProviderSuggestion,
} from "./discovery.ts";
export {
  ResearchError,
  publicURL,
  textFromHTML,
  linksFromHTML,
  decodeHTML,
} from "./research-fetch.ts";
export type ResearchOptions = {
  ollamaURL?: string;
  model?: string;
  searxngURL?: string;
  fetcher?: Transport;
  maxDocuments?: number;
  maxRequests?: number;
};
const AUTH = /\boauth(?:\s*[12](?:\.0)?)?\b|authorization[_ -]code|\bpkce\b/i;
const APP_REVIEW =
  /app(?:lication)? (?:review|approval|verification)|(?:marketplace|commercial|production|public distribution).{0,80}(?:review|approval|verification)|partner.{0,30}(?:program|access)/i;
const ALTERNATIVE =
  /api[ _-]?key|personal access token|database token|bearer token/i;
export function evidenceFor(page: Page) {
  if (page.format === "index")
    return { oauth: false, setup: false, alternative: false };
  const oauth = AUTH.test(page.text);
  const metadata = page.metadata;
  const discovery =
    typeof metadata?.authorization_endpoint === "string" &&
    typeof metadata?.token_endpoint === "string";
  const consumerOnly =
    /social login|single.sign.on|(?:sign|log)[ -]?in with (?:Google|Microsoft|GitHub|Okta)/i.test(
      page.text,
    ) &&
    !/acts? as.{0,20}(?:oauth|provider)|acting as.{0,20}oauth|third.party (?:applications?|clients?)/i.test(
      page.text,
    );
  const setup =
    oauth &&
    !consumerOnly &&
    /third.party (?:applications?|clients?)|oauth2? provider|register.{0,50}(?:client|oauth|application|app\b)|creat.{0,50}(?:oauth|application)|\bclient_id\b|\bredirect_uri\b/i.test(
      page.text,
    );
  return {
    oauth: oauth || discovery,
    setup:
      setup ||
      (discovery && typeof metadata?.registration_endpoint === "string"),
    alternative: ALTERNATIVE.test(page.text),
  };
}
function useful(page: Page) {
  return (
    page.format !== "index" &&
    (evidenceFor(page).oauth ||
      evidenceFor(page).alternative ||
      (/scope|redirect|callback|app review|verification|client secret/i.test(
        page.text,
      ) &&
        scoreLink(page.url + " " + page.title) > 0))
  );
}
function makeSources(pages: Page[]): Source[] {
  return pages.slice(0, 8).map((p, i) => {
    const paragraph =
      p.text
        .split("\n")
        .find((s) => s.length > 45 && (AUTH.test(s) || ALTERNATIVE.test(s))) ||
      p.text.split("\n").find((s) => s.length > 45) ||
      p.text;
    const words = paragraph.split(/\s+/);
    return {
      id: String(i + 1),
      title: p.title,
      url: p.url,
      checkedAt: new Date().toISOString().slice(0, 10),
      excerpt: words.slice(0, 23).join(" ") + (words.length > 23 ? " …" : ""),
      provenance: p.provenance,
    };
  });
}
function partialGuide(
  name: string,
  pages: Page[],
  trace: Guide["trace"],
): Guide {
  const alternative = pages.some((p) => evidenceFor(p).alternative);
  const references = pages.some((p) => evidenceFor(p).oauth);
  const sources = makeSources(
    pages.filter(useful).length ? pages.filter(useful) : pages.slice(0, 3),
  );
  const make = (title: string, detail: string, refs: string[] = []): Step => ({
    title,
    detail,
    owner: "You",
    level: "unknown",
    sources: refs,
  });
  const first = references
    ? make(
        "Confirm the API surface and OAuth direction",
        "The retrieved sources mention OAuth, but a third-party app-registration path is not established. Confirm whether the documents describe your intended API, MCP access, or sign-in/SSO.",
        sources.map((s) => s.id),
      )
    : alternative
      ? make(
          "Confirm the authentication method for your use case",
          "The inspected documentation describes a token or API-key method. This does not rule out a separate OAuth program. Confirm whether third-party OAuth app registration is available.",
          sources.map((s) => s.id),
        )
      : make(
          "Confirm the provider and documentation access",
          "Use the provider homepage or developer portal below. If the docs require login or partner access, an account owner must complete that handoff.",
          sources.slice(0, 1).map((s) => s.id),
        );
  return {
    id: crypto.randomUUID(),
    name,
    category: "Live research",
    glyph: name.slice(0, 2).toUpperCase(),
    color: "#8b785b",
    difficulty: "Unconfirmed",
    effort: "Needs confirmation",
    wait: "Needs confirmation",
    effortNote:
      "Public documentation did not establish an applicable setup path.",
    waitNote: "No approval requirement or turnaround was established.",
    production: "Research findings → resolve missing access or requirements",
    summary: references
      ? "OAuth references were found, but third-party app registration remains unconfirmed. Review the API surface, source evidence, and provider questions below."
      : alternative
        ? "Authentication documentation was found, but an OAuth app-registration path is still unconfirmed. Review the sources and the next questions below."
        : "Research saved the available findings and discovery attempts. OAuth setup remains unconfirmed; that is not evidence that this app does not support OAuth.",
    checkedAt: new Date().toISOString().slice(0, 10),
    kind: "live",
    supported: "unconfirmed",
    steps: [
      first,
      make(
        "Ask the provider about third-party OAuth apps",
        "Ask where to register an OAuth client, which account or plan is eligible, what scopes are available, and whether external-user distribution requires review.",
      ),
      make(
        "Choose the supported integration path",
        "If the provider confirms OAuth, continue with its registration instructions. If it confirms another authentication method, use that documented method and keep credentials server-side.",
      ),
    ],
    blockers: [
      make(
        "OAuth registration has not been established",
        "A missing public page, a blocked request, and an unsupported authentication method are different outcomes. Inspect the research coverage before choosing your next step.",
      ),
    ],
    sources,
    unknowns: [
      "Whether third-party OAuth apps can be registered for the intended API and audience.",
      "Account eligibility, minimum scopes, callback requirements, review conditions, and approval timing.",
      "No account login, app registration, or token exchange was performed.",
    ],
    agent: [
      "Discover documentation across linked sites, indexes, and free search",
      "Record sources, access failures, and unresolved questions",
    ],
    human: [
      "Confirm an ambiguous provider identity or supply its homepage",
      "Open account-only documentation and ask the provider about missing requirements",
    ],
    tested: [
      `${pages.length} public content pages retrieved. An incomplete report is not a completed OAuth guide.`,
      "No OAuth support or lack of support was inferred from missing pages.",
    ],
    trace,
  };
}
export function buildExtractiveGuide(
  name: string,
  pages: Page[],
  trace: Guide["trace"],
): Guide {
  if (!pages.some((p) => evidenceFor(p).oauth))
    return partialGuide(name, pages, trace);
  const ranked = pages
    .filter(useful)
    .sort(
      (a, b) =>
        Number(evidenceFor(b).setup) * 80 +
        Number(evidenceFor(b).oauth) * 40 -
        Number(evidenceFor(a).setup) * 80 -
        Number(evidenceFor(a).oauth) * 40,
    );
  const chosen = [
    ranked.find((p) => evidenceFor(p).setup),
    ranked.find(
      (p) => evidenceFor(p).oauth && /scope|permission/i.test(p.text),
    ),
    ranked.find((p) => APP_REVIEW.test(p.text.replace(/\s+/g, " "))),
    ...ranked,
  ].filter((p): p is Page => !!p);
  const relevant = [...new Map(chosen.map((p) => [p.url, p])).values()].slice(
    0,
    8,
  );
  const date = new Date().toISOString().slice(0, 10);
  const sources = makeSources(relevant);
  const refs = (re: RegExp) =>
    relevant
      .map((p, i) => (re.test(p.text) ? String(i + 1) : ""))
      .filter(Boolean)
      .slice(0, sources.length);
  const s = (
    title: string,
    detail: string,
    ids: string[],
    level: Step["level"] = "estimate",
  ): Step => ({
    title,
    detail,
    owner: "You",
    level,
    sources: ids.filter((id) => sources.some((s) => s.id === id)),
  });
  const registration = refs(
    /register|create.{0,30}(app|integration)|developer.{0,20}(portal|console)/i,
  );
  const approval = refs(
    /approval|verification|app review|marketplace|distribution/i,
  );
  const steps: Step[] = [
    s(
      "Confirm the registration path",
      "Open the cited documentation and locate app registration, account prerequisites, and the developer console. The agent has not signed in or created an app.",
      registration,
    ),
    s(
      "Define the minimum permissions",
      "Map each integration action to a documented permission. Confirm its sensitivity and whether it changes your approval path.",
      refs(/scope|permission|capabilit/i),
    ),
    s(
      "Configure your OAuth callback",
      "Locate the documented redirect requirements and code exchange. Use your OAuth library’s state and PKCE support as appropriate to the provider.",
      refs(/redirect|callback|authorization.code/i),
    ),
    s(
      "Test one complete user connection",
      "After you register the app, test consent, denial, token handling, and access to a real resource. These account-dependent operations require you.",
      [],
    ),
    s(
      "Confirm production and approval requirements",
      "Check the policy sources and contact the provider if the approval requirement or turnaround remains unclear. Do not infer no review from missing documentation.",
      approval,
    ),
  ];
  const blockers = [
    s(
      "Approval applicability remains unconfirmed",
      approval.length
        ? "The retrieved pages mention review, verification, or distribution. Check the exact conditions for your scopes and audience before planning a launch."
        : "The inspected pages do not establish an approval policy. Ask provider support whether your scopes and distribution require review.",
      approval,
      "unknown",
    ),
    s(
      "Account and permission gates need a human",
      "Log in to the developer console and confirm your account role, workspace policy, and app-creation access. Public docs cannot prove those permissions.",
      [],
      "unknown",
    ),
  ];
  return {
    id: crypto.randomUUID(),
    name,
    category: "Live research",
    glyph: name.slice(0, 2).toUpperCase(),
    color: "#64745e",
    difficulty: "Unconfirmed",
    effort: "Not established",
    wait: "Not established",
    effortNote:
      "A documentation scan cannot determine your implementation effort.",
    waitNote: "No provider SLA or applicable approval path was verified.",
    production: "Evidence collected → human validation → setup",
    summary:
      "Live documentation research found OAuth references. This is an evidence packet with an advisory setup plan; provider-specific requirements still need validation.",
    checkedAt: date,
    kind: "live",
    supported: "documented",
    steps,
    blockers,
    sources,
    unknowns: [
      "OAuth references were found; exact account eligibility and approval conditions are not independently verified.",
      "Effort, review turnaround, pricing, and scope classifications are unknown unless confirmed in the linked sources.",
      "No account login, app creation, token exchange, or review submission was performed.",
    ],
    agent: [
      "Discover public documentation",
      "Inspect OAuth and policy references",
      "Collect source excerpts and generate an advisory checklist",
    ],
    human: [
      "Confirm the official provider identity and requirements",
      "Log in, register the app, and choose scopes",
      "Test the OAuth flow and submit any required approval",
    ],
    tested: [
      `${pages.length} public pages fetched; ${sources.length} OAuth-related pages retained. Source retrieval is not a completed setup test.`,
      "Deterministic public-document research; no paid API was used.",
    ],
    trace,
  };
}
export async function investigate(
  input: string,
  emit: (message: string) => void,
  signal: AbortSignal,
  options: ResearchOptions = {},
): Promise<Guide> {
  input = input.trim();
  if (input.length < 2 || input.length > 240 || /[\x00-\x1f<>]/.test(input))
    throw new ResearchError(
      "Enter an app name or public website (2–240 characters).",
      400,
    );
  const transport = options.fetcher || fetch;
  const attempts: Attempt[] = [];
  const trace: NonNullable<Guide["trace"]> = [];
  const progress = (message: string) => {
    trace.push({ message, at: new Date().toISOString() });
    emit(message);
  };
  const looksURL =
    /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ||
    /^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(input);
  const entry = looksURL
    ? publicURL(/^[a-z]+:\/\//i.test(input) ? input : `https://${input}`).href
    : undefined;
  const crawlSignal = AbortSignal.any([signal, AbortSignal.timeout(100_000)]);
  const read = createPageReader(transport, crawlSignal, attempts);
  const pages: Page[] = [];
  type Task = {
    url: string;
    priority: number;
    kind: "document" | "index";
    provenance: string;
  };
  const queued = new Map<string, Task>();
  const tried = new Set<string>();
  const indexed = new Set<string>();
  const richRepresentations = new Set<string>();
  const documentKey = (url: string) =>
    url.replace(/\.md$/, "").replace(/\/$/, "");
  let reads = 0;
  let searched = false;
  let policyPass = false;
  let resolvedName = input;
  let discovery = "User-supplied website";
  let suggestions: ProviderSuggestion[] = [];
  const maxDocuments = Math.max(1, Math.min(options.maxDocuments || 16, 20));
  const maxRequests = Math.max(4, Math.min(options.maxRequests || 36, 40));
  // Protocol tutorials/standards can explain OAuth, but cannot establish this provider's registration policy.
  const referenceOnly = (url:string) => {
    const u=new URL(url), domain=siteDomain(url);
    const generic=["oauth.com","oauth.net","ietf.org","w3.org"].includes(domain)||u.hostname==="developer.mozilla.org";
    return generic && (!entry || siteDomain(entry)!==domain);
  };
  const enqueue = (
    url: string,
    priority: number,
    kind: Task["kind"] = "document",
    provenance = "Linked documentation",
  ) => {
    try {
      const u = publicURL(url);
      if(referenceOnly(u.href)) return;
      if (tried.has(u.href) || richRepresentations.has(documentKey(u.href)))
        return;
      if (
        /\/(?:oauth|oauth2)\/(?:authorize|token)$/.test(u.pathname) ||
        /\/login\/oauth\//.test(u.pathname)
      )
        return;
      const current = queued.get(u.href);
      if (!current || current.priority < priority)
        queued.set(u.href, { url: u.href, priority, kind, provenance });
    } catch {}
  };
  const indexOrigin = (url: string) => {
    const origin = new URL(url).origin;
    if (indexed.has(origin) || indexed.size >= 6) return;
    indexed.add(origin);
    for (const [path, priority] of [
      ["/llms.txt", 84],
      ["/robots.txt", 51],
      ["/sitemap.xml", 49],
      ["/.well-known/oauth-authorization-server", 16],
      ["/.well-known/openid-configuration", 15],
    ] as const)
      enqueue(
        origin + path,
        priority,
        path.includes(".well-known") ? "document" : "index",
        path.includes(".well-known")
          ? "Public authorization metadata"
          : "Documentation discovery index",
      );
  };
  const catalogPage = (url: string) =>
    siteDomain(url) === "nango.dev" ||
    url.startsWith("https://raw.githubusercontent.com/NangoHQ/nango/");
  const requestedToken = input.toLowerCase().replace(/[^a-z0-9]/g, "");
  const addLinks = (page: Page) => {
    for (const link of page.links || []) {
      const same = siteDomain(link.url) === siteDomain(page.url);
      if (
        !same &&
        /(^|\.)(oauth\.net|ietf\.org|rfc-editor\.org|w3\.org|openid\.net|developer\.mozilla\.org)$/.test(
          new URL(link.url).hostname,
        )
      )
        continue;
      if (catalogPage(page.url) && catalogPage(link.url)) {
        const path = new URL(link.url).pathname
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        if (!requestedToken || !path.includes(requestedToken)) continue;
      }
      const score = scoreLink(link.url + " " + link.label);
      // Explicitly linked external documentation is allowed; brand-name hostname guesses are not required.
      if (
        score >= 7 &&
        (same ||
          /docs|developer|documentation|api.reference|oauth|authentication|authorization|markdown|register|registration|application|client|permission|review/i.test(
            link.label +
              " " +
              new URL(link.url).hostname +
              " " +
              new URL(link.url).pathname,
          ))
      )
        enqueue(
          link.url,
          score + (page.format === "index" ? 43 : 38),
          /llms\.txt|sitemap[^/]*\.xml|robots\.txt/.test(link.url)
            ? "index"
            : "document",
          same
            ? "Provider-site documentation"
            : "Documentation linked by " + new URL(page.url).hostname,
        );
    }
  };
  progress("Resolving the provider and planning documentation discovery");
  if (entry) {
    enqueue(entry, 120, "document", "User-supplied website");
    resolvedName = siteDomain(entry).split(".")[0];
  } else {
    const hints = await registryHints(input, transport, crawlSignal, attempts);
    if (hints.length) {
      discovery =
        "Public provider discovery metadata, followed by live source retrieval";
      resolvedName = hints[0].label;
      for (const hint of hints)
        enqueue(
          hint.url,
          hint.provenance.includes("discovery link") ? 110 : 65,
          hint.provenance.includes("discovery link") ? "index" : "document",
          hint.provenance,
        );
      progress(
        "Resolved the provider using public discovery metadata; checking linked documentation live",
      );
    } else {
      const relevant = (hit: { url: string; label: string }) =>
        identityMatches(input, hit) || providerSuggestions(input, [hit], false).some(s => s.url === hit.url);
      const hits = await searchDocs(
        `${input} API OAuth app registration documentation`,
        transport, crawlSignal, attempts, options.searxngURL, relevant,
      );
      if (!hits.some(h => identityMatches(input, h)) && !crawlSignal.aborted) {
        progress("Looking for the provider website before searching deeper documentation");
        const homepages = await searchDocs(
          `${input} official website`, transport, crawlSignal, attempts,
          options.searxngURL, relevant,
        );
        hits.push(...homepages);
      }
      suggestions = providerSuggestions(input, hits);
      searched = true;
      const matches = hits
        .filter((h) => identityMatches(input, h))
        .sort(
          (a, b) =>
            scoreLink(b.url + " " + b.label) - scoreLink(a.url + " " + a.label),
        );
      if (!matches.length && !suggestions.length && !crawlSignal.aborted) {
        progress("Checking independent open-data identity records for a possible provider website");
        suggestions = await knowledgeSuggestions(input, transport, crawlSignal, attempts);
      }
      for (const hit of matches.slice(0, 4))
        enqueue(
          hit.url,
          100,
          "document",
          "Search-discovered candidate; confirm provider identity",
        );
      discovery = "Free web discovery";
      if (!matches.length)
        progress(
          "Provider identity could not be resolved confidently; preserving an actionable research report",
        );
    }
  }
  while (
    queued.size &&
    reads < maxRequests &&
    pages.length < maxDocuments &&
    !crawlSignal.aborted
  ) {
    for (const [url] of queued)
      if (richRepresentations.has(documentKey(url))) queued.delete(url);
    const batch = [...queued.values()]
      .sort((a, b) => b.priority - a.priority)
      .slice(0, Math.min(3, maxRequests - reads, maxDocuments - pages.length));
    for (const task of batch) {
      queued.delete(task.url);
      tried.add(task.url);
      reads++;
    }
    const results = await Promise.allSettled(
      batch.map(async (task) => {
        const page = await read(task.url, task.kind);
        page.provenance = task.provenance;
        return { page, task };
      }),
    );
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        progress(
          `Could not read ${new URL(batch[i].url).hostname}${new URL(batch[i].url).pathname.slice(0, 65)}; recorded the access limitation`,
        );
        continue;
      }
      const { page, task } = result.value;
      if(referenceOnly(page.url)) continue;
      for(const link of page.links||[]) {
        if(link.label && referenceOnly(link.url)) page.text=page.text.split(link.label).join("");
      }
      tried.add(page.url);
      progress(
        `Inspected ${new URL(page.url).hostname}${new URL(page.url).pathname.slice(0, 70)}`,
      );
      if (
        task.kind === "index" ||
        page.format === "index" ||
        catalogPage(page.url)
      ) {
        addLinks(page);
        continue;
      }
      if (!pages.some((p) => documentKey(p.url) === documentKey(page.url)))
        pages.push(page);
      if (useful(page) && page.text.length > 400)
        richRepresentations.add(documentKey(page.url));
      addLinks(page);
      indexOrigin(page.url);
      if ((page.links || []).length === 0 && !evidenceFor(page).oauth) {
        const u = new URL(page.url);
        if (u.pathname !== "/")
          enqueue(
            u.origin + "/",
            45,
            "document",
            "Parent website for documentation discovery",
          );
      }
    }
    const authPages = pages.filter((p) => evidenceFor(p).oauth);
    const coverage = coverageFor(pages);
    if (
      authPages.length >= 2 &&
      coverage.registration &&
      coverage.permissions
    ) {
      if (coverage.approval) break;
      if (!policyPass) {
        policyPass = true;
        progress(
          "Checking distribution and app-review references before finishing",
        );
        const domain = siteDomain(authPages[0].url);
        const hits = await searchDocs(
          `site:${domain} OAuth app review approval publishing`,
          transport,
          crawlSignal,
          attempts,
          options.searxngURL,
        );
        for (const hit of hits
          .filter(
            (h) =>
              siteDomain(h.url) === domain &&
              /review|approval|verif|publish|marketplace|distribut/i.test(
                h.url + " " + h.label,
              ),
          )
          .slice(0, 3))
          enqueue(hit.url, 95, "document", "Provider policy search result");
      }
      const focused = [...queued.values()].filter((t) =>
        /review|approval|verif|publish|marketplace|distribut|register|create.*app/i.test(
          t.url,
        ),
      );
      if (!focused.length) break;
      for (const task of queued.values())
        if (!focused.includes(task)) queued.delete(task.url);
    }
    if (
      !queued.size &&
      !searched &&
      pages.length < maxDocuments &&
      !crawlSignal.aborted
    ) {
      searched = true;
      const base = entry ? siteDomain(entry) : resolvedName;
      progress(
        "Expanding discovery beyond the first site for OAuth and developer documentation",
      );
      const hits = await searchDocs(
        `${base} OAuth register application developer documentation`,
        transport,
        crawlSignal,
        attempts,
        options.searxngURL,
      );
      for (const hit of hits
        .filter((h) =>
          entry
            ? siteDomain(h.url) === siteDomain(entry) ||
              identityMatches(resolvedName, h)
            : identityMatches(input, h),
        )
        .slice(0, 4))
        enqueue(
          hit.url,
          80,
          "document",
          "Search-discovered documentation; confirm provider identity",
        );
      if (entry && !authPages.length) {
        const hints = await registryHints(
          entry,
          transport,
          crawlSignal,
          attempts,
        );
        for (const hint of hints)
          enqueue(
            hint.url,
            78,
            hint.provenance.includes("discovery link") ? "index" : "document",
            hint.provenance,
          );
      }
    }
  }
  signal.throwIfAborted();
  const name = resolvedName.charAt(0).toUpperCase() + resolvedName.slice(1);
  progress(
    "Checking OAuth evidence, missing requirements, and research coverage",
  );
  const guide = pages.some((p) => evidenceFor(p).setup)
    ? buildExtractiveGuide(name, pages, trace)
    : partialGuide(name, pages, trace);
  guide.unknowns.unshift(
    "Confirm the intended API surface: standard REST API, MCP, sign-in/SSO, and self-hosted deployments can have different OAuth paths.",
  );
  const evidence = pages.map(evidenceFor);
  const hasSetup = evidence.some((e) => e.setup);
  const hasOAuth = evidence.some((e) => e.oauth);
  const searchAttempts = attempts.filter(a => a.kind === "search" || a.kind === "identity");
  const discoveryUnavailable = searchAttempts.length > 0 && searchAttempts.every(a => a.status !== "ok");
  const status = reads === 0
    ? suggestions.length ? "provider_unresolved"
      : discoveryUnavailable ? "discovery_unavailable" : "provider_unresolved"
    : !pages.length ? "unreachable"
    : hasSetup
      ? "oauth_documented"
      : hasOAuth
        ? "oauth_references"
        : evidence.some((e) => e.alternative)
          ? "authentication_alternative"
          : "needs_review";
  guide.supported = hasSetup ? "documented" : "unconfirmed";
  guide.research = {
    status,
    discovery,
    attempts,
    suggestions: reads === 0 ? suggestions : [],
    diagnosis: reads === 0
      ? suggestions.length
        ? "A possible provider match was found. Confirm it before documentation research starts."
        : discoveryUnavailable
          ? "Name discovery could not complete because the search services were blocked, timed out, or unavailable. No provider documentation was requested."
          : "Search did not establish a matching provider website. No provider documentation was requested. Check the name or supply its homepage."
      : undefined,
    coverage: coverageFor(pages),
    documents: pages.length,
    requests: reads,
    limited:
      crawlSignal.aborted ||
      reads >= maxRequests ||
      pages.length >= maxDocuments,
    facts: observedFacts(guide, pages),
  };
  if (reads === 0) {
    guide.summary = guide.research.diagnosis!;
    guide.production = "Resolve the provider before planning OAuth setup";
    guide.steps = [{
      title: suggestions.length ? "Confirm the intended provider" : "Find the provider website",
      detail: suggestions.length
        ? "Choose a possible match below, or enter the intended provider’s website. No match is selected automatically."
        : "Retry name discovery, check the spelling, or supply the homepage. You do not need to find an OAuth documentation URL.",
      owner: "You", level: "unknown", sources: [],
    }];
    guide.blockers = [{ title: discoveryUnavailable ? "Search discovery unavailable" : "Provider identity unconfirmed",
      detail: guide.research.diagnosis!, owner: "Agent", level: "unknown", sources: [] }];
  }
  guide.tested.push(
    `${reads} bounded page/index requests; ${pages.length} content pages retained. Discovery hints and indexes were not treated as OAuth proof.`,
  );
  if (hasOAuth && !hasSetup)
    guide.unknowns.unshift(
      "OAuth is mentioned, but these sources have not established a third-party app registration path. Login/SSO documentation can describe a different integration direction.",
    );
  if (options.ollamaURL && hasSetup) {
    progress(
      "Drafting provider-specific steps with the configured local model",
    );
    try {
      const { synthesize } = await import("./synthesize.ts");
      await synthesize(
        guide,
        pages,
        options.ollamaURL,
        options.model || "qwen2.5:1.5b",
        signal,
      );
      progress("Validated draft source IDs and supporting excerpts");
    } catch {
      progress(
        "Local synthesis did not pass; preserving the retrieved evidence and advisory plan",
      );
      guide.tested.push(
        "Local synthesis did not pass; no model-generated steps were retained.",
      );
    }
  }
  progress(
    hasSetup
      ? "OAuth setup evidence found; guide saved with source coverage"
      : hasOAuth
        ? "OAuth references found; registration still needs confirmation"
        : "Research report prepared with findings and concrete follow-up actions",
  );
  return guide;
}
export function coverageFor(pages: Page[]) {
  const docs = pages.filter((p) => p.format !== "index");
  return {
    oauth: docs.some((p) => evidenceFor(p).oauth),
    registration: docs.some((p) => evidenceFor(p).setup),
    permissions: docs.some((p) =>
      /\bscope[s]?\b|permissions|capabilities/i.test(p.text),
    ),
    approval: docs.some((p) => APP_REVIEW.test(p.text.replace(/\s+/g, " "))),
  };
}

function observedFacts(guide: Guide, pages: Page[]) {
  const facts: { label: string; value: string; source: string }[] = [];
  for (const source of guide.sources) {
    const page = pages.find((p) => p.url === source.url);
    if (!page) continue;
    for (const [key, label] of [
      ["authorization_endpoint", "Authorization endpoint"],
      ["token_endpoint", "Token endpoint"],
      ["registration_endpoint", "Client-registration endpoint"],
      ["scopes_supported", "Scopes in server metadata"],
    ] as const) {
      const value = page.metadata?.[key];
      if (typeof value === "string" && value.startsWith("https://")) {
        try {
          facts.push({
            label,
            value: publicURL(value).href,
            source: source.id,
          });
        } catch {}
      } else if (
        key === "scopes_supported" &&
        Array.isArray(value) &&
        value.every((v) => typeof v === "string")
      )
        facts.push({
          label,
          value: value.slice(0, 20).join(", "),
          source: source.id,
        });
    }
    for (const url of page.text.match(/https:\/\/[^\s<>"'`\\]+/g) || []) {
      try {
        const u = publicURL(url.replace(/[),.;]+$/, ""));
        const label = /\/(?:oauth2?\/)?(?:authorize|authorization)$/.test(
          u.pathname,
        )
          ? "Authorization URL in documentation"
          : /\/(?:oauth2?\/)?(?:token|access_token)$/.test(u.pathname)
            ? "Token URL in documentation"
            : "";
        if (label && !facts.some((f) => f.value === u.href))
          facts.push({ label, value: u.href, source: source.id });
      } catch {}
    }
  }
  return facts.slice(0, 10);
}

# Unknown-app discovery

## Why the old flow failed

The old engine depended on a small app-to-URL map and a shallow same-domain crawl. It also marked every candidate visited before fetching only the first three, so later candidates could disappear. If no inspected page contained OAuth text, it threw the reported error and discarded otherwise useful findings.

## Current path

1. Resolve a name using public provider-discovery metadata or free search. A website input starts directly from that website. No app-specific success cases are added to the engine.
2. Use registry documentation as a discovery index. Follow its provider-owned documentation links, including externally hosted docs. Other products in the catalog are excluded from evidence.
3. Inspect prioritized documentation links, `llms.txt`, Markdown alternatives, robots/sitemap indexes, and public authorization metadata. Indexes locate content; their keywords are not OAuth proof.
4. Separate OAuth app-registration evidence, OAuth references alone, token/API-key documentation, and unreadable sources. Sign-in/SSO instructions alone do not establish a third-party provider registration path.
5. Save a source-linked guide when evidence exists, or an explicitly incomplete report with findings, attempts, coverage, and a concrete human handoff. Missing public evidence never means “OAuth unsupported.”

The UI shows coverage for OAuth, registration, permissions, and review references. Observed metadata endpoints are shown as untested source values, not as working integrations. Account eligibility, scope classification, and approval timing remain unknown unless established by the sources.

## Sustainable boundaries

A run retains at most 16 content documents and makes at most 36 page/index requests, in groups of three. Each request has a deadline and each response a 2.5 MB bound. Bundled factual provider-name/URL metadata covers temporary registry outages. Missing names trigger live lookup; live metadata has a ten-minute isolate-local public cache. Source provenance is in `data/NOTICE.md`. Live metadata is parsed with JSON-safe YAML support; no visitor credentials are involved. Cancellation stops active retrieval.

Public search adapters can be unavailable, and genuinely private or unpublished integrations cannot be fully researched without a human. A supplied **homepage** is enough to continue discovery; the user is not required to hunt down a deep OAuth page.

## Optional open-source search service

For sustained name discovery, self-host SearXNG and enable JSON output in its configuration:

```yaml
use_default_settings: true
search:
  formats:
    - html
    - json
```

Configure `SEARXNG_URL` in the server environment, then start the local app. The app calls its `/search?q=...&format=json` endpoint. Keep this service private; do not accept an arbitrary search-service URL from site visitors. No paid search or model key is needed. The hosted demo uses free public discovery unless a reachable private service has been configured.

## Verification

`tests/discovery.test.ts` exercises a fictitious app absent from every registry, an external documentation host, an llms-only OAuth link, a fourth queued candidate, configured free search, API-key alternatives, inaccessible sources, cancellation, and cross-product contamination. These are deterministic regression tests, not claims about real provider availability.

Real retrieval records under `docs/evidence/unknown-*.json` include the inputs, source URLs, coverage, timings, and access outcomes. They deliberately distinguish a useful incomplete report from a verified OAuth setup path. No provider app was created or approved during these checks.

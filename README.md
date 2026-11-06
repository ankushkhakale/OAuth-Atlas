# OAuth Atlas

Find the setup path before building an OAuth integration. Atlas explains provider registration, permissions, launch blockers, human handoffs, and the difference between hands-on work and provider approval time.

**[Live demo](https://oauth-atlas-ankush.floralkite4.chatgpt.site)** · [Reviewer walkthrough](docs/SUBMISSION.md) · [Validation](docs/VALIDATION.md)

## What you can do

- Browse **908 apps and API products in 24 categories**, including 29 Indian-platform entries. Directory entries are discovery starting points, not tested integrations.
- Read four source-reviewed examples: **GitHub, Slack, Gmail, and Notion**. Compare their launch gates and change Gmail's read/send scope lens.
- Research another app by name or provider homepage. Follow public docs, linked developer sites, llms.txt, sitemaps and public authorization metadata.
- Inspect sources, coverage, access failures, uncertainties, and the next practical action. Missing evidence never becomes a claim that OAuth is unsupported.
- Save the latest 50 research reports, pins and checklist progress in this browser. Copy reports as Markdown or export them. Reviewed guides have shareable links.

**No app login, Firebase, database, paid search API or hosted model subscription.** Generated reports and checklist progress do not synchronize across devices. Clearing browser storage removes them; export reports you want to keep.

## Run locally

Requires Node.js 24 and pnpm 11.25.0.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm start:local
```

Open http://127.0.0.1:8080. Set `PORT` to change the port. The local runner needs no cloud account, credentials or database migration. It binds to loopback by default; use a TLS reverse proxy when exposing a self-hosted instance.

```sh
pnpm test
pnpm typecheck
pnpm build
```

Docker packaging is supplied (`docker compose up --build -d atlas`) but has not been executed in the development environment.

## Research and evidence

The default research agent is deterministic extraction, not an LLM. It resolves an identity, follows relevant public documentation, and creates a source-linked setup plan or an incomplete report. It distinguishes OAuth app-registration evidence, OAuth references alone, API-key/token alternatives, identity ambiguity and inaccessible documentation.

Source-backed requirements, planning estimates and unconfirmed questions have separate labels. The four curated guides are documentation reviews, not completed app registrations or token-exchange tests. Live reports do not promise precise effort, approval time or review applicability from keyword matches.

[Composio managed OAuth](https://docs.composio.dev/toolkits/managed-auth) can provide the OAuth application for eligible toolkit methods, including client credentials and redirect URI. Users still authorize their own provider accounts. Custom branding/scopes or a method without managed OAuth can require your own app registration. Atlas links the current catalog and does not invent toolkit eligibility or connect accounts.

## Optional OSS services

No model download is needed. For local drafts, install [Ollama](https://ollama.com), pull the Apache-2.0 Qwen model, then run:

```sh
ollama pull qwen2.5:1.5b
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5:1.5b pnpm start:local
```

The adapter requires known source IDs and supporting excerpts; invalid drafts fall back to extraction. Matching an excerpt does not establish correct interpretation. These drafts remain advice.

Self-host [SearXNG](https://docs.searxng.org/dev/search_api.html) with JSON output enabled and set `SEARXNG_URL` for more controllable discovery. Endpoint settings belong to the deployer, never visitors. No paid service is required. The hosting adapter is optional; authored code and the local runtime are open source.

## Boundaries

- Private, unpublished, PDF-only or JavaScript-only documentation may require a human handoff. An undocumented integration contract cannot be invented. See [unknown apps](docs/UNKNOWN_APPS.md).
- Runs inspect at most 16 content pages and make at most 36 page/index requests; responses are capped at 2.5 MB. A three-minute deadline and cancellation bound each run. Public search may throttle.
- Generated guide URLs work only in the browser that saved them. Use **Copy report** or **Export** to share content. Legacy server-saved guides are not exposed by this version.
- Backpressure is best effort within one Worker isolate, not a distributed quota. There is no durable job queue, idempotency or cross-device history.
- HTTPS, redirect validation and public-DNS checks reduce SSRF risk; application preflight does not eliminate DNS rebinding. Self-host behind an egress policy that denies private/reserved ranges.
- No provider login, token exchange, registration or review submission is performed. Do not enter credentials or confidential provider URLs.

See [architecture](docs/ARCHITECTURE.md), [source review](docs/SOURCE_REVIEW.md), and [third-party provenance](data/NOTICE.md).

## License

MIT for authored code. Dependencies, model weights and provider documentation retain their respective licenses and terms. Source excerpts are short evidence snippets, not copies of whole documentation pages.

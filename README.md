# OAuth Atlas

An OAuth setup navigator for agent builders: understand the launch gate before implementing the connection.

Four source-reviewed examples cover GitHub, Slack, Gmail, and Notion. Submit another app name or an official documentation URL to investigate it live, inspect the evidence, follow a checklist, and export or share the result.

## Run without paid services

Requirements: Node.js 24 and pnpm 11.25.0. No provider account, API key, Cloudflare account, or model subscription is needed for the default local app.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm start:local
```

Open http://127.0.0.1:8080. The local runner applies migrations once and stores SQLite data under `.wrangler/state`. Set `PORT` or `ATLAS_DATA_DIR` to change the port or storage location. Bind to loopback by default; put a TLS reverse proxy in front when exposing it.

Docker alternative:

```sh
docker compose up --build -d atlas
```

Open http://127.0.0.1:8080. Data survives container restarts in `atlas-data`. Docker packaging is supplied; see `docs/VALIDATION.md` for what was actually executed.

## Add local AI, without a paid API

The baseline is a deterministic research agent, not an LLM: resolve the provider, follow linked documentation across domains, inspect llms.txt and sitemap indexes, extract evidence, and assemble a source-linked setup plan or an actionable incomplete report. It works without a model download.

For provider-specific drafts, install [Ollama](https://ollama.com), run it locally, and pull an Apache-2.0 model:

```sh
ollama pull qwen2.5:1.5b
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5:1.5b pnpm start:local
```

With Docker, uncomment `OLLAMA_URL` and `OLLAMA_MODEL` in `compose.yaml`, then:

```sh
docker compose --profile ai up --build -d
docker compose exec ollama ollama pull qwen2.5:1.5b
```

The Ollama service has no published port. The 1.5B model download is roughly 1 GB; CPU inference is possible and slower than the default extraction. The local adapter requires structured JSON, known source IDs, and verbatim supporting excerpts present in the retrieved pages. Failed synthesis falls back visibly to extraction. Matching an excerpt does **not** prove the model interpreted it correctly; drafts remain planning advice.

`OLLAMA_URL` is server-owned configuration, never supplied by a site visitor. No OpenAI, hosted inference, or paid search API is used. Documentation retrieval uses public sites and DNS-over-HTTPS; free search discovery is best effort. You can configure a private [SearXNG](https://docs.searxng.org/dev/search_api.html) instance with JSON search enabled using `SEARXNG_URL`. It is server-owned configuration, not a visitor-supplied proxy. See [unknown-app discovery](docs/UNKNOWN_APPS.md).

## What to try

1. Open Gmail and switch from mailbox reading to sending only. The scope decision changes the verification burden.
2. Compare Slack with GitHub. Pilot distribution, commercial review, and organization/workspace permission are different gates.
3. Research `Linear` or `https://linear.app/developers/oauth-2-0-authentication`. It has a documentation entry point but no prewritten guide.
4. Submit another official OAuth documentation URL. Progress comes from real fetches; missing OAuth evidence produces an explicitly incomplete report instead of a fabricated guide.
5. Check a step, reload, copy a guide link, and export Markdown. The checklist/bookmarks are device-local. Generated guide content is stored on the server and retrievable by its opaque link.

## Product decisions

- **Path to launch, not an OAuth tutorial.** Separate hands-on estimates, provider waiting, blockers, and human handoffs.
- **Four useful examples over a pretend 100-app library.** The assignment explicitly allows a few varied apps. The same data shape supports additional reviewed guides.
- **Evidence before confidence.** Requirements link to provider sources; estimates and unresolved questions are labelled. No setup approval or token exchange is claimed.
- **Managed auth is a separate choice.** A provider OAuth app identifies the integration; each user’s authorization creates a connection. Composio-managed OAuth can avoid registering your own app for eligible toolkits.
- **No paid dependency.** React, Vinext/Vite, Wrangler/Miniflare, Drizzle, SQLite, Zod, and the optional Ollama/Qwen path are open-source software. Cloudflare/Sites hosting is an optional deployment adapter, not required for self-hosting.

## Architecture and checks

The same web-standard Request/Response app runs on an edge Worker or in the open-source local Worker emulator. SQLite/D1 stores immutable generated guides and request states; React renders safely without raw provider HTML. See [architecture](docs/ARCHITECTURE.md), [source review](docs/SOURCE_REVIEW.md), and [validation](docs/VALIDATION.md).

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Limits

- Source review is not a logged-in registration, real token exchange, or completed provider approval. Those are human handoffs.
- Live extraction alone cannot reliably infer precise review applicability, wait time, or effort; it keeps these unknown. The local model adds drafts, not independently verified facts.
- Name resolution uses public provider-discovery metadata and free web discovery. Bundled metadata works without a live registry request. Refresh it with `pnpm discovery:refresh`; source provenance is in `data/NOTICE.md`. Registry records and shared catalog pages are discovery hints, never OAuth proof. Documentation links can lead to external hosting domains. For names that remain ambiguous, supply the provider homepage; the app discovers deeper pages itself. Public search can still throttle or fail.
- Up to 16 content pages, 36 page/index requests, 2.5 MB per response, a 100-second discovery window, and a three-minute total deadline bound a run. A priority queue retains unvisited candidates and records blocked, timed-out, and successful attempts separately. Login-only, blocked, or client-rendered content may not be available.
- A guide is shared by URL, subject to the deployment’s access policy. Do not submit private URLs or confidential product details. No user account or cross-device checklist synchronization is included.
- Research rate limiting is a modest hourly database check, not a strict distributed quota. Site-wide cache, queues, automatic policy refreshes, and production account controls are future work.
- DNS preflight, HTTPS, redirect checks, and private-address rejection reduce SSRF risk. DNS rebinding is not eliminated by application preflight; self-host behind an egress policy that denies private/reserved ranges.

## License

MIT for authored code. Third-party dependencies, Qwen model weights, and provider documentation retain their respective licenses and terms. Source excerpts and links are evidence, not a redistribution of whole provider documents.

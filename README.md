# OAuth Atlas 🧭

**Less tab hopping. A clearer OAuth setup plan.**

You want to connect an app. First you need to figure out where to register it, which scopes to request, who needs to approve it, and what could hold up launch. That rabbit hole gets old fast.

Atlas pulls the public docs together, shows its sources, and gives you a checklist to work through. If the evidence is missing, it says so.

[Get running](#get-running) · [What to try](#take-it-for-a-spin) · [How it works](#where-the-data-comes-from) · [Docs](docs/README.md)

## Get running

You need **Node.js 24+**, **pnpm 11.25.0**, and an internet connection for live research. No app account, database setup, or paid API key is required.

### 1. Grab the source

```sh
git clone https://github.com/ankushkhakale/OAuth-Atlas.git
cd OAuth-Atlas
```

Using the submission ZIP? Extract it and open a terminal inside the `OAuth-Atlas` folder. The folder with `package.json` is the one you want.

### 2. Install the dependencies

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
```

If your Node installation does not include Corepack, install pnpm directly instead:

```sh
npm install --global pnpm@11.25.0
```

Then run `pnpm install --frozen-lockfile`. You only need one installation method.

### 3. Build and start

```sh
pnpm build
pnpm start
```

Open **http://127.0.0.1:8080**. That's it—you're in.

For development, use `pnpm dev` and open **http://localhost:5173**. The build/start flow above runs the production Worker locally; it does not publish anything.

## Take it for a spin

| Try this | What to look for |
| --- | --- |
| Browse the library | 900+ apps/API products, category filters, Indian-platform collection, and pins |
| Open Gmail | Switch read/modify to send-only and see how scope choices affect the setup discussion |
| Compare Slack and GitHub | Different registration, distribution, and organization/workspace gates |
| Research a provider homepage | Real progress messages, inspected sources, and coverage |
| Tick a step and reload | Your checklist stays in this browser |
| Copy or export a report | Markdown you can paste into a doc or share as a file |

For a concrete live example, research:

```text
https://linear.app/developers/oauth-2-0-authentication
```

The library is a discovery directory, not a list of 900+ verified OAuth integrations. **GitHub, Slack, Gmail, and Notion** have reviewed example guides. Other entries start fresh research.

## Where the data comes from

| Source | Used for |
| --- | --- |
| Provider websites and developer docs | Public pages fetched over HTTPS and parsed as text |
| Linked docs, `llms.txt`, and sitemaps | Finding deeper documentation, including external doc hosts |
| DuckDuckGo HTML and Bing RSS | Free discovery when a name or starting page needs more context |
| Wikipedia and Wikidata APIs | Possible provider identities and official websites |
| Bundled Nango directory metadata | Provider names and documentation links to start from |
| Cloudflare DNS-over-HTTPS | Checking whether a destination resolves to a public address |

The default flow uses **rules and text extraction**, without a model. Search endpoints can throttle or fail, and identity suggestions still need your confirmation. A provider homepage is a useful fallback—you don't need to find the exact OAuth page first.

The app keeps three labels separate:

- **Source-backed:** a claim linked to supporting documentation.
- **Planning advice:** a suggested next step or effort estimate.
- **Needs confirmation:** the public sources did not establish the answer.

General OAuth tutorials and shared integration catalogs cannot establish a provider's app-registration requirements. Missing docs do not mean OAuth is unsupported.

## What gets saved

Saved reports, pins, and checklist progress use **this browser's local storage**. The latest 50 research reports are retained; storage capacity can be reached sooner.

Clearing browser data removes them. They do not sync between devices. Use **Copy report** or **Export** for anything you want to keep or share. Reviewed-guide links work across browsers; generated-report URLs only work where the report was saved.

## Project map

| Location | What's there |
| --- | --- |
| `app/` | Workspace page, layout, styles, and API routes |
| `components/` | App directory browser |
| `lib/catalog/` | Reviewed guides and searchable directory construction |
| `lib/research/` | Discovery, safe fetching, evidence extraction, streaming, and optional model drafts |
| `lib/guide.ts` | Shared guide types and Markdown export |
| `data/` | Bundled provider metadata and its source/license notice |
| `types/` | Runtime and package type declarations |
| `worker/` | Production Worker entrypoint |
| `scripts/` | Local runtime, metadata refresh, and live retrieval checks |
| `tests/` | Regression tests; no live network needed for the default suite |
| `docs/` | Architecture, research notes, review walkthrough, and validation records |
| `public/` | Static assets |

Root config files stay at the root because the build tools look for them there. Dependencies, build output, and local runtime state are ignored by Git and excluded from the submission ZIP.

## Commands worth knowing

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start development at port 5173 |
| `pnpm build` | Build the production Worker and browser assets |
| `pnpm start` | Run the production build locally at port 8080 |
| `pnpm test` | Run deterministic regression tests |
| `pnpm typecheck` | Check TypeScript without emitting files |
| `pnpm check` | Run tests, type checking, and the build |
| `pnpm test:live` | Run real retrieval checks; needs internet and writes an evidence file |
| `pnpm discovery:refresh` | Refresh bundled discovery metadata from upstream |

Live checks can take a couple of minutes. They record what the network and provider pages returned; they do not register an OAuth app or exchange tokens.

## Optional extras

Want local model drafts, a self-hosted search service, Docker, or a different port? Start with [local setup options](docs/local-setup.md). None of these extras is needed for the default app.

[Composio managed OAuth](https://docs.composio.dev/toolkits/managed-auth) is a separate connection option: eligible toolkit methods can use Composio's OAuth application. Users still give consent. Atlas explains that distinction and links the current catalog; it does not connect provider accounts.

## The limits, straight up

- Private, unpublished, PDF-only, or JavaScript-only docs may need a human handoff. Atlas cannot recover a contract the provider has never published.
- Live research checks at most 16 content pages and makes at most 36 page/index requests. Each response is capped at 2.5 MB, and a run has a three-minute deadline.
- No provider login, app registration, token exchange, or review submission happens here. Those are account-owner tasks.
- Approval timing and eligibility stay unconfirmed unless the sources establish them. A successful source fetch is not a successful integration test.
- Backpressure is local to one Worker isolate. It is not a distributed quota, background job queue, or production abuse-control system.
- URL, redirect, and DNS checks reduce SSRF risk. They do not eliminate DNS rebinding; self-hosted deployments should also restrict private/reserved egress.

For executed checks and remaining gaps, read [validation](docs/review/validation.md). For the reviewer demo sequence, read [the walkthrough](docs/review/walkthrough.md).

## License and credits

Authored code is MIT-licensed. Dependencies, model weights, and provider documentation keep their own licenses and terms.

The bundled directory uses third-party factual metadata from Nango's source-available registry; that metadata is not an OSI-licensed runtime dependency. Its source and license context are recorded in [data/NOTICE.md](data/NOTICE.md). Source excerpts are short evidence snippets, not copies of whole documentation pages.

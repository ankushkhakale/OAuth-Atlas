# Current submission validation — 6 November 2026

The database-free version supersedes the historical records below. No app login, Firebase setup or database migration is required.

- **39 Node tests passed**, strict TypeScript checks passed, production Worker build passed, and diff whitespace checks passed.
- New coverage: stateless research streaming; malformed/oversized/cross-origin rejection; error frames; concurrency release after cancellation; curated citation integrity; native-script identity; protocol tutorials excluded from provider-registration evidence.
- Real Node retrieval after the tutorial filter: Linear established OAuth registration/permission references from two provider-owned source pages (~34s); Zoho established OAuth registration/permission references (~46s), with approval references unconfirmed. Duolingo retained an incomplete report after one content page and 20 page/index requests (~94s); OAuth support remains unconfirmed. Timings are observations, not promises. Results are in `docs/evidence/final-live-validation.json`; this does not prove hosted Worker networking or a browser token exchange.
- Hosted deployment is public and was verified anonymously. The browser generated a Linear report from two provider-owned sources; the report and checked step survived reload. Gmail save/checklist reload and read-to-send scope guidance passed. Copy report showed its success notification; clipboard bytes and downloaded export contents were not independently verified. A separate unauthenticated HTTP check retrieved GitHub and streamed a completed Linear report. See `docs/evidence/final-hosted-validation.json`.
- The initial Linear check exposed generic OAuth tutorial contamination; it was corrected and covered by a regression test before final publication.
- Managed browser preview was unavailable (`ERR_CONNECTION_REFUSED`; preview daemon stopped). Local preview remains unverified; hosted browser checks above passed. Mobile viewport/layout was not tested.
- Docker packaging was updated to remove database volumes/migrations but was not executed here.
- No provider app registration, OAuth token exchange, provider review, project-owner login or assignment submission was performed.
- Research reports, checklist and pins are local to the browser. Generated report URLs are not portable; Markdown copy/export is the sharing path.

---

# Historical validation records

# Original validation record

Date: 5 November 2026. This record separates executed checks from supplied deployment instructions.

## Passed

- TypeScript strict type checking.
- Eight Node tests: unsafe target rejection; text extraction; no-OAuth rejection; live uncertainty labels and valid source references; canonical URL deduplication; article-first extraction; invalid local-model citations, proof, and injected URLs; HTML spacing/invisible-anchor normalization.
- Production Vinext/Worker build.
- Direct real retrieval for Linear, outside the four curated guides: OAuth, actor authorization, and application-manifest pages were fetched and an evidence packet generated. Recorded under `docs/evidence/linear-live-run.json`.
- Real local Qwen2.5 1.5B inference through Ollama returned structured JSON on CPU. This proves local model execution, not the correctness of a full guide.
- Browser: GitHub/Slack comparison rendered; library rendered; Gmail guide opened; scope lens changed to send-only; a step advanced the next action; bookmark and checklist progress survived reload.
- Local D1 schema applied successfully for the preview.

## Observed limitations and incomplete checks

- Initial local-model drafts failed evidence validation and fell back safely. Source IDs are now constrained to a retrieved-source enum, and proof checks normalize HTML whitespace and invisible heading anchors. A real Qwen draft of four Linear steps and one blocker passed source/proof validation. This was an adapter check against real retrieved documentation, not a browser test of the AI-enabled app. See `docs/evidence/linear-model-validation.json`.
- The managed browser preview could start the research request but its Worker-side outgoing retrieval failed. Direct Node retrieval succeeded. This is not a passed end-to-end browser research test.
- Docker is unavailable in this execution environment. The Dockerfile and compose deployment were authored but were not run here.
- No provider account registration, OAuth token exchange, or app approval was performed. No model or paid-service API key is required by the app.
- Responsive CSS is provided; an actual mobile-viewport browser check has not been executed.

## Hosted deployment

Version 1 deployed successfully at https://oauth-atlas-ankush.floralkite4.chatgpt.site. It is owner-private. The cloud browser reached its sign-in gate. Hosted research and sharing were not verified as an authenticated visitor in that historical deployment.

A successful deployment does not establish live provider retrieval. Public reviewer access requires an explicit audience decision before submission.

## Unknown-app repair — 6 November 2026 (India)

- Replaced the short hand-maintained app map and shallow same-domain crawl with broad discovery metadata, free search adapters, linked external docs, Markdown, llms.txt, sitemap, and public authorization metadata discovery.
- Fixed the queue bug that marked unselected candidates visited. Added per-request deadlines, bounded parallel reads, public-DNS checks, cancellation, equivalent-representation deduplication, and provider-specific source selection.
- Shared integration catalogs and unrelated products cannot count as OAuth evidence. Social-login references, alternate authentication, and inaccessible documentation have separate report states.
- 19 regression tests, strict type checking, and the Worker build passed for the repaired source. The bundled discovery metadata contains 1,116 names/URL records, not 1,116 guides, and remains usable when live registry lookup is down. Its third-party provenance is documented under `data/NOTICE.md`.
- Real Node retrieval: `Front` resolved by name and reached its own app-registration and OAuth pages; the recorded run took approximately 44 seconds in this environment. `https://docs.gitea.com` found its OAuth provider documentation from the homepage. Figma retrieval reached its provider-owned OAuth-app documentation after following its developer site/index. Baserow returned OAuth references with registration unconfirmed instead of an unsupported claim. These timings are observations, not latency promises.
- The local browser exercised the live request, saved an inaccessible-source report, and rendered recovery actions without the old terminal error. The managed preview's outgoing fetch limitation remains distinct from the successful Node retrieval checks.
- An earlier development run that mixed unrelated shared-catalog entries was rejected, preserved explicitly as rejected evidence, fixed, and covered by a regression test.
- Authenticated hosted generation has not been re-tested in the cloud browser; the earlier sign-in restriction remained unresolved. Source retrieval tests and UI rendering checks are reported separately.

## Provider-name discovery repair — 6 November 2026 (India)

- 26 tests and strict type checking pass, including unseen-name homepage discovery, misspellings, irrelevant first-engine results, blocked search, and metadata isolation from OAuth proof.
- Live Node identity discovery resolved `doulingo` to a possible `Duolingo` website through Wikipedia search and Wikidata website records. This was a real open-data API check, not a completed OAuth setup. See `docs/evidence/provider-identity-live.json`.
- Direct Node retrieval of the supplied Duolingo homepage fetched content and discovery indexes but did not establish an OAuth app-registration path within its bounded run. No lack of OAuth support is inferred.
- Unknown identity and unavailable name discovery no longer present a zero-request result as unreachable provider documentation or a completed setup guide. Earlier saved reports remain immutable; start a fresh run to use the repaired flow.
- Local browser check: `githbu` produced a possible GitHub match, a research-report heading, separate discovery counts, and no setup-effort statistics. Confirming the match populated the canonical provider name for a new run. This checks the recovery interface; authenticated hosted generation remains unverified.

## Expanded directory — 6 November 2026 (India)

- Current directory: 908 named apps/API products across 24 categories, with 29 Indian-platform entries and four reviewed-guide links. This is not 908 completed OAuth guides or verified integrations.
- All 1,116 bundled provider records retain their research starting points; display-name grouping combines authentication variants. Eleven additional provider documentation/website links add regional variety.
- 32 Node tests, strict type checking, production build, and diff whitespace checks passed. Directory tests cover discovery-record preservation, reviewed-guide boundaries, cross-category and regional coverage, multiword/variant search, pinned selection, and HTTPS discovery links.
- The cloud-browser preview could not complete: an initial connection failure was followed by a browser policy block when acquiring the error page. No policy workaround was attempted. Visual layout, pin persistence through reload, and browser click-through remain unverified for this change.

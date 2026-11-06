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


## Standalone repository cleanup

The public source uses a direct Vinext/Cloudflare build and Worker entrypoint. Unused sign-in, connector and hosted-preview scaffolding was removed. The standalone build, strict type checking and all 39 tests passed. Historical hosted checks above refer to the separately deployed demo; they are not a new deployment of this repository cleanup.

The local production Worker API smoke check passed: GET /api/guides/github returned the reviewed GitHub guide. No new hosted deployment was made for this repository cleanup.

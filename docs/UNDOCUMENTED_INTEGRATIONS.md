# Integrations with incomplete or missing documentation

Status: implementation plan, not shipped functionality. Prepared after inspecting the current discovery, reader, and classification code. This document does not establish that the listed providers pass Atlas end to end.

## Problem and observed gaps

The current engine can resolve some unfamiliar providers and retain an incomplete research report. That does not cover every publicly documented integration, and it does not recover an integration contract that the provider has never published.

Specific code gaps:

- `scoreLink` in `lib/discovery.ts` rejects PDF links. `createPageReader` in `lib/research-fetch.ts` also rejects application/pdf. Official integration instructions can therefore be missed even when linked.
- Native-script normalization was corrected in the final submission pass. A regression test now checks distinct native-script identities. Other format/access gaps below remain.
- `evidenceFor` in `lib/research.ts` primarily detects OAuth words and registration phrases. Provider-specific parameter names, API keys, session exchanges, partner access, and social sign-in need separate treatment.
- The reader handles fetched text; it cannot establish the contents of an empty JavaScript-rendered documentation shell.
- No evidence-import interface currently exists for account-only documentation, OpenAPI files, or provider replies.
- Name correction helps find a provider, but does not prove its API, registration eligibility, scopes, or launch requirements.

Concrete public examples checked during this review:

- [Entity Locker requester specification](https://entity.digilocker.gov.in/assets/img/Requester%20-%20Entity%20Locker%20API%20Specification_07_10_24.pdf) documents OAuth in a PDF. Entity Locker must remain distinct from other DigiLocker products.
- [DigiLocker implementation model](https://www.digilocker.gov.in/web/implementation-model) describes partner and technical onboarding.
- [Kite Connect authentication](https://www.kite.trade/docs/connect/v3/agent-setup/) describes an OAuth-style request-token exchange. Atlas must preserve the documented scheme instead of translating it into invented standard OAuth parameters.
- [Composio managed OAuth](https://docs.composio.dev/toolkits/managed-auth) identifies eligible toolkits for which Composio supplies the OAuth application. This is a separate choice from provider-owned registration, and it does not create an undocumented provider API.

These are evaluation candidates, not app-specific shortcuts to add to discovery.

## Intended experience

Ask for an app name or website and, optionally, the action the integration needs to perform. Country or language may disambiguate identity; it must not restrict the product to a region.

1. Resolve the company, product, API surface, and deployment environment. Ask for confirmation when ambiguous. Offer the homepage as a recovery input, not a mandatory deep OAuth URL.
2. Inspect public provider documentation and linked developer or partner portals. Read HTML, Markdown, PDF text, OpenAPI/Swagger security definitions, public authorization metadata, and documentation in provider-owned SDK repositories.
3. If useful text is missing because a page needs JavaScript, attempt bounded rendering where supported. If an account is required, offer an explicit account-owner handoff or evidence import.
4. Classify the authentication scheme and the provisioning path separately. OAuth existence, registration availability, and eligibility to launch are different facts.
5. Produce either an evidence-backed setup guide or a recovery workspace that states what is known, what is missing, and the next action. Never present a generic checklist as completed provider research.

## Outcome handling

| Situation | What Atlas should do |
| --- | --- |
| Provider identity ambiguous | Show candidate products and domains; require selection before making provider-specific claims. |
| Standard OAuth documented | Extract documented flow, registration, callback requirements, permissions, and applicable review conditions with citations. |
| OAuth or OIDC used only for sign-in to the app | Explain the observed direction. Do not claim that developers can register third-party clients. |
| OAuth known, registration details missing | Mark authentication identified and setup incomplete. Ask specifically for the registration/partner path. |
| Partner or enterprise program required | Show the gate, cited onboarding route, known eligibility, and outstanding provider questions. Do not estimate approval times without evidence. |
| Provider-specific authorization exchange | Preserve its documented parameter names and lifecycle. Label the scheme accurately. |
| API key, personal token, or another supported method | Offer that documented integration path, scoped to the intended API; do not rule out a different OAuth program. |
| Login-only documentation | Allow the account owner to supply relevant text or a sanitized document, with provenance. |
| No published documentation found | Generate a provider inquiry and a missing-contract checklist; do not guess endpoints or scopes. |
| No supported API or registration path established | Explain the uncertainty and offer documented exports, webhooks, or a separate authorized browser workflow when actually available. |
| Caller owns the target application | Offer an authoring checklist for implementing and documenting an integration contract. This does not apply to someone else's service. |
| Search, parsing, or network failure | Report the operational failure, retry path, and exact coverage. Do not turn a failed tool into a provider capability judgment. |

## Evidence and assisted mode

Add optional provider website, intended action, supporting links, pasted documentation, PDF text extraction, and OpenAPI/Swagger import. Screenshots or scanned PDFs require an explicitly available OCR path; unsupported formats must be reported.

Keep facts structured:

- provider/product, API surface, deployment environment;
- source location and page/section, extraction date, content representation;
- authentication scheme and direction;
- registration route, eligibility, endpoints, permissions, token lifecycle, and review requirements;
- provenance: provider documentation, provider SDK, public metadata, user-supplied material, or inference;
- contradictions and fields still missing;
- validation level: documented, observed, user supplied, inferred, or tested.

A document supplied by a visitor is not automatically an official or current provider statement. Endpoint discovery alone does not establish registration permission. Do not ask for client secrets, account passwords, bearer tokens, or active authorization codes. Keep supplied nonpublic material private by default; sharing or exporting it requires an explicit preview and user choice. The current immutable, URL-addressable guide storage must be revised before accepting confidential imports.

For genuinely missing documentation, provide a copyable provider inquiry asking:

- Is the intended API available to third-party integrations?
- Is access self-service, partner-only, enterprise-only, or unavailable?
- Where is an application/client registered, and which account may do it?
- Which authentication scheme, callback restrictions, permissions, and token lifecycle apply?
- What sandbox, review, distribution, and revocation requirements apply?

Drafting this inquiry does not send it.

## Implementation order

1. Split provider identity, evidence acquisition, authentication classification, provisioning eligibility, and validation state in the guide model. Preserve compatibility with existing saved reports.
2. Add bounded PDF text and OpenAPI/Swagger extraction, retaining document-page or schema-location citations. Follow only relevant provider-linked SDK documentation.
3. Add Unicode-aware name handling, identity confirmation, and representation-specific failure states. Render public documentation only when the ordinary fetch yields insufficient content.
4. Add a private assisted-evidence interface and missing-contract fields; define storage and sharing before enabling imports.
5. Generate recovery actions from the actual missing fields and access gates. Add a source-linked managed-auth option only where current Composio support is established.
6. Evaluate the real failures supplied by the user and a held-out set of unfamiliar applications. Then build, deploy, and verify through the hosted UI.

Keep new processing deterministic where practical. Use OSS parsers and an optional locally hosted browser/OCR/model path; no paid search or inference dependency is required. Local infrastructure still has resource costs. Bound download bytes, parsing time, pages, redirects, rendering, and total request duration.

## Acceptance criteria before calling the rework complete

- A provider absent from bundled metadata is discoverable through its homepage and an externally linked developer portal.
- An official PDF can establish a source-backed flow, with page references.
- An OpenAPI security definition is recognized without inventing a registration route.
- Native-script and ambiguous product names receive useful confirmation or recovery behavior.
- A public rendered documentation page is distinguishable from a login wall or bot challenge.
- An SDK reference cannot borrow another product's OAuth claims.
- A Google sign-in button cannot establish third-party provider OAuth registration.
- A partner-only OAuth integration displays the actual onboarding gate.
- A provider-specific exchange retains its own parameter names.
- User-supplied evidence remains labelled and private; secrets are rejected or removed before retention.
- Missing documentation yields a useful provider inquiry and missing-contract checklist.
- Source contradictions, stale evidence, and unavailable search remain visible.
- Measure provider-resolution rate, relevant-source retrieval, correct scheme classification, unsupported-claim rate, latency, and recovery completion on held-out providers.
- Run unit/integration checks, a fresh build, and hosted browser tests; report failures and unverified paths separately.

The user's exact failing Indian app names and intended API actions are still needed for reproductions. No universal support claim should be made from the current regression suite or a few examples.

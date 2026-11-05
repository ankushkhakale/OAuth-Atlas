import type { Guide, Step, Source } from "./guide";
const date = "2026-11-05";
const source = (id: string, title: string, url: string): Source => ({
  id,
  title,
  url,
  checkedAt: date,
});
const step = (
  title: string,
  detail: string,
  owner: Step["owner"],
  sources: string[] = [],
  level: Step["level"] = "documented",
): Step => ({ title, detail, owner, sources, level });
const shared = {
  checkedAt: date,
  kind: "curated" as const,
  supported: "documented" as const,
  effortNote:
    "Planning estimate for a developer with an existing callback handler; excludes implementation and review.",
  agent: [
    "Find official setup and policy documentation",
    "Draft a scope rationale and implementation checklist",
    "Identify blockers and prepare a handoff",
  ],
  human: [
    "Sign in and create the provider app",
    "Choose permissions and store secrets securely",
    "Run the authorization flow and submit any required review",
  ],
  tested: [
    "Official documentation inspected on 5 November 2026.",
    "No OAuth app registered, token exchanged, or approval completed.",
  ],
};
export const catalog: Guide[] = [
  {
    ...shared,
    id: "github",
    name: "GitHub",
    category: "Developer tools",
    glyph: "GH",
    color: "#272725",
    difficulty: "Low",
    effort: "30–60 min",
    wait: "No standard review found",
    waitNote:
      "The registration guide has no routine pre-launch approval step; organization restrictions are separate.",
    production: "Register → authorize users → check organization access",
    summary:
      "A short registration path, with organization access as a separate gate. Consider a GitHub App when repository-level permissions matter.",
    sources: [
      source(
        "1",
        "Create an OAuth app",
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app",
      ),
      source(
        "2",
        "OAuth scopes",
        "https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps",
      ),
      source(
        "3",
        "Organization access restrictions",
        "https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/enabling-oauth-app-access-restrictions-for-your-organization",
      ),
    ],
    steps: [
      step(
        "Choose OAuth App or GitHub App",
        "GitHub recommends considering a GitHub App for finer permissions and repository selection. Confirm that an OAuth App fits your integration.",
        "You",
        ["1", "2"],
      ),
      step(
        "Register the app",
        "Open Settings → Developer settings → OAuth apps → New OAuth App. Supply a public app name, homepage, and authorization callback URL.",
        "You",
        ["1"],
      ),
      step(
        "Choose the minimum access",
        "Public information can be read without a scope. The repo scope also grants write access; do not treat it as private-repository read-only access.",
        "You",
        ["2"],
      ),
      step(
        "Implement and test the callback",
        "Use your OAuth library to validate state, exchange the code server-side, and check the granted permissions. Test denial and reconnection before launch.",
        "You",
        [],
        "estimate",
      ),
      step(
        "Test with a target organization",
        "Check whether the organization restricts OAuth app access. Ask an organization owner to approve access where required.",
        "You",
        ["3"],
      ),
    ],
    blockers: [
      step(
        "User connected, organization data missing",
        "Organization OAuth restrictions can still prevent access. Ask the organization owner to review the app rather than repeatedly reconnecting.",
        "You",
        ["3"],
      ),
      step(
        "Permission request is too broad",
        "If repo access exceeds the feature’s needs, reassess the app type and permissions before asking users to authorize.",
        "You",
        ["2"],
      ),
    ],
    unknowns: [
      "No provider SLA is established by these sources.",
      "Your target organization’s policy and SSO requirements need a real installation test.",
    ],
  },
  {
    ...shared,
    id: "slack",
    name: "Slack",
    category: "Communication",
    glyph: "S",
    color: "#611f69",
    difficulty: "Moderate",
    effort: "1–2 hours",
    wait: "Depends on distribution",
    waitNote:
      "Pilot, commercial Marketplace review, and workspace admin approval are distinct. No universal SLA assumed.",
    production: "One workspace → pilot distribution → commercial listing",
    summary:
      "Get a pilot working in another workspace, then plan commercial distribution separately. A successful OAuth callback does not bypass workspace policy.",
    sources: [
      source(
        "1",
        "App lifecycle and distribution",
        "https://docs.slack.dev/app-management/distribution/",
      ),
      source(
        "2",
        "Install with OAuth",
        "https://docs.slack.dev/authentication/installing-with-oauth/",
      ),
      source(
        "3",
        "Marketplace review guide",
        "https://docs.slack.dev/slack-marketplace/slack-marketplace-review-guide/",
      ),
    ],
    steps: [
      step(
        "Create a development app",
        "Associate the app with a development workspace. Keep the first installation separate from testing distribution to customer workspaces.",
        "You",
        ["1"],
      ),
      step(
        "Configure scopes and redirect URLs",
        "Choose bot or user permissions for the actual actions. Configure the OAuth redirect URL and implement the authorization-code exchange.",
        "You",
        ["2"],
      ),
      step(
        "Test an external pilot",
        "Complete Manage Distribution’s checklist and activate public distribution for an unlisted pilot. Distributed app URLs must support HTTPS.",
        "You",
        ["1"],
      ),
      step(
        "Check workspace policy",
        "A workspace can require admin approval or limit installations to Marketplace apps. Confirm the target workspace’s policy early.",
        "You",
        ["1"],
      ),
      step(
        "Prepare commercial listing",
        "Slack says apps intended for commercial distribution should be approved for Marketplace listing. Review the current prerequisites, including installation testing and active-workspace requirements.",
        "You",
        ["1", "3"],
      ),
    ],
    blockers: [
      step(
        "Install requires administrator approval",
        "Send the workspace administrator the app purpose and least-privilege rationale. Workspace permission is separate from provider listing.",
        "You",
        ["1"],
      ),
      step(
        "Marketplace submission is premature",
        "The review guide requires a functional app, testing outside the development workspace, and installation in at least 10 active workspaces. Confirm the latest full checklist.",
        "You",
        ["3"],
      ),
    ],
    unknowns: [
      "Provider review duration depends on the submission; no guaranteed timeline is established here.",
      "Bot/user scope choices and commercial distribution suitability depend on your product.",
    ],
  },
  {
    ...shared,
    id: "gmail",
    name: "Gmail",
    category: "Email",
    glyph: "M",
    color: "#cf4e3c",
    difficulty: "High",
    effort: "2–4 hours",
    wait: "Several weeks possible",
    waitNote:
      "Google documents that restricted-scope verification can take several weeks; this is not an approval promise.",
    production: "Define scopes → test users → verification when required",
    summary:
      "The scope is the launch decision. Sending email and reading a mailbox take different verification paths; server-side restricted data can also trigger a security assessment.",
    sources: [
      source(
        "1",
        "Gmail scope classifications",
        "https://developers.google.com/workspace/gmail/api/auth/scopes",
      ),
      source(
        "2",
        "Restricted scope verification",
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification",
      ),
      source(
        "3",
        "Web-server OAuth flow",
        "https://developers.google.com/identity/protocols/oauth2/web-server",
      ),
      source(
        "4",
        "Token expiration and testing",
        "https://developers.google.com/identity/protocols/oauth2",
      ),
      source(
        "5",
        "Sensitive scope verification",
        "https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification",
      ),
    ],
    steps: [
      step(
        "Choose the actual Gmail capability",
        "gmail.send is sensitive; gmail.readonly and gmail.modify are restricted. Do not request whole-mailbox access for a send-only feature.",
        "You",
        ["1"],
      ),
      step(
        "Prepare the consent configuration",
        "Configure the project’s branding and audience. Align the homepage, privacy policy, domains, and declared data use before requesting verification.",
        "You",
        ["5"],
      ),
      step(
        "Configure a web OAuth client",
        "Set the redirect URI and build the server-side authorization-code flow. Request offline access when the agent must operate while the user is absent.",
        "You",
        ["3"],
      ),
      step(
        "Test with permitted test users",
        "Exercise connect, denial, refresh, and revocation. External apps in Testing generally get seven-day refresh tokens outside the basic-identity exception.",
        "You",
        ["4"],
      ),
      step(
        "Resolve the production verification path",
        "Check exceptions before submitting. Restricted scopes can require additional review; restricted data accessed through servers can require an annual independent security assessment.",
        "You",
        ["2"],
      ),
    ],
    blockers: [
      step(
        "Mailbox reading increases the launch burden",
        "Restricted-scope use can require verification and an assessment. Decide whether the feature needs mailbox access before committing to launch dates.",
        "You",
        ["1", "2"],
      ),
      step(
        "A test connection stops refreshing",
        "For an external app in Testing, check the seven-day refresh-token rule. Reauthorization alone does not fix production readiness.",
        "You",
        ["4"],
      ),
      step(
        "Verification needs supporting material",
        "Prepare an accurate scope justification and a demonstration of the consent flow and feature. Submit through Google’s verification flow.",
        "You",
        ["5"],
      ),
    ],
    unknowns: [
      "The assessment’s cost and exact applicability require confirmation for your architecture.",
      "Exceptions, Workspace admin policies, and final review time are specific to the app.",
    ],
  },
  {
    ...shared,
    id: "notion",
    name: "Notion",
    category: "Productivity",
    glyph: "N",
    color: "#282824",
    difficulty: "Moderate",
    effort: "45–90 min",
    wait: "Listing is separate",
    waitNote:
      "The authorization documentation says Marketplace submission or review is not required to start the OAuth flow.",
    production: "OAuth integration → page selection → token exchange",
    summary:
      "Use an OAuth integration for user-authorized connections. An internal token is a different path, and Marketplace listing is a separate decision.",
    sources: [
      source(
        "1",
        "Authorization overview",
        "https://developers.notion.com/guides/authorization/overview",
      ),
    ],
    steps: [
      step(
        "Choose the connection type",
        "Internal connections use static tokens; OAuth integrations let users authorize the app. Select the latter for a user-facing integration.",
        "You",
        ["1"],
      ),
      step(
        "Set installation scope",
        "Create an OAuth integration in the Developer portal. Choose its installation scope carefully; the docs say it cannot be changed after creation.",
        "You",
        ["1"],
      ),
      step(
        "Register redirect URIs",
        "Configure the client credentials and redirect URI, then route the user through the authorization URL.",
        "You",
        ["1"],
      ),
      step(
        "Handle selected pages and the callback",
        "The user chooses pages to share. Exchange the returned code for tokens and store them securely server-side.",
        "You",
        ["1"],
      ),
      step(
        "Test access and refresh",
        "Exercise page selection and token refresh. Keep Marketplace listing separate from the first working OAuth installation.",
        "You",
        ["1"],
      ),
    ],
    blockers: [
      step(
        "The integration cannot access expected content",
        "Confirm the pages the user shared, the chosen workspace, and the integration’s capabilities. Start with one known page.",
        "You",
        [],
        "estimate",
      ),
    ],
    unknowns: [
      "No authenticated registration or token exchange was attempted.",
      "Your installation scope and workspace admin controls still need confirmation.",
    ],
  },
];

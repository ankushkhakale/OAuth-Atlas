import test from "node:test";
import assert from "node:assert/strict";
import {
  publicURL,
  textFromHTML,
  linksFromHTML,
  buildExtractiveGuide,
} from "../lib/research/engine.ts";

test("research targets reject private addresses, credentials, non-HTTPS, and unsafe ports", () => {
  for (const url of [
    "http://example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://169.254.169.254",
    "https://x.internal",
    "https://x.localhost",
    "https://user:secret@example.com",
    "https://example.com:8080",
    "file:///etc/passwd",
    "https://2130706433",
  ])
    assert.throws(() => publicURL(url), { name: "Error" }, url);
  assert.equal(
    publicURL("https://docs.example.com/oauth?token=secret#fragment").href,
    "https://docs.example.com/oauth",
  );
});
test("HTML extraction removes executable and navigation content without rendering it", () => {
  const html =
    "<nav>irrelevant</nav><script>alert(1)</script><style>.x{}</style><h1>OAuth 2.0</h1><p>Register &amp; configure &#83;copes.</p>";
  assert.equal(textFromHTML(html), "OAuth 2.0\nRegister & configure Scopes.");
  assert.deepEqual(
    linksFromHTML(
      '<a href="/oauth">OAuth</a><a href="javascript:alert(1)">X</a>',
      "https://example.com",
    ),
    [{ url: "https://example.com/oauth", label: "OAuth" }],
  );
});
test("missing OAuth evidence produces an honest report with recovery actions", () => {
  const guide = buildExtractiveGuide(
    "Unknown",
    [
      {
        url: "https://example.com",
        html: "",
        title: "Example",
        text: "A bakery serving good bread.",
      },
    ],
    [],
  );
  assert.equal(guide.supported, "unconfirmed");
  assert.match(guide.summary, /not evidence.*does not support OAuth/);
  assert.ok(guide.steps.length > 0);
  assert.ok(guide.steps.every((s) => s.level === "unknown"));
  assert.ok(
    !guide.steps.some((s) => /configure your OAuth callback/i.test(s.title)),
  );
});
test("live guides preserve evidence while keeping requirements and review time unconfirmed", () => {
  const text =
    "OAuth 2.0 authentication\nRegister an app and configure its redirect URL. Request only the scopes your integration needs. Marketplace review might be relevant to distribution depending on account eligibility.";
  const g = buildExtractiveGuide(
    "Example",
    [
      {
        url: "https://example.com/docs/oauth",
        html: "",
        title: "OAuth docs",
        text,
      },
    ],
    [],
  );
  assert.equal(g.kind, "live");
  assert.equal(g.wait, "Not established");
  assert.equal(g.difficulty, "Unconfirmed");
  assert.ok(g.steps.every((s) => s.level === "estimate"));
  assert.ok(g.blockers.every((s) => s.level === "unknown"));
  assert.ok(
    g.sources.every(
      (s) =>
        (s.excerpt?.split(/\s+/).filter((w) => w !== "…").length || 0) <= 23,
    ),
  );
  assert.ok(
    g.steps.every((step) =>
      step.sources.every((id) => g.sources.some((s) => s.id === id)),
    ),
  );
  assert.match(g.tested.join(" "), /no paid API/i);
});

test("canonical targets remove empty fragments and queries to prevent duplicate sources", () => {
  assert.equal(
    publicURL("https://example.com/oauth#").href,
    "https://example.com/oauth",
  );
  assert.equal(
    publicURL("https://example.com/oauth?").href,
    "https://example.com/oauth",
  );
});
test("article content takes priority over page-wide navigation", () => {
  assert.equal(
    textFromHTML(
      "<div>OAuth sidebar</div><article><h1>Files</h1><p>Download a file.</p></article>",
    ),
    "Files\nDownload a file.",
  );
});

test("source selection retains late-discovered registration evidence", () => {
  const earlier = Array.from({ length: 9 }, (_, i) => ({
    url: `https://example.com/api-${i}`,
    title: "API authentication",
    text: "An API key is required for this legacy API endpoint.",
  }));
  const registration = {
    url: "https://example.com/register-oauth",
    title: "Register OAuth applications",
    text: "Register an OAuth application and configure client_id and redirect_uri. Choose minimal scopes.",
  };
  const g = buildExtractiveGuide("Example", [...earlier, registration], []);
  assert.ok(g.sources.some((s) => s.url === registration.url));
});

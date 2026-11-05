export type EvidenceLevel = "documented" | "estimate" | "unknown";
export type Source = {
  id: string;
  title: string;
  url: string;
  checkedAt: string;
  excerpt?: string;
  provenance?: string;
};
export type Step = {
  title: string;
  detail: string;
  owner: "You" | "Agent" | "Provider";
  level: EvidenceLevel;
  sources: string[];
};
export type Guide = {
  id: string;
  name: string;
  category: string;
  summary: string;
  difficulty: "Low" | "Moderate" | "High" | "Unconfirmed";
  effort: string;
  wait: string;
  effortNote: string;
  waitNote: string;
  production: string;
  color: string;
  glyph: string;
  checkedAt: string;
  kind: "curated" | "live";
  supported: "documented" | "unconfirmed";
  steps: Step[];
  blockers: Step[];
  sources: Source[];
  unknowns: string[];
  agent: string[];
  human: string[];
  tested: string[];
  research?: {
    status:
      | "oauth_documented"
      | "oauth_references"
      | "authentication_alternative"
      | "needs_review"
      | "unreachable";
    discovery: string;
    attempts: { url: string; kind: string; status: string; detail?: string }[];
    coverage: {
      oauth: boolean;
      registration: boolean;
      permissions: boolean;
      approval: boolean;
    };
    documents: number;
    requests: number;
    limited: boolean;
    facts?: { label: string; value: string; source: string }[];
  };
  trace?: { message: string; at: string }[];
};
export function guideMarkdown(g: Guide) {
  const cite = (ids: string[]) =>
    ids
      .map((id) => {
        const s = g.sources.find((s) => s.id === id);
        return s ? `[${id}](${s.url})` : "";
      })
      .join(" ");
  return `# ${g.name} — OAuth setup guide\n\n${g.summary}\n\nResearch date: ${g.checkedAt}. ${g.kind === "live" ? "Live evidence extraction; review before implementation." : "Curated from official documentation."}\n\n## At a glance\n\n- Complexity: ${g.difficulty}\n- Hands-on effort: ${g.effort} (${g.effortNote})\n- Approval wait: ${g.wait} (${g.waitNote})\n- Production path: ${g.production}\n\n## Setup plan\n\n${g.steps.map((s, i) => `${i + 1}. **${s.title}** — ${s.detail} [${s.owner}; ${s.level}] ${cite(s.sources)}`).join("\n\n")}\n\n## Blockers and recovery\n\n${g.blockers.map((s) => `- **${s.title}** — ${s.detail} [${s.level}] ${cite(s.sources)}`).join("\n\n")}\n\n## Agent / human handoff\n\nAgent can: ${g.agent.join("; ")}.\n\nHuman must: ${g.human.join("; ")}.\n\n## Verification record\n\n${g.tested.map((t) => `- ${t}`).join("\n")}\n\n## Still uncertain\n\n${g.unknowns.map((t) => `- ${t}`).join("\n")}\n\n## Research coverage\n\n${g.research ? `Status: ${g.research.status}. ${g.research.documents} content pages; ${g.research.requests} page/index requests.\n\n${g.research.attempts.map((a) => `- ${a.status}: ${a.url}${a.detail ? ` — ${a.detail}` : ""}`).join("\n")}` : "Curated source review."}\n\n## Sources\n\n${g.sources.map((s) => `- [${s.id}] [${s.title}](${s.url}) — accessed ${s.checkedAt}${s.excerpt ? `\n  > ${s.excerpt}` : ""}`).join("\n")}\n`;
}

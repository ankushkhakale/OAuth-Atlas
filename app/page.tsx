"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  Clock3,
  Compass,
  ExternalLink,
  FileText,
  FlaskConical,
  GitCompareArrows,
  Layers3,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  SquareArrowOutUpRight,
  X,
  Bookmark,
  ListChecks,
  Terminal,
  AlertTriangle,
  Globe2,
} from "lucide-react";
import { catalog } from "../lib/catalog";
import { appDirectory } from "../lib/app-directory";
import { AppDirectory } from "../components/app-directory";
import { guideMarkdown, type Guide, type Step } from "../lib/guide";

function requestId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  return [...b]
    .map(
      (v, i) =>
        ([4, 6, 8, 10].includes(i) ? "-" : "") +
        v.toString(16).padStart(2, "0"),
    )
    .join("");
}

type View = "library" | "saved" | "method" | "compare";
const readLocal = (key: string, fallback: unknown) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
};
function Mark({ g, small = false }: { g: Guide; small?: boolean }) {
  return (
    <span
      className={`app-mark ${small ? "small" : ""}`}
      style={{ background: g.color }}
      aria-hidden="true"
    >
      {g.glyph}
    </span>
  );
}
function Evidence({ level }: { level: Step["level"] }) {
  return (
    <span className={`evidence ${level}`}>
      {level === "documented" ? (
        <ShieldCheck size={12} />
      ) : level === "estimate" ? (
        <Clock3 size={12} />
      ) : (
        <CircleHelp size={12} />
      )}{" "}
      {level === "documented"
        ? "Source-backed"
        : level === "estimate"
          ? "Planning advice"
          : "Needs confirmation"}
    </span>
  );
}
function Refs({ g, ids }: { g: Guide; ids: string[] }) {
  return (
    <span className="refs">
      {ids.map((id) => {
        const s = g.sources.find((s) => s.id === id);
        return s ? (
          <a
            key={id}
            href={s.url}
            title={s.title}
            target="_blank"
            rel="noreferrer"
          >
            [{id}]
          </a>
        ) : null;
      })}
    </span>
  );
}

export default function App() {
  const [view, setView] = useState<View>("library");
  const [guide, setGuide] = useState<Guide | null>(null);
  const [tab, setTab] = useState("plan");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All apps");
  const [saved, setSaved] = useState<Guide[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [modal, setModal] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [loadingGuide, setLoadingGuide] = useState(false);
  const [scope, setScope] = useState("read");
  const abort = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setSaved(readLocal("atlas:saved", []) as Guide[]);
    setChecks(readLocal("atlas:checks", {}) as Record<string, boolean>);
    const load = () => {
      const id = new URLSearchParams(location.search).get("guide");
      if (!id) {
        setGuide(null);
        return;
      }
      const stored=readLocal("atlas:saved", []) as Guide[];
      const local = catalog.find((g) => g.id === id) || (Array.isArray(stored)?stored.find(g=>g.id===id):undefined);
      if (local) {
        setGuide(local);
        return;
      }
      setLoadingGuide(true);
      fetch(`/api/guides/${encodeURIComponent(id)}`)
        .then((r) => r.json() as Promise<{ guide?: Guide; error?: string }>)
        .then((data) => {
          if (data.guide) setGuide(data.guide);
          else setToast(data.error || "Guide could not be loaded.");
        })
        .catch(() =>
          setToast("Connection failed. Try opening this guide again."),
        )
        .finally(() => setLoadingGuide(false));
    };
    load();
    window.addEventListener("popstate", load);
    return () => {
      window.removeEventListener("popstate", load);
      abort.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      inputRef.current?.focus();
    } else dialog.current?.close();
  }, [modal]);
  function navigate(v: View) {
    setView(v);
    setGuide(null);
    setQuery("");
    history.pushState({}, "", location.pathname);
  }
  function openGuide(g: Guide) {
    setGuide(g);
    setTab("plan");
    history.pushState({}, "", `?guide=${encodeURIComponent(g.id)}`);
    window.scrollTo({ top: 0 });
  }
  function toggleSave(g: Guide) {
    const next = saved.some((x) => x.id === g.id)
      ? saved.filter((x) => x.id !== g.id)
      : [g, ...saved].slice(0,50);
    setSaved(next);
    try {
      localStorage.setItem("atlas:saved", JSON.stringify(next));
    } catch {
      setToast(
        "Browser storage is full. Copy or export this report before leaving.",
      );
    }
  }
  function check(i: number) {
    if (!guide) return;
    const key = `${guide.id}:${i}`;
    const next = { ...checks, [key]: !checks[key] };
    setChecks(next);
    try {
      localStorage.setItem("atlas:checks", JSON.stringify(next));
    } catch {
      setToast("Checklist progress could not be saved on this device.");
    }
  }
  function download(g: Guide) {
    const url = URL.createObjectURL(
      new Blob([guideMarkdown(g)], { type: "text/markdown;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${g.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-oauth-guide.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function share(g: Guide) {
    try {
      if(g.kind==='live'){
        await navigator.clipboard.writeText(guideMarkdown(g));
        setToast("Report copied as Markdown. Paste it into a document or message to share.");
      } else {
        const url=new URL(location.href);url.search="";url.searchParams.set("guide",g.id);
        await navigator.clipboard.writeText(url.href);setToast("Reviewed guide link copied.");
      }
    }catch{download(g);setToast("Clipboard unavailable. Report downloaded as Markdown.");}
  }
  function startResearch(text = "") {
    setInput(text);
    setError("");
    setEvents([]);
    setModal(true);
  }
  async function research(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setEvents([]);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: input.trim(), requestId: requestId() }),
        signal: controller.signal,
      });
      if (!r.ok) {
        const data = (await r.json()) as { error?: string };
        throw new Error(data.error || "Research could not start.");
      }
      const reader = r.body?.getReader();
      if (!reader) throw new Error("The research stream is unavailable.");
      let buffer = "";
      let completed = false;
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const data = JSON.parse(line);
          if (data.type === "progress")
            setEvents((prev) => [...prev, data.message]);
          if (data.type === "error") throw new Error(data.message);
          if (data.type === "complete") {
            completed = true;
            const g = data.guide as Guide;
            openGuide(g);
            const next=[g,...saved.filter(x=>x.id!==g.id)].slice(0,50);
            setSaved(next);
            let persisted=true;
            try {localStorage.setItem("atlas:saved",JSON.stringify(next));}catch{persisted=false;}
            setModal(false);
            setToast(
              !persisted ? "Report ready, but browser storage is full. Export it before closing this page." : g.supported === "documented"
                ? "Research saved. Review the sources and setup requirements."
                : "Research report saved. Review what is still unconfirmed.",
            );
          }
        }
      }
      if (!completed)
        throw new Error(
          "Research connection ended before a result was saved. Please try again.",
        );
    } catch (err) {
      setError(
        controller.signal.aborted
          ? "Research cancelled. You can start another run."
          : err instanceof Error
            ? err.message
            : "Research failed. Try a direct documentation URL.",
      );
    } finally {
      setBusy(false);
      abort.current = null;
    }
  }
  const active = guide ? "library" : view;
  const cards = (view === "saved" ? saved : catalog).filter(
    (g) =>
      (g.name + " " + g.category + " " + g.summary)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "All apps" || filter === g.category),
  );
  const chosen = catalog.filter((g) => compare.includes(g.id));
  const checked = guide
    ? guide.steps.filter((_, i) => checks[`${guide.id}:${i}`]).length
    : 0;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate("library");
          }}
        >
          <span className="brand-icon">
            <Compass size={24} />
          </span>
          <span>
            atlas<span className="brand-dot">.</span>
          </span>
          <span className="beta">BETA</span>
        </a>
        <div className="workspace-label">THE OAUTH WORKSPACE</div>
        <nav aria-label="Main navigation">
          <button
            className={active === "library" ? "nav active" : "nav"}
            onClick={() => navigate("library")}
          >
            <Layers3 size={18} /> App library{" "}
            <span className="nav-count">{appDirectory.length}</span>
          </button>
          <button
            className={active === "saved" ? "nav active" : "nav"}
            onClick={() => navigate("saved")}
          >
            <Bookmark size={18} /> My guides{" "}
            <span className="nav-count">{saved.length}</span>
          </button>
          <button
            className={active === "compare" ? "nav active" : "nav"}
            onClick={() => navigate("compare")}
          >
            <GitCompareArrows size={18} /> Compare apps{" "}
            {compare.length > 0 && (
              <span className="nav-count">{compare.length}</span>
            )}
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="workspace-label">UNDER THE HOOD</div>
        <button
          className={active === "method" ? "nav active" : "nav"}
          onClick={() => navigate("method")}
        >
          <FlaskConical size={18} /> Evidence & method
        </button>
        <a
          className="nav"
          href="https://docs.composio.dev/toolkits/managed-auth"
          target="_blank"
          rel="noreferrer"
        >
          <BookOpen size={18} /> Managed OAuth{" "}
          <ExternalLink size={13} className="push" />
        </a>
        <div className="sidebar-bottom">
          <div className="little-compass">
            <Compass size={24} />
          </div>
          <h3>
            Less guesswork.
            <br />
            More building.
          </h3>
          <p>A clear path through OAuth setup, one app at a time.</p>
          <button className="outline-btn" onClick={() => startResearch()}>
            Research an app <Plus size={14} />
          </button>
          <div className="oss-label">
            <span /> Open-source · No paid API
          </div>
        </div>
        <div className="author">
          <span className="avatar">AK</span>
          <div>
            Ankush Khakale<small>Composio take-home</small>
          </div>
          <span className="online" />
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="crumb">
            <span>Workspace</span>
            <span>/</span>
            <b>
              {guide
                ? guide.name
                : {
                    library: "App library",
                    saved: "My guides",
                    compare: "Compare apps",
                    method: "Evidence & method",
                  }[view]}
            </b>
          </div>
          <div className="top-actions">
            <span className="source-status">
              <span /> Source-first guidance
            </span>
            <button
              className="icon-btn"
              aria-label="How evidence is checked"
              onClick={() => navigate("method")}
            >
              <CircleHelp size={19} />
            </button>
          </div>
        </header>
        <main>
          {loadingGuide ? (
            <div className="loading">
              <LoaderCircle className="spin" /> Loading guide…
            </div>
          ) : guide ? (
            <>
              <button className="back-link" onClick={() => navigate("library")}>
                <ArrowLeft size={15} /> Back to app library
              </button>
              <div className="guide-heading">
                <div className="guide-title">
                  <Mark g={guide} />
                  <div>
                    <div className="eyebrow">
                      {guide.category} <span> / </span>{" "}
                      {guide.supported === "documented" ? "OAUTH SETUP GUIDE" : "RESEARCH REPORT"}
                    </div>
                    <h1>{guide.name}</h1>
                  </div>
                </div>
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => toggleSave(guide)}
                  >
                    <Bookmark
                      size={15}
                      fill={
                        saved.some((g) => g.id === guide.id)
                          ? "currentColor"
                          : "none"
                      }
                    />
                    {saved.some((g) => g.id === guide.id)
                      ? "Saved"
                      : "Save guide"}
                  </button>
                  <button className="secondary" onClick={() => download(guide)}>
                    <ArrowDownToLine size={15} /> Export
                  </button>
                  <button className="primary" onClick={() => share(guide)}>
                    <Link2 size={15} /> {guide.kind === "live" ? "Copy report" : "Copy link"}
                  </button>
                </div>
              </div>
              <p className="guide-summary">{guide.summary}</p>
              <div className="guide-meta">
                <span>
                  <ShieldCheck size={14} />
                  {guide.kind === "curated"
                    ? "Documentation reviewed"
                    : "Live evidence packet"}
                </span>
                <span>Checked {guide.checkedAt}</span>
                <span>{guide.sources.length} sources</span>
              </div>
              {guide.kind === "live" && !guide.research && (
                <div className="notice">
                  <CircleHelp size={18} />
                  <div>
                    <b>This guide used the earlier discovery flow.</b>
                    <p>
                      Research it again to check linked documentation, indexes,
                      and the expanded coverage report.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => startResearch(guide.name)}
                    >
                      Research with the updated engine <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              {guide.research && (
                <section
                  className={`research-outcome ${guide.research.status === "oauth_documented" ? "confirmed" : ""}`}
                  aria-label="Research outcome"
                >
                  <div className="outcome-heading">
                    <ShieldCheck size={20} />
                    <div>
                      <h2>
                        {
                          (
                            {
                              oauth_documented: "OAuth setup details found",
                              oauth_references:
                                "OAuth mentioned · app registration unconfirmed",
                              authentication_alternative:
                                "Another authentication method was found",
                              needs_review: "OAuth setup needs more evidence",
                              unreachable: "Documentation could not be reached",
                              provider_unresolved: "Confirm the provider",
                              discovery_unavailable: "Name discovery is unavailable",
                            } as const
                          )[guide.research.status]
                        }
                      </h2>
                      <p>
                        {guide.research.attempts.filter(a => a.kind === "search" || a.kind === "registry" || a.kind === "identity").length} discovery attempts ·{" "}
                        {guide.research.documents} content pages inspected ·{" "}
                        {guide.research.requests} page/index requests
                        {guide.research.limited
                          ? " · Research budget reached"
                          : ""}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setTab("evidence")}
                    >
                      Inspect coverage <ArrowRight size={14} />
                    </button>
                  </div>
                  {guide.supported !== "documented" && (
                    <p className="outcome-note">
                      {guide.research.diagnosis || "This is an incomplete research report, not a finding that OAuth is unsupported. Add the provider’s homepage or developer portal to continue; you do not need to locate a deep OAuth URL yourself."}
                    </p>
                  )}
                  {!!guide.research.suggestions?.length && (
                    <div className="provider-suggestions">
                      <h3>Did you mean one of these?</h3>
                      <p>These are possible matches, not verified integrations. Choose the intended provider to continue.</p>
                      {guide.research.suggestions.map(suggestion => (
                        <div key={suggestion.input}>
                          <b>{suggestion.name}</b>
                          {suggestion.url && <small>{new URL(suggestion.url).hostname}</small>}
                          <p>{suggestion.reason}</p>
                          <button className="secondary" onClick={() => startResearch(suggestion.input)}>
                            Confirm & research {suggestion.name} <ArrowRight size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="coverage-grid">
                    {Object.entries(guide.research.coverage).map(
                      ([key, found]) => (
                        <span key={key} className={found ? "found" : ""}>
                          {found ? (
                            <Check size={13} />
                          ) : (
                            <CircleHelp size={13} />
                          )}{" "}
                          {
                            (
                              {
                                oauth: "OAuth evidence",
                                registration: "Registration",
                                permissions: "Permissions",
                                approval: "Review policy",
                              } as Record<string, string>
                            )[key]
                          }
                          <small>{found ? "Found" : "Unconfirmed"}</small>
                        </span>
                      ),
                    )}
                  </div>
                  {guide.supported !== "documented" && (
                    <button
                      className="secondary"
                      onClick={() => startResearch()}
                    >
                      Continue with a provider website <ArrowRight size={14} />
                    </button>
                  )}
                </section>
              )}
              {guide.research?.requests !== 0 && <div className="stats-grid">
                <div className="stat">
                  <span>SETUP COMPLEXITY</span>
                  <strong
                    className={guide.difficulty === "High" ? "danger-text" : ""}
                  >
                    {guide.difficulty}
                  </strong>
                  <p>{guide.production}</p>
                </div>
                <div className="stat">
                  <span>
                    HANDS-ON EFFORT <Clock3 size={13} />
                  </span>
                  <strong>{guide.effort}</strong>
                  <p>{guide.effortNote}</p>
                </div>
                <div className="stat">
                  <span>APPROVAL WAIT</span>
                  <strong>{guide.wait}</strong>
                  <p>{guide.waitNote}</p>
                </div>
              </div>}
              <div
                className="guide-tabs"
                role="tablist"
                aria-label="Guide sections"
              >
                {[
                  ["plan", guide.supported === "documented" ? "Setup plan" : "Research next steps", ListChecks],
                  ["blockers", "Blockers", AlertTriangle],
                  ["evidence", "Evidence", ShieldCheck],
                  ["handoff", "Agent & you", Terminal],
                ].map(([id, label, Icon]) => (
                  <button
                    key={String(id)}
                    role="tab"
                    aria-selected={tab === id}
                    className={tab === id ? "selected" : ""}
                    onClick={() => setTab(String(id))}
                  >
                    {typeof Icon !== "string" && <Icon size={15} />}{" "}
                    {String(label)}
                    {id === "blockers" && <span>{guide.blockers.length}</span>}
                  </button>
                ))}
              </div>
              <div className="guide-body">
                <section className="guide-content" role="tabpanel">
                  {tab === "plan" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>{guide.supported === "documented" ? "Your path to a working connection" : "Continue the research"}</h2>
                          <p>
                            Follow in order. Your checklist stays on this
                            device.
                          </p>
                        </div>
                        <span className="progress-text">
                          {checked}/{guide.steps.length} done
                        </span>
                      </div>
                      <div className="progress-track">
                        <span
                          style={{
                            width: `${(checked / guide.steps.length) * 100}%`,
                          }}
                        />
                      </div>
                      {guide.id === "gmail" && (
                        <div className="scope-lens">
                          <div>
                            <b>What will your agent do?</b>
                            <select
                              aria-label="Gmail capability"
                              value={scope}
                              onChange={(e) => setScope(e.target.value)}
                            >
                              <option value="read">Read / modify email</option>
                              <option value="send">Send email only</option>
                            </select>
                          </div>
                          <p>
                            {scope === "send"
                              ? "gmail.send is sensitive. It avoids mailbox-reading scopes, but production verification can still apply."
                              : "gmail.readonly and gmail.modify are restricted. Confirm verification and server-side assessment requirements early."}
                            <Refs g={guide} ids={["1", "2"]} />
                          </p>
                        </div>
                      )}
                      <div className="steps">
                        {guide.steps.map((s, i) => (
                          <article
                            className={`step ${checks[`${guide.id}:${i}`] ? "done" : ""}`}
                            key={i}
                          >
                            <button
                              className="step-check"
                              onClick={() => check(i)}
                              aria-label={`${checks[`${guide.id}:${i}`] ? "Unmark" : "Mark"} step ${i + 1}: ${s.title}`}
                              aria-pressed={!!checks[`${guide.id}:${i}`]}
                            >
                              {checks[`${guide.id}:${i}`] ? (
                                <Check size={16} />
                              ) : (
                                <span>{String(i + 1).padStart(2, "0")}</span>
                              )}
                            </button>
                            <div>
                              <h3>{s.title}</h3>
                              <p>
                                {s.detail} <Refs g={guide} ids={s.sources} />
                              </p>
                              <div className="step-meta">
                                <Evidence level={s.level} />
                                <span>
                                  {s.owner === "You"
                                    ? "Human handoff"
                                    : s.owner}
                                </span>
                              </div>
                            </div>
                          </article>
                        ))}
                      </div>
                      {checked === guide.steps.length && (
                        <div className="notice success">
                          <CheckCheck size={18} />
                          <div>
                            <b>Checklist complete</b>
                            <p>
                              This records your progress. Provider approval and
                              a real connection still need independent
                              confirmation.
                            </p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  {tab === "blockers" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>Know what can hold you up</h2>
                          <p>Each blocker has a concrete next action.</p>
                        </div>
                      </div>
                      {guide.blockers.map((b, i) => (
                        <article className="blocker" key={i}>
                          <span className="blocker-icon">
                            <AlertTriangle size={19} />
                          </span>
                          <div>
                            <h3>{b.title}</h3>
                            <p>
                              {b.detail}
                              <Refs g={guide} ids={b.sources} />
                            </p>
                            <Evidence level={b.level} />
                          </div>
                        </article>
                      ))}
                      <div className="unknown-box">
                        <h3>Questions to resolve before launch</h3>
                        <ul>
                          {guide.unknowns.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                        <button
                          className="text-link"
                          onClick={() => {
                            const msg = `Hello, we are building an integration with ${guide.name}.\n\nOur intended scopes: [fill in]\nAudience and distribution: [fill in]\nData stored and where: [fill in]\n\nCould you confirm:\n${guide.unknowns.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n\nThank you.`;
                            navigator.clipboard
                              .writeText(msg)
                              .then(() =>
                                setToast(
                                  "Provider inquiry copied. Fill in your scope and data-use details before sending.",
                                ),
                              )
                              .catch(() =>
                                setToast(
                                  "Clipboard unavailable. Use the questions above in your provider inquiry.",
                                ),
                              );
                          }}
                        >
                          Copy provider inquiry <ArrowRight size={14} />
                        </button>
                      </div>
                    </>
                  )}
                  {tab === "evidence" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>Show the work</h2>
                          <p>
                            Inspect the sources. Keep retrieval and setup
                            validation separate.
                          </p>
                        </div>
                      </div>
                      <div className="verification">
                        <h3>
                          <FlaskConical size={17} /> Verification record
                        </h3>
                        {guide.tested.map((t) => (
                          <p key={t}>{t}</p>
                        ))}
                      </div>
                      {!!guide.research?.facts?.length && (
                        <section className="observed-facts">
                          <h3>Technical details observed in the sources</h3>
                          <p>
                            Observed values are not tested endpoints. Use the
                            cited source to confirm the correct environment and
                            installation.
                          </p>
                          <dl>
                            {guide.research.facts.map((fact, i) => (
                              <div key={i}>
                                <dt>{fact.label}</dt>
                                <dd>
                                  <code>{fact.value}</code>
                                  <Refs g={guide} ids={[fact.source]} />
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      )}
                      {guide.sources.map((s) => (
                        <article className="source" key={s.id}>
                          <span className="source-number">{s.id}</span>
                          <div>
                            <a href={s.url} target="_blank" rel="noreferrer">
                              {s.title}
                              <SquareArrowOutUpRight size={14} />
                            </a>
                            <small>
                              {new URL(s.url).hostname} · Accessed {s.checkedAt}
                              {s.provenance ? ` · ${s.provenance}` : ""}
                            </small>
                            {s.excerpt && <blockquote>{s.excerpt}</blockquote>}
                          </div>
                        </article>
                      ))}
                      {guide.research && (
                        <details className="research-attempts">
                          <summary>
                            Discovery and access coverage ·{" "}
                            {guide.research.attempts.length} attempts
                          </summary>
                          <p className="attempts-note">
                            Discovery indexes and registry hints help locate
                            sources; they are not proof of OAuth support. Access
                            failures are recorded separately.
                          </p>
                          <div className="table-scroll">
                            <table>
                              <thead>
                                <tr>
                                  <th>Target</th>
                                  <th>Type</th>
                                  <th>Result</th>
                                </tr>
                              </thead>
                              <tbody>
                                {guide.research.attempts.map((attempt, i) => (
                                  <tr key={i}>
                                    <td>
                                      <a
                                        href={attempt.url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        {new URL(attempt.url).hostname}
                                        {new URL(attempt.url).pathname.slice(
                                          0,
                                          100,
                                        )}
                                      </a>
                                      {attempt.detail && (
                                        <small>{attempt.detail}</small>
                                      )}
                                    </td>
                                    <td>{attempt.kind}</td>
                                    <td
                                      className={
                                        attempt.status === "ok"
                                          ? "attempt-ok"
                                          : ""
                                      }
                                    >
                                      {attempt.status}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </details>
                      )}
                      {guide.trace && (
                        <details className="trace">
                          <summary>
                            Research activity · {guide.trace.length} events
                          </summary>
                          {guide.trace.map((e, i) => (
                            <p key={i}>
                              <time>{e.at.slice(11, 19)} UTC</time>
                              {e.message}
                            </p>
                          ))}
                        </details>
                      )}
                    </>
                  )}
                  {tab === "handoff" && (
                    <>
                      <div className="section-head">
                        <div>
                          <h2>Automation, with a clear handoff</h2>
                          <p>
                            Public research can get you to the right next step.
                            Account actions remain yours.
                          </p>
                        </div>
                      </div>
                      <div className="handoff-grid">
                        <div>
                          <span className="handoff-icon">
                            <Terminal size={20} />
                          </span>
                          <h3>The agent can</h3>
                          {guide.agent.map((t) => (
                            <p key={t}>
                              <Check size={15} />
                              {t}
                            </p>
                          ))}
                        </div>
                        <div>
                          <span className="handoff-icon human">
                            <Bookmark size={20} />
                          </span>
                          <h3>You take over</h3>
                          {guide.human.map((t) => (
                            <p key={t}>
                              <ArrowRight size={15} />
                              {t}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="notice">
                        <ShieldCheck size={19} />
                        <div>
                          <b>Your credentials stay with you.</b>
                          <p>
                            Atlas never asks for OAuth client secrets, provider
                            passwords, or access tokens.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </section>
                <aside className="guide-aside">
                  <div className="next-card">
                    <span className="eyebrow">YOUR NEXT STEP</span>
                    <div className="next-number">
                      {String(
                        guide.steps.findIndex(
                          (_, i) => !checks[`${guide.id}:${i}`],
                        ) + 1 || guide.steps.length,
                      ).padStart(2, "0")}
                    </div>
                    <h3>
                      {guide.steps.find((_, i) => !checks[`${guide.id}:${i}`])
                        ?.title || "Validate the full connection"}
                    </h3>
                    <p>
                      {checked === guide.steps.length
                        ? "Confirm the connection and approval status in the provider console."
                        : "Start with the documentation, then hand off when sign-in or account permissions are required."}
                    </p>
                    {guide.sources[0] ? (
                      <a
                        href={guide.sources[0].url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {guide.kind === "curated"
                          ? "Open official docs"
                          : "Open cited source"}{" "}
                        <ExternalLink size={14} />
                      </a>
                    ) : (
                      <button
                        className="text-link"
                        onClick={() => startResearch(guide.name)}
                      >
                        Add provider website <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  <div className="evidence-key">
                    <h4>Read the labels</h4>
                    <Evidence level="documented" />
                    <p>A provider claim linked to documentation.</p>
                    <Evidence level="estimate" />
                    <p>Planning advice, not a provider promise.</p>
                    <Evidence level="unknown" />
                    <p>Unresolved. Verify before committing.</p>
                  </div>
                </aside>
              </div>
            </>
          ) : view === "method" ? (
            <>
              <div className="page-intro">
                <span className="eyebrow">EVIDENCE & METHOD</span>
                <h1>
                  Useful guidance.
                  <br />
                  Visible limits.
                </h1>
                <p>
                  OAuth setup is a launch dependency. A confident guess is not a
                  launch plan.
                </p>
              </div>
              <div className="method-grid">
                <article>
                  <ShieldCheck />
                  <h2>Every requirement needs a source</h2>
                  <p>
                    Curated guides link provider requirements to official
                    documentation. Live research preserves short source excerpts
                    and distinguishes observations from an advisory setup
                    checklist.
                  </p>
                </article>
                <article>
                  <Clock3 />
                  <h2>Effort is not approval time</h2>
                  <p>
                    Hands-on ranges are planning estimates, assuming a callback
                    handler already exists. Provider waits are separate. An
                    undocumented timeline stays unknown.
                  </p>
                </article>
                <article>
                  <Terminal />
                  <h2>A bounded research agent</h2>
                  <p>
                    The free workflow identifies a provider, follows relevant
                    documentation links, inspects up to sixteen public content
                    pages, and assembles an evidence packet. The default uses
                    deterministic extraction. Self-host with Ollama to add
                    local, evidence-checked model drafts.
                  </p>
                </article>
                <article>
                  <Bookmark />
                  <h2>A deliberate human handoff</h2>
                  <p>
                    Registration, account permissions, scope decisions, secret
                    storage, and review submissions require you. No guide claims
                    a token exchange or approval that we did not perform.
                  </p>
                </article>
              </div>
              <div className="wide-note">
                <h2>Provider app ≠ user connection</h2>
                <p>
                  You register an OAuth app once to establish your integration’s
                  identity. Each user then grants consent and creates a separate
                  connection. Provider approval and workspace policy can gate
                  those connections.
                </p>
                <p>
                  Composio can supply a managed OAuth app for eligible toolkits.
                  If you need your own branding or custom scopes, or managed
                  OAuth is unavailable, register your own app. Check the
                  toolkit’s current managed-auth schemes.
                </p>
                <a
                  className="text-link"
                  href="https://docs.composio.dev/toolkits/managed-auth"
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the managed OAuth directory <ExternalLink size={14} />
                </a>
              </div>
              <div className="wide-note">
                <h2>What this slice proves</h2>
                <p>
                  Browse {appDirectory.length} directory entries and {catalog.length} source-reviewed guides. Directory listings are discovery starting points; they do not establish OAuth support or completed integration tests. Live research preserves evidence and unresolved requirements.
                </p>
                <p>
                  Free search endpoints may throttle or block requests. A direct
                  official documentation URL is the most reliable research entry
                  point. Content behind login and JavaScript-only documentation
                  may be unavailable. The live plan deliberately leaves exact
                  approval rules unconfirmed.
                </p>
              </div>
            </>
          ) : view === "compare" ? (
            <>
              <div className="section-heading">
                <div>
                  <span className="eyebrow">PLAN BEFORE YOU BUILD</span>
                  <h1>Compare the path to launch</h1>
                  <p>
                    Select up to three apps to see where the work and waiting
                    differ.
                  </p>
                </div>
              </div>
              <div className="compare-picks">
                {catalog.map((g) => (
                  <button
                    key={g.id}
                    className={compare.includes(g.id) ? "selected" : ""}
                    aria-pressed={compare.includes(g.id)}
                    onClick={() =>
                      setCompare((prev) =>
                        prev.includes(g.id)
                          ? prev.filter((id) => id !== g.id)
                          : prev.length < 3
                            ? [...prev, g.id]
                            : prev,
                      )
                    }
                  >
                    <Mark g={g} small />
                    {g.name}
                    {compare.includes(g.id) ? (
                      <Check size={15} />
                    ) : (
                      <Plus size={15} />
                    )}
                  </button>
                ))}
              </div>
              {chosen.length ? (
                <div className="table-scroll">
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>Launch consideration</th>
                        {chosen.map((g) => (
                          <th key={g.id}>{g.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["Complexity", "difficulty"],
                        ["Hands-on effort · estimate", "effort"],
                        ["Approval wait", "wait"],
                        ["Production path", "production"],
                      ].map(([label, key]) => (
                        <tr key={key}>
                          <th>{label}</th>
                          {chosen.map((g) => (
                            <td key={g.id}>
                              {g[key as keyof Guide] as string}
                              {key === "wait" && <small>{g.waitNote}</small>}
                              {key === "effort" && (
                                <small>{g.effortNote}</small>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      <tr>
                        <th>Read the evidence</th>
                        {chosen.map((g) => (
                          <td key={g.id}>
                            <button
                              className="text-link"
                              onClick={() => openGuide(g)}
                            >
                              Open guide <ArrowRight size={14} />
                            </button>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty">
                  <GitCompareArrows size={34} />
                  <h2>Choose your first two apps</h2>
                  <p>
                    A faster prototype and a faster public launch can be
                    different choices.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              {view === "library" ? (
                <section className="hero">
                  <div className="hero-copy">
                    <div className="eyebrow">
                      <span className="tiny-cross">✦</span> THE PATH BEFORE THE
                      CONNECTION
                    </div>
                    <h1>
                      OAuth setup.
                      <br />
                      <span>Without the guesswork.</span>
                    </h1>
                    <p>
                      Know what to build, what might block approval,
                      <br className="desktop-break" /> and when a human needs to
                      take over.
                    </p>
                    <button className="primary" onClick={() => startResearch()}>
                      <Plus size={16} /> Research an app{" "}
                      <ArrowRight size={16} />
                    </button>
                    <span className="hero-footnote">
                      Official sources. Clear handoffs. No paid API.
                    </span>
                  </div>
                  <div
                    className="hero-map"
                    aria-label="Three stages: register app, configure permissions, confirm launch requirements"
                  >
                    <div className="map-top">
                      <span className="map-dot" /> YOUR ROUTE TO READY{" "}
                      <span>01—03</span>
                    </div>
                    <div className="map-step">
                      <span>
                        <Compass size={18} />
                      </span>
                      <div>
                        <b>Register your app</b>
                        <small>Find the right starting point</small>
                      </div>
                      <Check size={14} />
                    </div>
                    <div className="map-connector" />
                    <div className="map-step">
                      <span>
                        <ListChecks size={18} />
                      </span>
                      <div>
                        <b>Configure & test</b>
                        <small>Scopes, consent, and callbacks</small>
                      </div>
                      <Check size={14} />
                    </div>
                    <div className="map-connector" />
                    <div className="map-step final">
                      <span>
                        <ShieldCheck size={18} />
                      </span>
                      <div>
                        <b>Understand the launch gate</b>
                        <small>Approval, policies, and next steps</small>
                      </div>
                      <ArrowRight size={14} />
                    </div>
                    <div className="map-bottom">
                      <span /> Evidence at every turn{" "}
                      <span className="map-star">✳</span>
                    </div>
                  </div>
                </section>
              ) : (
                <div className="section-heading">
                  <div>
                    <span className="eyebrow">YOUR WORKSPACE</span>
                    <h1>My guides</h1>
                    <p>
                      Bookmarks and the latest 50 research results saved on this device. Research
                      reports can be copied or exported.
                    </p>
                  </div>
                  <button className="primary" onClick={() => startResearch()}>
                    <Plus size={16} /> Research an app
                  </button>
                </div>
              )}
              {view === "library" && (
                <div className="library-strip">
                  <span>
                    <Layers3 size={16} /> <b>{appDirectory.length}</b> apps to explore
                  </span>
                  <span>
                    <ShieldCheck size={16} /> {catalog.length} source-reviewed guides
                  </span>
                  <span>
                    <Clock3 size={16} /> Effort ≠ approval wait
                  </span>
                  <button onClick={() => navigate("method")}>
                    How we check <ArrowRight size={13} />
                  </button>
                </div>
              )}
              <section className="library-section">
                <div className="section-heading">
                  <div>
                    <div className="heading-inline">
                      <h2>
                        {view === "saved"
                          ? "Saved guides"
                          : "Explore the app library"}
                      </h2>
                      <span className="number-pill">
                        {view === "saved" ? saved.length : appDirectory.length}
                      </span>
                    </div>
                    <p>
                      {view === "saved"
                        ? "Pick up where you left off."
                        : "Find a platform, keep a shortlist, and research its integration path."}
                    </p>
                  </div>
                  {view === "library" && (
                    <button
                      className="text-link"
                      onClick={() => navigate("compare")}
                    >
                      <GitCompareArrows size={15} /> Compare apps
                    </button>
                  )}
                </div>
                {view === "library" ? (
                  <AppDirectory onResearch={startResearch} onGuide={id => {
                    const match = catalog.find(g => g.id === id);
                    if (match) openGuide(match);
                  }} />
                ) : <>
                <div className="library-toolbar">
                  <label className="search-box">
                    <Search size={18} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search apps, categories, or requirements…"
                      aria-label="Search guides"
                    />
                    {query && (
                      <button
                        aria-label="Clear search"
                        onClick={() => setQuery("")}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <label className="filter">
                    <span className="sr-only">Filter category</span>
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    >
                      {[
                        "All apps",
                        "Developer tools",
                        "Communication",
                        "Email",
                        "Productivity",
                        "Live research",
                      ].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} />
                  </label>
                </div>
                <div className="app-grid">
                  {cards.map((g) => (
                    <article className="app-card" key={g.id}>
                      <div className="card-top">
                        <Mark g={g} />
                        <span
                          className={`difficulty ${g.difficulty.toLowerCase()}`}
                        >
                          <span />
                          {g.difficulty === "Unconfirmed"
                            ? "Unconfirmed"
                            : g.difficulty + " complexity"}
                        </span>
                        <button
                          className="bookmark-btn"
                          aria-label={`${saved.some((s) => s.id === g.id) ? "Unsave" : "Save"} ${g.name}`}
                          onClick={() => toggleSave(g)}
                        >
                          <Bookmark
                            size={16}
                            fill={
                              saved.some((s) => s.id === g.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                      <div className="app-card-title">
                        <h3>
                          <button onClick={() => openGuide(g)}>{g.name}</button>
                        </h3>
                        <span>{g.category}</span>
                      </div>
                      <p className="card-summary">{g.summary}</p>
                      <div className="card-stats">
                        <div>
                          <span>
                            HANDS-ON <small>EST.</small>
                          </span>
                          <b>
                            <Clock3 size={13} />
                            {g.effort}
                          </b>
                        </div>
                        <div>
                          <span>APPROVAL WAIT</span>
                          <b>{g.wait}</b>
                        </div>
                      </div>
                      <div className="card-footer">
                        <span>
                          <ShieldCheck size={13} />
                          {g.sources.length} sources ·{" "}
                          {g.kind === "live"
                            ? "Live research"
                            : "Docs reviewed"}
                        </span>
                        <button onClick={() => openGuide(g)}>
                          View guide <ArrowRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                {!cards.length && (
                  <div className="empty">
                    <Search size={30} />
                    <h3>
                      {view === "saved" && !saved.length
                        ? "Your next integration starts here"
                        : "No guides match that search"}
                    </h3>
                    <p>
                      {view === "saved" && !saved.length
                        ? "Save a library guide or research an unfamiliar app."
                        : "Research the app live, or clear your filters."}
                    </p>
                    <button
                      className="primary"
                      onClick={() => startResearch(query)}
                    >
                      Research {query || "an app"} <ArrowRight size={15} />
                    </button>
                  </div>
                )}
                </>}
              </section>
              {view === "library" && (
                <section className="research-banner">
                  <span className="banner-icon">
                    <Globe2 size={24} />
                  </span>
                  <div>
                    <h3>Your app isn’t in the library?</h3>
                    <p>
                      Bring a name or official website. The research agent will
                      investigate it live.
                    </p>
                  </div>
                  <button
                    className="secondary"
                    onClick={() => startResearch(query)}
                  >
                    Research a new app <ArrowRight size={15} />
                  </button>
                </section>
              )}
              <footer className="page-footer">
                <span>Built for the work before “Connect”.</span>
                <span>{appDirectory.length} apps to explore · {catalog.length} reviewed guides</span>
              </footer>
            </>
          )}
        </main>
      </div>
      <dialog
        ref={dialog}
        className="research-dialog"
        onCancel={(e) => {
          if (busy) {
            e.preventDefault();
            return;
          }
          setModal(false);
        }}
        onClose={() => {
          if (!busy) setModal(false);
        }}
      >
        <form onSubmit={research}>
          <button
            type="button"
            className="dialog-close icon-btn"
            disabled={busy}
            onClick={() => setModal(false)}
            aria-label="Close research"
          >
            <X size={19} />
          </button>
          <span className="dialog-symbol">
            <Compass size={28} />
          </span>
          <span className="eyebrow">LIVE DOCUMENTATION RESEARCH</span>
          <h2>Find your way through OAuth.</h2>
          <p>
            Start with an app name or, for the best results, its official
            homepage. Atlas discovers linked developer documentation and
            indexes.
          </p>
          <label className="field-label" htmlFor="research-input">
            App name or official website
          </label>
          <input
            id="research-input"
            ref={inputRef}
            className="research-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={240}
            minLength={2}
            required
            disabled={busy}
            placeholder="e.g. Front or your-provider.com"
            autoComplete="off"
          />
          <div className="suggestions">
            Try a website:{" "}
            {[
              "linear.app/developers/oauth-2-0-authentication",
              "developers.dropbox.com",
            ].map((v) => (
              <button
                type="button"
                key={v}
                disabled={busy}
                onClick={() => setInput(v)}
              >
                {v.startsWith("linear") ? "Linear" : "Dropbox"}{" "}
                <ArrowRight size={12} />
              </button>
            ))}
          </div>
          <div className="research-explainer">
            <span>
              <Check size={14} /> Discover official documentation
            </span>
            <span>
              <Check size={14} /> Inspect OAuth setup and policy references
            </span>
            <span>
              <Check size={14} /> Export an evidence packet
            </span>
          </div>
          <p className="research-note">
            No sign-in to the provider. No credentials. No paid API. Public
            documentation only; unknown requirements stay unknown. Research reports stay in this browser. Copy or export a report to share it.
          </p>
          {events.length > 0 && (
            <div className="activity" aria-live="polite">
              <div>
                <span className={busy ? "pulse" : ""} />
                {busy ? "Research in progress" : "Research activity"}
              </div>
              {events.map((event, i) => (
                <p key={i}>
                  {i === events.length - 1 && busy ? (
                    <LoaderCircle size={12} className="spin" />
                  ) : (
                    <Check size={12} />
                  )}{" "}
                  {event}
                </p>
              ))}
            </div>
          )}
          {error && (
            <div className="form-error" role="alert">
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="dialog-actions">
            {busy ? (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => abort.current?.abort()}
                >
                  Cancel research
                </button>
                <button type="button" className="primary" disabled>
                  <LoaderCircle className="spin" size={16} /> Investigating…
                </button>
              </>
            ) : (
              <>
                <span>Up to 16 content pages · Local AI can take longer</span>
                <button className="primary" type="submit">
                  <Compass size={16} /> Generate guide <ArrowRight size={15} />
                </button>
              </>
            )}
          </div>
        </form>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <CheckCheck size={17} />
          {toast}
          <button
            className="icon-btn"
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

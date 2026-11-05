import { env } from "cloudflare:workers";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { guides, researchRuns } from "../../../db/schema";
import { investigate, ResearchError } from "../../../lib/research";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    new URL(request.url).host;
  if (!origin || new URL(origin).host !== host)
    return Response.json(
      { error: "Use the research form on this site." },
      { status: 403, headers },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json({ error: "Expected JSON." }, { status: 415, headers });
  if (Number(request.headers.get("content-length")) > 2048)
    return Response.json(
      { error: "Request too large." },
      { status: 413, headers },
    );
  let body: { input?: unknown; requestId?: unknown };
  try {
    const text = await request.text();
    if (text.length > 2048) throw new Error();
    body = JSON.parse(text);
  } catch {
    return Response.json(
      { error: "Invalid request." },
      { status: 400, headers },
    );
  }
  if (
    typeof body.input !== "string" ||
    body.input.trim().length < 2 ||
    body.input.length > 240 ||
    typeof body.requestId !== "string" ||
    !/^[a-f0-9-]{36}$/.test(body.requestId)
  )
    return Response.json(
      { error: "Enter an app name or official website." },
      { status: 400, headers },
    );
  const input = body.input;
  const runId = body.requestId;
  const db = getDb();
  const ip = request.headers.get("cf-connecting-ip") || "private-preview";
  const day = new Date().toISOString().slice(0, 10);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(ip + day),
  );
  const client = Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  try {
    const previous = await db
      .select()
      .from(researchRuns)
      .where(eq(researchRuns.id, runId))
      .get();
    if (previous) {
      if (previous.client !== client)
        return Response.json(
          { error: "Request ID already used. Start a new research run." },
          { status: 409, headers },
        );
      if (previous.status === "complete")
        return Response.json({ guideId: previous.guideId }, { headers });
      return Response.json(
        {
          error:
            "This request has already started. Open its result or start a new run.",
        },
        { status: 409, headers },
      );
    }
    const row = await db
      .select({ n: sql<number>`count(*)` })
      .from(researchRuns)
      .where(
        and(
          eq(researchRuns.client, client),
          gte(researchRuns.startedAt, Date.now() - 3600_000),
        ),
      )
      .get();
    if ((row?.n || 0) >= 12)
      return Response.json(
        { error: "Hourly research limit reached. Try again in an hour." },
        { status: 429, headers: { ...headers, "Retry-After": "3600" } },
      );
    await db
      .insert(researchRuns)
      .values({ id: runId, client, startedAt: Date.now(), status: "running" });
  } catch {
    return Response.json(
      {
        error:
          "Research storage is unavailable. Check database migrations or try again shortly.",
      },
      { status: 503, headers },
    );
  }
  const runController = new AbortController();
  const timeout = AbortSignal.timeout(180_000);
  const signal = AbortSignal.any([
    timeout,
    request.signal,
    runController.signal,
  ]);
  const encoder = new TextEncoder();
  let open = true;
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (type: string, data: unknown) => {
        if (open)
          try {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({ type, ...(data as object) }) + "\n",
              ),
            );
          } catch {
            open = false;
          }
      };
      try {
        const guide = await investigate(
          input,
          (message) => emit("progress", { message }),
          signal,
          {
            ollamaURL: env.OLLAMA_URL,
            model: env.OLLAMA_MODEL,
            searxngURL: env.SEARXNG_URL,
          },
        );
        signal.throwIfAborted();
        await db.batch([
          db.insert(guides).values({
            id: guide.id,
            content: JSON.stringify(guide),
            createdAt: new Date().toISOString(),
          }),
          db
            .update(researchRuns)
            .set({ status: "complete", guideId: guide.id })
            .where(eq(researchRuns.id, runId)),
        ]);
        emit("complete", { guide });
      } catch (error) {
        console.warn(
          "Research failed:",
          error instanceof Error ? error.message : "unknown",
        );
        await db
          .update(researchRuns)
          .set({ status: "failed" })
          .where(eq(researchRuns.id, runId))
          .catch(() => {});
        const message = signal.aborted
          ? "Research timed out or was cancelled. Try a direct OAuth documentation URL."
          : error instanceof ResearchError
            ? error.message
            : `The documentation request failed in this environment (${error instanceof Error ? error.name : "network error"}). Try a direct official documentation URL.`;
        emit("error", { message });
      } finally {
        if (open) {
          open = false;
          controller.close();
        }
      }
    },
    cancel() {
      open = false;
      runController.abort();
    },
  });
  return new Response(stream, {
    headers: {
      ...headers,
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

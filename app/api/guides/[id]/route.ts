import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { guides } from "../../../../db/schema";
import { catalog } from "../../../../lib/catalog";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  const curated = catalog.find((g) => g.id === id);
  if (curated) return Response.json({ guide: curated }, { headers });
  if (!/^[a-f0-9-]{36}$/.test(id))
    return Response.json(
      { error: "Guide not found." },
      { status: 404, headers },
    );
  try {
    const row = await getDb()
      .select()
      .from(guides)
      .where(eq(guides.id, id))
      .get();
    if (!row)
      return Response.json(
        { error: "Guide not found." },
        { status: 404, headers },
      );
    return Response.json({ guide: JSON.parse(row.content) }, { headers });
  } catch {
    return Response.json(
      { error: "Guide storage is unavailable. Try again shortly." },
      { status: 503, headers },
    );
  }
}

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { progressPhotos } from "@/db/schema";

export const dynamic = "force-dynamic";

/** Sirve una foto de progreso. El contenido de un id no cambia nunca, así que se cachea en el navegador. */
export async function GET(_req: Request, ctx: RouteContext<"/api/fotos/[id]">) {
  const { id } = await ctx.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return new Response("No encontrada", { status: 404 });
  const db = await getDb();
  const [photo] = await db.select({ mime: progressPhotos.mime, data: progressPhotos.data }).from(progressPhotos).where(eq(progressPhotos.id, n));
  if (!photo) return new Response("No encontrada", { status: 404 });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: { "content-type": photo.mime, "cache-control": "private, max-age=31536000, immutable" },
  });
}

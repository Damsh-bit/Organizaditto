import { getDb } from "@/db";
import { exportAll } from "@/lib/server/backup";
import { todayISO } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const data = await exportAll(db);
  return new Response(JSON.stringify(data, null, 1), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="organizaditto-backup-${todayISO()}.json"`,
      "cache-control": "no-store",
    },
  });
}

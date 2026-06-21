import { getLifetimeScanCount } from "@/lib/scan/scanCounter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await getLifetimeScanCount();
    return Response.json(
      { count: count ?? 0, available: count !== null },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return Response.json(
      { count: 0, available: false },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }
}

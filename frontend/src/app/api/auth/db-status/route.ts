import { NextRequest, NextResponse } from "next/server";
import { getDbHealth, DB_NAMES } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const health = await getDbHealth();
    return NextResponse.json({
      ok: health.ok,
      status: health.status,
      latencyMs: health.latencyMs,
      databases: health.databases,
      connectedAt: health.connectedAt,
      error: (health as any).error || null,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        error: err.message,
        databases: DB_NAMES,
      },
      { status: 500 }
    );
  }
}

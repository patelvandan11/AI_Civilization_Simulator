import { NextResponse } from "next/server";
import { loadAllCatalogs } from "@/lib/io";

export async function GET() {
  try {
    const catalogs = loadAllCatalogs();
    return NextResponse.json({ ok: true, ...catalogs });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

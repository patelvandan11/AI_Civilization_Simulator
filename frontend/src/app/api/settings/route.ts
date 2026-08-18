import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer } from "@/lib/io";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";
    
    const body = await req.json();
    const settings = body.settings;
    
    if (!settings) {
      return NextResponse.json({ ok: false, message: "Missing settings object." }, { status: 400 });
    }

    const player = await loadPlayer(userId);
    player.agent_settings = settings;
    await savePlayer(player);

    return NextResponse.json({ ok: true, message: "Agent configurations updated.", settings: player.agent_settings });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

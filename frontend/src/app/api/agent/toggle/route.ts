import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer } from "@/lib/io";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";

    const body = await req.json();
    const agent = body.agent;
    const enabled = Boolean(body.enabled);

    if (!agent || !["farming", "manufacturing", "trade"].includes(agent)) {
      return NextResponse.json({ ok: false, message: "Invalid agent type." }, { status: 400 });
    }

    const player = await loadPlayer(userId);
    if (!player.agent_settings) player.agent_settings = {};
    if (!player.agent_settings[agent]) player.agent_settings[agent] = {};
    
    player.agent_settings[agent].enabled = enabled;
    await savePlayer(player);

    return NextResponse.json({ 
      ok: true, 
      message: `${agent.charAt(0).toUpperCase() + agent.slice(1)} agent ${enabled ? "enabled" : "disabled"}.`, 
      settings: player.agent_settings 
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer, loadAllCatalogs } from "@/lib/io";
import { runSimulationTick, fluctuatePrices } from "@/lib/simulation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";

    const player = await loadPlayer(userId);
    const catalogs = loadAllCatalogs();

    // Catch up simulation based on real-time elapsed
    const rawPlayer = player as any;
    if (rawPlayer.last_saved_at) {
      const lastSavedTime = new Date(rawPlayer.last_saved_at).getTime();
      const elapsedSeconds = (Date.now() - lastSavedTime) / 1000;
      
      // If significant time has passed (and not massive to prevent locking)
      if (elapsedSeconds >= 2.0) {
        // Limit catch-up to max 1 hour of real-time elapsed to prevent freezes
        const ticksCount = Math.min(3600, Math.floor(elapsedSeconds));
        
        for (let i = 0; i < ticksCount; i++) {
          runSimulationTick(player, 1.0, catalogs);
        }
        await savePlayer(player);
      }
    }

    // Ensure prices are initialized and contain all catalog items
    if (!player.item_prices || Object.keys(player.item_prices).length < Object.keys(catalogs.items).length) {
      fluctuatePrices(player, catalogs.items);
      await savePlayer(player);
    }

    // Map output to match original python REST response exactly
    const plotsMapped = player.plots.map((p) => {
      let cropKey = String(p.crop_id || "").trim().toLowerCase().replace(/^crop_/, "");
      if (cropKey === "broccoli") cropKey = "brokeli";
      if (cropKey === "cabbage") cropKey = "cabbige";
      if (cropKey === "chili") cropKey = "chilly";
      if (cropKey === "radish") cropKey = "reddies";

      const crop = catalogs.crops[cropKey] || catalogs.crops[p.crop_id || ""];
      let state = "empty";
      let label = "Empty Plot";
      let remaining = 0;
      let progress = 0;

      if (p.crop_id && p.planted_at) {
        const needed = Number(crop?.growth_seconds || 20);
        const realElapsed = (Date.now() - new Date(p.planted_at).getTime()) / 1000;
        const rawP = p as any;
        const inGameElapsed = (rawP.planted_game_seconds !== undefined && player.clock?.total_seconds !== undefined)
          ? Math.max(0, player.clock.total_seconds - rawP.planted_game_seconds)
          : 0;
        const elapsed = Math.max(realElapsed, inGameElapsed);
        remaining = Math.max(0, needed - elapsed);
        progress = Math.min(100, Math.max(0, Math.floor((elapsed / needed) * 100)));

        if (remaining <= 0 || elapsed >= needed) {
          state = "ready";
          label = `${crop?.name || cropKey || "Crop"} READY`;
          remaining = 0;
          progress = 100;
        } else {
          state = "growing";
          const m = Math.floor(remaining / 60);
          const s = Math.floor(remaining % 60);
          label = `${crop?.name || cropKey} ${m > 0 ? `${m}m ` : ""}${s}s`;
        }
      }

      return {
        index: p.index,
        crop_id: cropKey || p.crop_id,
        crop_name: crop?.name || (cropKey ? cropKey.replace(/_/g, " ") : "Empty Plot"),
        yield_id: crop?.yield_id || cropKey || p.crop_id,
        planted_at: p.planted_at,
        growth_seconds: crop?.growth_seconds || 20,
        state,
        label,
        progress,
        remaining
      };
    });

    const placedBuildingsMapped = player.buildings
      .filter((b) => b.x !== null)
      .map((b) => ({
        building_id: b.building_id,
        name: catalogs.buildings[b.building_id]?.name || b.building_id,
        x: b.x,
        y: b.y,
        ready: b.ready_at_game_seconds === null
      }));

    const buildQueueMapped = player.build_queue.map((bj) => ({
      building_id: bj.building_id,
      name: catalogs.buildings[bj.building_id]?.name || bj.building_id,
      ready_at: bj.ready_at_game_seconds,
      current: player.clock.total_seconds
    }));

    const activeCraftMapped = player.craft_job
      ? {
          recipe_id: player.craft_job.recipe_id,
          name: catalogs.recipes[player.craft_job.recipe_id]?.name || player.craft_job.recipe_id,
          finishes_at: player.craft_job.finishes_at
        }
      : null;

    const clockHour = Math.floor((player.clock.total_seconds % (24 * 60)) / 60) % 24;
    const clockMinute = Math.floor(player.clock.total_seconds % 60);
    const clockDay = Math.floor(player.clock.total_seconds / (24 * 60)) + 1;
    const isNight = clockHour >= 20 || clockHour < 6;

    let dailySummaries: string[] = [];
    try {
      const fs = require("fs");
      const path = require("path");
      const summaryPath = path.join(process.cwd(), "..", "saves", "players", `${userId.replace(/[^a-zA-Z0-9_-]/g, "")}_daily_summaries.json`);
      if (fs.existsSync(summaryPath)) {
        dailySummaries = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
      }
    } catch {}

    const formattedClock = `Day ${clockDay} • ${clockHour.toString().padStart(2, "0")}:${clockMinute.toString().padStart(2, "0")} hrs (IST)`;
    const dayOffset = Math.floor(player.clock.total_seconds / (24 * 60));
    const baseDate = new Date(2026, 0, 1);
    baseDate.setDate(baseDate.getDate() + dayOffset);
    const indianDate = `${baseDate.getDate().toString().padStart(2, "0")}/${(baseDate.getMonth() + 1).toString().padStart(2, "0")}/${baseDate.getFullYear()}`;

    const adminEmail = (process.env.ADMIN_EMAIL || "vandan11patel@gmail.com").toLowerCase().trim();
    const isAdmin = userId.toLowerCase() === "vandan_11" || userId.toLowerCase().trim() === adminEmail;

    // Privacy filter for non-admin citizens:
    // Citizens can see where houses are located on the map, but cannot see private family names, member counts, budgets, or jobs
    const filteredFamilies = isAdmin
      ? player.families
      : (player.families || []).map((fam, idx) => ({
          id: fam.id,
          name: `Private Residence #${idx + 1}`,
          budget: undefined, // Hidden for privacy
          inventory: {}, // Hidden for privacy
          members: [
            {
              name: "Citizen Resident",
              role: "resident",
              relation: "Protected by Civic Privacy Laws",
              state: "Private Routine"
            }
          ]
        }));

    return NextResponse.json({
      ok: true,
      user_id: player.user_id,
      is_admin: isAdmin,
      money: player.money,
      clock: {
        day: clockDay,
        hour: clockHour,
        minute: clockMinute,
        total_seconds: player.clock.total_seconds,
        formatted: formattedClock,
        indian_date: indianDate,
        is_night: isNight,
        weather: player.clock.weather
      },
      inventory: Object.entries(player.inventory),
      plots: plotsMapped,
      placed_buildings: placedBuildingsMapped,
      build_queue: buildQueueMapped,
      active_craft: activeCraftMapped,
      agent_settings: player.agent_settings,
      agent_logs: player.agent_logs,
      item_prices: player.item_prices,
      daily_summaries: dailySummaries,
      // City & Household fields
      city_name: player.city_name,
      city_treasury: player.city_treasury,
      tax_rate: player.tax_rate,
      city_projects: player.city_projects,
      household: player.household,
      shops: player.shops,
      families: filteredFamilies,
      government: player.government,
      cabinet: player.cabinet,
      news_feed: player.news_feed,
      livestock: player.livestock || { cows: 4, sheep: 6, chickens: 10 },
      farm_barn: player.farm_barn || { milk: 20, wool: 15, egg: 30, wheat: 50, carrot: 30, apple: 25 },
      automated_farming_enabled: player.automated_farming_enabled !== false,
      city_manager_enabled: player.city_manager_enabled,
      zone_locations: player.zone_locations
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

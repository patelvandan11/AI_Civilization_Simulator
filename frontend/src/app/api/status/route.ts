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

    // Ensure prices are initialized
    if (!player.item_prices || Object.keys(player.item_prices).length === 0) {
      fluctuatePrices(player, catalogs.items);
      await savePlayer(player);
    }

    // Map output to match original python REST response exactly
    const plotsMapped = player.plots.map((p) => {
      const crop = catalogs.crops[p.crop_id || ""];
      let state = "empty";
      let label = "Empty";
      let remaining = 0;

      if (p.crop_id && p.planted_at) {
        const planted = new Date(p.planted_at).getTime();
        const elapsed = (Date.now() - planted) / 1000;
        const needed = Number(crop?.growth_seconds || 5);
        remaining = Math.max(0, needed - elapsed);
        if (remaining <= 0) {
          state = "ready";
          label = `${crop?.name || p.crop_id} READY`;
          remaining = 0;
        } else {
          state = "growing";
          const m = Math.floor(remaining / 60);
          const s = Math.floor(remaining % 60);
          label = `${crop?.name || p.crop_id} ${m}:${s.toString().padStart(2, "0")}`;
        }
      }

      return {
        index: p.index,
        crop_id: p.crop_id,
        planted_at: p.planted_at,
        state,
        label,
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

    const formattedClock = `Day ${clockDay}  ${clockHour.toString().padStart(2, "0")}:${clockMinute.toString().padStart(2, "0")}`;
    const isAdmin = userId === "vandan_11" || userId === "vandan_11patel@gmail.com";

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
        formatted: formattedClock,
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
      city_manager_enabled: player.city_manager_enabled,
      zone_locations: player.zone_locations
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

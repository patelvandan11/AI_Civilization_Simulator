import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer, loadAllCatalogs, listAllPlayers } from "@/lib/io";
import { runSimulationTick, fluctuatePrices } from "@/lib/simulation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";

    const player = await loadPlayer(userId);
    const catalogs = loadAllCatalogs();

    // Catch up simulation based on real-time elapsed and clock speed multiplier
    const rawPlayer = player as any;
    const speed = Number(player.clock?.speed || 1);
    const isPaused = Boolean(rawPlayer.clock?.paused);

    if (rawPlayer.last_saved_at) {
      const lastSavedTime = new Date(rawPlayer.last_saved_at).getTime();
      const elapsedSeconds = (Date.now() - lastSavedTime) / 1000;
      
      // If time has passed and simulation is not paused
      if (!isPaused && elapsedSeconds >= 0.5) {
        const inGameSeconds = Math.min(86400, elapsedSeconds * speed);
        const ticksCount = Math.min(120, Math.max(1, Math.ceil(inGameSeconds / 10)));
        const dt = inGameSeconds / ticksCount;
        
        for (let i = 0; i < ticksCount; i++) {
          runSimulationTick(player, dt, catalogs);
        }
        rawPlayer.last_saved_at = new Date().toISOString();
        await savePlayer(player);
      }
    } else {
      rawPlayer.last_saved_at = new Date().toISOString();
      await savePlayer(player);
    }

    // Ensure prices are initialized and contain all catalog items
    if (!player.item_prices || Object.keys(player.item_prices).length < Object.keys(catalogs.items).length) {
      fluctuatePrices(player, catalogs.items);
      await savePlayer(player);
    }

    // Map output to match original python REST response exactly
    const plotsList = Array.isArray(player.plots) ? player.plots : [];
    const plotsMapped = plotsList.map((p) => {
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

    const buildingsList = Array.isArray(player.buildings) ? player.buildings : [];
    const placedBuildingsMapped = buildingsList
      .filter((b) => b.x !== null)
      .map((b) => ({
        building_id: b.building_id,
        name: catalogs.buildings[b.building_id]?.name || b.building_id,
        x: b.x,
        y: b.y,
        ready: b.ready_at_game_seconds === null
      }));

    const buildQueueList = Array.isArray(player.build_queue) ? player.build_queue : [];
    const clockTotalSeconds = player.clock?.total_seconds ?? 480;
    const buildQueueMapped = buildQueueList.map((bj) => ({
      building_id: bj.building_id,
      name: catalogs.buildings[bj.building_id]?.name || bj.building_id,
      ready_at: bj.ready_at_game_seconds,
      current: clockTotalSeconds
    }));

    const activeCraftMapped = player.craft_job
      ? {
          recipe_id: player.craft_job.recipe_id,
          name: catalogs.recipes[player.craft_job.recipe_id]?.name || player.craft_job.recipe_id,
          finishes_at: player.craft_job.finishes_at
        }
      : null;

    const clockHour = Math.floor((clockTotalSeconds % (24 * 60)) / 60) % 24;
    const clockMinute = Math.floor(clockTotalSeconds % 60);
    const clockDay = Math.floor(clockTotalSeconds / (24 * 60)) + 1;
    const isNight = clockHour >= 20 || clockHour < 6;

    const dailySummaries: string[] = (player as any).daily_summaries || [];

    const formattedClock = `Day ${clockDay} • ${clockHour.toString().padStart(2, "0")}:${clockMinute.toString().padStart(2, "0")} hrs (IST)`;
    const dayOffset = Math.floor(clockTotalSeconds / (24 * 60));
    const baseDate = new Date(2026, 0, 1);
    baseDate.setDate(baseDate.getDate() + dayOffset);
    const indianDate = `${baseDate.getDate().toString().padStart(2, "0")}/${(baseDate.getMonth() + 1).toString().padStart(2, "0")}/${baseDate.getFullYear()}`;

    const adminEmail = (process.env.ADMIN_EMAIL || "vandan11patel@gmail.com").toLowerCase().trim();
    const isAdmin = userId.toLowerCase() === "vandan_11" || userId.toLowerCase().trim() === adminEmail;

    const allUsers = await listAllPlayers();
    const cleanUserId = String(userId || "").trim().toLowerCase();

    // Map all registered citizens directly to simulation families (1 citizen = 1 family & 1 house)
    const citizenFamilies = allUsers.map((u: any, idx: number) => {
      const isOwn =
        u.user_id?.toLowerCase() === cleanUserId ||
        u.user_id?.toLowerCase() === player.user_id?.toLowerCase();
      return {
        id: `house_${u.user_id.replace(/[^a-zA-Z0-9_-]/g, "")}`,
        name: u.home_name || (u.name ? `${u.name}'s Residence` : `Citizen Residence #${idx + 1}`),
        address: u.address || u.city_name || "Civilization Zone",
        type: "house" as const,
        budget: isOwn ? (player.money || u.money || 150) : (u.budget || u.money || 150),
        inventory: { wheat: 5, apple: 5, milk: 2, bread: 3 },
        coords: u.coords || [20.9472, 72.9515],
        members:
          u.members && u.members.length > 0
            ? u.members
            : [{ name: u.name || "Citizen", role: "Head", relation: "Household Head", vehicle: "car" }],
      };
    });

    const filteredFamilies = isAdmin
      ? citizenFamilies
      : citizenFamilies.map((fam) => {
          const isOwn =
            fam.id === `house_${cleanUserId.replace(/[^a-zA-Z0-9_-]/g, "")}` ||
            fam.id === `house_${player.user_id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
          if (isOwn) return fam;
          return {
            id: fam.id,
            name: fam.name,
            address: fam.address,
            type: fam.type,
            coords: fam.coords,
            budget: undefined,
            inventory: {},
            members: [
              {
                name: "Citizen Resident",
                role: "resident",
                relation: "Protected by Civic Privacy Laws",
                state: "Private Routine",
              },
            ],
          };
        });

    const sanitizedRegisteredUsers = isAdmin
      ? allUsers
      : allUsers.map((u: any) => {
          const isOwn =
            u.user_id?.toLowerCase() === cleanUserId ||
            u.user_id?.toLowerCase() === player.user_id.toLowerCase();
          return {
            user_id: isOwn ? u.user_id : "citizen",
            home_name: u.home_name || "Citizen Residence",
            city_name: u.city_name || u.address,
            address: u.address || u.city_name,
            coords: u.coords,
            money: isOwn ? u.money : undefined,
            members: isOwn ? u.members : [],
            member_count: isOwn ? u.member_count : undefined,
            budget: isOwn ? u.budget : undefined,
            is_own: isOwn,
          };
        });

    return NextResponse.json({
      ok: true,
      user_id: player.user_id,
      is_admin: isAdmin,
      money: player.money,
      clock: {
        day: clockDay,
        hour: clockHour,
        minute: clockMinute,
        total_seconds: clockTotalSeconds,
        formatted: formattedClock,
        indian_date: indianDate,
        is_night: isNight,
        weather: player.clock?.weather || "sunny",
        speed: Number(player.clock?.speed || 1),
        paused: Boolean((player.clock as any)?.paused)
      },
      inventory: Object.entries(player.inventory || {}),
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
      zone_locations: player.zone_locations,
      registered_users: sanitizedRegisteredUsers
    });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

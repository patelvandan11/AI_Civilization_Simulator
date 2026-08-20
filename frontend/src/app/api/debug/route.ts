import { NextRequest, NextResponse } from "next/server";
import { listAllPlayers, loadPlayer, savePlayer, resetAndSeedDatabase } from "@/lib/io";
import { getDbHealth } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * 🛠️ DEVELOPER & CODER DIAGNOSTIC DEBUG API (/api/debug)
 * 
 * Provides developers with real-time inspection, audit logging, vehicle/budget distribution,
 * and diagnostic testing tools to easily debug citizen updates across MongoDB.
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const filterUserId = searchParams.get("user_id");

    const health = await getDbHealth();
    const allPlayers = await listAllPlayers();

    const vehicleCounts: Record<string, number> = {
      car: 0,
      scooter: 0,
      bicycle: 0,
      tractor: 0,
      truck: 0,
      walk: 0
    };

    let totalBudget = 0;
    const roster: any[] = [];
    const auditLogs: string[] = [];

    allPlayers.forEach((p: any) => {
      const pUserId = p.user_id;
      if (filterUserId && pUserId.toLowerCase() !== filterUserId.toLowerCase()) return;

      if (Array.isArray(p.agent_logs)) {
        auditLogs.push(...p.agent_logs.slice(-10));
      }

      (p.families || []).forEach((fam: any) => {
        const famBudget = fam.budget || p.budget || 201;
        totalBudget += famBudget;

        (fam.members || []).forEach((m: any, idx: number) => {
          const mName = typeof m === "string" ? m : m.name;
          const mVehicle = (typeof m === "object" && m.vehicle) ? m.vehicle.toLowerCase() : (p.vehicle || "car").toLowerCase();
          
          if (vehicleCounts[mVehicle] !== undefined) {
            vehicleCounts[mVehicle]++;
          } else {
            vehicleCounts[mVehicle] = 1;
          }

          roster.push({
            index: roster.length + 1,
            user_id: pUserId,
            name: mName,
            role: typeof m === "object" ? (m.role || "resident") : "resident",
            relation: typeof m === "object" ? (m.relation || "Citizen") : "Citizen",
            age: typeof m === "object" ? (m.age || 25) : 25,
            vehicle: mVehicle,
            residence_id: fam.id,
            residence_name: fam.name,
            daily_budget: famBudget,
            coords: status ? (p.zone_locations?.[fam.id] || [20.9472, 72.9515]) : [20.9472, 72.9515]
          });
        });
      });
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      developer_note: "AI Civilization Simulator Developer Diagnostic API",
      db_health: {
        mongodb_connected: health.ok,
        status: health.status,
        latency_ms: health.latencyMs,
        databases: health.databases
      },
      summary: {
        total_active_citizens: roster.length,
        total_user_accounts: allPlayers.length,
        total_daily_budget: totalBudget,
        vehicle_distribution: vehicleCounts
      },
      citizens_roster: roster,
      recent_audit_logs: auditLogs.slice(-20)
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || "inspect";

    if (action === "inspect_user") {
      const targetUserId = String(body.user_id || "").trim().toLowerCase();
      if (!targetUserId) {
        return NextResponse.json({ ok: false, message: "user_id is required." }, { status: 400 });
      }
      const player = await loadPlayer(targetUserId);
      return NextResponse.json({
        ok: true,
        action: "inspect_user",
        user_id: targetUserId,
        raw_document: player
      });
    }

    if (action === "test_update_citizen") {
      const targetUserId = String(body.user_id || "").trim().toLowerCase();
      const familyId = String(body.family_id || "my_home").trim();
      const oldName = String(body.old_name || "").trim();
      const newName = String(body.new_name || oldName).trim();
      const vehicle = body.vehicle ? String(body.vehicle).trim().toLowerCase() : undefined;
      const budget = body.budget !== undefined ? Number(body.budget) : undefined;

      const traceLogs: string[] = [];
      traceLogs.push(`1. Loading player document for '${targetUserId}'...`);
      let player = await loadPlayer(targetUserId);

      traceLogs.push(`2. Locating residence '${familyId}'...`);
      const cleanFamId = familyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      let sourceFam = player.families?.find((f: any) => f.id === familyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId) || player.families?.[0];

      if (!sourceFam) {
        traceLogs.push(`3. Family '${familyId}' not in player document. Searching across all MongoDB players...`);
        const allPlayers = await listAllPlayers();
        for (const p of allPlayers) {
          const found = p.families?.find((f: any) => f.id === familyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId);
          if (found) {
            sourceFam = found;
            player = p;
            traceLogs.push(`   Found in player '${p.user_id}'.`);
            break;
          }
        }
      }

      if (!sourceFam) {
        if (!player.families) player.families = [];
        sourceFam = {
          id: familyId,
          name: (player as any).home_name || `${player.user_id}'s Residence`,
          address: "Civilization Region",
          type: "house",
          budget: budget || 201,
          inventory: { milk: 5, wheat: 5 },
          members: []
        };
        player.families.push(sourceFam);
        traceLogs.push(`   Created new fallback residence '${familyId}' on player '${player.user_id}'.`);
      }

      const beforeState = JSON.parse(JSON.stringify(sourceFam));

      if (budget !== undefined && !isNaN(budget)) {
        sourceFam.budget = Math.max(10, budget);
        traceLogs.push(`4. Updated house budget to $${sourceFam.budget}/day.`);
      }

      if (oldName) {
        const oName = oldName.toLowerCase();
        let memberIdx = sourceFam.members?.findIndex((m: any) => {
          const mName = (typeof m === "string" ? m : m.name || "").toLowerCase();
          return mName === oName || mName.includes(oName) || oName.includes(mName);
        });

        if (memberIdx === undefined || memberIdx === -1) {
          sourceFam.members.push({
            name: newName,
            role: "resident",
            relation: "Citizen",
            vehicle: vehicle || "car",
            state: "At Home"
          });
          traceLogs.push(`5. Added new citizen '${newName}' with vehicle '${vehicle || "car"}'.`);
        } else {
          const mem = sourceFam.members[memberIdx];
          if (typeof mem === "object") {
            mem.name = newName;
            if (vehicle) mem.vehicle = vehicle;
          } else {
            sourceFam.members[memberIdx] = {
              name: newName,
              role: "resident",
              relation: "Citizen",
              vehicle: vehicle || "car",
              state: "At Home"
            };
          }
          traceLogs.push(`5. Updated citizen '${newName}' vehicle to '${vehicle}'.`);
        }
      }

      if (vehicle) {
        (player as any).vehicle = vehicle;
      }

      await savePlayer(player);
      traceLogs.push("6. Successfully saved updated player state to MongoDB!");

      return NextResponse.json({
        ok: true,
        action: "test_update_citizen",
        diagnostic_trace: traceLogs,
        before_residence_state: beforeState,
        after_residence_state: sourceFam,
        updated_player_document: player
      });
    }

    if (action === "reset_and_seed") {
      const seeded = await resetAndSeedDatabase();
      return NextResponse.json({
        ok: true,
        action: "reset_and_seed",
        message: "Database successfully reset and seeded to baseline 6 citizens.",
        seeded_players: seeded
      });
    }

    return NextResponse.json({ ok: false, message: `Unknown debug action '${action}'. Supported: inspect_user, test_update_citizen, reset_and_seed` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message, stack: err.stack }, { status: 500 });
  }
}

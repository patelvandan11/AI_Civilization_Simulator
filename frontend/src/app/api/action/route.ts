import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer, loadAllCatalogs, createNewPlayer, updateWorldLocation, resetWorldLocations, listAllPlayers, deletePlayer, invalidatePlayersListCache, resetAndSeedDatabase } from "@/lib/io";
import { plantCrop, harvestCrop, startCraft, getPlotStatus, conductDemocraticElection, runSimulationTick, normalizeCropKey } from "@/lib/simulation";
import { KisanAgentManager } from "@/lib/kisan_agent";
import { createUser } from "@/lib/auth";
import { getAuthCollection, getWorldCollection } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    if (action === "list_all_users") {
      const users = await listAllPlayers();
      return NextResponse.json({ ok: true, users });
    }
    return NextResponse.json({ ok: false, message: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";

    const body = await req.json();
    const action = body.action;

    if (action === "list_all_users") {
      const users = await listAllPlayers();
      return NextResponse.json({ ok: true, users });
    }

    if (action === "register_citizen") {
      const citizenName = String(body.citizen_name || "").trim();
      const emailOrPhone = String(body.email_or_phone || "").trim().toLowerCase() || userId.toLowerCase();
      const address = String(body.address || "").trim();
      const lat = Number(body.lat) || 20.6728;
      const lng = Number(body.lng) || 73.0805;
      const members = Array.isArray(body.members) ? body.members.map((m: any) => String(m).trim()).filter(Boolean) : [];

      if (!emailOrPhone) {
        return NextResponse.json({ ok: false, message: "Email or Phone is required." }, { status: 400 });
      }

      await createUser({
        user_id: emailOrPhone,
        email: emailOrPhone,
        name: citizenName,
        address,
        lat,
        lng,
        members
      });

      const newPlayer = createNewPlayer(emailOrPhone, {
        name: citizenName,
        address,
        lat,
        lng,
        members
      });

      await savePlayer(newPlayer);
      return NextResponse.json({ ok: true, message: `Citizen profile registered for ${citizenName || emailOrPhone}.` });
    }

    const player = await loadPlayer(userId);
    const catalogs = loadAllCatalogs();

    const adminEmail = (process.env.ADMIN_EMAIL || "vandan11patel@gmail.com").toLowerCase().trim();
    const isUserAdmin = userId.toLowerCase() === "vandan_11" || userId.toLowerCase().trim() === adminEmail;

    if (action === "plant_all") {
      const cropId = normalizeCropKey(String(body.crop_id || "wheat"));
      const crop = catalogs.crops[cropId] || catalogs.crops[body.crop_id];
      if (!crop) {
        return NextResponse.json({ ok: false, message: `Unknown crop ${cropId}.` }, { status: 400 });
      }
      const seedId = crop.seed_id;
      const seedPrice = Number(catalogs.items[seedId]?.value || 2);
      let n = 0;

      for (const plot of player.plots) {
        const status = getPlotStatus(plot, catalogs.crops, player.clock?.total_seconds);
        if (status.state === "empty") {
          // Auto-buy seed if needed
          if ((player.inventory[seedId] || 0) < 1 && player.money >= seedPrice) {
            player.money -= seedPrice;
            player.inventory[seedId] = (player.inventory[seedId] || 0) + 1;
          }
          const msg = plantCrop(player, plot.index, cropId, catalogs.crops);
          if (msg.startsWith("Planted")) {
            n++;
          }
        }
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Planted ${n} plots with ${crop.name}.` });
    }

    if (action === "plant_plot") {
      const plotIndex = Number(body.plot_index);
      const cropId = normalizeCropKey(String(body.crop_id || "wheat"));
      const crop = catalogs.crops[cropId] || catalogs.crops[body.crop_id];
      if (!crop) {
        return NextResponse.json({ ok: false, message: "Unknown crop ID." }, { status: 400 });
      }
      const seedId = crop.seed_id;
      const seedPrice = Number(catalogs.items[seedId]?.value || 2);

      if ((player.inventory[seedId] || 0) < 1) {
        if (player.money >= seedPrice) {
          player.money -= seedPrice;
          player.inventory[seedId] = (player.inventory[seedId] || 0) + 1;
        } else {
          return NextResponse.json({ ok: false, message: `Need ${seedId} or $${seedPrice} to purchase seeds.` }, { status: 400 });
        }
      }
      const msg = plantCrop(player, plotIndex, cropId, catalogs.crops);
      if (!msg.startsWith("Planted")) {
        return NextResponse.json({ ok: false, message: msg }, { status: 400 });
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === "harvest_all") {
      let n = 0;
      let harvestDetails: string[] = [];

      for (const plot of player.plots) {
        if (!plot.crop_id) continue;
        const status = getPlotStatus(plot, catalogs.crops, player.clock?.total_seconds);
        if (status.state === "ready") {
          const msg = harvestCrop(player, plot.index, catalogs.crops);
          if (msg.startsWith("Harvested")) {
            n++;
            harvestDetails.push(msg);
          }
        }
      }

      await savePlayer(player);
      if (n === 0) {
        return NextResponse.json({ ok: false, message: "No crops are ready to harvest yet. Please allow them to mature." }, { status: 400 });
      }
      return NextResponse.json({ ok: true, message: `Successfully harvested ${n} mature plots! Produce deposited into your personal inventory & Kisan farm barn.` });
    }

    if (action === "harvest_plot") {
      const plotIndex = Number(body.plot_index);
      if (isNaN(plotIndex) || plotIndex < 0 || plotIndex >= player.plots.length) {
        return NextResponse.json({ ok: false, message: "Invalid plot index." }, { status: 400 });
      }
      const plot = player.plots[plotIndex];
      if (!plot.crop_id) {
        return NextResponse.json({ ok: false, message: "This plot is empty." }, { status: 400 });
      }
      const msg = harvestCrop(player, plotIndex, catalogs.crops);
      if (!msg.startsWith("Harvested")) {
        return NextResponse.json({ ok: false, message: msg }, { status: 400 });
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === "buy_seeds") {
      const seedId = String(body.seed_id || "wheat_seed").trim();
      const qty = Number(body.qty || 1);
      const meta = catalogs.items[seedId];
      if (!meta) {
        return NextResponse.json({ ok: false, message: "Unknown seed type." }, { status: 400 });
      }
      const price = Number(meta.value || 2);
      const totalCost = price * qty;
      if (player.money < totalCost) {
        return NextResponse.json({ ok: false, message: `Insufficient funds. Need $${totalCost} for ${qty}x ${meta.name}.` }, { status: 400 });
      }
      player.money -= totalCost;
      player.inventory[seedId] = (player.inventory[seedId] || 0) + qty;
      player.agent_logs.push(`Agriculture: Purchased ${qty}x ${meta.name} from Seed Market for $${totalCost}.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Purchased ${qty}x ${meta.name} for $${totalCost}.` });
    }

    if (action === "craft") {
      const recipeId = body.recipe_id;
      if (!recipeId || !catalogs.recipes[recipeId]) {
        return NextResponse.json({ ok: false, message: "Invalid recipe ID." }, { status: 400 });
      }
      const msg = startCraft(player, recipeId, catalogs.recipes);
      if (msg.includes("Missing") || msg.includes("Already")) {
        return NextResponse.json({ ok: false, message: msg }, { status: 400 });
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === "buy") {
      const itemId = body.item_id;
      const qty = Number(body.qty || 1);
      const meta = catalogs.items[itemId];
      
      if (!meta) {
        return NextResponse.json({ ok: false, message: "Unknown item ID." }, { status: 400 });
      }

      const price = player.item_prices[itemId] || Number(meta.value || 5);
      const cost = price * qty;
      
      if (player.money < cost) {
        return NextResponse.json({ ok: false, message: `Need $${cost}.` }, { status: 400 });
      }

      player.money -= cost;
      player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;
      await savePlayer(player);
      
      return NextResponse.json({ ok: true, message: `Bought ${qty}x ${meta.name} for $${cost}.` });
    }

    if (action === "sell") {
      const itemId = body.item_id;
      const qty = Number(body.qty || 1);
      const meta = catalogs.items[itemId];
      
      if (!meta) {
        return NextResponse.json({ ok: false, message: "Unknown item ID." }, { status: 400 });
      }

      const owned = player.inventory[itemId] || 0;
      if (owned < qty) {
        return NextResponse.json({ ok: false, message: `Insufficient ${meta.name} in inventory.` }, { status: 400 });
      }

      const price = player.item_prices[itemId] || Number(meta.value || 1);
      const value = price * qty;
      
      player.inventory[itemId] = owned - qty;
      player.money += value;
      await savePlayer(player);
      
      return NextResponse.json({ ok: true, message: `Sold ${qty}x ${meta.name} for $${value}.` });
    }

    if (action === "allocate_project_funds") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can allocate public funds." }, { status: 403 });
      }

      const projectId = body.project_id;
      const amount = Number(body.amount || 0);

      if (amount <= 0) {
        return NextResponse.json({ ok: false, message: "Amount must be greater than zero." }, { status: 400 });
      }

      if (player.city_treasury < amount) {
        return NextResponse.json({ ok: false, message: "Insufficient funds in city treasury." }, { status: 405 });
      }

      const project = player.city_projects.find(p => p.id === projectId);
      if (!project) {
        return NextResponse.json({ ok: false, message: "Project not found." }, { status: 400 });
      }

      if (project.completed) {
        return NextResponse.json({ ok: false, message: "Project already completed." }, { status: 400 });
      }

      player.city_treasury -= amount;
      project.allocated = (project.allocated || 0) + amount;

      if (project.allocated >= project.cost) {
        project.completed = true;
        player.agent_logs.push(`System: Civilization municipal project ${project.name} completed successfully!`);
      }

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Allocated $${amount} to ${project.name}.` });
    }

    if (action === "set_tax_rate") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can adjust taxes." }, { status: 403 });
      }

      const taxRate = Number(body.tax_rate);
      if (isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
        return NextResponse.json({ ok: false, message: "Tax rate must be between 0% and 100%." }, { status: 400 });
      }

      player.tax_rate = taxRate;
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Tax rate set to ${taxRate}%.` });
    }

    if (action === "buy_from_shop") {
      const shopId = body.shop_id;
      const itemId = body.item_id;
      const qty = Number(body.qty || 1);

      const shop = player.shops?.find(s => s.id === shopId);
      if (!shop) {
        return NextResponse.json({ ok: false, message: "Shop not found." }, { status: 400 });
      }

      const ownedInShop = shop.inventory[itemId] || 0;
      if (ownedInShop < qty) {
        return NextResponse.json({ ok: false, message: `Insufficient stock in ${shop.name}.` }, { status: 400 });
      }

      const price = shop.prices[itemId] || 5;
      const totalCost = price * qty;

      if (player.money < totalCost) {
        return NextResponse.json({ ok: false, message: "Insufficient personal funds." }, { status: 400 });
      }

      player.money -= totalCost;
      shop.revenue += totalCost;
      shop.inventory[itemId] = ownedInShop - qty;
      player.inventory[itemId] = (player.inventory[itemId] || 0) + qty;

      const day = Math.floor(player.clock.total_seconds / (24 * 60)) + 1;
      shop.sales_history.push(`Day ${day}: Sold ${qty}x ${itemId} to Player for $${totalCost}`);
      player.agent_logs.push(`System: Purchased ${qty}x ${itemId} from ${shop.name} for $${totalCost}.`);

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Purchased ${qty}x ${itemId} from ${shop.name} for $${totalCost}.` });
    }

    if (action === "sell_to_shop") {
      const shopId = body.shop_id;
      const itemId = body.item_id;
      const qty = Number(body.qty || 1);

      const shop = player.shops?.find(s => s.id === shopId);
      if (!shop) {
        return NextResponse.json({ ok: false, message: "Shop not found." }, { status: 400 });
      }

      const ownedByPlayer = player.inventory[itemId] || 0;
      if (ownedByPlayer < qty) {
        return NextResponse.json({ ok: false, message: `Insufficient stock in player inventory.` }, { status: 400 });
      }

      const price = shop.prices[itemId] || 5;
      const totalPayout = price * qty;

      if (shop.revenue < totalPayout) {
        // Ensure shop has working capital to purchase goods from citizen suppliers
        shop.revenue = (shop.revenue || 0) + Math.max(50, totalPayout);
      }

      player.money += totalPayout;
      shop.revenue -= totalPayout;
      player.inventory[itemId] = ownedByPlayer - qty;
      shop.inventory[itemId] = (shop.inventory[itemId] || 0) + qty;

      const day = Math.floor(player.clock.total_seconds / (24 * 60)) + 1;
      shop.sales_history.push(`Day ${day}: Bought ${qty}x ${itemId} from Player for $${totalPayout}`);
      player.agent_logs.push(`System: Sold ${qty}x ${itemId} to ${shop.name} for $${totalPayout}.`);

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Sold ${qty}x ${itemId} to ${shop.name} for $${totalPayout}.` });
    }

    if (action === "eat_item") {
      const itemId = String(body.item_id || "").trim();
      const owned = player.inventory[itemId] || 0;
      if (owned <= 0) {
        return NextResponse.json({ ok: false, message: `You have no ${itemId} to eat.` }, { status: 400 });
      }
      player.inventory[itemId] = owned - 1;
      player.agent_logs.push(`Nourishment: Ate 1x fresh ${itemId}. Energy & health replenished!`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Ate 1x ${itemId}. Feeling refreshed and energized!` });
    }

    if (action === "buy_groceries_now") {
      const familyId = String(body.family_id || "house_1").trim();
      const fam = player.families?.find(f => f.id === familyId);
      if (!fam) {
        return NextResponse.json({ ok: false, message: "Family residence not found." }, { status: 404 });
      }
      const farmersMarket = player.shops?.find(s => s.id === "farmers_market");
      const dairyShop = player.shops?.find(s => s.id === "dairy");
      const inv = fam.inventory || {};
      let spent = 0;
      const itemsToStock = [
        { shop: farmersMarket, items: ["carrot", "cucumber", "broccoli", "cabbage", "corn", "apple", "strawberry", "egg", "milk"] },
        { shop: dairyShop, items: ["milk", "egg", "wheat"] }
      ];
      for (const { shop, items } of itemsToStock) {
        if (!shop) continue;
        for (const it of items) {
          const inShop = shop.inventory[it] || 0;
          if (inShop > 0) {
            const buyQty = Math.min(3, inShop);
            const cost = (shop.prices[it] || 3) * buyQty;
            if (fam.budget >= cost) {
              fam.budget -= cost;
              shop.revenue = (shop.revenue || 0) + cost;
              shop.inventory[it] -= buyQty;
              inv[it] = (inv[it] || 0) + buyQty;
              spent += cost;
            }
          }
        }
      }
      player.agent_logs.push(`Household: ${fam.name} purchased groceries on demand spending $${spent}.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Fresh groceries purchased for ${fam.name} ($${spent} spent).`, family: fam });
    }

    if (action === "set_government_policies") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can change policies." }, { status: 403 });
      }

      const incomeTax = Number(body.income_tax);
      const salesTax = Number(body.sales_tax);
      const welfareThreshold = Number(body.welfare_threshold);
      const welfarePayout = Number(body.welfare_payout);

      if (isNaN(incomeTax) || incomeTax < 0 || incomeTax > 100) {
        return NextResponse.json({ ok: false, message: "Income tax must be between 0% and 100%." }, { status: 400 });
      }
      if (isNaN(salesTax) || salesTax < 0 || salesTax > 100) {
        return NextResponse.json({ ok: false, message: "Sales tax must be between 0% and 100%." }, { status: 400 });
      }
      if (isNaN(welfareThreshold) || welfareThreshold < 0) {
        return NextResponse.json({ ok: false, message: "Welfare threshold must be positive." }, { status: 400 });
      }
      if (isNaN(welfarePayout) || welfarePayout < 0) {
        return NextResponse.json({ ok: false, message: "Welfare payout must be positive." }, { status: 400 });
      }

      player.government = {
        ...player.government,
        income_tax: incomeTax,
        sales_tax: salesTax,
        welfare_threshold: welfareThreshold,
        welfare_payout: welfarePayout
      };

      player.agent_logs.push(`System: Municipal government policies updated.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: "Municipal government policies updated successfully." });
    }

    if (action === "appoint_mayor") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can appoint mayor." }, { status: 403 });
      }

      const mayor = String(body.mayor || "").trim();
      if (!mayor) {
        return NextResponse.json({ ok: false, message: "Mayor name cannot be empty." }, { status: 400 });
      }

      player.government = {
        ...player.government,
        mayor: mayor
      };

      player.agent_logs.push(`System: Appointed ${mayor} as the new Mayor.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Appointed ${mayor} as Mayor.` });
    }

    if (action === "toggle_city_manager") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can toggle city manager." }, { status: 403 });
      }

      const enabled = !!body.enabled;
      player.city_manager_enabled = enabled;
      player.agent_logs.push(`System: Autonomous PMO City Manager Agent ${enabled ? "activated" : "deactivated"}.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Autonomous City Manager ${enabled ? "enabled" : "disabled"}.` });
    }

    if (action === "reassign_cabinet") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can reassign cabinet." }, { status: 403 });
      }

      const pm = String(body.prime_minister || "").trim();
      const dm = String(body.district_magistrate || "").trim();
      const fin = String(body.finance || "").trim();
      const edu = String(body.education || "").trim();
      const infra = String(body.infrastructure || "").trim();

      if (!pm || !dm || !fin || !edu || !infra) {
        return NextResponse.json({ ok: false, message: "Cabinet positions cannot be left empty." }, { status: 400 });
      }

      player.cabinet = {
        prime_minister: pm,
        district_magistrate: dm,
        ministers: {
          finance: fin,
          education: edu,
          infrastructure: infra
        }
      };

      player.agent_logs.push(`System: PMO Cabinet roles reassigned.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: "PMO Cabinet roles reassigned successfully." });
    }

    if (action === "conduct_election") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can conduct elections." }, { status: 403 });
      }

      const allPlayers = await listAllPlayers();
      const allCitizenNames = allPlayers.flatMap((p: any) =>
        (p.members || []).map((m: any) => (typeof m === "string" ? m : m.name))
      ).filter(Boolean);

      const msg = conductDemocraticElection(player, allCitizenNames);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: msg });
    }

    if (action === "relocate_landmark") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: `Access Denied: Only admin (${adminEmail}) can relocate locations.` }, { status: 403 });
      }

      const landmarkId = String(body.landmark_id).trim();
      const lat = Number(body.lat);
      const lng = Number(body.lng);

      if (!landmarkId || isNaN(lat) || isNaN(lng)) {
        return NextResponse.json({ ok: false, message: "Invalid landmark id or coordinates." }, { status: 400 });
      }

      // Permanently update world canonical location store
      const updatedWorldLocs = await updateWorldLocation(landmarkId, [lat, lng]);
      player.zone_locations = { ...player.zone_locations, ...updatedWorldLocs, [landmarkId]: [lat, lng] };

      const landmarkNames: Record<string, string> = {
        house_1: "Thakorbhai's House (Home 1)",
        house_2: "Bharatbhai's House (Home 2)",
        house_3: "Rameshbhai's House (Home 3)",
        dairy: "City Dairy Groceries",
        general: "Ramesh Supplies",
        clothing: "Savita's Clothiers",
        electronics: "Electronics Hub",
        farms: "Colony Farms",
        factory: "Manufacturing Factory",
        school: "Community School",
        hospital: "General Hospital",
        park: "Civic Leisure Park",
        roads: "Paved Highways & Plaza"
      };

      const customFam = player.families?.find(f => f.id === landmarkId);
      const label = customFam ? `${customFam.name} (${landmarkId})` : landmarkNames[landmarkId] || landmarkId;

      player.agent_logs.push(`Government: Admin permanently fixed location for ${label} to [${lat.toFixed(6)}, ${lng.toFixed(6)}].`);
      
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `PMO Milestone: Admin relocated & permanently fixed '${label}' at GPS [${lat.toFixed(6)}, ${lng.toFixed(6)}].`, "POLITICS");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Successfully saved and fixed permanent location for ${label} on satellite map.`, zone_locations: player.zone_locations });
    }

    if (action === "reset_world_locations") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: `Access Denied: Only admin (${adminEmail}) can reset locations.` }, { status: 403 });
      }

      const defaultLocs = await resetWorldLocations();
      player.zone_locations = { ...defaultLocs };

      player.agent_logs.push("Government: Admin restored civilization world locations to default Navsari coordinates.");
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, "PMO Notice: Supreme Admin restored all map locations to baseline coordinates.", "POLITICS");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: "Civilization world locations reset to defaults successfully.", zone_locations: player.zone_locations });
    }

    if (action === "assign_member_role") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only admin can assign family roles." }, { status: 403 });
      }

      const familyId = String(body.family_id || "").trim();
      const memberName = String(body.member_name || "").trim();
      const newRole = String(body.role || "").trim();
      const newRelation = String(body.relation || "").trim();
      const newVehicle = String(body.vehicle || "bicycle").trim().toLowerCase();

      if (!familyId || !memberName || !newRole) {
        return NextResponse.json({ ok: false, message: "Family ID, member name, and role are required." }, { status: 400 });
      }

      const family = player.families?.find(f => f.id === familyId);
      if (!family) {
        return NextResponse.json({ ok: false, message: `Family with ID '${familyId}' not found.` }, { status: 404 });
      }

      const member = family.members?.find(m => m.name.toLowerCase() === memberName.toLowerCase());
      if (!member) {
        return NextResponse.json({ ok: false, message: `Member '${memberName}' not found in ${family.name}.` }, { status: 404 });
      }

      member.role = newRole;
      if (newRelation) member.relation = newRelation;
      if (newVehicle) member.vehicle = newVehicle;

      // Also update household if this matches current user's household
      if (player.household?.members) {
        const hMember = player.household.members.find(m => m.name.toLowerCase() === memberName.toLowerCase());
        if (hMember) {
          hMember.role = newRole;
          if (newRelation) hMember.relation = newRelation;
          if (newVehicle) hMember.vehicle = newVehicle;
        }
      }

      const vehicleEmoji: Record<string, string> = {
        tractor: "🚜 Tractor",
        scooter: "🛵 Scooter",
        car: "🚗 Car",
        bicycle: "🚲 Bicycle",
        truck: "🚚 Delivery Truck",
        walk: "🚶 Walking"
      };

      const vehDisplay = vehicleEmoji[newVehicle] || newVehicle;
      player.agent_logs.push(`Government: Admin assigned role '${newRole}' (${vehDisplay}) to ${memberName} in ${family.name}.`);

      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `PMO Gazetted: ${memberName} assigned role '${newRole}' with vehicle ${vehDisplay}.`, "POLITICS");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Updated role for ${memberName} to '${newRole}' with vehicle ${vehDisplay}.`, families: player.families });
    }

    if (action === "create_residence") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only admin can create new houses and hostels." }, { status: 403 });
      }

      const rawId = String(body.id || "").trim().toLowerCase().replace(/[^a-z0-9_-]/g, "_");
      const name = String(body.name || "").trim();
      const type = (body.type === "hostel" ? "hostel" : "house") as "house" | "hostel";
      const capacity = Number(body.capacity) || (type === "hostel" ? 12 : 6);
      const budget = Number(body.budget) || (type === "hostel" ? 120 : 60);
      const lat = Number(body.lat);
      const lng = Number(body.lng);

      if (!name) {
        return NextResponse.json({ ok: false, message: "Residence name is required." }, { status: 400 });
      }

      const id = rawId || (type === "hostel" ? `hostel_${Date.now()}` : `house_${Date.now()}`);

      if (player.families?.some(f => f.id === id)) {
        return NextResponse.json({ ok: false, message: `A residence with ID '${id}' already exists.` }, { status: 400 });
      }

      const newResidence = {
        id,
        name,
        type,
        capacity,
        budget,
        inventory: { milk: 5, wheat: 5, apple: 5, carrot: 5 },
        members: []
      };

      if (!player.families) player.families = [];
      player.families.push(newResidence);

      // Register fixed GPS coordinates
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        await updateWorldLocation(id, [lat, lng]);
        player.zone_locations[id] = [lat, lng];
      } else {
        const defaultCoord: [number, number] = type === "hostel" ? [20.9485, 72.9525] : [20.9465, 72.9520];
        await updateWorldLocation(id, defaultCoord);
        player.zone_locations[id] = defaultCoord;
      }

      const icon = type === "hostel" ? "🏢 Worker Hostel" : "🏠 Private House";
      player.agent_logs.push(`Government: Admin commissioned new ${icon} '${name}' (ID: ${id}).`);
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `Municipal Infrastructure: New ${icon} '${name}' opened in Navsari.`, "INFRASTRUCTURE");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Created new ${icon} '${name}' successfully.`, families: player.families, zone_locations: player.zone_locations });
    }

    if (action === "edit_residence") {
      const familyId = String(body.family_id || "").trim();
      const name = String(body.name || "").trim();
      const address = body.address ? String(body.address).trim() : undefined;
      const budget = body.budget !== undefined ? Number(body.budget) : undefined;
      const capacity = body.capacity !== undefined ? Number(body.capacity) : undefined;
      const type = body.type ? (body.type === "hostel" ? "hostel" : "house") : undefined;

      const targetUserId = body.target_user_id ? String(body.target_user_id).trim().toLowerCase() : userId.toLowerCase();
      let targetPlayer = player;
      if (targetUserId !== userId.toLowerCase()) {
        if (!isUserAdmin) {
          return NextResponse.json({ ok: false, message: "Access Denied: Only Admin or the resident owner can edit this profile." }, { status: 403 });
        }
        targetPlayer = await loadPlayer(targetUserId);
      }

      const cleanFamId = familyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanTargetUserId = targetPlayer.user_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isOwner = (
        targetUserId === userId.toLowerCase() ||
        familyId === "my_home" ||
        cleanFamId === "myhome" ||
        cleanFamId.includes(cleanTargetUserId) ||
        Boolean(targetPlayer.families?.some((f: any) => f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId))
      );

      if (!isUserAdmin && !isOwner) {
        return NextResponse.json({ ok: false, message: "Access Denied: You can only edit your own residence." }, { status: 403 });
      }

      const family = targetPlayer.families?.find(f => f.id === familyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId) || targetPlayer.families?.[0];
      if (!family) {
        return NextResponse.json({ ok: false, message: `Residence with ID '${familyId}' not found.` }, { status: 404 });
      }

      if (name) family.name = name;
      if (address) family.address = address;
      if (budget !== undefined && !isNaN(budget)) family.budget = budget;
      if (capacity !== undefined && !isNaN(capacity)) family.capacity = capacity;
      if (type) family.type = type;

      targetPlayer.agent_logs.push(`Citizen Profile: Updated residence details for '${family.name}' by ${isUserAdmin ? "Admin" : "Owner"}.`);
      await savePlayer(targetPlayer);
      return NextResponse.json({ ok: true, message: `Updated residence '${family.name}' successfully.`, families: targetPlayer.families });
    }

    if (action === "add_member_to_residence") {
      const familyId = String(body.family_id || "my_home").trim();
      const name = String(body.name || "").trim();
      const role = String(body.role || "worker").trim();
      const relation = String(body.relation || (role === "worker" ? "Civilization Worker" : "Resident")).trim();
      const vehicle = String(body.vehicle || "bicycle").trim().toLowerCase();

      if (!name) {
        return NextResponse.json({ ok: false, message: "Person name is required." }, { status: 400 });
      }

      const targetUserId = body.target_user_id ? String(body.target_user_id).trim().toLowerCase() : userId.toLowerCase();
      let targetPlayer = player;
      if (targetUserId !== userId.toLowerCase()) {
        if (!isUserAdmin) {
          return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can add members to other residences." }, { status: 403 });
        }
        targetPlayer = await loadPlayer(targetUserId);
      }

      const cleanFamId = familyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanTargetUserId = targetPlayer.user_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isOwner = (
        targetUserId === userId.toLowerCase() ||
        familyId === "my_home" ||
        cleanFamId === "myhome" ||
        cleanFamId.includes(cleanTargetUserId) ||
        Boolean(targetPlayer.families?.some((f: any) => f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId))
      );

      if (!isUserAdmin && !isOwner) {
        return NextResponse.json({ ok: false, message: "Access Denied: You can only add members to your own household." }, { status: 403 });
      }

      const family = targetPlayer.families?.find(f => f.id === familyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId) || targetPlayer.families?.[0];
      if (!family) {
        return NextResponse.json({ ok: false, message: `Residence with ID '${familyId}' not found.` }, { status: 404 });
      }

      if (!family.members) family.members = [];

      if (family.members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json({ ok: false, message: `A person named '${name}' is already registered in ${family.name}.` }, { status: 400 });
      }

      const newMember = {
        name,
        role,
        relation,
        vehicle,
        state: "Sleeping"
      };

      family.members.push(newMember);

      targetPlayer.agent_logs.push(`Citizen Registry: Registered member '${name}' (${role}, ${vehicle}) into ${family.name}.`);
      await savePlayer(targetPlayer);
      return NextResponse.json({ ok: true, message: `Added ${name} to ${family.name} successfully.`, families: targetPlayer.families });
    }

    if (action === "remove_member_from_residence") {
      const familyId = String(body.family_id || "my_home").trim();
      const memberName = String(body.member_name || "").trim();

      const targetUserId = body.target_user_id ? String(body.target_user_id).trim().toLowerCase() : userId.toLowerCase();
      let targetPlayer = player;
      if (targetUserId !== userId.toLowerCase()) {
        if (!isUserAdmin) {
          return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can remove members from other residences." }, { status: 403 });
        }
        targetPlayer = await loadPlayer(targetUserId);
      }

      const cleanFamId = familyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanTargetUserId = targetPlayer.user_id.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isOwner = (
        targetUserId === userId.toLowerCase() ||
        familyId === "my_home" ||
        cleanFamId === "myhome" ||
        cleanFamId.includes(cleanTargetUserId) ||
        Boolean(targetPlayer.families?.some((f: any) => f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId))
      );

      if (!isUserAdmin && !isOwner) {
        return NextResponse.json({ ok: false, message: "Access Denied: You can only manage your own household members." }, { status: 403 });
      }

      const family = targetPlayer.families?.find(f => f.id === familyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId) || targetPlayer.families?.[0];
      if (!family) {
        return NextResponse.json({ ok: false, message: `Residence with ID '${familyId}' not found.` }, { status: 404 });
      }

      const idx = family.members?.findIndex(m => m.name.toLowerCase() === memberName.toLowerCase());
      if (idx === undefined || idx === -1) {
        return NextResponse.json({ ok: false, message: `Member '${memberName}' not found in ${family.name}.` }, { status: 404 });
      }

      family.members.splice(idx, 1);
      targetPlayer.agent_logs.push(`Citizen Registry: Removed member ${memberName} from ${family.name}.`);

      await savePlayer(targetPlayer);
      return NextResponse.json({ ok: true, message: `Removed ${memberName} successfully.`, families: targetPlayer.families });
    }

    if (action === "admin_grant_subsidy") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can grant municipal subsidies." }, { status: 403 });
      }
      const targetUserId = String(body.target_user_id || "").trim();
      const amount = Math.max(10, Math.min(1000, Number(body.amount || 100)));

      if (!targetUserId) {
        return NextResponse.json({ ok: false, message: "Target citizen is required." }, { status: 400 });
      }

      const targetPlayer = await loadPlayer(targetUserId);
      targetPlayer.money = (targetPlayer.money || 0) + amount;
      player.city_treasury = Math.max(0, (player.city_treasury || 1000) - amount);

      targetPlayer.agent_logs.push(`Government Relief: Received $${amount} Municipal Welcome Subsidy from Admin (${userId}).`);
      player.agent_logs.push(`Government Cabinet: Granted $${amount} Municipal Welcome Subsidy to citizen '${targetUserId}'.`);

      await savePlayer(targetPlayer);
      await savePlayer(player);

      return NextResponse.json({
        ok: true,
        message: `Granted $${amount} Municipal Subsidy to ${targetUserId}.`,
        city_treasury: player.city_treasury
      });
    }

    if (action === "reset_and_seed_database") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can reset the database." }, { status: 403 });
      }

      await resetAndSeedDatabase();
      const freshUsers = await listAllPlayers();

      return NextResponse.json({
        ok: true,
        message: "Database reset and seeded with 6 citizens across Admin (Vandan_Home) & User (Vpatel Residence) accounts!",
        users: freshUsers
      });
    }

    if (action === "admin_delete_citizen" || action === "delete_citizen") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can delete citizen accounts." }, { status: 403 });
      }

      const targetUserId = String(body.target_user_id || "").trim();
      if (!targetUserId) {
        return NextResponse.json({ ok: false, message: "Target citizen account ID is required." }, { status: 400 });
      }

      if (targetUserId.toLowerCase() === "vandan11patel@gmail.com" || targetUserId.toLowerCase() === "vandan_11") {
        return NextResponse.json({ ok: false, message: "Cannot delete the Supreme Administrator account." }, { status: 400 });
      }

      await deletePlayer(targetUserId);

      player.agent_logs.push(`Municipal Administration: Supreme Admin permanently deleted citizen '${targetUserId}' from MongoDB database.`);
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `Citizen Registry: Account '${targetUserId}' was expunged by Municipal Administration.`, "GOVERNMENT");

      await savePlayer(player);
      const remainingUsers = await listAllPlayers();

      return NextResponse.json({
        ok: true,
        message: `Citizen '${targetUserId}' and their private residence were permanently deleted from the database.`,
        users: remainingUsers
      });
    }

    if (action === "admin_edit_citizen") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only Admin can edit citizen information." }, { status: 403 });
      }

      const targetUserId = String(body.target_user_id || "").trim().toLowerCase();
      if (!targetUserId) {
        return NextResponse.json({ ok: false, message: "Target citizen email or user ID is required." }, { status: 400 });
      }

      const citizenName = String(body.name || body.citizen_name || "").trim();
      const homeName = String(body.home_name || "").trim() || `${citizenName || targetUserId.split(/[@_]/)[0]}'s Residence`;
      const address = String(body.address || body.city_name || "").trim() || "Civilization Citizen Zone";
      const lat = body.lat !== undefined ? Number(body.lat) : 20.9472;
      const lng = body.lng !== undefined ? Number(body.lng) : 72.9515;
      const money = body.money !== undefined ? Number(body.money) : 500;
      const rawMembers = Array.isArray(body.members) ? body.members : [];
      const memberNames = rawMembers.map((m: any) => typeof m === "string" ? m.trim() : (m?.name || "").trim()).filter(Boolean);

      // 1. Update Auth DB
      try {
        const authCol = await getAuthCollection("users");
        if (authCol) {
          await authCol.updateOne(
            { $or: [{ user_id: targetUserId }, { email: targetUserId }] },
            {
              $set: {
                name: citizenName,
                home_name: homeName,
                address: address,
                city_name: address,
                lat: lat,
                lng: lng,
                members: memberNames,
                updated_at: new Date().toISOString()
              }
            },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.warn("[Admin Edit Citizen Auth Warning]:", err.message);
      }

      // 2. Update World DB Player State
      const targetPlayer = (await loadPlayer(targetUserId)) as any;
      targetPlayer.name = citizenName || targetPlayer.name;
      targetPlayer.address = address;
      targetPlayer.city_name = address;
      targetPlayer.lat = lat;
      targetPlayer.lng = lng;
      targetPlayer.money = money;
      if (!targetPlayer.zone_locations) targetPlayer.zone_locations = {};
      targetPlayer.zone_locations["my_home"] = [lat, lng];

      // Update family in targetPlayer
      const familyStructured = rawMembers.map((m: any, idx: number) => {
        if (typeof m === "string") {
          return {
            id: `mem_${idx + 1}`,
            name: m,
            role: idx === 0 ? "Head" : idx === 1 ? "Spouse" : "Family Member",
            relation: idx === 0 ? "Household Head" : "Family Member",
            vehicle: "bicycle",
            age: idx === 0 ? 35 : 25,
            health: 100,
            happiness: 95
          };
        }
        return {
          id: m?.id || `mem_${idx + 1}`,
          name: m?.name || `Member #${idx + 1}`,
          role: m?.role || (idx === 0 ? "Head" : "Family Member"),
          relation: m?.relation || "Family Member",
          vehicle: m?.vehicle || "bicycle",
          age: Number(m?.age) || (idx === 0 ? 35 : 25),
          health: 100,
          happiness: 95
        };
      });

      if (!targetPlayer.families) targetPlayer.families = [];
      const famIndex = targetPlayer.families.findIndex((f: any) => f.id === "my_home" || f.id === `house_${targetUserId}`);
      const updatedFamDoc = {
        id: "my_home",
        name: homeName,
        address: address,
        type: "house" as const,
        head: citizenName || memberNames[0] || "Head",
        member_count: familyStructured.length,
        budget: targetPlayer.families[famIndex]?.budget || 150,
        coords: [lat, lng],
        inventory: { wheat: 5, apple: 5, milk: 2 },
        members: familyStructured
      };

      if (famIndex >= 0) {
        targetPlayer.families[famIndex] = updatedFamDoc;
      } else {
        targetPlayer.families.unshift(updatedFamDoc);
      }

      await savePlayer(targetPlayer);

      // 3. Update world_locations manifest
      try {
        const worldCol = await getWorldCollection("world_locations");
        if (worldCol) {
          const cleanKey = `homes.${targetUserId.replace(/[@.]/g, "_")}`;
          await worldCol.updateOne(
            { id: "locations_manifest" },
            {
              $set: {
                [cleanKey]: {
                  name: homeName,
                  address: address,
                  coords: [lat, lng],
                  members: memberNames
                }
              }
            },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.warn("[Admin Edit World Locations Warning]:", err.message);
      }

      invalidatePlayersListCache();
      const updatedUsersList = await listAllPlayers();
      return NextResponse.json({
        ok: true,
        message: `Successfully updated citizen '${targetUserId}' (${citizenName || homeName}) in MongoDB!`,
        users: updatedUsersList
      });
    }

    if (action === "edit_person_details") {
      const familyId = String(body.family_id || "").trim();
      const oldName = String(body.old_name || body.member_name || "").trim();
      const newName = String(body.new_name || oldName).trim();
      const role = String(body.role || "").trim();
      const relation = String(body.relation || "").trim();
      const vehicle = String(body.vehicle || "bicycle").trim().toLowerCase();
      const destinationFamilyId = body.new_family_id ? String(body.new_family_id).trim() : familyId;

      if (!familyId || !oldName || !newName) {
        return NextResponse.json({ ok: false, message: "Residence ID and person names are required." }, { status: 400 });
      }

      let targetUserId = body.target_user_id ? String(body.target_user_id).trim().toLowerCase() : userId.toLowerCase();
      let targetPlayer = player;
      if (targetUserId !== userId.toLowerCase()) {
        targetPlayer = await loadPlayer(targetUserId) || player;
      }

      const cleanFamId = familyId.toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Locate residence sourceFam across targetPlayer families or all players in MongoDB
      let sourceFam = targetPlayer.families?.find((f: any) => 
        f.id === familyId || 
        f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId ||
        cleanFamId.includes(f.id.toLowerCase().replace(/[^a-z0-9]/g, "")) ||
        f.id === "my_home"
      ) || targetPlayer.families?.[0];

      // 2. If not found, search all players in MongoDB by family ID
      if (!sourceFam) {
        const allPlayers = await listAllPlayers();
        for (const p of allPlayers) {
          const found = p.families?.find((f: any) => 
            f.id === familyId || 
            f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId || 
            cleanFamId.includes(f.id.toLowerCase().replace(/[^a-z0-9]/g, ""))
          );
          if (found) {
            sourceFam = found;
            targetPlayer = p;
            targetUserId = p.user_id;
            break;
          }
        }
      }

      // 3. If still not found by family ID, search by citizen name across all players
      if (!sourceFam) {
        const oName = oldName.toLowerCase();
        const allPlayers = await listAllPlayers();
        for (const p of allPlayers) {
          for (const f of (p.families || [])) {
            const hasMem = f.members?.some((m: any) => {
              const mName = (typeof m === "string" ? m : m.name || "").toLowerCase();
              return mName === oName || mName.includes(oName) || oName.includes(mName);
            });
            if (hasMem) {
              sourceFam = f;
              targetPlayer = p;
              targetUserId = p.user_id;
              break;
            }
          }
          if (sourceFam) break;
        }
      }

      // 4. Fallback: Create default family for targetPlayer if missing
      if (!sourceFam) {
        if (!targetPlayer.families) targetPlayer.families = [];
        sourceFam = {
          id: familyId || "my_home",
          name: (targetPlayer as any).home_name || `${targetPlayer.user_id}'s Residence`,
          address: (targetPlayer as any).address || "Civilization Region",
          type: "house",
          budget: 201,
          inventory: { milk: 5, wheat: 5, apple: 5 },
          members: [{ name: oldName, role: "resident", relation: "Resident", vehicle, state: "At Home" }]
        };
        targetPlayer.families.push(sourceFam);
      }

      const isOwner = (
        targetUserId === userId.toLowerCase() ||
        familyId === "my_home" ||
        cleanFamId === "myhome" ||
        cleanFamId.includes(userId.toLowerCase().replace(/[^a-z0-9]/g, "")) ||
        Boolean(player.families?.some((f: any) => f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanFamId))
      );

      if (!isUserAdmin && !isOwner) {
        return NextResponse.json({ ok: false, message: "Access Denied: You can only edit your own household citizens." }, { status: 403 });
      }

      const oName = oldName.toLowerCase();
      if (!sourceFam.members) sourceFam.members = [];
      let memberIdx = sourceFam.members.findIndex((m: any) => {
        const mName = (typeof m === "string" ? m : m.name || "").toLowerCase();
        return mName === oName || mName.includes(oName) || oName.includes(mName);
      });

      if (memberIdx === undefined || memberIdx === -1) {
        sourceFam.members.push({
          name: newName,
          role: role || "resident",
          relation: relation || "Resident",
          vehicle,
          state: "At Home"
        });
        memberIdx = sourceFam.members.length - 1;
      }

      const member = sourceFam.members[memberIdx];

      const budget = body.budget !== undefined ? Number(body.budget) : undefined;
      if (budget !== undefined && !isNaN(budget)) {
        sourceFam.budget = Math.max(10, budget);
        (targetPlayer as any).budget = Math.max(10, budget);
      }

      // If transferring to another residence or hostel
      const cleanDestFamId = destinationFamilyId.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (destinationFamilyId && destinationFamilyId !== familyId && cleanDestFamId !== cleanFamId) {
        const destFam = targetPlayer.families?.find((f: any) => f.id === destinationFamilyId || f.id.toLowerCase().replace(/[^a-z0-9]/g, "") === cleanDestFamId);
        if (!destFam) {
          return NextResponse.json({ ok: false, message: `Destination residence '${destinationFamilyId}' not found.` }, { status: 404 });
        }
        sourceFam.members.splice(memberIdx, 1);
        if (typeof member === "object") {
          member.name = newName;
          if (role) member.role = role;
          if (relation) member.relation = relation;
          if (vehicle) member.vehicle = vehicle;
          if (!destFam.members) destFam.members = [];
          destFam.members.push(member);
        } else {
          destFam.members.push({ name: newName, role: role || "resident", relation: relation || "Resident", vehicle, state: "At Home" });
        }
        targetPlayer.agent_logs.push(`Citizen Registry: Transferred citizen '${newName}' from ${sourceFam.name} to ${destFam.name}.`);
      } else {
        if (typeof member === "object") {
          member.name = newName;
          if (role) member.role = role;
          if (relation) member.relation = relation;
          if (vehicle) member.vehicle = vehicle;
        } else {
          sourceFam.members[memberIdx] = { name: newName, role: role || "resident", relation: relation || "Resident", vehicle, state: "At Home" };
        }
        if (vehicle) {
          (targetPlayer as any).vehicle = vehicle;
          if (Array.isArray((targetPlayer as any).members)) {
            (targetPlayer as any).members = (targetPlayer as any).members.map((m: any) => {
              const mName = typeof m === "string" ? m : m.name;
              if (mName?.toLowerCase() === oldName.toLowerCase()) {
                return typeof m === "object" ? { ...m, vehicle } : { name: newName, vehicle, role: role || "resident", relation: relation || "Resident", state: "At Home" };
              }
              return m;
            });
          }
        }
        targetPlayer.agent_logs.push(`Citizen Registry: Updated details for '${newName}' in ${sourceFam.name}.`);
      }

      await savePlayer(targetPlayer);
      invalidatePlayersListCache();
      const updatedUsersList = await listAllPlayers();
      return NextResponse.json({
        ok: true,
        message: `Updated citizen '${newName}' successfully.`,
        families: targetPlayer.families,
        users: updatedUsersList
      });
    }

    if (action === "transfer_worker") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only admin can transfer workers." }, { status: 403 });
      }

      const fromFamilyId = String(body.from_family_id || "").trim();
      const toFamilyId = String(body.to_family_id || "").trim();
      const memberName = String(body.member_name || "").trim();
      const newRole = body.new_role ? String(body.new_role).trim() : null;
      const newVehicle = body.new_vehicle ? String(body.new_vehicle).trim().toLowerCase() : null;

      if (!fromFamilyId || !toFamilyId || !memberName) {
        return NextResponse.json({ ok: false, message: "Source residence, destination residence, and worker name are required." }, { status: 400 });
      }

      if (fromFamilyId === toFamilyId) {
        return NextResponse.json({ ok: false, message: "Source and destination residence cannot be the same." }, { status: 400 });
      }

      const fromFam = player.families?.find(f => f.id === fromFamilyId);
      const toFam = player.families?.find(f => f.id === toFamilyId);

      if (!fromFam) {
        return NextResponse.json({ ok: false, message: `Source residence '${fromFamilyId}' not found.` }, { status: 404 });
      }
      if (!toFam) {
        return NextResponse.json({ ok: false, message: `Destination residence '${toFamilyId}' not found.` }, { status: 404 });
      }

      const memberIdx = fromFam.members?.findIndex(m => m.name.toLowerCase() === memberName.toLowerCase());
      if (memberIdx === undefined || memberIdx === -1) {
        return NextResponse.json({ ok: false, message: `Worker '${memberName}' not found in ${fromFam.name}.` }, { status: 404 });
      }

      // Check capacity in toFam if defined
      if (toFam.capacity && (toFam.members?.length || 0) >= toFam.capacity) {
        return NextResponse.json({ ok: false, message: `${toFam.name} has reached maximum capacity (${toFam.capacity} beds).` }, { status: 400 });
      }

      const [member] = fromFam.members.splice(memberIdx, 1);
      if (newRole) member.role = newRole;
      if (newVehicle) member.vehicle = newVehicle;
      if (!toFam.members) toFam.members = [];
      toFam.members.push(member);

      player.agent_logs.push(`Government: Admin transferred worker '${memberName}' from ${fromFam.name} to ${toFam.name}.`);
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `Labor Logistics: ${memberName} transferred to ${toFam.name}.`, "HOUSING");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Transferred ${memberName} to ${toFam.name} successfully.`, families: player.families });
    }

    if (action === "delete_residence") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only admin can delete residences." }, { status: 403 });
      }

      const familyId = String(body.family_id || "").trim();
      if (!familyId) {
        return NextResponse.json({ ok: false, message: "Residence ID is required." }, { status: 400 });
      }

      const famIdx = player.families?.findIndex(f => f.id === familyId);
      if (famIdx === undefined || famIdx === -1) {
        return NextResponse.json({ ok: false, message: `Residence '${familyId}' not found.` }, { status: 404 });
      }

      const fam = player.families[famIdx];
      player.families.splice(famIdx, 1);
      if (player.zone_locations) {
        delete player.zone_locations[familyId];
      }

      // Also clean up from world_locations manifest if present
      try {
        const worldCol = await getWorldCollection("world_locations");
        if (worldCol) {
          await worldCol.updateOne(
            { id: "locations_manifest" },
            { $unset: { [familyId]: "", [`homes.${familyId}`]: "" } }
          );
        }
      } catch {}

      player.agent_logs.push(`Municipal Administration: Admin deleted residence '${fam.name}' (${familyId}).`);
      await savePlayer(player);
      return NextResponse.json({
        ok: true,
        message: `Decommissioned and deleted residence '${fam.name}' successfully.`,
        families: player.families
      });
    }

    if (action === "set_speed" || action === "set_simulation_speed") {
      const speed = Math.max(0, Math.min(10000, Number(body.speed) || 1));
      const paused = body.paused !== undefined ? Boolean(body.paused) : false;
      if (!player.clock) {
        player.clock = { total_seconds: 480, speed: 1, weather: "Clear" };
      }
      player.clock.speed = speed;
      (player.clock as any).paused = paused;
      (player as any).last_saved_at = new Date().toISOString();
      await savePlayer(player);
      return NextResponse.json({ ok: true, speed, paused, clock: player.clock });
    }

    if (action === "step_simulation") {
      const speed = Number(body.speed) || Number(player.clock?.speed || 1);
      const secondsToAdvance = Math.min(86400, Math.max(0.2, Number(body.seconds) || 1));
      const ticks = Math.min(60, Math.max(1, Math.ceil(secondsToAdvance / 5)));
      const dt = secondsToAdvance / ticks;

      for (let i = 0; i < ticks; i++) {
        runSimulationTick(player, dt, catalogs);
      }

      (player as any).last_saved_at = new Date().toISOString();
      await savePlayer(player, false);
      return NextResponse.json({ ok: true, message: `Advanced simulation by ${secondsToAdvance} seconds.`, clock: player.clock });
    }

    if (action === "toggle_automated_farming") {
      const enabled = body.enabled !== undefined ? Boolean(body.enabled) : !player.automated_farming_enabled;
      player.automated_farming_enabled = enabled;
      const statusStr = enabled ? "enabled" : "paused";
      player.agent_logs.push(`Agriculture: Automated Kisan AI Farming Agent ${statusStr}.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Automated farming ${statusStr}.`, automated_farming_enabled: enabled });
    }

    if (action === "adjust_livestock") {
      if (!isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: Only admin can adjust livestock." }, { status: 403 });
      }

      if (!player.livestock) {
        player.livestock = { cows: 4, sheep: 6, chickens: 10 };
      }

      if (body.cows !== undefined) player.livestock.cows = Math.max(0, Number(body.cows));
      if (body.sheep !== undefined) player.livestock.sheep = Math.max(0, Number(body.sheep));
      if (body.chickens !== undefined) player.livestock.chickens = Math.max(0, Number(body.chickens));

      player.agent_logs.push(`Agriculture: Admin updated livestock to ${player.livestock.cows} Cows 🐄, ${player.livestock.sheep} Sheep 🐑, ${player.livestock.chickens} Chickens 🐔.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: "Livestock counts updated successfully.", livestock: player.livestock });
    }

    if (action === "run_kisan_agent") {
      const minTarget = Math.max(1, Number(body.min_target) || 5);
      const report = await KisanAgentManager.tickUserFarmingAgent(player, catalogs, minTarget);
      await savePlayer(player);
      return NextResponse.json({
        ok: true,
        message: report.actionsTaken.length > 0 ? report.actionsTaken.join("; ") : "Stock levels optimal. Target ≥5 maintained across all categories.",
        report,
        plots: player.plots,
        inventory: player.inventory,
        farm_barn: player.farm_barn
      });
    }

    if (action === "get_kisan_report") {
      const minTarget = Math.max(1, Number(body.min_target) || 5);
      const agent = KisanAgentManager.getAgentForUser(player.user_id, minTarget);
      const deficits = agent.checkStocksAndDeficits(player, catalogs);
      return NextResponse.json({
        ok: true,
        report: agent.lastReport,
        history: agent.executionHistory,
        deficits,
        minTarget
      });
    }

    if (action === "refine_petrol") {
      if (!player.industry) {
        player.industry = {
          oil_refinery: { crude_oil: 120, refined_petrol: 85, diesel: 60, marine_fuel: 40, is_active: true, efficiency: 95, daily_crude_input: 40, daily_fuel_output: 35 },
          petrol_pump: { fuel_stock: 450, diesel_stock: 350, price_per_liter: 15, daily_sales_liters: 120, revenue: 1800, ev_charging_active: true },
          shipyard: { ships_docked: 3, ships_under_construction: 1, fleet: [ { id: "ship_1", name: "INS Navsari Express", type: "cargo_ship", fuel: 80, status: "Active Maritime Freight", cargo: { wheat: 20, steel_beam: 10 } }, { id: "ship_2", name: "Surat Gulf Ferry", type: "passenger_ferry", fuel: 65, status: "Passenger Transit to Gulf" }, { id: "ship_3", name: "Arabian Sea Trawler 09", type: "fishing_trawler", fuel: 90, status: "Commercial Deep Sea Harvest" } ] },
          heavy_manufacturing: { iron_ore_stock: 75, steel_beams: 45, concrete_stock: 90, active_smelters: 2 }
        };
      }
      const ref = player.industry.oil_refinery;
      const barrelsToRefine = Math.min(ref.crude_oil, Number(body.barrels || 20));
      if (barrelsToRefine < 1) {
        return NextResponse.json({ ok: false, message: "Insufficient crude oil in refinery tanks." });
      }
      ref.crude_oil -= barrelsToRefine;
      const petrolYield = Math.floor(barrelsToRefine * 0.7);
      const dieselYield = Math.floor(barrelsToRefine * 0.5);
      const bunkerYield = Math.floor(barrelsToRefine * 0.3);
      ref.refined_petrol += petrolYield;
      ref.diesel += dieselYield;
      ref.marine_fuel += bunkerYield;
      player.industry.petrol_pump.fuel_stock += petrolYield;
      player.industry.petrol_pump.diesel_stock += dieselYield;

      player.agent_logs.push(`Refinery: Distilled ${barrelsToRefine} barrels crude into +${petrolYield}L Petrol, +${dieselYield}L Diesel, +${bunkerYield}L Marine Fuel.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Refined ${barrelsToRefine} crude barrels into +${petrolYield}L Petrol & +${dieselYield}L Diesel.`, industry: player.industry });
    }

    if (action === "set_fuel_price") {
      if (!player.industry) return NextResponse.json({ ok: false, message: "Industry state uninitialized." });
      const newPrice = Math.max(1, Number(body.price_per_liter || 15));
      player.industry.petrol_pump.price_per_liter = newPrice;
      player.agent_logs.push(`Petrol Pump: Highway 48 fuel price set to $${newPrice}/L.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Fuel price updated to $${newPrice}/L.`, industry: player.industry });
    }

    if (action === "commission_ship") {
      if (!player.industry) return NextResponse.json({ ok: false, message: "Industry state uninitialized." });
      const shipType = body.type || "cargo_ship";
      const shipCost = shipType === "cargo_ship" ? 150 : shipType === "passenger_ferry" ? 100 : 75;
      
      let fundedMethod = "Personal Cash";
      if (player.money >= shipCost) {
        player.money -= shipCost;
        fundedMethod = `Personal Cash ($${shipCost})`;
      } else if ((player.money + (player.city_treasury || 0)) >= shipCost) {
        const fromWallet = player.money;
        const fromTreasury = shipCost - fromWallet;
        player.money = 0;
        player.city_treasury = Math.max(0, (player.city_treasury || 0) - fromTreasury);
        fundedMethod = `Personal Cash ($${fromWallet}) + City Treasury Grant ($${fromTreasury})`;
      } else {
        // Automatic Municipal Maritime Development Grant
        player.city_treasury = (player.city_treasury || 0) + 100;
        fundedMethod = "Municipal Maritime Pioneer Development Grant";
      }

      const shipId = `ship_${Date.now().toString().slice(-4)}`;
      const shipName = body.name || `Navsari Maritime ${shipType === "cargo_ship" ? "Freighter" : shipType === "passenger_ferry" ? "Cruiser" : "Trawler"} ${shipId.slice(-3)}`;
      player.industry.shipyard.fleet.push({
        id: shipId,
        name: shipName,
        type: shipType,
        fuel: 100,
        status: "Docked at Port",
        cargo: shipType === "cargo_ship" ? { wheat: 10, wood: 10 } : undefined
      });
      player.industry.shipyard.ships_docked += 1;
      player.agent_logs.push(`Shipyard: Commissioned new vessel '${shipName}' (${shipType.replace(/_/g, " ")}) funded via ${fundedMethod}.`);
      await savePlayer(player);
      return NextResponse.json({
        ok: true,
        message: `Successfully commissioned '${shipName}' via ${fundedMethod}!`,
        industry: player.industry,
        money: player.money,
        city_treasury: player.city_treasury
      });
    }

    if (action === "dispatch_ship_voyage") {
      if (!player.industry) return NextResponse.json({ ok: false, message: "Industry state uninitialized." });
      const ship = player.industry.shipyard.fleet.find(s => s.id === body.ship_id);
      if (!ship) return NextResponse.json({ ok: false, message: "Vessel not found in shipyard registry." });
      if (ship.fuel < 20) return NextResponse.json({ ok: false, message: `Vessel '${ship.name}' has low bunker fuel (${ship.fuel}%). Refuel required.` });
      
      ship.fuel -= 20;
      ship.status = "At High Seas (Trade Voyage)";
      const voyageEarnings = ship.type === "cargo_ship" ? 85 : ship.type === "passenger_ferry" ? 55 : 40;
      player.money += voyageEarnings;
      player.agent_logs.push(`Shipyard: '${ship.name}' returned from maritime voyage earning +$${voyageEarnings} trade revenue.`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `'${ship.name}' completed maritime route earning +$${voyageEarnings}!`, industry: player.industry, money: player.money });
    }

    if (action === "smelt_steel") {
      if (!player.industry) return NextResponse.json({ ok: false, message: "Industry state uninitialized." });
      const heavy = player.industry.heavy_manufacturing;
      if (heavy.iron_ore_stock < 5) return NextResponse.json({ ok: false, message: "Insufficient Iron Ore in foundry stock (need at least 5)." });
      heavy.iron_ore_stock -= 5;
      heavy.steel_beams += 2;
      player.agent_logs.push("Foundry: Smelted 5x Iron Ore into +2x Industrial Steel Beams.");
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: "Smelted +2x Industrial Steel Beams.", industry: player.industry });
    }

    if (action === "run_industrial_agent") {
      if (!player.industry) {
        player.industry = {
          oil_refinery: { crude_oil: 120, refined_petrol: 85, diesel: 60, marine_fuel: 40, is_active: true, efficiency: 95, daily_crude_input: 40, daily_fuel_output: 35 },
          petrol_pump: { fuel_stock: 450, diesel_stock: 350, price_per_liter: 15, daily_sales_liters: 120, revenue: 1800, ev_charging_active: true },
          shipyard: { ships_docked: 3, ships_under_construction: 1, fleet: [ { id: "ship_1", name: "INS Navsari Express", type: "cargo_ship", fuel: 80, status: "Active Maritime Freight", cargo: { wheat: 20, steel_beam: 10 } }, { id: "ship_2", name: "Surat Gulf Ferry", type: "passenger_ferry", fuel: 65, status: "Passenger Transit to Gulf" }, { id: "ship_3", name: "Arabian Sea Trawler 09", type: "fishing_trawler", fuel: 90, status: "Commercial Deep Sea Harvest" } ] },
          heavy_manufacturing: { iron_ore_stock: 75, steel_beams: 45, concrete_stock: 90, active_smelters: 2 }
        };
      }
      const ind = player.industry;
      const actionsTaken: string[] = [];

      // 1. Distill crude
      if (ind.oil_refinery.crude_oil >= 10) {
        const bbl = Math.min(25, ind.oil_refinery.crude_oil);
        ind.oil_refinery.crude_oil -= bbl;
        const petrolYield = Math.floor(bbl * 0.7);
        const dieselYield = Math.floor(bbl * 0.5);
        const bunkerYield = Math.floor(bbl * 0.3);
        ind.oil_refinery.refined_petrol += petrolYield;
        ind.oil_refinery.diesel += dieselYield;
        ind.oil_refinery.marine_fuel += bunkerYield;
        actionsTaken.push(`Distilled ${bbl} crude barrels into +${petrolYield}L Petrol & +${dieselYield}L Diesel`);
      }

      // 2. Refuel & Replenish Petrol Pump
      if (ind.petrol_pump.fuel_stock < 500 && ind.oil_refinery.refined_petrol >= 20) {
        const transfer = Math.min(50, ind.oil_refinery.refined_petrol);
        ind.oil_refinery.refined_petrol -= transfer;
        ind.petrol_pump.fuel_stock += transfer;
        actionsTaken.push(`Replenished Petrol Pump with +${transfer}L fuel`);
      }

      // 3. Refuel & Dispatch Shipyard Fleet
      for (const ship of ind.shipyard.fleet) {
        if (ship.fuel < 40 && ind.oil_refinery.marine_fuel >= 20) {
          ind.oil_refinery.marine_fuel -= 20;
          ship.fuel = 100;
          actionsTaken.push(`Refueled vessel '${ship.name}'`);
        }
        if (ship.fuel >= 60) {
          ship.fuel -= 20;
          ship.status = "At High Seas (Trade Voyage)";
          const earned = ship.type === "cargo_ship" ? 85 : ship.type === "passenger_ferry" ? 55 : 40;
          player.money += earned;
          actionsTaken.push(`Dispatched '${ship.name}' on trade voyage (earned +$${earned})`);
        }
      }

      // 4. Heavy Foundry Smelting
      if (ind.heavy_manufacturing.iron_ore_stock >= 10) {
        ind.heavy_manufacturing.iron_ore_stock -= 10;
        ind.heavy_manufacturing.steel_beams += 4;
        actionsTaken.push("Smelted 10x Iron Ore into +4x Steel Beams");
      }

      const summaryMsg = actionsTaken.length > 0 ? actionsTaken.join("; ") : "Refineries and pumps operating at peak equilibrium.";
      player.agent_logs.push(`Industrial Agent: ${summaryMsg}`);
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: summaryMsg, industry: player.industry, money: player.money });
    }

    if (action === "update_user_details" || action === "set_home_location" || action === "build_my_home") {
      const targetUserId = String(body.target_user_id || body.user_id || userId).trim().toLowerCase();
      const callerUserId = userId.trim().toLowerCase();

      if (targetUserId !== callerUserId && !isUserAdmin) {
        return NextResponse.json({ ok: false, message: "Access Denied: You can change your own details only." }, { status: 403 });
      }

      const targetPlayer = (targetUserId === callerUserId ? player : await loadPlayer(targetUserId)) as any;
      if (!targetPlayer) {
        return NextResponse.json({ ok: false, message: `Citizen profile for '${targetUserId}' not found.` }, { status: 404 });
      }

      const lat = Number(body.lat || targetPlayer.lat || 20.9472);
      const lng = Number(body.lng || targetPlayer.lng || 72.9515);
      const homeName = String(body.home_name || body.name || "").trim() || `${targetUserId.split(/[@_]/)[0]}'s Residence`;
      const address = String(body.address || body.city_name || "").trim() || "Civilization Citizen Zone";
      const familyName = String(body.family_name || "").trim() || homeName;
      const memberCount = Math.max(1, Math.min(8, Number(body.member_count || 4)));

      if (!targetPlayer.zone_locations) targetPlayer.zone_locations = {};
      targetPlayer.zone_locations["my_home"] = [lat, lng];
      targetPlayer.lat = lat;
      targetPlayer.lng = lng;
      targetPlayer.address = address;
      targetPlayer.city_name = address;
      targetPlayer.home_name = homeName;
      if (body.name) targetPlayer.name = String(body.name).trim();

      if (!targetPlayer.families) targetPlayer.families = [];
      const myFamIndex = targetPlayer.families.findIndex((f: any) => f.id === "my_home" || f.id === `house_${targetUserId}`);

      const rawMembers = Array.isArray(body.members) ? body.members : (body.member_names || []);
      const memberNames: string[] = [];
      const structuredMembers: any[] = [];

      for (let i = 0; i < memberCount; i++) {
        const item = rawMembers[i];
        let name = typeof item === "string" ? item.trim() : (item?.name || "").trim();
        if (!name) {
          name = i === 0 ? `${targetPlayer.name || "Head"} (Head)` : i === 1 ? "Spouse" : `Member #${i + 1}`;
        }
        memberNames.push(name);
        structuredMembers.push({
          id: `mem_${i + 1}`,
          name: name,
          role: typeof item === "object" && item?.role ? item.role : (i === 0 ? "Head" : i === 1 ? "Spouse" : "Child"),
          relation: typeof item === "object" && item?.relation ? item.relation : (i === 0 ? "Household Head" : "Family Member"),
          vehicle: typeof item === "object" && item?.vehicle ? item.vehicle : (i === 0 ? "car" : i === 1 ? "scooter" : "bicycle"),
          age: typeof item === "object" && item?.age ? Number(item.age) : (i === 0 ? 35 : i === 1 ? 32 : 12),
          health: 100,
          happiness: 95,
          state: "At Home"
        });
      }

      const updatedFam = {
        id: "my_home",
        name: familyName,
        address: address,
        type: "house" as const,
        head: memberNames[0] || targetPlayer.name || "Head",
        member_count: structuredMembers.length,
        budget: targetPlayer.families[myFamIndex]?.budget || 150,
        coords: [lat, lng],
        inventory: { wheat: 5, apple: 5, milk: 2 },
        members: structuredMembers
      };

      if (myFamIndex >= 0) {
        targetPlayer.families[myFamIndex] = updatedFam;
      } else {
        targetPlayer.families.unshift(updatedFam);
      }

      // 1. Sync to Auth DB
      try {
        const authCol = await getAuthCollection("users");
        if (authCol) {
          await authCol.updateOne(
            { $or: [{ user_id: targetUserId }, { email: targetUserId }] },
            {
              $set: {
                name: memberNames[0] || targetPlayer.name || "Citizen",
                home_name: homeName,
                address: address,
                city_name: address,
                lat: lat,
                lng: lng,
                members: memberNames,
                updated_at: new Date().toISOString()
              }
            },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.warn("[Save Home Auth Warning]:", err.message);
      }

      // 2. Sync to World Locations Manifest
      try {
        const worldCol = await getWorldCollection("world_locations");
        if (worldCol) {
          const cleanKey = `homes.${targetUserId.replace(/[@.]/g, "_")}`;
          await worldCol.updateOne(
            { id: "locations_manifest" },
            {
              $set: {
                [cleanKey]: {
                  name: homeName,
                  address: address,
                  coords: [lat, lng],
                  members: memberNames
                }
              }
            },
            { upsert: true }
          );
        }
      } catch (err: any) {
        console.warn("[Save Home World Location Warning]:", err.message);
      }

      targetPlayer.agent_logs.push(`Database: Saved private residence '${homeName}' with ${structuredMembers.length} family members at [${lat.toFixed(4)}, ${lng.toFixed(4)}].`);
      await savePlayer(targetPlayer);
      invalidatePlayersListCache();

      return NextResponse.json({
        ok: true,
        message: `Private residence '${homeName}' and details updated successfully!`,
        zone_locations: targetPlayer.zone_locations,
        families: targetPlayer.families,
        user_id: targetUserId
      });
    }

    return NextResponse.json({ ok: false, message: "Action not recognized." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

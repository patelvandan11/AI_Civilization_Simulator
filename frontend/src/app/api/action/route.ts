import { NextRequest, NextResponse } from "next/server";
import { loadPlayer, savePlayer, loadAllCatalogs, createNewPlayer } from "@/lib/io";
import { plantCrop, harvestCrop, startCraft, getPlotStatus, conductDemocraticElection } from "@/lib/simulation";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id") || "vandan_11";

    const body = await req.json();
    const action = body.action;

    if (action === "register_citizen") {
      const citizenName = String(body.citizen_name || "").trim();
      const emailOrPhone = String(body.email_or_phone || "").trim() || userId;
      const address = String(body.address || "").trim();
      const lat = Number(body.lat) || 20.6728;
      const lng = Number(body.lng) || 73.0805;
      const members = Array.isArray(body.members) ? body.members.map((m: any) => String(m).trim()).filter(Boolean) : [];

      if (!emailOrPhone) {
        return NextResponse.json({ ok: false, message: "Email or Phone is required." }, { status: 400 });
      }

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
      const cropId = body.crop_id || "apple";
      let n = 0;
      for (const plot of player.plots) {
        const status = getPlotStatus(plot, catalogs.crops);
        if (status.state === "empty") {
          const msg = plantCrop(player, plot.index, cropId, catalogs.crops);
          if (msg.startsWith("Planted")) {
            n++;
          }
        }
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Planted ${n} plots with ${cropId}.` });
    }

    if (action === "harvest_all") {
      let n = 0;
      for (const plot of player.plots) {
        const status = getPlotStatus(plot, catalogs.crops);
        if (status.state === "ready") {
          const msg = harvestCrop(player, plot.index, catalogs.crops);
          if (msg.startsWith("Harvested")) {
            n++;
          }
        }
      }
      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Harvested ${n} plots.` });
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
        return NextResponse.json({ ok: false, message: `${shop.name} cannot afford this purchase.` }, { status: 400 });
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

      const msg = conductDemocraticElection(player);
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

      player.zone_locations[landmarkId] = [lat, lng];

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
        park: "Civic Leisure Park"
      };

      const label = landmarkNames[landmarkId] || landmarkId;
      player.agent_logs.push(`Government: Admin relocated ${label} to [${lat.toFixed(4)}, ${lng.toFixed(4)}].`);
      
      const { publishNews } = require("../../../lib/simulation");
      publishNews(player, `Cabinet Milestone: PMO relocated '${label}' to geolocated coordinates [${lat.toFixed(4)}, ${lng.toFixed(4)}].`, "POLITICS");

      await savePlayer(player);
      return NextResponse.json({ ok: true, message: `Successfully relocated ${label} on satellite map.` });
    }

    return NextResponse.json({ ok: false, message: "Action not recognized." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, message: err.message }, { status: 500 });
  }
}

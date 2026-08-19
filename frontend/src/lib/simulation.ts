
import { KisanAgentManager } from "./kisan_agent";

export interface FarmPlot {
  index: number;
  crop_id: string | null;
  planted_at: string | null;
}

export interface PlacedBuilding {
  building_id: string;
  count: number;
  ready_at_game_seconds: number | null;
  x: number | null;
  y: number | null;
}

export interface BuildJob {
  building_id: string;
  ready_at_game_seconds: number;
}

export interface CraftJob {
  recipe_id: string;
  finishes_at: string;
}

export interface FamilyMember {
  name: string;
  role: string;
  relation: string;
  state: string;
  vehicle?: string;
  destination?: string;
}

export interface PlayerState {
  user_id: string;
  password_hash?: string;
  money: number;
  inventory: Record<string, number>;
  clock: {
    total_seconds: number;
    speed: number;
    weather: string;
    formatted?: string;
  };
  plots: FarmPlot[];
  buildings: PlacedBuilding[];
  craft_job: CraftJob | null;
  plot_count: number;
  owned_land: number[][];
  terrain_data: number[] | null;
  camera_x: number;
  camera_y: number;
  build_queue: BuildJob[];
  agent_settings: any;
  agent_logs: string[];
  item_prices: Record<string, number>;
  last_price_update_day: number;
  // City & Household simulation fields
  city_name: string;
  city_treasury: number;
  tax_rate: number;
  city_projects: { id: string; name: string; cost: number; allocated: number; completed: boolean }[];
  household: {
    name: string;
    budget: number;
    inventory: Record<string, number>;
    members: FamilyMember[];
  };
  shops: {
    id: string;
    name: string;
    owner: string;
    inventory: Record<string, number>;
    prices: Record<string, number>;
    revenue: number;
    sales_history: string[];
  }[];
  families: {
    id: string;
    name: string;
    address?: string;
    type?: "house" | "hostel";
    capacity?: number;
    budget: number;
    inventory: Record<string, number>;
    members: FamilyMember[];
  }[];
  government: {
    mayor: string;
    income_tax: number;
    sales_tax: number;
    welfare_threshold: number;
    welfare_payout: number;
    welfare_checks_payouts: number;
  };
  cabinet: {
    prime_minister: string;
    district_magistrate: string;
    ministers: Record<string, string>;
  };
  news_feed: {
    timestamp: string;
    headline: string;
    category: string;
  }[];
  livestock?: {
    cows: number;
    sheep: number;
    chickens: number;
    last_produce_day?: number;
  };
  automated_farming_enabled?: boolean;
  farm_barn?: Record<string, number>;
  city_manager_enabled: boolean;
  zone_locations: Record<string, [number, number]>;
  industry?: {
    oil_refinery: {
      crude_oil: number;
      refined_petrol: number;
      diesel: number;
      marine_fuel: number;
      is_active: boolean;
      efficiency: number;
      daily_crude_input: number;
      daily_fuel_output: number;
    };
    petrol_pump: {
      fuel_stock: number;
      diesel_stock: number;
      price_per_liter: number;
      daily_sales_liters: number;
      revenue: number;
      ev_charging_active: boolean;
      recent_refuelings?: {
        citizen: string;
        vehicle: string;
        liters: number;
        cost: number;
        fuel_type: string;
        time: string;
      }[];
    };
    shipyard: {
      ships_docked: number;
      ships_under_construction: number;
      fleet: {
        id: string;
        name: string;
        type: "cargo_ship" | "passenger_ferry" | "fishing_trawler";
        fuel: number;
        status: string;
        destination?: string;
        cargo?: Record<string, number>;
      }[];
    };
    heavy_manufacturing: {
      iron_ore_stock: number;
      steel_beams: number;
      concrete_stock: number;
      active_smelters: number;
    };
  };
}

export const SECONDS_PER_GAME_HOUR = 60; // 1 hour = 60 seconds (1 minute)
export const SECONDS_PER_GAME_DAY = 24 * 60; // 24 hours = 1440 seconds (24 minutes = 1 day)

// Helper to get formatted 24-hr Indian Standard Time clock
export function formatClock(totalSeconds: number): string {
  const day = Math.floor(totalSeconds / SECONDS_PER_GAME_DAY) + 1;
  const timeOfDay = totalSeconds % SECONDS_PER_GAME_DAY;
  const hour = Math.floor(timeOfDay / SECONDS_PER_GAME_HOUR) % 24;
  const minute = Math.floor(timeOfDay) % 60;
  
  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");
  return `Day ${day} • ${hh}:${mm} hrs (IST)`;
}

// Format Indian Calendar Date (DD/MM/YYYY)
export function formatIndianDate(totalSeconds: number): string {
  const dayOffset = Math.floor(totalSeconds / SECONDS_PER_GAME_DAY);
  const baseDate = new Date(2026, 0, 1); // Starts 01/01/2026
  baseDate.setDate(baseDate.getDate() + dayOffset);
  const dd = baseDate.getDate().toString().padStart(2, "0");
  const mm = (baseDate.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = baseDate.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function getDay(totalSeconds: number): number {
  return Math.floor(totalSeconds / SECONDS_PER_GAME_DAY) + 1;
}

export function getHour(totalSeconds: number): number {
  return Math.floor((totalSeconds % SECONDS_PER_GAME_DAY) / SECONDS_PER_GAME_HOUR) % 24;
}

export function getMinute(totalSeconds: number): number {
  return Math.floor(totalSeconds % SECONDS_PER_GAME_HOUR);
}

// Generate dynamic prices
export function fluctuatePrices(player: PlayerState, itemsCatalog: any) {
  const prices: Record<string, number> = {};
  for (const [itemId, meta] of Object.entries<any>(itemsCatalog)) {
    const baseVal = Number(meta.value || 1);
    const factor = 0.75 + Math.random() * 0.5; // 75% to 125%
    const newVal = Math.max(1, Math.round(baseVal * factor));
    prices[itemId] = newVal;
  }
  player.item_prices = prices;
}

// Check plot state
// Normalize crop ID helper
export function normalizeCropKey(raw: string): string {
  let k = String(raw || "").trim().toLowerCase().replace(/^crop_/, "");
  if (k === "broccoli") return "brokeli";
  if (k === "cabbage") return "cabbige";
  if (k === "chili") return "chilly";
  if (k === "radish") return "reddies";
  return k;
}

// Check plot state
export function getPlotStatus(plot: FarmPlot, cropsCatalog: any, playerClockSeconds?: number) {
  if (!plot.crop_id || !plot.planted_at) {
    return { state: "empty", label: "Empty Plot", remaining: 0, progress: 0, crop: null };
  }
  const cleanKey = normalizeCropKey(plot.crop_id);
  const crop = cropsCatalog[cleanKey] || cropsCatalog[plot.crop_id];
  if (!crop) {
    return { state: "empty", label: "Unknown crop", remaining: 0, progress: 0, crop: null };
  }
  
  const growthSeconds = Number(crop.growth_seconds) || 20;
  const rawPlot = plot as any;
  const realElapsed = (Date.now() - new Date(plot.planted_at).getTime()) / 1000;
  const inGameElapsed = (rawPlot.planted_game_seconds !== undefined && playerClockSeconds !== undefined)
    ? Math.max(0, playerClockSeconds - rawPlot.planted_game_seconds)
    : 0;
  const elapsed = Math.max(realElapsed, inGameElapsed);

  const remaining = Math.max(0, growthSeconds - elapsed);
  const progress = Math.min(100, Math.max(0, Math.floor((elapsed / growthSeconds) * 100)));

  if (remaining <= 0 || elapsed >= growthSeconds) {
    return {
      state: "ready",
      label: `${crop.name} READY`,
      remaining: 0,
      progress: 100,
      crop
    };
  }
  
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  const countdown = m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  
  return {
    state: "growing",
    label: `${crop.name} (${countdown})`,
    remaining,
    progress,
    crop
  };
}

// Plant crop
export function plantCrop(player: PlayerState, plotIndex: number, cropId: string, cropsCatalog: any): string {
  const cleanKey = normalizeCropKey(cropId);
  const crop = cropsCatalog[cleanKey] || cropsCatalog[cropId];
  if (!crop) return "Unknown crop.";
  if (plotIndex < 0 || plotIndex >= player.plots.length) return "Invalid plot.";
  
  const plot = player.plots[plotIndex];
  if (plot.crop_id) return "Plot is already planted.";
  
  const seedId = String(crop.seed_id);
  const seedCount = player.inventory[seedId] || 0;
  if (seedCount < 1) return `Need 1 ${seedId}.`;
  
  player.inventory[seedId] = seedCount - 1;
  plot.crop_id = cleanKey;
  plot.planted_at = new Date().toISOString();
  (plot as any).planted_game_seconds = player.clock.total_seconds;
  
  const growthSeconds = Number(crop.growth_seconds) || 20;
  return `Planted ${crop.name} (ready in ${growthSeconds}s).`;
}

// Harvest plot
export function harvestCrop(player: PlayerState, plotIndex: number, cropsCatalog: any): string {
  if (plotIndex < 0 || plotIndex >= player.plots.length) return "Invalid plot.";
  const plot = player.plots[plotIndex];
  if (!plot.crop_id) return "Nothing to harvest.";
  
  const cleanKey = normalizeCropKey(plot.crop_id);
  const crop = cropsCatalog[cleanKey] || cropsCatalog[plot.crop_id];
  const status = getPlotStatus(plot, cropsCatalog, player.clock?.total_seconds);
  
  if (status.state !== "ready") {
    if (status.state === "growing") return `Still growing (${Math.ceil(status.remaining)}s left).`;
    return "Nothing to harvest.";
  }
  
  const yieldMin = Number(crop?.yield_min || 2);
  const yieldMax = Number(crop?.yield_max || 4);
  const amount = Math.floor(yieldMin + Math.random() * (yieldMax - yieldMin + 1));
  const yieldId = String(crop?.yield_id || crop?.yield_item || crop?.id || cleanKey || plot.crop_id);
  
  // Add to player inventory
  player.inventory[yieldId] = (player.inventory[yieldId] || 0) + amount;

  // Add to farm barn
  if (!player.farm_barn) player.farm_barn = {};
  player.farm_barn[yieldId] = (player.farm_barn[yieldId] || 0) + amount;

  // Stock portion in Farmers Market
  const farmersMarket = player.shops?.find(s => s.id === "farmers_market");
  if (farmersMarket) {
    farmersMarket.inventory[yieldId] = (farmersMarket.inventory[yieldId] || 0) + Math.ceil(amount * 0.5);
  }

  const cropName = crop?.name || yieldId;
  plot.crop_id = null;
  plot.planted_at = null;
  (plot as any).planted_game_seconds = null;
  
  return `Harvested ${amount}x ${cropName}.`;
}

// Can craft check
export function canCraft(player: PlayerState, recipeId: string, recipesCatalog: any): [boolean, string] {
  const recipe = recipesCatalog[recipeId];
  if (!recipe) return [false, "Unknown recipe."];
  if (player.craft_job !== null) return [false, "Already crafting something."];
  
  const reqs = recipe.requirements || {};
  const missing: string[] = [];
  for (const [itemId, qty] of Object.entries(reqs)) {
    const owned = player.inventory[itemId] || 0;
    if (owned < Number(qty)) {
      missing.push(`${itemId}x${Number(qty) - owned}`);
    }
  }
  
  if (missing.length > 0) {
    return [false, "Missing: " + missing.join(", ")];
  }
  return [true, "OK"];
}

// Start craft job
export function startCraft(player: PlayerState, recipeId: string, recipesCatalog: any): string {
  const [ok, reason] = canCraft(player, recipeId, recipesCatalog);
  if (!ok) return reason;
  
  const recipe = recipesCatalog[recipeId];
  const reqs = recipe.requirements || {};
  for (const [itemId, qty] of Object.entries(reqs)) {
    player.inventory[itemId] = (player.inventory[itemId] || 0) - Number(qty);
  }
  
  const duration = Number(recipe.craft_seconds || 5);
  const finishes = new Date(Date.now() + duration * 1000).toISOString();
  player.craft_job = { recipe_id: recipeId, finishes_at: finishes };
  
  return `Crafting ${recipe.name}... (${duration}s)`;
}

// Can build check
export function canBuild(player: PlayerState, buildingId: string, buildingsCatalog: any): [boolean, string] {
  const defn = buildingsCatalog[buildingId];
  if (!defn) return [false, "Unknown building."];
  
  if (defn.unique) {
    const isCompleted = player.buildings.some(b => b.building_id === buildingId && b.ready_at_game_seconds === null);
    const inQueue = player.build_queue.some(bj => bj.building_id === buildingId);
    if (isCompleted || inQueue) {
      return [false, `${defn.name} already built or in queue.`];
    }
  }
  
  const reqs = defn.requirements || {};
  const missing: string[] = [];
  for (const [itemId, qty] of Object.entries(reqs)) {
    const owned = player.inventory[itemId] || 0;
    if (owned < Number(qty)) {
      missing.push(`${itemId}x${Number(qty) - owned}`);
    }
  }
  
  if (missing.length > 0) {
    return [false, "Need: " + missing.join(", ")];
  }
  return [true, "OK"];
}

// Start building project
export function startBuild(player: PlayerState, buildingId: string, buildingsCatalog: any): string {
  const [ok, reason] = canBuild(player, buildingId, buildingsCatalog);
  if (!ok) return reason;
  
  const defn = buildingsCatalog[buildingId];
  const reqs = defn.requirements || {};
  for (const [itemId, qty] of Object.entries(reqs)) {
    player.inventory[itemId] = (player.inventory[itemId] || 0) - Number(qty);
  }
  
  const duration = Number(defn.build_time_game_seconds || 30);
  const readyAt = player.clock.total_seconds + duration;
  player.build_queue.push({ building_id: buildingId, ready_at_game_seconds: readyAt });
  
  return `Crafting ${defn.name}... (ready in ${duration}s)`;
}

// Tick building completion
export function tickBuilding(player: PlayerState, buildingsCatalog: any): string[] {
  const messages: string[] = [];
  const now = player.clock.total_seconds;
  const completed: BuildJob[] = [];
  
  for (const bj of player.build_queue) {
    if (now >= bj.ready_at_game_seconds) {
      completed.push(bj);
      const name = buildingsCatalog[bj.building_id]?.name || bj.building_id;
      messages.push(`${name} ready — added to inventory!`);
    }
  }
  
  for (const bj of completed) {
    player.build_queue = player.build_queue.filter(q => q !== bj);
    // Add completed building to inventory stack (x = null, y = null)
    let found = false;
    for (const b of player.buildings) {
      if (b.building_id === bj.building_id && b.x === null && b.ready_at_game_seconds === null) {
        b.count += 1;
        found = true;
        break;
      }
    }
    if (!found) {
      player.buildings.push({
        building_id: bj.building_id,
        count: 1,
        ready_at_game_seconds: null,
        x: null,
        y: null
      });
    }
  }
  
  // Apply farm expansion if farms are completed
  const completedFarms = player.buildings.reduce((sum, b) => {
    return b.building_id === "farm" && b.ready_at_game_seconds === null ? sum + b.count : sum;
  }, 0);
  const targetPlots = 9 + completedFarms * 3;
  if (targetPlots > player.plot_count) {
    player.plot_count = targetPlots;
    while (player.plots.length < player.plot_count) {
      player.plots.push({ index: player.plots.length, crop_id: null, planted_at: null });
    }
  }

  return messages;
}

// Tick crafting completion
export function tickCrafting(player: PlayerState, recipesCatalog: any): string | null {
  const job = player.craft_job;
  if (!job) return null;
  
  if (Date.now() < new Date(job.finishes_at).getTime()) {
    return null;
  }
  
  player.craft_job = null;
  const recipe = recipesCatalog[job.recipe_id];
  if (!recipe) return "Craft finished (unknown recipe).";
  
  const outputId = String(recipe.output_id);
  const count = Number(recipe.output_count || 1);
  player.inventory[outputId] = (player.inventory[outputId] || 0) + count;
  
  return `Crafted ${count}x ${recipe.name}.`;
}

// Run Agents logic
export function runAgentsTick(player: PlayerState, dt: number, catalogs: any): string[] {
  const logs: string[] = [];
  const settings = player.agent_settings;
  if (!settings) return logs;

  // 1. Autonomous Kisan AI Agriculture Agent (LangChain + 5-Unit Enforcer)
  if (player.automated_farming_enabled !== false && player.plots && player.plots.length > 0) {
    const report = KisanAgentManager.tickUserFarmingAgentSync(player, catalogs, 5);
    if (report.actionsTaken.length > 0) {
      logs.push(`🌾 Kisan AI Agent: ${report.actionsTaken.join("; ")}.`);
    }
  }

  // 2. Manufacturing Agent
  const manCfg = settings.manufacturing || {};
  if (manCfg.enabled) {
    const preferredRecipes = manCfg.preferred_recipes || {};
    const autoBuildFarms = manCfg.auto_build_farms !== false;

    if (player.craft_job === null) {
      for (const [recipeId, targetQty] of Object.entries(preferredRecipes)) {
        const recipe = catalogs.recipes[recipeId];
        if (!recipe) continue;
        
        const currentQty = player.inventory[recipe.output_id] || 0;
        if (currentQty < Number(targetQty)) {
          const [ok] = canCraft(player, recipeId, catalogs.recipes);
          if (ok) {
            const msg = startCraft(player, recipeId, catalogs.recipes);
            logs.push(`Manufacturing Agent: ${msg}`);
            break; // Only start one job
          }
        }
      }
    }

    if (autoBuildFarms) {
      const completedFarms = player.buildings.reduce((sum, b) => b.building_id === "farm" && b.ready_at_game_seconds === null ? sum + b.count : sum, 0);
      const inQueue = player.build_queue.filter(bj => bj.building_id === "farm").length;
      if (completedFarms + inQueue < 10) {
        const [ok] = canBuild(player, "farm", catalogs.buildings);
        if (ok) {
          const msg = startBuild(player, "farm", catalogs.buildings);
          logs.push(`Manufacturing Agent: ${msg}`);
        }
      }
    }
  }

  // 3. Trade Agent
  const tradeCfg = settings.trade || {};
  if (tradeCfg.enabled) {
    const minCash = tradeCfg.min_cash_reserve || 100;
    const keepStock = tradeCfg.keep_stock || {};
    const buyThreshold = tradeCfg.buy_seeds_threshold || 3;
    const buyQty = tradeCfg.buy_seeds_qty || 5;

    // Sell excess
    for (const [itemId, count] of Object.entries(player.inventory)) {
      if (count <= 0) continue;
      const meta = catalogs.items[itemId];
      if (!meta || meta.max_stack <= 1) continue; // Skip tools/trophy

      const targetKeep = keepStock[itemId] !== undefined ? keepStock[itemId] : 10;
      if (count > targetKeep) {
        const sellQty = count - targetKeep;
        const price = player.item_prices[itemId] || Number(meta.value || 1);
        const value = price * sellQty;
        
        player.inventory[itemId] = count - sellQty;
        player.money += value;
        logs.push(`Trade Agent: Sold ${sellQty}x ${meta.name} for $${value} at $${price}/unit.`);
      }
    }

    // Buy low stock seeds
    const seedIds = [
      "apple_seed", "wheat_seed", "banana_seed", "cherry_seed", "grape_seed",
      "orange_seed", "strawberry_seed", "watermelon_seed", "avacado_seed",
      "peach_seed", "blue_berry_seed", "carrot_seed", "pumpkin_seed",
      "mushroom_seed", "corn_seed", "cucumber_seed", "brokeli_seed",
      "cabbige_seed", "chilly_seed", "reddies_seed"
    ];
    for (const seedId of seedIds) {
      if (!catalogs.items[seedId]) continue;
      const current = player.inventory[seedId] || 0;
      if (current < buyThreshold) {
        const meta = catalogs.items[seedId];
        const price = player.item_prices[seedId] || Number(meta.value || 5);
        const cost = price * buyQty;
        if (player.money - cost >= minCash) {
          player.money -= cost;
          player.inventory[seedId] = current + buyQty;
          logs.push(`Trade Agent: Low seed stock. Bought ${buyQty}x ${meta.name} for $${cost} at $${price}/unit.`);
        }
      }
    }
  }

  // 4. Autonomous Industrial Revolution & Energy Supply Chain Agent
  const indCfg = settings.industrial || { enabled: true, auto_refine: true, auto_replenish_pump: true, auto_dispatch_ships: true, auto_smelt_steel: true };
  if (indCfg.enabled !== false && player.industry) {
    const ind = player.industry;
    
    // a. Autonomous Crude Extraction & Distillation Cracking
    if (indCfg.auto_refine !== false && ind.oil_refinery.is_active && ind.oil_refinery.crude_oil >= 10) {
      const bbl = Math.min(15, ind.oil_refinery.crude_oil);
      ind.oil_refinery.crude_oil -= bbl;
      const petrolYield = Math.floor(bbl * 0.7);
      const dieselYield = Math.floor(bbl * 0.5);
      const bunkerYield = Math.floor(bbl * 0.3);
      ind.oil_refinery.refined_petrol += petrolYield;
      ind.oil_refinery.diesel += dieselYield;
      ind.oil_refinery.marine_fuel += bunkerYield;
      logs.push(`🛢️ Industrial Agent: Auto-distilled ${bbl} crude barrels into +${petrolYield}L Petrol, +${dieselYield}L Diesel, +${bunkerYield}L Marine Bunker.`);
    }

    // b. Autonomous Maritime Fleet Refueling & Trade Voyage Dispatch
    if (indCfg.auto_dispatch_ships !== false && ind.shipyard?.fleet) {
      for (const ship of ind.shipyard.fleet) {
        if (ship.fuel < 30 && ind.oil_refinery.marine_fuel >= 15) {
          ind.oil_refinery.marine_fuel -= 15;
          ship.fuel = 100;
          logs.push(`⚓ Industrial Agent: Refueled '${ship.name}' at shipyard berth.`);
        }
        if (ship.fuel >= 60 && (ship.status === "Docked at Port" || ship.status === "Berth Ready")) {
          ship.fuel -= 20;
          ship.status = "At High Seas (Trade Voyage)";
          const earned = ship.type === "cargo_ship" ? 85 : ship.type === "passenger_ferry" ? 55 : 40;
          player.money += earned;
          logs.push(`🚢 Industrial Agent: Dispatched '${ship.name}' on maritime trade route (earned +$${earned}).`);
        }
      }
    }

    // c. Autonomous Steel Smelting
    if (indCfg.auto_smelt_steel !== false && ind.heavy_manufacturing?.iron_ore_stock >= 10) {
      ind.heavy_manufacturing.iron_ore_stock -= 10;
      ind.heavy_manufacturing.steel_beams += 4;
      logs.push(`🏭 Industrial Agent: Smelted 10x Iron Ore into +4x Structural Steel Beams.`);
    }
  }

  // 5. Autonomous Highway 48 Petrol Pump & Citizen Vehicle Fueling Agent
  if (player.industry?.petrol_pump) {
    const pump = player.industry.petrol_pump;
    const ref = player.industry.oil_refinery;
    const families = player.families || [];
    const currentTimeStr = player.clock?.formatted || "12:00 PM";

    if (!pump.recent_refuelings) {
      pump.recent_refuelings = [];
    }

    // 5a. Auto-Replenish Pump Tanks via Tanker Deliveries from Oil Refinery
    if (pump.fuel_stock < 300 && ref.refined_petrol >= 20) {
      const tankerTransfer = Math.min(60, ref.refined_petrol);
      ref.refined_petrol -= tankerTransfer;
      pump.fuel_stock += tankerTransfer;
      logs.push(`⛽ Petrol Pump Agent: Dispatched ${tankerTransfer}L petrol tanker delivery from Gulf Refinery to Highway 48.`);
    }
    if (pump.diesel_stock < 250 && ref.diesel >= 20) {
      const tankerTransfer = Math.min(50, ref.diesel);
      ref.diesel -= tankerTransfer;
      pump.diesel_stock += tankerTransfer;
      logs.push(`⛽ Petrol Pump Agent: Dispatched ${tankerTransfer}L diesel tanker delivery from Gulf Refinery to Highway 48.`);
    }

    // 5b. Active Citizen Vehicles Travel Fuel Consumption & Automated Gas Station Refueling
    for (const fam of families) {
      for (const member of fam.members || []) {
        const veh = member.vehicle || "walking";
        if (veh === "walking" || veh === "bicycle") continue; // Green zero-emission travel

        // Rate of fuel burn per travel activity
        const isDieselVehicle = veh === "tractor" || veh === "truck";
        const fuelType = isDieselVehicle ? "Diesel" : "Petrol";
        const burnLiters = veh === "car" ? 0.3 : veh === "scooter" ? 0.15 : veh === "tractor" ? 0.5 : 0.6;
        const fuelCost = Math.ceil(burnLiters * pump.price_per_liter);

        // Check if pump has fuel and family can pay
        if (isDieselVehicle ? pump.diesel_stock >= burnLiters : pump.fuel_stock >= burnLiters) {
          if (fam.budget >= fuelCost) {
            fam.budget -= fuelCost;
            pump.revenue += fuelCost;
            pump.daily_sales_liters += burnLiters;
            
            if (isDieselVehicle) {
              pump.diesel_stock -= burnLiters;
            } else {
              pump.fuel_stock -= burnLiters;
            }

            // 10% Municipal Fuel Tax
            const fuelTax = Math.max(1, Math.floor(fuelCost * 0.1));
            player.city_treasury += fuelTax;

            // Log recent refueling event (keep last 8)
            pump.recent_refuelings.unshift({
              citizen: member.name,
              vehicle: veh,
              liters: Number(burnLiters.toFixed(2)),
              cost: fuelCost,
              fuel_type: fuelType,
              time: currentTimeStr
            });
            if (pump.recent_refuelings.length > 10) {
              pump.recent_refuelings = pump.recent_refuelings.slice(0, 10);
            }
          }
        }
      }
    }
  }

  return logs;
}

export function generateDailySummary(logsThisDay: string[]): string {
  let harvested = 0;
  let planted = 0;
  let crafted = 0;
  let sold = 0;
  let bought = 0;
  let built = 0;
  let earnings = 0;
  let spending = 0;

  for (const log of logsThisDay) {
    if (log.includes("Harvested")) {
      harvested++;
    } else if (log.includes("Planted")) {
      planted++;
    } else if (log.includes("Crafted") || log.includes("Started crafting")) {
      crafted++;
    } else if (log.includes("Sold")) {
      sold++;
      const parts = log.split("$");
      if (parts.length > 1) {
        const val = parseInt(parts[1].split(" ")[0]);
        if (!isNaN(val)) earnings += val;
      }
    } else if (log.includes("Bought") || log.includes("Low seed stock")) {
      bought++;
      const parts = log.split("$");
      if (parts.length > 1) {
        const val = parseInt(parts[1].split(" ")[0]);
        if (!isNaN(val)) spending += val;
      }
    } else if (log.includes("Started building") || log.includes("ready — added")) {
      built++;
    }
  }

  const summaryParts: string[] = [];
  if (harvested > 0) summaryParts.push(`harvested ${harvested} plots`);
  if (planted > 0) summaryParts.push(`planted ${planted} crops`);
  if (crafted > 0) summaryParts.push(`crafted ${crafted} items`);
  if (built > 0) summaryParts.push(`built ${built} structures`);
  if (sold > 0) summaryParts.push(`sold ${sold} batches (+$${earnings})`);
  if (bought > 0) summaryParts.push(`bought ${bought} batches (-$${spending})`);

  if (summaryParts.length === 0) {
    return "Colony operations stable. Assets maintained.";
  }
  return summaryParts.join(", ") + ".";
}

export function saveDailySummaryTS(userId: string, day: number, summaryText: string): void {
  // Only execute on server side (Node.js)
  if (typeof window !== "undefined") return;

  try {
    const fs = require("fs");
    const path = require("path");
    const WORKSPACE_DIR = path.resolve(process.cwd(), "..");
    const filePath = path.join(WORKSPACE_DIR, "saves", "players", `${userId.replace(/[^a-zA-Z0-9_-]/g, "")}_daily_summaries.json`);

    let summaries: string[] = [];
    if (fs.existsSync(filePath)) {
      try {
        summaries = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      } catch {}
    }

    summaries.push(`Day ${day}: ${summaryText}`);
    
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(summaries, null, 2), "utf-8");
  } catch (err) {
    console.error("[simulation TS ERROR] Failed to save daily summary:", err);
  }
}

// Publishes real-time headlines to the micro-nation news feed
export function publishNews(player: PlayerState, headline: string, category: "POLITICS" | "ECONOMY" | "LOCAL" | "WEATHER"): void {
  if (!player.news_feed) {
    player.news_feed = [];
  }
  player.news_feed.unshift({
    timestamp: player.clock?.formatted || "12:00 PM",
    headline,
    category
  });
  if (player.news_feed.length > 50) {
    player.news_feed = player.news_feed.slice(0, 50);
  }
}

// Ticks city funding, taxation, and household routines
export function tickHouseholdAndProjects(player: PlayerState, dt: number, catalogs: any): string[] {
  const logs: string[] = [];
  if (!player.families || !player.government || !player.cabinet) return logs;

  const rawPlayer = player as any;
  const totalSeconds = player.clock.total_seconds;
  const currentDay = getDay(totalSeconds);
  const currentHour = getHour(totalSeconds);

  // 1. Daily Government Tax Audit & Welfare Audits (triggers at 00:00 midnight)
  if (!rawPlayer.last_tax_collected_day) {
    rawPlayer.last_tax_collected_day = 0;
  }
  if (rawPlayer.last_tax_collected_day !== currentDay) {
    if (rawPlayer.last_tax_collected_day > 0) {
      // Collect player corporate colony tax
      const taxRate = player.tax_rate || 10;
      const playerTax = Math.floor(player.money * (taxRate / 100));
      if (playerTax > 0) {
        player.money -= playerTax;
        player.city_treasury += playerTax;
        logs.push(`Government: Collected $${playerTax} in corporate taxes from Player Brokerage.`);
        publishNews(player, `Finance Ministry: Collected $${playerTax} in corporate taxes from Player Brokerage.`, "ECONOMY");
      }

      // Collect income tax from all families, and issue welfare checks if they are poor
      const families = player.families || [];
      const incomeTaxRate = player.government.income_tax || 10;
      const welfareThreshold = player.government.welfare_threshold || 15;
      const welfarePayout = player.government.welfare_payout || 15;

      for (const family of families) {
        // Collect Income Tax
        const incomeTax = Math.floor(family.budget * (incomeTaxRate / 100));
        if (incomeTax > 0) {
          family.budget -= incomeTax;
          player.city_treasury += incomeTax;
          logs.push(`Government: Collected $${incomeTax} in income tax from ${family.name}.`);
          publishNews(player, `Finance Ministry: Collected $${incomeTax} in income tax from ${family.name}.`, "ECONOMY");
        }

        // Welfare Check Program
        if (family.budget < welfareThreshold) {
          if (player.city_treasury >= welfarePayout) {
            player.city_treasury -= welfarePayout;
            family.budget += welfarePayout;
            player.government.welfare_checks_payouts = (player.government.welfare_checks_payouts || 0) + welfarePayout;
            logs.push(`Government: Approved $${welfarePayout} welfare subsidy check for ${family.name} due to low budget.`);
            publishNews(player, `Welfare Program: Cabinet Finance Minister ${player.cabinet.ministers.finance} approved $${welfarePayout} subsidy check for ${family.name}.`, "ECONOMY");
          } else {
            logs.push(`Government Warning: Insufficient treasury funds to pay welfare check to ${family.name}!`);
            publishNews(player, `Treasury Alert: Insufficient funds to pay welfare check to ${family.name}!`, "ECONOMY");
          }
        }
      }

      // Trigger daily weather forecast
      const weatherForecasts = [
        "Heavy monsoons expected over the region. Farmlands report high mud saturation.",
        "Sunny skies and mild wind current across the region.",
        "Heatwave warning: Power grids at maximum load. Citizens stay hydrated.",
        "Monsoonal breeze sweeps through the town plaza."
      ];
      const forecast = weatherForecasts[Math.floor(Math.random() * weatherForecasts.length)];
      publishNews(player, `Weather Alert: ${forecast}`, "WEATHER");
    }
    rawPlayer.last_tax_collected_day = currentDay;
  }

  // 2. Daily Shop Restocking (triggers at 06:00 morning)
  if (currentHour === 6) {
    if (!rawPlayer.last_restock_day) rawPlayer.last_restock_day = 0;
    if (rawPlayer.last_restock_day !== currentDay) {
      const shops = player.shops || [];
      for (const shop of shops) {
        let restockedSomething = false;
        
        let itemsToRestock: string[] = [];
        if (shop.id === "dairy") itemsToRestock = ["milk", "wheat", "apple", "bread", "tomato_ketch"];
        else if (shop.id === "farmers_market") itemsToRestock = ["carrot", "brokeli", "cabbige", "cucumber", "chilly", "corn", "apple", "banana", "wheat"];
        else if (shop.id === "general") itemsToRestock = ["wood", "stone", "rope"];
        else if (shop.id === "clothing") itemsToRestock = ["fiber", "wool"];
        else if (shop.id === "electronics") itemsToRestock = ["copper", "iron", "steel"];

        for (const itemId of itemsToRestock) {
          const currentStock = shop.inventory[itemId] || 0;
          if (currentStock < 5) {
            const restockTarget = 15;
            const buyQty = restockTarget - currentStock;
            const price = player.item_prices[itemId] || (catalogs.items[itemId]?.value || 5);
            const totalCost = price * buyQty;

            if (shop.revenue >= totalCost) {
              const ownedByPlayer = player.inventory[itemId] || 0;
              const actualBuy = Math.min(buyQty, ownedByPlayer);
              
              if (actualBuy > 0) {
                const actualCost = price * actualBuy;
                shop.revenue -= actualCost;
                player.money += actualCost; // Player earns gold from sales
                player.inventory[itemId] = ownedByPlayer - actualBuy;
                shop.inventory[itemId] = currentStock + actualBuy;
                restockedSomething = true;

                shop.sales_history.push(`Day ${currentDay} 06:00 - Restocked ${actualBuy}x ${itemId} from Player for $${actualCost}`);
              }
            }
          }
        }
        if (restockedSomething) {
          logs.push(`System: Shop '${shop.name}' restocked inventory shelves from Player reserves.`);
          publishNews(player, `Market Report: '${shop.name}' owner ${shop.owner} replenished shelves from Player Brokerage.`, "LOCAL");
        }
      }
      rawPlayer.last_restock_day = currentDay;
    }

    // 2b. Daily Livestock Production & Automated AI Farming Agent (ticked daily at 06:00 AM)
    if (!player.livestock) {
      player.livestock = { cows: 4, sheep: 6, chickens: 10, last_produce_day: 0 };
    }
    if (!player.farm_barn) {
      player.farm_barn = { milk: 20, wool: 15, egg: 30, wheat: 50, carrot: 30, apple: 25 };
    }
    if (player.automated_farming_enabled === undefined) {
      player.automated_farming_enabled = true;
    }

    if (player.livestock.last_produce_day !== currentDay) {
      // 1. Livestock produce
      const cows = player.livestock.cows ?? 4;
      const sheep = player.livestock.sheep ?? 6;
      const chickens = player.livestock.chickens ?? 10;

      const milkProduced = cows * 2;
      const woolProduced = sheep * 1;
      const eggProduced = chickens * 2;

      player.farm_barn["milk"] = (player.farm_barn["milk"] || 0) + milkProduced;
      player.farm_barn["wool"] = (player.farm_barn["wool"] || 0) + woolProduced;
      player.farm_barn["egg"] = (player.farm_barn["egg"] || 0) + eggProduced;

      // Deliver to shops / market
      const dairyShop = player.shops.find(s => s.id === "dairy");
      if (dairyShop) {
        dairyShop.inventory["milk"] = (dairyShop.inventory["milk"] || 0) + Math.floor(milkProduced * 0.7);
        dairyShop.inventory["egg"] = (dairyShop.inventory["egg"] || 0) + Math.floor(eggProduced * 0.5);
      }
      const clothingShop = player.shops.find(s => s.id === "clothing");
      if (clothingShop) {
        clothingShop.inventory["wool"] = (clothingShop.inventory["wool"] || 0) + woolProduced;
      }
      const farmersMarket = player.shops.find(s => s.id === "farmers_market");
      if (farmersMarket) {
        farmersMarket.inventory["milk"] = (farmersMarket.inventory["milk"] || 0) + Math.ceil(milkProduced * 0.3);
        farmersMarket.inventory["egg"] = (farmersMarket.inventory["egg"] || 0) + Math.ceil(eggProduced * 0.5);
      }

      player.livestock.last_produce_day = currentDay;
      logs.push(`Agriculture: Livestock Barn gathered +${milkProduced}x Milk 🥛, +${woolProduced}x Wool 🧶, +${eggProduced}x Eggs 🥚.`);
      publishNews(player, `Farm Report: Kisan Livestock barn gathered ${milkProduced}x Milk, ${woolProduced}x Wool, ${eggProduced}x Eggs for town markets.`, "ECONOMY");
    }
  }

  // 3. Autonomous Cabinet PMO City Manager Agent (ticked daily at 12:00 PM)
  if (player.city_manager_enabled) {
    if (!rawPlayer.last_cabinet_meeting_day) {
      rawPlayer.last_cabinet_meeting_day = 0;
    }
    if (currentHour === 12 && rawPlayer.last_cabinet_meeting_day !== currentDay) {
      // 3a. Auto Allocate treasury funds to incomplete projects
      const incomplete = player.city_projects.filter(p => !p.completed);
      if (incomplete.length > 0 && player.city_treasury >= 100) {
        const nextProject = incomplete[0];
        nextProject.allocated += 50;
        player.city_treasury -= 50;
        
        logs.push(`Government: Cabinet PMO approved $50 funding allocation for '${nextProject.name}'.`);
        publishNews(player, `Cabinet Decision: PM ${player.cabinet.prime_minister} approved $50 treasury allocation to '${nextProject.name}'.`, "POLITICS");

        if (nextProject.allocated >= nextProject.cost) {
          nextProject.completed = true;
          logs.push(`Government: Public infrastructure project '${nextProject.name}' is complete!`);
          publishNews(player, `Milestone: Infrastructure Minister ${player.cabinet.ministers.infrastructure} announced completion of '${nextProject.name}'!`, "POLITICS");
        }
      }

      // 3b. Auto Adjust tax policies
      if (player.city_treasury < 50 && player.government.income_tax < 20) {
        player.government.income_tax = Math.min(20, player.government.income_tax + 2);
        logs.push(`Government: DM ${player.cabinet.district_magistrate} raised Income Tax to ${player.government.income_tax}% to balance budget deficit.`);
        publishNews(player, `Policy Update: DM ${player.cabinet.district_magistrate} increased Income Tax to ${player.government.income_tax}% due to treasury levels.`, "ECONOMY");
      } else if (player.city_treasury > 500 && player.government.income_tax > 5) {
        player.government.income_tax = Math.max(5, player.government.income_tax - 2);
        logs.push(`Government: PM ${player.cabinet.prime_minister} reduced Income Tax to ${player.government.income_tax}% to relieve citizen budgets.`);
        publishNews(player, `Policy Update: PM ${player.cabinet.prime_minister} slashed Income Tax to ${player.government.income_tax}% to support consumer budgets.`, "ECONOMY");
      }

      rawPlayer.last_cabinet_meeting_day = currentDay;
    }
  }

  // 4. Hourly Routine Transitions
  if (rawPlayer.last_routine_hour === undefined) {
    rawPlayer.last_routine_hour = -1;
  }

  if (rawPlayer.last_routine_hour !== currentHour) {
    const families = player.families || [];
    const hasSchool = player.city_projects.find(p => p.id === "school")?.completed;
    const hasHospital = player.city_projects.find(p => p.id === "hospital")?.completed;

    for (const family of families) {
      const members = family.members || [];
      
      // Sleeping hours (22:00 - 07:00)
      if (currentHour >= 22 || currentHour < 8) {
        for (const m of members) m.state = "Sleeping in Bed";
      }
      // Breakfast hour (08:00)
      else if (currentHour === 8) {
        for (const m of members) m.state = "Eating Breakfast";
        
        // Consume daily requirement (milk, wheat, apple)
        const inv = family.inventory || {};
        const reqs = { milk: 1, wheat: 1, apple: 1 };
        let hungry = false;
        for (const [item, qty] of Object.entries(reqs)) {
          if ((inv[item] || 0) >= qty) {
            inv[item] -= qty;
          } else {
            hungry = true;
          }
        }
        if (hungry) {
          logs.push(`Household Warning: Low food stocks. ${family.name} went hungry today!`);
          publishNews(player, `Local Warning: Food shortages reported at ${family.name}. Residents plead for deliveries.`, "LOCAL");
        }
      }
      // Working hours (09:00 - 17:00)
      else if (currentHour >= 9 && currentHour < 17) {
        for (const m of members) {
          const role = (m.role || "").toLowerCase();
          if (role === "farmer") {
            m.state = "Working at Farms";
          } else if (role === "worker") {
            m.state = "Working at Factory";
          } else if (role === "merchant") {
            m.state = "Working at Commercial Stores";
          } else if (role === "tailor") {
            m.state = "Working at Savita's Clothiers";
          } else if (role === "engineer") {
            m.state = "Working at Electronic Hub";
          } else if (role === "doctor") {
            m.state = hasHospital ? "Working at General Hospital" : "Community Medical Care";
          } else if (role === "teacher") {
            m.state = hasSchool ? "Teaching at Community School" : "Tutoring Citizens";
          } else if (role === "student" || role === "daughter" && m.name === "hetvi" || role === "daughter" && m.name === "vainavi") {
            m.state = hasSchool ? "Schooling at Community School" : "Home Playing / Studying";
          } else if (role === "driver") {
            m.state = "Transporting Cargo & Materials";
          } else if (role === "police") {
            m.state = "Patrolling Civilization Roads";
          } else if (role === "mother") {
            m.state = "Home Chores & Meal Prep";
          } else if (role === "father") {
            m.state = "Household Management & Operations";
          } else if (family.id === "house_1") {
            if (m.name === "Thakorbhai") m.state = "Working at Farms";
            else if (m.name === "vasantiben") m.state = "Home Chores / Baking";
            else if (m.name === "vandan") m.state = "Working at Factory";
            else if (m.name === "hetvi") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "Kiran") m.state = "Working at Savita's Clothiers";
          } else if (family.id === "house_2") {
            if (m.name === "bharatbhai") m.state = "Working at General Store";
            else if (m.name === "mayuriben") m.state = "Home Chores / Gardening";
            else if (m.name === "vainavi") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "prathav") m.state = "Working at Factory";
            else if (m.name === "Dinesh") m.state = "Working at Farms";
            else if (m.name === "Geeta") m.state = "Working at Amina's Dairy Store";
          } else if (family.id === "house_3") {
            if (m.name === "rameshbhai") m.state = "Working at Electronic Hub";
            else if (m.name === "hemuben") m.state = "Home Chores / Cleaning";
            else if (m.name === "krushil" || m.name === "harshil") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "Sanjay") m.state = "Working at Factory";
          } else {
            m.state = "Active Working in Civilization";
          }
        }
      }
      // Work Day Ends & Salary Payment & Shopping (17:00)
      else if (currentHour === 17) {
        // Pay Salary to family / hostel budgets
        let dailyWages = 0;
        for (const m of members) {
          const r = (m.role || "").toLowerCase();
          if (["farmer", "worker", "merchant", "tailor", "engineer", "doctor", "teacher", "driver", "police"].includes(r)) {
            dailyWages += 12;
          }
        }
        if (family.id === "house_1") dailyWages = Math.max(dailyWages, 35);
        else if (family.id === "house_2") dailyWages = Math.max(dailyWages, 45);
        else if (family.id === "house_3") dailyWages = Math.max(dailyWages, 25);
        else if (dailyWages === 0 && members.length > 0) dailyWages = members.length * 10;

        family.budget = (family.budget || 0) + dailyWages;

        // Set leisure and shopping states
        for (const m of members) {
          if (m.role === "mother" || m.role === "merchant" || (family.type === "hostel" && m === members[0])) {
            m.state = "Shopping at Farmers Market & Dairy";
          } else if (m.role === "father" || m.role === "son" || m.role === "worker" || m.role === "farmer") {
            m.state = hasHospital ? "Leisure at Plaza" : "Leisure at Home";
          } else {
            m.state = "Leisure at Residence";
          }
        }

        // Realistic Household Grocery Shopping from Farmers Market & Dairy Stores
        const farmersMarket = player.shops?.find(s => s.id === "farmers_market");
        const dairyShop = player.shops?.find(s => s.id === "dairy");
        const generalShop = player.shops?.find(s => s.id === "general");
        const inv = family.inventory || {};
        const memberCount = Math.max(1, members.length);
        const targetFoodPerItem = Math.max(2, Math.ceil(memberCount * 1.5));

        const groceryStores = [
          { shop: farmersMarket, items: ["carrot", "cucumber", "broccoli", "cabbage", "corn", "apple", "strawberry", "egg", "milk"] },
          { shop: dairyShop, items: ["milk", "egg", "wheat"] },
          { shop: generalShop, items: ["wheat", "apple"] }
        ];

        const salesTaxRate = player.government.sales_tax || 5;
        let totalSpent = 0;
        let itemsBoughtSummary: string[] = [];

        for (const { shop, items } of groceryStores) {
          if (!shop) continue;

          for (const itemId of items) {
            const currentQty = inv[itemId] || 0;
            if (currentQty < targetFoodPerItem) {
              const needed = targetFoodPerItem - currentQty;
              const price = shop.prices[itemId] || (catalogs.items[itemId]?.value || 3);
              const availableInShop = shop.inventory[itemId] || 0;
              const buyQty = Math.min(needed, availableInShop);

              if (buyQty > 0) {
                const itemCost = price * buyQty;
                const salesTax = Math.floor(itemCost * (salesTaxRate / 100));
                const totalCost = itemCost + salesTax;

                if (family.budget >= totalCost) {
                  family.budget -= totalCost;
                  shop.revenue = (shop.revenue || 0) + itemCost;
                  player.city_treasury += salesTax;

                  shop.inventory[itemId] = availableInShop - buyQty;
                  inv[itemId] = (inv[itemId] || 0) + buyQty;
                  totalSpent += totalCost;
                  itemsBoughtSummary.push(`${buyQty}x ${itemId}`);

                  const shopperName = members.find(m => m.role === "mother" || m.role === "father")?.name || members[0]?.name || "Family Head";
                  shop.sales_history.push(`Day ${currentDay} 17:00 - Sold ${buyQty}x ${itemId} to ${shopperName} for $${itemCost}`);
                }
              }
            }
          }
        }

        if (totalSpent > 0) {
          logs.push(`Household Commerce: ${family.name} bought fresh groceries (${itemsBoughtSummary.slice(0, 3).join(", ")}) spending $${totalSpent}.`);
        }
      }
      // Dinner Time & Family Meal Consumption (19:00 - 20:00)
      else if (currentHour === 19) {
        const inv = family.inventory || {};
        const memberCount = Math.max(1, members.length);
        const vegList = ["carrot", "cucumber", "broccoli", "cabbage", "corn", "wheat", "egg", "apple", "milk"];
        let foodEatenCount = 0;

        for (const v of vegList) {
          if (foodEatenCount >= memberCount) break;
          const qty = inv[v] || 0;
          if (qty > 0) {
            const eat = Math.min(qty, memberCount - foodEatenCount);
            inv[v] -= eat;
            foodEatenCount += eat;
          }
        }

        for (const m of members) {
          if (foodEatenCount >= Math.ceil(memberCount * 0.7)) {
            m.state = "Eating Fresh Dinner 🍲";
          } else {
            m.state = "Consuming Minimal Rations ⚠️";
          }
        }

        if (foodEatenCount < Math.ceil(memberCount * 0.5)) {
          logs.push(`Household Warning: ${family.name} had low food supplies for dinner (${foodEatenCount}/${memberCount} fed).`);
        }
      }
      // Evening / leisure (20:00 - 22:00)
      else if (currentHour >= 20 && currentHour < 22) {
        for (const m of members) m.state = "Family Dinner & Evening Leisure";
      }
    }

    rawPlayer.last_routine_hour = currentHour;
  }

  return logs;
}

// Conduct democratic election across all citizens
export function conductDemocraticElection(player: PlayerState): string {
  const candidates = ["Thakorbhai", "Bharatbhai", "Rameshbhai", "Vasantiben", "Mayuriben", "Hemuben"];
  
  // Dynamic democratic voting simulation
  const shuffled = [...candidates].sort(() => 0.5 - Math.random());
  const newPM = shuffled[0];
  const newDM = shuffled[1];
  const newFin = shuffled[2];
  const newEdu = shuffled[3];
  const newInfra = shuffled[4];

  player.cabinet = {
    prime_minister: newPM,
    district_magistrate: newDM,
    ministers: {
      finance: newFin,
      education: newEdu,
      infrastructure: newInfra
    }
  };

  const totalDays = Math.floor(player.clock.total_seconds / SECONDS_PER_GAME_DAY) + 1;
  const currentYear = Math.floor((totalDays - 1) / 365) + 1;

  const headline = `🏛️ DEMOCRACY (Year ${currentYear}): Citizens elected ${newPM} as Prime Minister & ${newDM} as District Magistrate!`;
  publishNews(player, headline, "POLITICS");
  
  player.agent_logs.push(`Democracy: Year ${currentYear} civic elections certified. PM: ${newPM}, DM: ${newDM}, Finance: ${newFin}, Education: ${newEdu}, Infra: ${newInfra}.`);
  return headline;
}

// Master tick catch-up simulation
export function runSimulationTick(player: PlayerState, dt: number, catalogs: any): string[] {
  const logs: string[] = [];
  if (!player) return logs;

  const rawPlayer = player as any;
  if (!rawPlayer.logs_this_day) {
    rawPlayer.logs_this_day = [];
  }

  // 1. Tick game clock
  player.clock.total_seconds += dt * player.clock.speed;

  // 2. Check day change for price fluctuation and daily summary log
  const currentDay = getDay(player.clock.total_seconds);
  if (player.last_price_update_day !== currentDay) {
    // Generate daily summary for day that just ended
    if (player.last_price_update_day > 0) {
      const summaryText = generateDailySummary(rawPlayer.logs_this_day);
      saveDailySummaryTS(player.user_id, player.last_price_update_day, summaryText);
      logs.push(`System: Day ${player.last_price_update_day} operations summary logged.`);
      rawPlayer.logs_this_day = [];
    }

    fluctuatePrices(player, catalogs.items);
    player.last_price_update_day = currentDay;
    logs.push(`System: Dynamic market prices fluctuated for Day ${currentDay}!`);

    // Automatic Democratic Election every 10 in-game years (or every 10 in-game days cycle)
    const currentYear = Math.floor((currentDay - 1) / 10) + 1;
    if (!rawPlayer.last_election_cycle) {
      rawPlayer.last_election_cycle = currentYear;
    } else if (rawPlayer.last_election_cycle !== currentYear) {
      rawPlayer.last_election_cycle = currentYear;
      const electionMsg = conductDemocraticElection(player);
      logs.push(electionMsg);
    }
  }

  // 3. Tick crafting queue
  const craftMsg = tickCrafting(player, catalogs.recipes);
  if (craftMsg) logs.push(craftMsg);

  // 4. Tick building construction
  const buildMsgs = tickBuilding(player, catalogs.buildings);
  logs.push(...buildMsgs);

  // 5. Tick agents (ran every game tick)
  const agentLogs = runAgentsTick(player, dt, catalogs);
  logs.push(...agentLogs);

  // 6. Tick city projects funding and household routines
  const routineLogs = tickHouseholdAndProjects(player, dt, catalogs);
  logs.push(...routineLogs);

  // 7. Tick Industrial Production, Oil Refining, Petrol Pump & Maritime Shipyards
  const industryLogs = tickIndustriesAndPetroleum(player, dt, catalogs);
  logs.push(...industryLogs);

  if (agentLogs.length > 0) {
    rawPlayer.logs_this_day.push(...agentLogs);
  }

  // Log consolidation
  if (logs.length > 0) {
    player.agent_logs = [...player.agent_logs, ...logs];
    if (player.agent_logs.length > 100) {
      player.agent_logs = player.agent_logs.slice(-100);
    }
  }

  return logs;
}

// Tick Industrial Production, Oil Refining, Petrol Pump & Maritime Shipyards
export function tickIndustriesAndPetroleum(player: PlayerState, dt: number, catalogs: any): string[] {
  const logs: string[] = [];
  if (!player.industry) {
    player.industry = {
      oil_refinery: {
        crude_oil: 120,
        refined_petrol: 85,
        diesel: 60,
        marine_fuel: 40,
        is_active: true,
        efficiency: 95,
        daily_crude_input: 40,
        daily_fuel_output: 35
      },
      petrol_pump: {
        fuel_stock: 450,
        diesel_stock: 350,
        price_per_liter: 15,
        daily_sales_liters: 120,
        revenue: 1800,
        ev_charging_active: true
      },
      shipyard: {
        ships_docked: 3,
        ships_under_construction: 1,
        fleet: [
          { id: "ship_1", name: "INS Navsari Express", type: "cargo_ship", fuel: 80, status: "Active Maritime Freight", cargo: { wheat: 20, steel_beam: 10 } },
          { id: "ship_2", name: "Surat Gulf Ferry", type: "passenger_ferry", fuel: 65, status: "Passenger Transit to Gulf" },
          { id: "ship_3", name: "Arabian Sea Trawler 09", type: "fishing_trawler", fuel: 90, status: "Commercial Deep Sea Harvest" }
        ]
      },
      heavy_manufacturing: {
        iron_ore_stock: 75,
        steel_beams: 45,
        concrete_stock: 90,
        active_smelters: 2
      }
    };
  }

  const ind = player.industry;
  const currentHour = getHour(player.clock.total_seconds);
  const rawPlayer = player as any;

  if (rawPlayer.last_industry_hour === undefined) rawPlayer.last_industry_hour = -1;

  if (rawPlayer.last_industry_hour !== currentHour) {
    rawPlayer.last_industry_hour = currentHour;

    // 1. Oil Extraction & Refining (Runs when active)
    if (ind.oil_refinery.is_active) {
      // Extract crude oil
      ind.oil_refinery.crude_oil += 5;
      
      // Refine crude into petrol, diesel, and marine fuel
      if (ind.oil_refinery.crude_oil >= 4) {
        ind.oil_refinery.crude_oil -= 4;
        ind.oil_refinery.refined_petrol += 3;
        ind.oil_refinery.diesel += 2;
        ind.oil_refinery.marine_fuel += 1;

        // Auto distribute fuel to Petrol Pump
        if (ind.petrol_pump.fuel_stock < 600) {
          ind.petrol_pump.fuel_stock += 3;
          ind.petrol_pump.diesel_stock += 2;
        }
      }
    }

    // 2. Petrol Pump Vehicle Dispensing & Revenue Generation
    const totalVehicles = (player.families || []).reduce((acc, f) => acc + (f.members || []).filter(m => m.vehicle && m.vehicle !== "walking").length, 0);
    const fuelDispensed = Math.min(ind.petrol_pump.fuel_stock, Math.ceil(totalVehicles * 0.8));
    if (fuelDispensed > 0) {
      ind.petrol_pump.fuel_stock -= fuelDispensed;
      const pumpEarn = fuelDispensed * ind.petrol_pump.price_per_liter;
      ind.petrol_pump.revenue += pumpEarn;
      ind.petrol_pump.daily_sales_liters += fuelDispensed;
      player.city_treasury += Math.floor(pumpEarn * 0.1); // 10% fuel tax to city treasury
    }

    // 3. Shipyard Maritime Fleet Operations
    for (const ship of ind.shipyard.fleet) {
      if (ship.fuel > 10) {
        ship.fuel -= 2;
        if (ship.type === "fishing_trawler" && Math.random() > 0.6) {
          const catchFish = Math.floor(Math.random() * 4) + 2;
          player.farm_barn = player.farm_barn || {};
          player.farm_barn["fish"] = (player.farm_barn["fish"] || 0) + catchFish;
        }
      } else if (ind.oil_refinery.marine_fuel >= 15) {
        // Refuel ship
        ind.oil_refinery.marine_fuel -= 15;
        ship.fuel = 100;
        logs.push(`Shipyard: Refueled '${ship.name}' with 15L marine bunker fuel.`);
      }
    }

    // 4. Heavy Foundry Smelting
    if (ind.heavy_manufacturing.iron_ore_stock >= 3) {
      ind.heavy_manufacturing.iron_ore_stock -= 3;
      ind.heavy_manufacturing.steel_beams += 1;
    }
  }

  return logs;
}


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

export interface PlayerState {
  user_id: string;
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
    members: { name: string; role: string; state: string }[];
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
    budget: number;
    inventory: Record<string, number>;
    members: { name: string; role: string; relation: string; state: string }[];
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
  city_manager_enabled: boolean;
  zone_locations: Record<string, [number, number]>;
}

const SECONDS_PER_GAME_DAY = 24 * 60;
const SECONDS_PER_GAME_HOUR = 60;

// Helper to get formatted date string
export function formatClock(totalSeconds: number): string {
  const day = Math.floor(totalSeconds / SECONDS_PER_GAME_DAY) + 1;
  const timeOfDay = totalSeconds % SECONDS_PER_GAME_DAY;
  const hour = Math.floor(timeOfDay / SECONDS_PER_GAME_HOUR) % 24;
  const minute = Math.floor(timeOfDay) % 60;
  
  const hh = hour.toString().padStart(2, "0");
  const mm = minute.toString().padStart(2, "0");
  return `Day ${day}  ${hh}:${mm}`;
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
export function getPlotStatus(plot: FarmPlot, cropsCatalog: any) {
  if (!plot.crop_id || !plot.planted_at) {
    return { state: "empty", label: "Empty", remaining: 0, crop: null };
  }
  const crop = cropsCatalog[plot.crop_id];
  if (!crop) {
    return { state: "empty", label: "Unknown crop", remaining: 0, crop: null };
  }
  
  const planted = new Date(plot.planted_at).getTime();
  const elapsed = (Date.now() - planted) / 1000;
  const needed = Number(crop.growth_seconds);
  const remaining = Math.max(0, needed - elapsed);

  if (remaining <= 0) {
    return {
      state: "ready",
      label: `${crop.name} READY`,
      remaining: 0,
      crop
    };
  }
  
  const m = Math.floor(remaining / 60);
  const s = Math.floor(remaining % 60);
  const countdown = m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
  
  return {
    state: "growing",
    label: `${crop.name} ${countdown}`,
    remaining,
    crop
  };
}

// Plant crop
export function plantCrop(player: PlayerState, plotIndex: number, cropId: string, cropsCatalog: any): string {
  const crop = cropsCatalog[cropId];
  if (!crop) return "Unknown crop.";
  if (plotIndex < 0 || plotIndex >= player.plots.length) return "Invalid plot.";
  
  const plot = player.plots[plotIndex];
  if (plot.crop_id) return "Plot is already planted.";
  
  const seedId = String(crop.seed_id);
  const seedCount = player.inventory[seedId] || 0;
  if (seedCount < 1) return `Need 1 ${seedId}.`;
  
  player.inventory[seedId] = seedCount - 1;
  plot.crop_id = cropId;
  plot.planted_at = new Date().toISOString();
  
  const hours = Number(crop.growth_seconds) / 3600;
  return `Planted ${crop.name} (ready in ${hours.toFixed(1)}h).`;
}

// Harvest plot
export function harvestCrop(player: PlayerState, plotIndex: number, cropsCatalog: any): string {
  if (plotIndex < 0 || plotIndex >= player.plots.length) return "Invalid plot.";
  const plot = player.plots[plotIndex];
  const status = getPlotStatus(plot, cropsCatalog);
  
  if (status.state !== "ready") {
    if (status.state === "growing") return "Still growing.";
    return "Nothing to harvest.";
  }
  
  const crop = status.crop as any;
  const yieldMin = Number(crop.yield_min || 1);
  const yieldMax = Number(crop.yield_max || 3);
  const amount = Math.floor(yieldMin + Math.random() * (yieldMax - yieldMin + 1));
  const yieldId = String(crop.yield_id);
  
  player.inventory[yieldId] = (player.inventory[yieldId] || 0) + amount;
  plot.crop_id = null;
  plot.planted_at = null;
  
  return `Harvested ${amount}x ${yieldId}.`;
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

  // 1. Farming Agent
  const farmCfg = settings.farming || {};
  if (farmCfg.enabled) {
    const preferredCrops = farmCfg.preferred_crops || ["apple", "wheat"];
    const autoBuy = farmCfg.auto_buy_seeds !== false;

    // Harvest ready
    for (const plot of player.plots) {
      const status = getPlotStatus(plot, catalogs.crops);
      if (status.state === "ready") {
        const msg = harvestCrop(player, plot.index, catalogs.crops);
        logs.push(`Farming Agent: ${msg}`);
      }
    }

    // Plant empty
    for (const plot of player.plots) {
      const status = getPlotStatus(plot, catalogs.crops);
      if (status.state === "empty") {
        let planted = false;
        for (const cropId of preferredCrops) {
          const crop = catalogs.crops[cropId];
          if (!crop) continue;
          const seedId = crop.seed_id;
          if ((player.inventory[seedId] || 0) >= 1) {
            const msg = plantCrop(player, plot.index, cropId, catalogs.crops);
            logs.push(`Farming Agent: Planted ${crop.name} on plot ${plot.index + 1}.`);
            planted = true;
            break;
          }
        }

        if (!planted && autoBuy) {
          for (const cropId of preferredCrops) {
            const crop = catalogs.crops[cropId];
            if (!crop) continue;
            const seedId = crop.seed_id;
            const seedMeta = catalogs.items[seedId];
            if (!seedMeta) continue;
            
            const unitPrice = player.item_prices[seedId] || Number(seedMeta.value || 5);
            const buyQty = 5;
            const cost = unitPrice * buyQty;
            const minCash = settings.trade?.min_cash_reserve || 100;
            
            if (player.money - cost >= minCash) {
              player.money -= cost;
              player.inventory[seedId] = (player.inventory[seedId] || 0) + buyQty;
              logs.push(`Farming Agent: Bought ${buyQty}x ${seedMeta.name} for $${cost} to plant.`);
              
              // Plant immediately
              plantCrop(player, plot.index, cropId, catalogs.crops);
              logs.push(`Farming Agent: Planted ${crop.name} on plot ${plot.index + 1}.`);
              planted = true;
              break;
            }
          }
          
          if (!planted) {
            logs.push(`Farming Agent: Stalled on plot ${plot.index + 1} - No seeds or gold.`);
            break; // Stop further loop
          }
        }
      }
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
        "Heavy monsoons expected over Valsad region. Rumla Farms report high mud saturation.",
        "Sunny skies and mild wind current in Rumla town.",
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
          if (family.id === "house_1") {
            if (m.name === "Thakorbhai") m.state = "Working at Farms";
            else if (m.name === "vasantiben") m.state = "Home Chores / Baking";
            else if (m.name === "vandan") m.state = "Working at Factory";
            else if (m.name === "hetvi") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "Kiran") m.state = "Working at Savita's Clothiers";
          } 
          else if (family.id === "house_2") {
            if (m.name === "bharatbhai") m.state = "Working at General Store";
            else if (m.name === "mayuriben") m.state = "Home Chores / Gardening";
            else if (m.name === "vainavi") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "prathav") m.state = "Working at Factory";
            else if (m.name === "Dinesh") m.state = "Working at Farms";
            else if (m.name === "Geeta") m.state = "Working at Amina's Dairy Store";
          }
          else if (family.id === "house_3") {
            if (m.name === "rameshbhai") m.state = "Working at Electronic Hub";
            else if (m.name === "hemuben") m.state = "Home Chores / Cleaning";
            else if (m.name === "krushil") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "harshil") m.state = hasSchool ? "Schooling at Community School" : "Home Playing";
            else if (m.name === "Sanjay") m.state = "Working at Factory";
          }
        }
      }
      // Work Day Ends & Salary Payment & Shopping (17:00)
      else if (currentHour === 17) {
        // Pay Salary to family budgets
        if (family.id === "house_1") {
          family.budget = (family.budget || 0) + 35; // Thakorbhai ($15) + vandan ($10) + Kiran ($10)
        } else if (family.id === "house_2") {
          family.budget = (family.budget || 0) + 45; // bharatbhai ($15) + prathav ($10) + Dinesh ($10) + Geeta ($10)
        } else if (family.id === "house_3") {
          family.budget = (family.budget || 0) + 25; // rameshbhai ($15) + Sanjay ($10)
        }

        // Set leisure and shopping states
        for (const m of members) {
          if (m.role === "mother") {
            m.state = "Shopping at Marketplace";
          } else if (m.role === "father" || m.role === "son" || m.role === "worker") {
            m.state = hasHospital ? "Leisure at Plaza" : "Leisure at Home";
          } else {
            m.state = "Leisure at Home";
          }
        }

        // Mother shopping logic: buy from Amina's Dairy Store
        const dairyShop = player.shops?.find(s => s.id === "dairy");
        const inv = family.inventory || {};
        
        if (dairyShop) {
          const itemsToBuy = ["milk", "wheat", "apple"];
          const salesTaxRate = player.government.sales_tax || 5;
          let boughtSomething = false;
          
          for (const itemId of itemsToBuy) {
            const currentQty = inv[itemId] || 0;
            if (currentQty < 3) {
              const buyQty = 5 - currentQty;
              const price = dairyShop.prices[itemId] || 3;
              
              const itemCost = price * buyQty;
              const salesTax = Math.floor(itemCost * (salesTaxRate / 100));
              const totalCost = itemCost + salesTax;
              
              if (family.budget >= totalCost) {
                const ownedInShop = dairyShop.inventory[itemId] || 0;
                const actualBuy = Math.min(buyQty, ownedInShop);
                
                if (actualBuy > 0) {
                  const actualCost = price * actualBuy;
                  const actualTax = Math.floor(actualCost * (salesTaxRate / 100));
                  
                  family.budget -= (actualCost + actualTax);
                  dairyShop.revenue += actualCost;
                  player.city_treasury += actualTax; // Government collects sales tax!
                  
                  dairyShop.inventory[itemId] = ownedInShop - actualBuy;
                  inv[itemId] = (inv[itemId] || 0) + actualBuy;
                  boughtSomething = true;
                  
                  dairyShop.sales_history.push(`Day ${currentDay} 17:00 - Sold ${actualBuy}x ${itemId} to ${members.find(m => m.role === "mother")?.name} for $${actualCost}`);
                }
              }
            }
          }
          if (boughtSomething) {
            logs.push(`Household: Mother purchased daily food requirements for ${family.name} from Amina's Dairy Store.`);
            publishNews(player, `Local: Mother purchased daily food requirements for ${family.name} from Amina's Dairy Store.`, "LOCAL");
          }
        }

        // Thakorbhai utility torch shopping from Rajesh's Electronics Hub
        if (family.id === "house_1" && (family.budget || 0) > 80 && (inv.torch || 0) < 1) {
          const electShop = player.shops?.find(s => s.id === "electronics");
          if (electShop) {
            const torchStock = electShop.inventory["torch"] || 0;
            if (torchStock > 0) {
              const price = electShop.prices["torch"] || 10;
              const salesTaxRate = player.government.sales_tax || 5;
              const tax = Math.floor(price * (salesTaxRate / 100));
              const totalCost = price + tax;

              if (family.budget >= totalCost) {
                family.budget -= totalCost;
                electShop.revenue += price;
                player.city_treasury += tax;
                electShop.inventory["torch"] = torchStock - 1;
                inv["torch"] = (inv["torch"] || 0) + 1;
                
                electShop.sales_history.push(`Day ${currentDay} 17:00 - Sold 1x torch to Thakorbhai for $${price}`);
                logs.push("Household: Thakorbhai purchased a utility torch from Rajesh at the Electronics Hub.");
                publishNews(player, `Market Report: Thakorbhai purchased a utility torch from Rajesh's Electronics Hub.`, "LOCAL");
              }
            }
          }
        }
      }
      // Evening / leisure (18:00 - 21:00)
      else if (currentHour >= 18 && currentHour < 22) {
        for (const m of members) m.state = "Family Dinner & Leisure";
      }
    }

    rawPlayer.last_routine_hour = currentHour;
  }

  return logs;
}

// Conduct democratic election across Rumla citizens
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

  // 6. Tick city projects funding and Thakorbhai's household routine
  const routineLogs = tickHouseholdAndProjects(player, dt, catalogs);
  logs.push(...routineLogs);

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

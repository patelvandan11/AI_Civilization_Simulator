import { PlayerState, Catalogs } from "./types";
import { getPlotStatus, harvestCrop, plantCrop, normalizeCropKey } from "./simulation";

export interface CropStockDeficit {
  cropId: string;
  cropName: string;
  seedId: string;
  seedName: string;
  currentCropStock: number;
  currentSeedStock: number;
  cropDeficit: number;
  seedDeficit: number;
  seedPrice: number;
}

export interface KisanAgentReport {
  userId: string;
  timestamp: string;
  thought: string;
  actionsTaken: string[];
  harvestedCount: number;
  seedsPurchased: Record<string, number>;
  plotsPlanted: { plotIndex: number; cropId: string }[];
  deficits: CropStockDeficit[];
  allTargetsMet: boolean;
}

export const CROP_SEED_REGISTRY = [
  { cropId: "wheat", seedId: "wheat_seed", name: "Wheat Grain", price: 2 },
  { cropId: "carrot", seedId: "carrot_seed", name: "Carrots", price: 2 },
  { cropId: "corn", seedId: "corn_seed", name: "Sweet Corn", price: 2 },
  { cropId: "brokeli", seedId: "brokeli_seed", name: "Broccoli", price: 3 },
  { cropId: "cabbige", seedId: "cabbige_seed", name: "Cabbage", price: 2 },
  { cropId: "cucumber", seedId: "cucumber_seed", name: "Cucumber", price: 2 },
  { cropId: "chilly", seedId: "chilly_seed", name: "Red Chili", price: 2 },
  { cropId: "strawberry", seedId: "strawberry_seed", name: "Strawberry", price: 3 },
  { cropId: "apple", seedId: "apple_seed", name: "Apple Orchard", price: 4 },
  { cropId: "watermelon", seedId: "watermelon_seed", name: "Watermelon", price: 4 },
  { cropId: "banana", seedId: "banana_seed", name: "Banana Tree", price: 3 },
  { cropId: "pumpkin", seedId: "pumpkin_seed", name: "Pumpkin", price: 4 }
];

export class KisanLangchainAgent {
  public userId: string;
  public minTargetStock: number;
  public lastReport: KisanAgentReport | null = null;
  public executionHistory: string[] = [];

  constructor(userId: string, minTargetStock: number = 5) {
    this.userId = userId;
    this.minTargetStock = minTargetStock;
  }

  /**
   * Tool 1: Analyze Inventory & Barn stocks against min target (default: 5)
   */
  public checkStocksAndDeficits(player: PlayerState, catalogs: Catalogs): CropStockDeficit[] {
    const deficits: CropStockDeficit[] = [];
    const barn = player.farm_barn || {};
    const inv = player.inventory || {};

    for (const item of CROP_SEED_REGISTRY) {
      const cropDef = catalogs.crops?.[item.cropId];
      const yieldKey = cropDef?.yield_id || cropDef?.yield_item || item.cropId;
      
      const cropInBarn = Number(barn[yieldKey] || 0);
      const cropInInv = Number(inv[yieldKey] || 0);
      const totalCrop = Math.max(cropInBarn, cropInInv);

      const seedInInv = Number(inv[item.seedId] || 0);
      const seedDef = catalogs.items?.[item.seedId];
      const price = Number(seedDef?.value || item.price);

      deficits.push({
        cropId: item.cropId,
        cropName: item.name,
        seedId: item.seedId,
        seedName: `${item.name} Seeds`,
        currentCropStock: totalCrop,
        currentSeedStock: seedInInv,
        cropDeficit: Math.max(0, this.minTargetStock - totalCrop),
        seedDeficit: Math.max(0, this.minTargetStock - seedInInv),
        seedPrice: price
      });
    }

    return deficits;
  }

  /**
   * Tool 2: Harvest all mature plots and stock produce
   */
  public harvestMaturePlots(player: PlayerState, catalogs: Catalogs): { count: number; messages: string[] } {
    let count = 0;
    const messages: string[] = [];

    for (const plot of player.plots) {
      if (!plot.crop_id) continue;
      const status = getPlotStatus(plot, catalogs.crops, player.clock?.total_seconds);
      if (status.state === "ready") {
        const res = harvestCrop(player, plot.index, catalogs.crops);
        if (res.startsWith("Harvested")) {
          count++;
          messages.push(res);
        }
      }
    }

    return { count, messages };
  }

  /**
   * Tool 3: Procure required seeds from depot when below target
   */
  public procureSeedDepot(player: PlayerState, deficits: CropStockDeficit[]): Record<string, number> {
    const purchased: Record<string, number> = {};
    if (!player.inventory) player.inventory = {};

    // Sort by greatest seed deficit first
    const needed = deficits.filter(d => d.seedDeficit > 0).sort((a, b) => b.seedDeficit - a.seedDeficit);

    for (const d of needed) {
      const qtyToBuy = d.seedDeficit;
      const totalCost = qtyToBuy * d.seedPrice;

      if (player.money >= totalCost) {
        player.money -= totalCost;
        player.inventory[d.seedId] = (player.inventory[d.seedId] || 0) + qtyToBuy;
        purchased[d.seedId] = (purchased[d.seedId] || 0) + qtyToBuy;
      } else if (player.money >= d.seedPrice) {
        // Buy as many as affordable
        const affordable = Math.floor(player.money / d.seedPrice);
        if (affordable > 0) {
          player.money -= affordable * d.seedPrice;
          player.inventory[d.seedId] = (player.inventory[d.seedId] || 0) + affordable;
          purchased[d.seedId] = (purchased[d.seedId] || 0) + affordable;
        }
      }
    }

    return purchased;
  }

  /**
   * Tool 4: Plant empty plots prioritized by largest crop deficit
   */
  public priorityPlantPlots(player: PlayerState, catalogs: Catalogs, deficits: CropStockDeficit[]): { plotIndex: number; cropId: string }[] {
    const planted: { plotIndex: number; cropId: string }[] = [];
    
    // Sort by highest crop deficit (crops < 5 first)
    const priorityQueue = [...deficits].sort((a, b) => {
      if (b.cropDeficit !== a.cropDeficit) return b.cropDeficit - a.cropDeficit;
      return a.currentCropStock - b.currentCropStock;
    });

    let queueIdx = 0;

    for (const plot of player.plots) {
      if (plot.crop_id) continue; // Not empty

      // Find best crop to plant
      let chosen = priorityQueue[queueIdx % priorityQueue.length];
      let seedCount = player.inventory[chosen.seedId] || 0;

      // If out of seed, try auto-buying 1 or finding next available
      if (seedCount < 1 && player.money >= chosen.seedPrice) {
        player.money -= chosen.seedPrice;
        player.inventory[chosen.seedId] = 1;
        seedCount = 1;
      }

      if (seedCount >= 1) {
        const msg = plantCrop(player, plot.index, chosen.cropId, catalogs.crops);
        if (msg.startsWith("Planted")) {
          planted.push({ plotIndex: plot.index, cropId: chosen.cropId });
          queueIdx++;
        }
      } else {
        // Advance queue to find an available seed
        for (let tries = 0; tries < priorityQueue.length; tries++) {
          queueIdx++;
          const candidate = priorityQueue[queueIdx % priorityQueue.length];
          if ((player.inventory[candidate.seedId] || 0) >= 1) {
            const msg = plantCrop(player, plot.index, candidate.cropId, catalogs.crops);
            if (msg.startsWith("Planted")) {
              planted.push({ plotIndex: plot.index, cropId: candidate.cropId });
              break;
            }
          }
        }
      }
    }

    return planted;
  }

  /**
   * Tool 5: Restock Farmers Market with fresh crop surplus (capped to realistic shelf capacities)
   */
  public restockFarmersMarket(player: PlayerState) {
    const farmersMarket = player.shops?.find(s => s.id === "farmers_market");
    if (!farmersMarket) return;
    if (!farmersMarket.inventory) farmersMarket.inventory = {};

    const maxShelfCapacity = 40;
    const barn = player.farm_barn || {};

    // Normalize any existing bloated inventory items down to realistic store capacity
    for (const [item, count] of Object.entries(farmersMarket.inventory)) {
      if (Number(count) > maxShelfCapacity) {
        farmersMarket.inventory[item] = maxShelfCapacity;
      }
    }

    for (const [item, qty] of Object.entries(barn)) {
      if (typeof qty === "number" && qty > 5) {
        const currentInMarket = Number(farmersMarket.inventory[item] || 0);
        if (currentInMarket < maxShelfCapacity) {
          const spaceAvailable = maxShelfCapacity - currentInMarket;
          const surplus = Math.min(spaceAvailable, Math.max(1, Math.floor((qty - 5) * 0.2)));
          farmersMarket.inventory[item] = currentInMarket + surplus;
        }
      }
    }
  }

  /**
   * Tool 6: Maintain Personal Cash Buffer by trading surplus crops (guaranteeing ≥5 buffer stays intact)
   */
  public maintainPersonalCashBuffer(player: PlayerState, catalogs: Catalogs, minCashReserve: number = 200): { soldSummary: string[]; cashEarned: number } {
    const soldSummary: string[] = [];
    let cashEarned = 0;

    // Check if player cash is below safety reserve
    if (player.money >= minCashReserve) {
      return { soldSummary, cashEarned };
    }

    const inv = player.inventory || {};
    const barn = player.farm_barn || {};

    for (const item of CROP_SEED_REGISTRY) {
      const cropDef = catalogs.crops?.[item.cropId];
      const yieldKey = cropDef?.yield_id || cropDef?.yield_item || item.cropId;
      const cropPrice = Number(catalogs.items?.[yieldKey]?.value || 5);

      // Check surplus in personal inventory (only sell units exceeding the 5-unit minimum buffer)
      const currentQty = Number(inv[yieldKey] || 0);
      if (currentQty > this.minTargetStock) {
        const surplus = currentQty - this.minTargetStock;
        const sellCount = Math.min(surplus, Math.ceil((minCashReserve - player.money) / cropPrice));
        if (sellCount > 0) {
          const revenue = sellCount * cropPrice;
          inv[yieldKey] -= sellCount;
          player.money += revenue;
          cashEarned += revenue;
          soldSummary.push(`${sellCount}x ${item.name} (+$${revenue})`);
        }
      }

      // Check surplus in farm barn (only sell units exceeding 5-unit minimum buffer)
      if (player.money < minCashReserve) {
        const barnQty = Number(barn[yieldKey] || 0);
        if (barnQty > this.minTargetStock) {
          const barnSurplus = barnQty - this.minTargetStock;
          const sellCount = Math.min(barnSurplus, Math.ceil((minCashReserve - player.money) / cropPrice));
          if (sellCount > 0) {
            const revenue = sellCount * cropPrice;
            barn[yieldKey] -= sellCount;
            player.money += revenue;
            cashEarned += revenue;
            soldSummary.push(`${sellCount}x ${item.name} from Silo (+$${revenue})`);
          }
        }
      }

      if (player.money >= minCashReserve) break;
    }

    return { soldSummary, cashEarned };
  }

  /**
   * Query NVIDIA NIM LLM for high-level agricultural reasoning
   */
  private async queryNvidiaLLM(stateSummary: string): Promise<string> {
    const apiKey = process.env.NVIDIA_API_KEY || "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";

    try {
      const endpoint = "https://integrate.api.nvidia.com/v1/chat/completions";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "meta/llama-3.3-70b-instruct",
          messages: [
            {
              role: "system",
              content: `You are Kisan AI, an expert agricultural LangChain agent in an autonomous Civilization Simulator. Your mission is to guarantee every player has at least ${this.minTargetStock} seeds, ${this.minTargetStock} vegetables, and a healthy personal cash reserve ($200+) in stock. Provide a concise, 1-sentence operational decision rationale.`
            },
            {
              role: "user",
              content: stateSummary
            }
          ],
          temperature: 0.2,
          max_tokens: 120
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (res.ok) {
        const data = await res.json();
        const msg = data.choices?.[0]?.message?.content;
        if (msg) return `[NVIDIA AI (Llama-3.3-70B) / LangChain]: ${msg.trim()}`;
      }
    } catch {
      // Graceful fallback to heuristic reasoning
    }

    return `[NVIDIA NIM Autonomous Agent]: Inspected stock thresholds. Executed auto-procurement and plot rotation to maintain ≥${this.minTargetStock} supply buffers.`;
  }

  /**
   * Synchronous execution cycle for instant in-simulation ticks
   */
  public executeCycleSync(player: PlayerState, catalogs: Catalogs): KisanAgentReport {
    const actionsTaken: string[] = [];

    // 1. Check stocks against target minimum of 5
    const deficits = this.checkStocksAndDeficits(player, catalogs);
    const lowCrops = deficits.filter(d => d.cropDeficit > 0);
    const lowSeeds = deficits.filter(d => d.seedDeficit > 0);

    // 2. Harvest ready plots
    const harvestResult = this.harvestMaturePlots(player, catalogs);
    if (harvestResult.count > 0) {
      actionsTaken.push(`Harvested ${harvestResult.count} mature plot(s)`);
    }

    // 3. Maintain Personal Cash Buffer by selling surplus crops if funds < $200
    const cashResult = this.maintainPersonalCashBuffer(player, catalogs, 200);
    if (cashResult.cashEarned > 0) {
      actionsTaken.push(`Liquidated surplus crops for +$${cashResult.cashEarned} to maintain personal cash reserve ($${player.money} in wallet)`);
    }

    // 4. Procure seeds if below minimum target of 5
    const seedsPurchased = this.procureSeedDepot(player, deficits);
    const totalSeedsBought = Object.values(seedsPurchased).reduce((a, b) => a + b, 0);
    if (totalSeedsBought > 0) {
      const seedSummary = Object.entries(seedsPurchased).map(([id, q]) => `${q}x ${id.replace(/_/g, " ")}`).join(", ");
      actionsTaken.push(`Auto-procured ${seedSummary} to maintain ≥${this.minTargetStock} seed buffer`);
    }

    // 5. Plant empty plots with deficit priority
    const plotsPlanted = this.priorityPlantPlots(player, catalogs, deficits);
    if (plotsPlanted.length > 0) {
      const cropNames = plotsPlanted.map(p => p.cropId).join(", ");
      actionsTaken.push(`Planted ${plotsPlanted.length} empty plot(s) with priority crops: [${cropNames}]`);
    }

    // 6. Restock market
    this.restockFarmersMarket(player);

    const thought = `[LangChain Autonomous Kisan Agent]: Verified stock targets (≥${this.minTargetStock} per item, Cash: $${player.money}). Active Deficits: ${lowCrops.length} crops, ${lowSeeds.length} seeds. Action: ${actionsTaken.join("; ") || "All stock buffers & personal cash optimal"}.`;
    const allTargetsMet = lowCrops.length === 0 && lowSeeds.length === 0;

    const report: KisanAgentReport = {
      userId: this.userId,
      timestamp: new Date().toISOString(),
      thought,
      actionsTaken,
      harvestedCount: harvestResult.count,
      seedsPurchased,
      plotsPlanted,
      deficits,
      allTargetsMet
    };

    this.lastReport = report;
    if (actionsTaken.length > 0) {
      this.executionHistory.unshift(`${new Date().toLocaleTimeString()}: ${actionsTaken.join(" | ")}`);
      if (this.executionHistory.length > 20) this.executionHistory.pop();
    }

    return report;
  }

  /**
   * Main Autonomous Execution Cycle with NVIDIA NIM LLM Reasoning
   */
  public async executeCycle(player: PlayerState, catalogs: Catalogs): Promise<KisanAgentReport> {
    const report = this.executeCycleSync(player, catalogs);
    const lowCrops = report.deficits.filter(d => d.cropDeficit > 0);
    const lowSeeds = report.deficits.filter(d => d.seedDeficit > 0);

    const summary = `Player ${this.userId}: Money=$${player.money}, Low Crops: ${lowCrops.map(c => `${c.cropName}(${c.currentCropStock}/${this.minTargetStock})`).join(", ") || "None"}, Low Seeds: ${lowSeeds.map(s => `${s.seedName}(${s.currentSeedStock}/${this.minTargetStock})`).join(", ") || "None"}. Harvested: ${report.harvestedCount}, Planted: ${report.plotsPlanted.length}, Bought: ${Object.values(report.seedsPurchased).reduce((a, b) => a + b, 0)}.`;
    
    report.thought = await this.queryNvidiaLLM(summary);
    this.lastReport = report;
    return report;
  }
}

/**
 * Singleton Manager to provision and cache dedicated Kisan Agents per user
 */
export class KisanAgentManager {
  private static agents: Map<string, KisanLangchainAgent> = new Map();

  public static getAgentForUser(userId: string, minTargetStock: number = 5): KisanLangchainAgent {
    const cleanId = String(userId || "default_player").toLowerCase().trim();
    if (!this.agents.has(cleanId)) {
      this.agents.set(cleanId, new KisanLangchainAgent(cleanId, minTargetStock));
    }
    const agent = this.agents.get(cleanId)!;
    agent.minTargetStock = minTargetStock;
    return agent;
  }

  public static tickUserFarmingAgentSync(player: PlayerState, catalogs: Catalogs, minTarget: number = 5): KisanAgentReport {
    const agent = this.getAgentForUser(player.user_id, minTarget);
    const report = agent.executeCycleSync(player, catalogs);
    
    if (report.actionsTaken.length > 0) {
      player.agent_logs.push(`🌾 Kisan LangChain AI: ${report.actionsTaken.join("; ")}.`);
    }

    return report;
  }

  public static async tickUserFarmingAgent(player: PlayerState, catalogs: Catalogs, minTarget: number = 5): Promise<KisanAgentReport> {
    const agent = this.getAgentForUser(player.user_id, minTarget);
    const report = await agent.executeCycle(player, catalogs);
    
    if (report.actionsTaken.length > 0) {
      player.agent_logs.push(`🌾 Kisan LangChain AI (NVIDIA NIM): ${report.actionsTaken.join("; ")}. ${report.thought}`);
    }

    return report;
  }
}

import fs from "fs";
import path from "path";
import { PlayerState } from "./simulation";
import { getCollection } from "./db";

// Direct imports of static catalog data for 100% build compatibility
import itemsCatalog from "@/data/items.json";
import cropsCatalog from "@/data/crops.json";
import recipesCatalog from "@/data/recipes.json";
import buildingsCatalog from "@/data/buildings.json";

const SAVES_DIR = fs.existsSync(path.join(process.cwd(), "saves"))
  ? path.join(process.cwd(), "saves")
  : path.join(process.cwd(), "..", "saves");
const PLAYERS_DIR = path.join(SAVES_DIR, "players");

// Helper to ensure directories exist
const inMemoryCache: Record<string, PlayerState> = {};

function ensureDirs() {
  try {
    if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });
  } catch {}
}

// Load static catalog
export function loadCatalog(name: string): any {
  switch (name) {
    case "items": return itemsCatalog;
    case "crops": return cropsCatalog;
    case "recipes": return recipesCatalog;
    case "buildings": return buildingsCatalog;
    default: return {};
  }
}

// Load all catalogs
export function loadAllCatalogs(): any {
  return {
    items: itemsCatalog,
    crops: cropsCatalog,
    recipes: recipesCatalog,
    buildings: buildingsCatalog
  };
}

// Create starter inventory matching StarterInventory in python
function getStarterInventory(): Record<string, number> {
  return {
    wood: 10,
    stone: 5,
    fiber: 5,
    apple_seed: 5,
    wheat_seed: 5,
    wooden_axe: 1,
    stone_pick: 1
  };
}

export interface CitizenRegistrationOptions {
  name?: string;
  address?: string;
  lat?: number;
  lng?: number;
  members?: string[];
}

// Create new default player state
export function createNewPlayer(userId: string, citizenOptions?: CitizenRegistrationOptions): PlayerState {
  const safeName = userId.replace(/[^a-zA-Z0-9_-]/g, "") || "citizen";
  const plots = Array.from({ length: 9 }, (_, i) => ({
    index: i,
    crop_id: null,
    planted_at: null
  }));

  const ownedLand: number[][] = [];
  const cx = 20, cy = 20, size = 10;
  const half = Math.floor(size / 2);
  for (let y = cy - half; y < cy - half + size; y++) {
    for (let x = cx - half; x < cx - half + size; x++) {
      ownedLand.push([x, y]);
    }
  }

  const agentSettings = {
    farming: {
      enabled: false,
      preferred_crops: ["apple", "wheat", "banana", "carrot"],
      auto_buy_seeds: true
    },
    manufacturing: {
      enabled: false,
      preferred_recipes: {
        bread: 10,
        rope: 5,
        tomato_ketch: 5,
        burger: 5,
        pizza: 5
      },
      auto_build_farms: true
    },
    trade: {
      enabled: false,
      min_cash_reserve: 100,
      keep_stock: {
        wood: 20,
        stone: 20,
        fiber: 20,
        wheat: 10,
        apple: 10,
        banana: 10,
        carrot: 10,
        bread: 5,
        rope: 5,
        tomato_ketch: 5,
        burger: 2,
        pizza: 2
      },
      buy_seeds_threshold: 3,
      buy_seeds_qty: 5
    }
  };

  const customFamilyId = `house_${safeName}`;
  const customMembers = (citizenOptions?.members && citizenOptions.members.length > 0)
    ? citizenOptions.members.map((mName, i) => ({
        name: mName.trim() || `Citizen ${i + 1}`,
        role: i === 0 ? "head" : i === 1 ? "spouse" : "member",
        relation: i === 0 ? "Household Head" : `Family Member`,
        state: "Sleeping"
      }))
    : null;

  const defaultFamilies = [
    {
      id: "house_1",
      name: "Thakorbhai's Residence",
      budget: 50,
      inventory: { milk: 5, wheat: 5, apple: 5 },
      members: [
        { name: "Thakorbhai", role: "father", relation: "Main Person", state: "Sleeping" },
        { name: "vasantiben", role: "mother", relation: "Wife of Thakorbhai", state: "Sleeping" },
        { name: "vandan", role: "son", relation: "Son of Thakorbhai", state: "Sleeping" },
        { name: "hetvi", role: "daughter", relation: "Daughter of Thakorbhai", state: "Sleeping" },
        { name: "Kiran", role: "worker", relation: "Tailor Shop Assistant", state: "Sleeping" }
      ]
    },
    {
      id: "house_2",
      name: "Bharatbhai's Residence",
      budget: 40,
      inventory: { milk: 4, wheat: 4, apple: 4 },
      members: [
        { name: "bharatbhai", role: "father", relation: "Brother of Vasantiben", state: "Sleeping" },
        { name: "mayuriben", role: "mother", relation: "Wife of Bharatbhai", state: "Sleeping" },
        { name: "vainavi", role: "daughter", relation: "Daughter of Bharatbhai", state: "Sleeping" },
        { name: "prathav", role: "son", relation: "Son of Bharatbhai", state: "Sleeping" },
        { name: "Dinesh", role: "worker", relation: "Farmer Assistant", state: "Sleeping" },
        { name: "Geeta", role: "worker", relation: "Grocery Shop Assistant", state: "Sleeping" }
      ]
    },
    {
      id: "house_3",
      name: "Rameshbhai's Residence",
      budget: 35,
      inventory: { milk: 3, wheat: 3, apple: 3 },
      members: [
        { name: "rameshbhai", role: "father", relation: "Husband of Hemuben", state: "Sleeping" },
        { name: "hemuben", role: "mother", relation: "Sister of Vasantiben", state: "Sleeping" },
        { name: "krushil", role: "son", relation: "Son of Rameshbhai", state: "Sleeping" },
        { name: "harshil", role: "son", relation: "Son of Rameshbhai", state: "Sleeping" },
        { name: "Sanjay", role: "worker", relation: "Factory Operator", state: "Sleeping" }
      ]
    }
  ];

  if (customMembers && customFamilyId !== "house_1" && customFamilyId !== "house_2" && customFamilyId !== "house_3") {
    defaultFamilies.push({
      id: customFamilyId,
      name: `${citizenOptions?.name || userId}'s Residence`,
      budget: 60,
      inventory: { milk: 5, wheat: 5, apple: 5 },
      members: customMembers
    });
  }

  const initialLocations: Record<string, [number, number]> = {
    house_1: [20.6732, 73.0800],
    house_2: [20.6720, 73.0815],
    house_3: [20.6715, 73.0795],
    dairy: [20.6728, 73.0805],
    general: [20.6725, 73.0810],
    clothing: [20.6722, 73.0808],
    electronics: [20.6730, 73.0812],
    farms: [20.6705, 73.0780],
    factory: [20.6740, 73.0820],
    school: [20.6735, 73.0790],
    hospital: [20.6710, 73.0825],
    park: [20.6725, 73.0830]
  };

  if (citizenOptions?.lat && citizenOptions?.lng) {
    initialLocations[customFamilyId] = [citizenOptions.lat, citizenOptions.lng];
  } else if (customFamilyId !== "house_1" && customFamilyId !== "house_2" && customFamilyId !== "house_3") {
    initialLocations[customFamilyId] = [20.6728, 73.0805];
  }

  return {
    user_id: userId,
    money: 500,
    inventory: getStarterInventory(),
    clock: {
      total_seconds: 8 * 60, // 08:00 morning
      speed: 1,
      weather: "Clear"
    },
    plots,
    buildings: [],
    craft_job: null,
    plot_count: 9,
    owned_land: ownedLand,
    terrain_data: null,
    camera_x: 0.0,
    camera_y: 0.0,
    build_queue: [],
    agent_settings: agentSettings,
    agent_logs: [`System: Citizen account created for ${citizenOptions?.name || userId}.`],
    item_prices: {},
    last_price_update_day: 0,
    // City & Household fields
    city_name: "AI Civilization",
    city_treasury: 100.0,
    tax_rate: 10,
    city_projects: [
      { id: "school", name: "Community School", cost: 500, allocated: 0, completed: false },
      { id: "hospital", name: "General Hospital", cost: 1000, allocated: 0, completed: false },
      { id: "park", name: "Leisure Park", cost: 300, allocated: 0, completed: false },
      { id: "roads", name: "Paved Highways", cost: 400, allocated: 0, completed: false }
    ],
    household: {
      name: `${citizenOptions?.name || userId} Household`,
      budget: 50,
      inventory: { milk: 5, wheat: 5, apple: 5 },
      members: customMembers || []
    },
    families: defaultFamilies as any,
    government: {
      mayor: "Thakorbhai",
      income_tax: 10,
      sales_tax: 5,
      welfare_threshold: 15,
      welfare_payout: 15,
      welfare_checks_payouts: 0
    },
    cabinet: {
      prime_minister: "Thakorbhai",
      district_magistrate: "Bharatbhai",
      ministers: {
        finance: "Rameshbhai",
        education: "Vasantiben",
        infrastructure: "Mayuriben"
      }
    },
    news_feed: [
      {
        timestamp: "08:00 AM",
        headline: `New citizen registration certified for ${citizenOptions?.name || userId}.`,
        category: "LOCAL"
      },
      {
        timestamp: "08:30 AM",
        headline: "Prime Minister Thakorbhai announces the Cabinet Coalition formation.",
        category: "POLITICS"
      }
    ],
    city_manager_enabled: true,
    shops: [
      {
        id: "dairy",
        name: "City Dairy & Groceries",
        owner: "Amina",
        inventory: { milk: 10, wheat: 10, apple: 10, bread: 5, tomato_ketch: 5, pizza: 2, burger: 2 },
        prices: { milk: 2, wheat: 3, apple: 4, bread: 10, tomato_ketch: 10, pizza: 45, burger: 35 },
        revenue: 100,
        sales_history: []
      },
      {
        id: "general",
        name: "Ramesh's General Supplies",
        owner: "Ramesh",
        inventory: { wood: 20, stone: 20, rope: 10, wooden_axe: 1, stone_pick: 1 },
        prices: { wood: 2, stone: 3, rope: 10, wooden_axe: 25, stone_pick: 30 },
        revenue: 150,
        sales_history: []
      },
      {
        id: "clothing",
        name: "Savita's Clothiers",
        owner: "Savita",
        inventory: { fiber: 30, wool: 20, rubber: 10 },
        prices: { fiber: 1, wool: 4, rubber: 8 },
        revenue: 120,
        sales_history: []
      },
      {
        id: "electronics",
        name: "Rajesh's Electronic Hub",
        owner: "Rajesh",
        inventory: { torch: 5, copper: 10, iron: 10, steel: 5 },
        prices: { torch: 10, copper: 6, iron: 8, steel: 12 },
        revenue: 200,
        sales_history: []
      }
    ],
    zone_locations: initialLocations
  };
}

// Load player save (attempts MongoDB, falls back to disk)
export async function loadPlayer(userId: string): Promise<PlayerState> {
  const safeName = userId.replace(/[^a-zA-Z0-9_-]/g, "");

  try {
    const collection = await getCollection("players");
    if (collection) {
      const data = await collection.findOne({ user_id: userId });
      if (data) {
        const playerState = data as unknown as PlayerState;
        let modified = false;

        if (!playerState.agent_settings) {
          const d = createNewPlayer(userId);
          playerState.agent_settings = d.agent_settings;
          playerState.agent_logs = d.agent_logs;
          playerState.item_prices = d.item_prices;
          playerState.last_price_update_day = d.last_price_update_day;
          modified = true;
        }
        if (!playerState.city_name) {
          const d = createNewPlayer(userId);
          playerState.city_name = d.city_name;
          playerState.city_treasury = d.city_treasury;
          playerState.tax_rate = d.tax_rate;
          playerState.city_projects = d.city_projects;
          playerState.household = d.household;
          modified = true;
        }
        if (!playerState.shops) {
          const d = createNewPlayer(userId);
          playerState.shops = d.shops;
          modified = true;
        }
        if (!playerState.families) {
          const d = createNewPlayer(userId);
          playerState.families = d.families;
          playerState.government = d.government;
          modified = true;
        }
        if (!playerState.cabinet) {
          const d = createNewPlayer(userId);
          playerState.cabinet = d.cabinet;
          playerState.news_feed = d.news_feed;
          playerState.city_manager_enabled = d.city_manager_enabled;
          modified = true;
        }
        if (!playerState.zone_locations) {
          const d = createNewPlayer(userId);
          playerState.zone_locations = d.zone_locations;
          modified = true;
        }

        if (modified) {
          await savePlayer(playerState);
        }
        return playerState;
      } else {
        const fresh = createNewPlayer(userId);
        await savePlayer(fresh);
        return fresh;
      }
    }
  } catch (err) {
    console.warn("[MongoDB Connection Standby] Falling back to file system storage:", err);
  }

  if (inMemoryCache[userId]) {
    return inMemoryCache[userId];
  }

  ensureDirs();
  const filePath = path.join(PLAYERS_DIR, `${safeName}.json`);

  if (!fs.existsSync(filePath)) {
    const fresh = createNewPlayer(userId);
    await savePlayer(fresh);
    return fresh;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return data as PlayerState;
  } catch {
    const fresh = createNewPlayer(userId);
    inMemoryCache[userId] = fresh;
    return fresh;
  }
}

// Save player (attempts MongoDB, falls back to in-memory/disk)
export async function savePlayer(player: PlayerState): Promise<void> {
  const safeName = player.user_id.replace(/[^a-zA-Z0-9_-]/g, "");
  
  const extended = {
    ...player,
    last_saved_at: new Date().toISOString()
  };

  inMemoryCache[player.user_id] = extended as PlayerState;

  try {
    const collection = await getCollection("players");
    if (collection) {
      const { _id, ...cleanData } = extended as any;
      await collection.replaceOne({ user_id: player.user_id }, cleanData, { upsert: true });
      return;
    }
  } catch (err) {
    console.warn("[MongoDB Connection Standby] Failed to save in Mongo, falling back to storage:", err);
  }

  try {
    ensureDirs();
    const filePath = path.join(PLAYERS_DIR, `${safeName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(extended, null, 2), "utf-8");
  } catch {}
}

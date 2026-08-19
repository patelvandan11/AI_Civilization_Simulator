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
const WORLD_LOCATIONS_FILE = path.join(SAVES_DIR, "world_locations.json");

// Helper to ensure directories exist
export const inMemoryCache: Record<string, PlayerState> = {};
let inMemoryWorldLocations: Record<string, [number, number]> | null = null;

// Canonical default coordinates for all civilization landmarks & residences (Navsari / Civilization standard)
export const DEFAULT_WORLD_LOCATIONS: Record<string, [number, number]> = {
  house_1: [20.9472, 72.9515],
  house_2: [20.9460, 72.9530],
  house_3: [20.9455, 72.9510],
  house_maritime: [20.9380, 72.9300],
  hostel_refinery: [20.9620, 72.9680],
  house_merchant: [20.9490, 72.9540],
  hostel_central: [20.9485, 72.9525],
  farmers_market: [20.9458, 72.9518],
  dairy: [20.9468, 72.9520],
  general: [20.9465, 72.9525],
  clothing: [20.9462, 72.9523],
  electronics: [20.9470, 72.9527],
  farms: [20.9445, 72.9495],
  factory: [20.9480, 72.9535],
  school: [20.9475, 72.9505],
  hospital: [20.9450, 72.9540],
  park: [20.9465, 72.9545],
  roads: [20.9465, 72.9520],
  shipyard: [20.9350, 72.9250],
  refinery: [20.9650, 72.9700],
  petrol_pump: [20.9520, 72.9480],
  steel_mill: [20.9580, 72.9600]
};

function ensureDirs() {
  try {
    if (!fs.existsSync(SAVES_DIR)) fs.mkdirSync(SAVES_DIR, { recursive: true });
    if (!fs.existsSync(PLAYERS_DIR)) fs.mkdirSync(PLAYERS_DIR, { recursive: true });
  } catch {}
}

// Load canonical world locations (attempts memory -> Mongo -> file system -> defaults)
export async function loadWorldLocations(): Promise<Record<string, [number, number]>> {
  if (inMemoryWorldLocations) {
    return { ...DEFAULT_WORLD_LOCATIONS, ...inMemoryWorldLocations };
  }

  // 1. Try MongoDB
  try {
    const col = await getCollection("world_settings");
    if (col) {
      const doc = await col.findOne({ _id: "canonical_world_locations" as any });
      if (doc && (doc as any).locations) {
        inMemoryWorldLocations = (doc as any).locations;
        return { ...DEFAULT_WORLD_LOCATIONS, ...inMemoryWorldLocations };
      }
    }
  } catch {}

  // 2. Try Disk File
  ensureDirs();
  if (fs.existsSync(WORLD_LOCATIONS_FILE)) {
    try {
      const content = fs.readFileSync(WORLD_LOCATIONS_FILE, "utf-8");
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === "object") {
        inMemoryWorldLocations = parsed;
        return { ...DEFAULT_WORLD_LOCATIONS, ...inMemoryWorldLocations };
      }
    } catch {}
  }

  // 3. Fallback to Defaults and persist
  inMemoryWorldLocations = { ...DEFAULT_WORLD_LOCATIONS };
  await saveWorldLocations(inMemoryWorldLocations);
  return { ...inMemoryWorldLocations };
}

// Save canonical world locations permanently to disk & Mongo & active in-memory caches
export async function saveWorldLocations(locations: Record<string, [number, number]>): Promise<void> {
  inMemoryWorldLocations = { ...locations };

  // Sync to all inMemoryCache players so active user sessions immediately have the fixed location
  for (const uid of Object.keys(inMemoryCache)) {
    if (inMemoryCache[uid]) {
      inMemoryCache[uid].zone_locations = {
        ...inMemoryCache[uid].zone_locations,
        ...locations
      };
    }
  }

  // Save to MongoDB
  try {
    const col = await getCollection("world_settings");
    if (col) {
      await col.replaceOne(
        { _id: "canonical_world_locations" as any },
        { _id: "canonical_world_locations", locations, updated_at: new Date().toISOString() } as any,
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn("[MongoDB Standby] Failed to save world locations to Mongo:", err);
  }

  // Save to Disk
  try {
    ensureDirs();
    fs.writeFileSync(WORLD_LOCATIONS_FILE, JSON.stringify(locations, null, 2), "utf-8");
  } catch (err) {
    console.error("[Storage Error] Failed to write world_locations.json:", err);
  }
}

// Permanently updates a single landmark or user home location
export async function updateWorldLocation(landmarkId: string, coords: [number, number]): Promise<Record<string, [number, number]>> {
  const current = await loadWorldLocations();
  current[landmarkId] = coords;
  await saveWorldLocations(current);
  return current;
}

// Resets all world locations back to civilization defaults
export async function resetWorldLocations(): Promise<Record<string, [number, number]>> {
  const defaults = { ...DEFAULT_WORLD_LOCATIONS };
  await saveWorldLocations(defaults);
  return defaults;
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
    carrot_seed: 5,
    corn_seed: 5,
    strawberry_seed: 5,
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
    },
    industrial: {
      enabled: true,
      auto_refine: true,
      auto_replenish_pump: true,
      auto_dispatch_ships: true,
      auto_smelt_steel: true
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

  const defaultFamilies: PlayerState['families'] = [
    {
      id: "house_1",
      name: "Thakorbhai's Residence",
      type: "house",
      budget: 50,
      inventory: { milk: 5, wheat: 5, apple: 5, carrot: 5 },
      members: [
        { name: "Thakorbhai", role: "father", relation: "Main Person / Household Head", state: "Sleeping", vehicle: "tractor" },
        { name: "vasantiben", role: "mother", relation: "Wife of Thakorbhai", state: "Sleeping", vehicle: "scooter" },
        { name: "hetvi", role: "daughter", relation: "Daughter of Thakorbhai", state: "Sleeping", vehicle: "bicycle" },
        { name: "vandan", role: "son", relation: "Son of Thakorbhai", state: "Sleeping", vehicle: "car" }
      ]
    },
    {
      id: "house_2",
      name: "Bharatbhai's Residence",
      type: "house",
      budget: 40,
      inventory: { milk: 4, wheat: 4, apple: 4, carrot: 4 },
      members: [
        { name: "bharatbhai", role: "father", relation: "Brother of Vasantiben / Head", state: "Sleeping", vehicle: "scooter" },
        { name: "mayuriben", role: "mother", relation: "Wife of Bharatbhai", state: "Sleeping", vehicle: "scooter" },
        { name: "vainavi", role: "daughter", relation: "Daughter of Bharatbhai", state: "Sleeping", vehicle: "bicycle" },
        { name: "prathav", role: "son", relation: "Son of Bharatbhai", state: "Sleeping", vehicle: "car" },
        { name: "Dinesh", role: "worker", relation: "Farmer Assistant", state: "Sleeping", vehicle: "tractor" },
        { name: "Geeta", role: "worker", relation: "Grocery Shop Assistant", state: "Sleeping", vehicle: "scooter" }
      ]
    },
    {
      id: "house_3",
      name: "Rameshbhai's Residence",
      type: "house",
      budget: 35,
      inventory: { milk: 3, wheat: 3, apple: 3, carrot: 3 },
      members: [
        { name: "rameshbhai", role: "father", relation: "Husband of Hemuben / Head", state: "Sleeping", vehicle: "car" },
        { name: "hemuben", role: "mother", relation: "Sister of Vasantiben", state: "Sleeping", vehicle: "scooter" },
        { name: "krushil", role: "son", relation: "Son of Rameshbhai", state: "Sleeping", vehicle: "bicycle" },
        { name: "harshil", role: "son", relation: "Son of Rameshbhai", state: "Sleeping", vehicle: "bicycle" },
        { name: "Sanjay", role: "worker", relation: "Factory Operator", state: "Sleeping", vehicle: "truck" }
      ]
    },
    {
      id: "house_maritime",
      name: "Port Captain's Naval Quarters",
      type: "house",
      budget: 120,
      inventory: { milk: 6, wheat: 8, apple: 6, fish: 12 },
      members: [
        { name: "Captain Vikram", role: "captain", relation: "Shipyard Harbor Master", state: "Sleeping", vehicle: "car" },
        { name: "Priya Sharma", role: "navigator", relation: "First Navigation Officer", state: "Sleeping", vehicle: "scooter" },
        { name: "Rahul Tandel", role: "deck_officer", relation: "Maritime Cargo Pilot", state: "Sleeping", vehicle: "truck" }
      ]
    },
    {
      id: "hostel_refinery",
      name: "PetroChem Industrial Workers Dormitory",
      type: "hostel",
      capacity: 10,
      budget: 180,
      inventory: { milk: 8, wheat: 12, apple: 8, bread: 10 },
      members: [
        { name: "Arjun Patel", role: "engineer", relation: "Chief Refinery Engineer", state: "Sleeping", vehicle: "truck" },
        { name: "Deepa Shah", role: "chemist", relation: "Petroleum Chemist", state: "Sleeping", vehicle: "scooter" },
        { name: "Rohan Mistri", role: "technician", relation: "Petrol Pump Supervisor", state: "Sleeping", vehicle: "scooter" },
        { name: "Meera Dave", role: "inspector", relation: "Industrial Safety Inspector", state: "Sleeping", vehicle: "car" }
      ]
    },
    {
      id: "house_merchant",
      name: "Market Square Traders Manor",
      type: "house",
      budget: 160,
      inventory: { milk: 6, wheat: 10, carrot: 10, apple: 10 },
      members: [
        { name: "Kisan Mandi", role: "merchant", relation: "Farmers Market Proprietor", state: "Sleeping", vehicle: "car" },
        { name: "Sunil Varma", role: "grocer", relation: "Wholesale Grocery Manager", state: "Sleeping", vehicle: "truck" },
        { name: "Anita Ben", role: "cashier", relation: "Dairy Depot Cashier", state: "Sleeping", vehicle: "scooter" }
      ]
    },
    {
      id: "hostel_central",
      name: "Navsari Central Workers Hostel",
      type: "hostel",
      capacity: 12,
      budget: 150,
      inventory: { milk: 10, wheat: 10, apple: 10, carrot: 10 },
      members: [
        { name: "Ashok Kumar", role: "worker", relation: "High-Tech Fabrication Specialist", state: "Sleeping", vehicle: "scooter" },
        { name: "Manoj Bhai", role: "worker", relation: "Agricultural Logistician", state: "Sleeping", vehicle: "tractor" },
        { name: "Suresh Patil", role: "worker", relation: "Municipal Infrastructure Builder", state: "Sleeping", vehicle: "truck" },
        { name: "Raju Sharma", role: "worker", relation: "Renewable Grid Electrician", state: "Sleeping", vehicle: "bicycle" }
      ]
    }
  ];

  if (customMembers && customMembers.length > 0) {
    const customHomeName = citizenOptions?.name || `${userId.split(/[@_]/)[0]}'s Residence`;
    defaultFamilies.unshift({
      id: "my_home",
      name: customHomeName,
      address: citizenOptions?.address || "Civilization Citizen Zone",
      type: "house",
      budget: 150,
      inventory: { milk: 8, wheat: 10, apple: 8, carrot: 6, bread: 5 },
      members: customMembers.map((m, idx) => ({
        ...m,
        vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle"
      }))
    });
  }

  const initialLocations: Record<string, [number, number]> = {
    ...DEFAULT_WORLD_LOCATIONS,
    ...(inMemoryWorldLocations || {})
  };

  if (citizenOptions?.lat && citizenOptions?.lng) {
    initialLocations.my_home = [citizenOptions.lat, citizenOptions.lng];
    initialLocations[customFamilyId] = [citizenOptions.lat, citizenOptions.lng];
    if (inMemoryWorldLocations) {
      inMemoryWorldLocations.my_home = [citizenOptions.lat, citizenOptions.lng];
      inMemoryWorldLocations[customFamilyId] = [citizenOptions.lat, citizenOptions.lng];
    }
  } else if (!initialLocations.my_home) {
    initialLocations.my_home = [20.9468, 72.9520];
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
      members: (customMembers || []).map((m, idx) => ({
        ...m,
        vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle"
      }))
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
        id: "farmers_market",
        name: "Navsari Fresh Farmers & Vegetable Market",
        owner: "Kisan Mandi",
        inventory: { carrot: 25, brokeli: 20, cabbige: 20, cucumber: 25, chilly: 25, corn: 30, apple: 30, banana: 25, strawberry: 15, watermelon: 15, wheat: 40 },
        prices: { carrot: 3, brokeli: 4, cabbige: 3, cucumber: 2, chilly: 2, corn: 3, apple: 4, banana: 3, strawberry: 6, watermelon: 8, wheat: 3 },
        revenue: 300,
        sales_history: []
      },
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
    industry: {
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
    },
    zone_locations: initialLocations
  };
}

// Load player save (attempts MongoDB, falls back to disk, always synchronizing canonical world locations)
export async function loadPlayer(userId: string): Promise<PlayerState> {
  const safeName = userId.replace(/[^a-zA-Z0-9_-]/g, "");
  const worldLocations = await loadWorldLocations();

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
        } else if (!playerState.shops.some(s => s.id === "farmers_market")) {
          const fm = createNewPlayer(userId).shops.find(s => s.id === "farmers_market");
          if (fm) {
            playerState.shops.unshift(fm);
            modified = true;
          }
        }

        // Normalize bloated shop inventories to realistic store capacities (max 40)
        if (playerState.shops) {
          for (const shop of playerState.shops) {
            if (shop.inventory) {
              for (const [key, count] of Object.entries(shop.inventory)) {
                if (Number(count) > 40) {
                  shop.inventory[key] = Math.min(40, Math.max(15, Math.floor(Math.random() * 15) + 20));
                  modified = true;
                }
              }
            }
          }
        }

        if (!playerState.industry) {
          const d = createNewPlayer(userId);
          playerState.industry = d.industry;
          modified = true;
        }

        if (!playerState.families) {
          const d = createNewPlayer(userId);
          playerState.families = d.families;
          playerState.government = d.government;
          modified = true;
        }
        if (playerState.families) {
          const defaultFam = createNewPlayer(userId).families;
          for (const requiredId of ["house_maritime", "hostel_refinery", "house_merchant", "hostel_central"]) {
            if (!playerState.families.some(f => f.id === requiredId)) {
              const toAdd = defaultFam.find(f => f.id === requiredId);
              if (toAdd) {
                playerState.families.push(toAdd);
                modified = true;
              }
            }
          }
          for (const fam of playerState.families) {
            if (!fam.type) {
              fam.type = fam.id.startsWith("hostel_") ? "hostel" : "house";
              modified = true;
            }
            if (fam.members) {
              fam.members.forEach((m, idx) => {
                if (!m.vehicle) {
                  if (m.role === "father" || m.role === "captain") m.vehicle = idx === 0 ? "car" : "tractor";
                  else if (m.role === "mother" || m.role === "navigator") m.vehicle = "scooter";
                  else if (m.role === "engineer" || m.role === "deck_officer" || m.role === "grocer") m.vehicle = "truck";
                  else if (m.role === "merchant" || m.role === "inspector") m.vehicle = "car";
                  else if (m.role === "chemist" || m.role === "technician" || m.role === "cashier") m.vehicle = "scooter";
                  else if (m.role === "son") m.vehicle = "car";
                  else if (m.role === "daughter") m.vehicle = "bicycle";
                  else if (m.role === "worker") m.vehicle = "truck";
                  else m.vehicle = "bicycle";
                  modified = true;
                }
              });
            }
          }
        }
        if (!playerState.cabinet) {
          const d = createNewPlayer(userId);
          playerState.cabinet = d.cabinet;
          playerState.news_feed = d.news_feed;
          playerState.city_manager_enabled = d.city_manager_enabled;
          modified = true;
        }

        const userPrivateHome = playerState.zone_locations?.my_home;
        // Always enforce fixed canonical world locations for all users while preserving personal home
        playerState.zone_locations = {
          ...DEFAULT_WORLD_LOCATIONS,
          ...worldLocations,
          ...(playerState.zone_locations || {}),
          ...(userPrivateHome ? { my_home: userPrivateHome } : {})
        };

        if (modified) {
          await savePlayer(playerState);
        }
        return playerState;
      } else {
        const fresh = createNewPlayer(userId);
        fresh.zone_locations = {
          ...DEFAULT_WORLD_LOCATIONS,
          ...worldLocations,
          ...(fresh.zone_locations || {})
        };
        await savePlayer(fresh);
        return fresh;
      }
    }
  } catch (err) {
    console.warn("[MongoDB Connection Standby] Falling back to file system storage:", err);
  }

  if (inMemoryCache[userId]) {
    inMemoryCache[userId].zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...(inMemoryCache[userId].zone_locations || {}),
      ...worldLocations
    };
    return inMemoryCache[userId];
  }

  ensureDirs();
  const filePath = path.join(PLAYERS_DIR, `${safeName}.json`);

  if (!fs.existsSync(filePath)) {
    const fresh = createNewPlayer(userId);
    fresh.zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...worldLocations,
      ...(fresh.zone_locations || {})
    };
    await savePlayer(fresh);
    return fresh;
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content) as PlayerState;
    const userPrivateHome = data.zone_locations?.my_home;
    data.zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...worldLocations,
      ...(data.zone_locations || {}),
      ...(userPrivateHome ? { my_home: userPrivateHome } : {})
    };

    if (!data.shops) {
      data.shops = createNewPlayer(userId).shops;
    } else if (!data.shops.some(s => s.id === "farmers_market")) {
      const fm = createNewPlayer(userId).shops.find(s => s.id === "farmers_market");
      if (fm) data.shops.unshift(fm);
    }

    // Normalize bloated shop inventories to realistic store capacities (max 40)
    if (data.shops) {
      for (const shop of data.shops) {
        if (shop.inventory) {
          for (const [key, count] of Object.entries(shop.inventory)) {
            if (Number(count) > 40) {
              shop.inventory[key] = Math.min(40, Math.max(15, Math.floor(Math.random() * 15) + 20));
            }
          }
        }
      }
    }

    if (!data.industry) {
      data.industry = createNewPlayer(userId).industry;
    }

    if (data.families) {
      const defaultFam = createNewPlayer(userId).families;
      for (const requiredId of ["house_maritime", "hostel_refinery", "house_merchant", "hostel_central"]) {
        if (!data.families.some(f => f.id === requiredId)) {
          const toAdd = defaultFam.find(f => f.id === requiredId);
          if (toAdd) {
            data.families.push(toAdd);
          }
        }
      }
      for (const fam of data.families) {
        if (!fam.type) {
          fam.type = fam.id.startsWith("hostel_") ? "hostel" : "house";
        }
        if (fam.members) {
          fam.members.forEach((m, idx) => {
            if (!m.vehicle) {
              if (m.role === "father" || m.role === "captain") m.vehicle = idx === 0 ? "car" : "tractor";
              else if (m.role === "mother" || m.role === "navigator") m.vehicle = "scooter";
              else if (m.role === "engineer" || m.role === "deck_officer" || m.role === "grocer") m.vehicle = "truck";
              else if (m.role === "merchant" || m.role === "inspector") m.vehicle = "car";
              else if (m.role === "chemist" || m.role === "technician" || m.role === "cashier") m.vehicle = "scooter";
              else if (m.role === "son") m.vehicle = "car";
              else if (m.role === "daughter") m.vehicle = "bicycle";
              else if (m.role === "worker") m.vehicle = "truck";
              else m.vehicle = "bicycle";
            }
          });
        }
      }
    }
    return data;
  } catch {
    const fresh = createNewPlayer(userId);
    fresh.zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...worldLocations,
      ...(fresh.zone_locations || {})
    };
    inMemoryCache[userId] = fresh;
    return fresh;
  }
}

// Save player (attempts MongoDB, falls back to in-memory/disk)
export async function savePlayer(player: PlayerState): Promise<void> {
  const safeName = player.user_id.replace(/[^a-zA-Z0-9_-]/g, "");
  
  const myHomeFam = player.families?.find(f => f.id === "my_home" || f.id === `house_${player.user_id.replace(/[^a-zA-Z0-9_-]/g, "")}`) || player.families?.[0];
  const myHomeCoords = player.zone_locations?.my_home || [20.9472, 72.9515];

  const extended = {
    ...player,
    home_name: myHomeFam?.name || `${player.user_id.split(/[@_]/)[0]}'s Residence`,
    address: myHomeFam?.address || player.city_name || "Civilization Citizen Zone",
    coords: myHomeCoords,
    members_count: myHomeFam?.members?.length || 0,
    members_list: myHomeFam?.members?.map(m => m.name) || [],
    last_saved_at: new Date().toISOString()
  };

  inMemoryCache[player.user_id] = extended as PlayerState;

  try {
    const collection = await getCollection("players");
    if (collection) {
      const { _id, ...cleanData } = extended as any;
      await collection.replaceOne({ user_id: player.user_id }, cleanData, { upsert: true });
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

// Fetch all registered players & their home residences for Admin Census
export async function listAllPlayers(): Promise<any[]> {
  const playersMap = new Map<string, any>();

  // 1. Try MongoDB Atlas
  try {
    const collection = await getCollection("players");
    if (collection) {
      const docs = await collection.find({}).toArray();
      for (const doc of docs) {
        if (!doc.user_id) continue;
        const myHomeFam = doc.families?.find((f: any) => f.id === "my_home" || f.id === `house_${doc.user_id.replace(/[^a-zA-Z0-9_-]/g, "")}`) || doc.families?.[0];
        const myHomeCoords = doc.zone_locations?.my_home || doc.zone_locations?.[myHomeFam?.id] || [20.9472, 72.9515];
        playersMap.set(doc.user_id, {
          user_id: doc.user_id,
          city_name: doc.city_name || "AI Civilization",
          money: doc.money || 500,
          home_name: myHomeFam?.name || `${doc.user_id.split(/[@_]/)[0]}'s Residence`,
          address: myHomeFam?.address || "Civilization Citizen Zone",
          coords: myHomeCoords,
          budget: myHomeFam?.budget || 150,
          members: myHomeFam?.members || [],
          member_count: myHomeFam?.members?.length || 0,
          all_families_count: doc.families?.length || 1,
          last_saved_at: doc.last_saved_at || doc.clock?.formatted || "Active"
        });
      }
    }
  } catch (err) {
    console.warn("[MongoDB List Players Standby]:", err);
  }

  // 2. Fall back / Merge with local disk saves
  try {
    ensureDirs();
    if (fs.existsSync(PLAYERS_DIR)) {
      const files = fs.readdirSync(PLAYERS_DIR);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const filePath = path.join(PLAYERS_DIR, file);
          const content = fs.readFileSync(filePath, "utf-8");
          const doc = JSON.parse(content);
          if (doc.user_id && !playersMap.has(doc.user_id)) {
            const myHomeFam = doc.families?.find((f: any) => f.id === "my_home" || f.id === `house_${doc.user_id.replace(/[^a-zA-Z0-9_-]/g, "")}`) || doc.families?.[0];
            const myHomeCoords = doc.zone_locations?.my_home || doc.zone_locations?.[myHomeFam?.id] || [20.9472, 72.9515];
            playersMap.set(doc.user_id, {
              user_id: doc.user_id,
              city_name: doc.city_name || "AI Civilization",
              money: doc.money || 500,
              home_name: myHomeFam?.name || `${doc.user_id.split(/[@_]/)[0]}'s Residence`,
              address: myHomeFam?.address || "Civilization Citizen Zone",
              coords: myHomeCoords,
              budget: myHomeFam?.budget || 150,
              members: myHomeFam?.members || [],
              member_count: myHomeFam?.members?.length || 0,
              all_families_count: doc.families?.length || 1,
              last_saved_at: doc.last_saved_at || doc.clock?.formatted || "Active"
            });
          }
        } catch {}
      }
    }
  } catch {}

  return Array.from(playersMap.values());
}

// Permanently delete a citizen from MongoDB Atlas, memory cache, and local disk
export async function deletePlayer(userId: string): Promise<boolean> {
  const safeName = userId.replace(/[^a-zA-Z0-9_-]/g, "");

  // 1. Delete from in-memory cache
  if (inMemoryCache[userId]) {
    delete inMemoryCache[userId];
  }

  // 2. Delete from MongoDB Atlas
  try {
    const collection = await getCollection("players");
    if (collection) {
      await collection.deleteOne({ user_id: userId });
      console.log(`[MongoDB Deleted] Citizen '${userId}' expunged from collection 'players'.`);
    }
  } catch (err) {
    console.warn("[MongoDB Delete Standby]:", err);
  }

  // 3. Delete from local disk
  try {
    ensureDirs();
    const filePath = path.join(PLAYERS_DIR, `${safeName}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    const summariesPath = path.join(PLAYERS_DIR, `${safeName}_daily_summaries.json`);
    if (fs.existsSync(summariesPath)) {
      fs.unlinkSync(summariesPath);
    }
  } catch {}

  return true;
}


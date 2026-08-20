import { PlayerState } from "./simulation";
import {
  getWorldCollection,
  getAuthCollection,
  getCatalogCollection,
  resetMongoConnection,
  DB_NAMES,
} from "./db";

// Direct imports of static catalog data for instant initialization & build compatibility
import itemsCatalog from "@/data/items.json";
import cropsCatalog from "@/data/crops.json";
import recipesCatalog from "@/data/recipes.json";
import buildingsCatalog from "@/data/buildings.json";

// Helper to ensure directories exist
export const inMemoryCache: Record<string, PlayerState> = {};
let inMemoryWorldLocations: Record<string, [number, number]> | null = null;
let catalogsSeeded = false;

// In-Memory cache for listAllPlayers with 10-second TTL
let cachedAllPlayersList: any[] | null = null;
let cachedAllPlayersExpiry = 0;

export function invalidatePlayersListCache(): void {
  cachedAllPlayersList = null;
  cachedAllPlayersExpiry = 0;
}

// Write-behind debouncing for tick updates to prevent hammering MongoDB on every sub-second tick
const lastSavedToDbTime: Record<string, number> = {};
const pendingSaveTimers: Record<string, NodeJS.Timeout> = {};

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

/**
 * Seed catalogs to MongoDB civilization_catalog database
 */
export async function seedCatalogsToMongo(): Promise<void> {
  if (catalogsSeeded) return;
  catalogsSeeded = true;
  try {
    const itemsCol = await getCatalogCollection("items");
    const cropsCol = await getCatalogCollection("crops");
    const recipesCol = await getCatalogCollection("recipes");
    const buildingsCol = await getCatalogCollection("buildings");

    if (itemsCol && (await itemsCol.countDocuments()) === 0) {
      const itemsList = Object.entries(itemsCatalog).map(([k, v]) => ({ id: k, ...(v as any) }));
      await itemsCol.insertMany(itemsList as any);
      console.log(`[MongoDB Catalog] Seeded ${itemsList.length} items to database '${DB_NAMES.CATALOG}'.`);
    }

    if (cropsCol && (await cropsCol.countDocuments()) === 0) {
      const cropsList = Object.entries(cropsCatalog).map(([k, v]) => ({ id: k, ...(v as any) }));
      await cropsCol.insertMany(cropsList as any);
      console.log(`[MongoDB Catalog] Seeded ${cropsList.length} crops to database '${DB_NAMES.CATALOG}'.`);
    }

    if (recipesCol && (await recipesCol.countDocuments()) === 0) {
      const recipesList = Object.entries(recipesCatalog).map(([k, v]) => ({ id: k, ...(v as any) }));
      await recipesCol.insertMany(recipesList as any);
      console.log(`[MongoDB Catalog] Seeded ${recipesList.length} recipes to database '${DB_NAMES.CATALOG}'.`);
    }

    if (buildingsCol && (await buildingsCol.countDocuments()) === 0) {
      const buildingsList = Object.entries(buildingsCatalog).map(([k, v]) => ({ id: k, ...(v as any) }));
      await buildingsCol.insertMany(buildingsList as any);
      console.log(`[MongoDB Catalog] Seeded ${buildingsList.length} buildings to database '${DB_NAMES.CATALOG}'.`);
    }
  } catch (err: any) {
    console.warn("[MongoDB Catalog Seed Warning]:", err?.message || err);
  }
}

// Generate unique residency coordinates for every user near Navsari base
export function generateUserResidencyCoords(userId: string): [number, number] {
  const cleanId = String(userId || "").trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < cleanId.length; i++) {
    hash = (hash << 5) - hash + cleanId.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = (((Math.abs(hash) % 120) - 60) * 0.0003); // approx ±0.018 deg
  const lngOffset = (((Math.abs(hash >> 3) % 120) - 60) * 0.0003);
  return [20.9472 + latOffset, 72.9515 + lngOffset];
}

// Load canonical world locations exclusively from MongoDB civilization_world.world_locations
export async function loadWorldLocations(): Promise<Record<string, [number, number]>> {
  if (inMemoryWorldLocations) {
    return { ...DEFAULT_WORLD_LOCATIONS, ...inMemoryWorldLocations };
  }

  // Fetch from MongoDB civilization_world.world_locations
  try {
    const col = await getWorldCollection("world_locations");
    if (col) {
      const doc = await col.findOne({ _id: "canonical_world_locations" as any });
      if (doc && (doc as any).locations) {
        const { my_home, ...clean } = (doc as any).locations;
        inMemoryWorldLocations = clean;
        return { ...DEFAULT_WORLD_LOCATIONS, ...inMemoryWorldLocations };
      }
    }
  } catch (err) {
    console.warn("[MongoDB World Locations]:", err);
  }

  inMemoryWorldLocations = { ...DEFAULT_WORLD_LOCATIONS };
  await saveWorldLocations(inMemoryWorldLocations);
  return { ...inMemoryWorldLocations };
}

// Save canonical world locations permanently to MongoDB civilization_world (excl user private home)
export async function saveWorldLocations(locations: Record<string, [number, number]>): Promise<void> {
  const { my_home, ...cleanLocations } = locations;
  inMemoryWorldLocations = { ...cleanLocations };

  for (const uid of Object.keys(inMemoryCache)) {
    if (inMemoryCache[uid]) {
      const userHome = inMemoryCache[uid].zone_locations?.my_home;
      inMemoryCache[uid].zone_locations = {
        ...inMemoryCache[uid].zone_locations,
        ...cleanLocations,
        ...(userHome ? { my_home: userHome } : {})
      };
    }
  }

  try {
    const col = await getWorldCollection("world_locations");
    if (col) {
      await col.replaceOne(
        { _id: "canonical_world_locations" as any },
        { _id: "canonical_world_locations", locations: cleanLocations, updated_at: new Date().toISOString() } as any,
        { upsert: true }
      );
    }
  } catch (err) {
    console.warn("[MongoDB World Locations Save Warning]:", err);
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

// Load static & dynamic catalogs
export function loadCatalog(name: string): any {
  seedCatalogsToMongo().catch(() => {});
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
  seedCatalogsToMongo().catch(() => {});
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

  const cleanId = String(userId || "").trim().toLowerCase();
  const isAdminAcc = cleanId === "vandan11patel@gmail.com" || cleanId === "vandan_11";
  const isVPatelAcc = cleanId === "vpatelcode@gmail.com";

  const customFamilyId = `house_${safeName}`;
  const userHomeCoords: [number, number] = (citizenOptions?.lat && citizenOptions?.lng)
    ? [citizenOptions.lat, citizenOptions.lng]
    : generateUserResidencyCoords(userId);

  let formattedMembers: any[] = [];
  let homeName = citizenOptions?.name ? (citizenOptions.name.endsWith("Residence") || citizenOptions.name.endsWith("Villa") || citizenOptions.name.endsWith("Home") ? citizenOptions.name : `${citizenOptions.name}'s Residence`) : `${safeName}'s Residence`;

  if (isAdminAcc) {
    homeName = "Vandan_Home";
    formattedMembers = [
      { id: "mem_1", name: "Thakorbhai", role: "Senior Agricultural Head", relation: "Household Head", vehicle: "car", age: 62, health: 100, happiness: 95, state: "At Home" },
      { id: "mem_2", name: "Vasantiben", role: "District Magistrate", relation: "Spouse", vehicle: "scooter", age: 58, health: 100, happiness: 95, state: "At Home" },
      { id: "mem_3", name: "Vandan", role: "Finance Minister", relation: "Son", vehicle: "car", age: 28, health: 100, happiness: 95, state: "At Home" },
      { id: "mem_4", name: "Hetvi", role: "Education Lead", relation: "Daughter", vehicle: "scooter", age: 22, health: 100, happiness: 95, state: "At Home" }
    ];
  } else if (isVPatelAcc) {
    homeName = "Vpatel Residence";
    formattedMembers = [
      { id: "mem_1", name: "V1", role: "Civilization Engineer", relation: "Household Head", vehicle: "car", age: 30, health: 100, happiness: 95, state: "At Home" },
      { id: "mem_2", name: "V2", role: "Urban Logistics Coordinator", relation: "Spouse", vehicle: "scooter", age: 26, health: 100, happiness: 95, state: "At Home" }
    ];
  } else {
    const rawMems = (citizenOptions?.members && citizenOptions.members.length > 0)
      ? citizenOptions.members
      : [citizenOptions?.name || safeName];
    formattedMembers = rawMems.map((mName, idx) => ({
      id: `mem_${idx + 1}`,
      name: mName.trim() || `Citizen ${idx + 1}`,
      role: idx === 0 ? "head" : idx === 1 ? "spouse" : "child",
      relation: idx === 0 ? "Household Head" : "Family Member",
      vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle",
      age: idx === 0 ? 35 : idx === 1 ? 32 : 12,
      health: 100,
      happiness: 95,
      state: "At Home"
    }));
  }

  const defaultFamilies: any[] = [
    {
      id: "my_home",
      name: homeName,
      address: citizenOptions?.address || (isAdminAcc ? "Civilization Central Zone, Navsari" : isVPatelAcc ? "West Coast Zone, Navsari" : "Civilization Citizen Zone"),
      type: "house",
      budget: 150,
      inventory: { milk: 8, wheat: 10, apple: 8, carrot: 6, bread: 5 },
      coords: userHomeCoords,
      members: formattedMembers
    }
  ];

  const initialLocations: Record<string, [number, number]> = {
    ...DEFAULT_WORLD_LOCATIONS,
    ...(inMemoryWorldLocations || {}),
    my_home: userHomeCoords,
    [customFamilyId]: userHomeCoords
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
      members: formattedMembers.map((m: any) => ({
        name: m.name,
        role: m.role,
        relation: m.relation,
        vehicle: m.vehicle,
        state: m.state || "At Home"
      }))
    },
    families: defaultFamilies as any,
    government: {
      mayor: formattedMembers[1]?.name || "V2",
      income_tax: 10,
      sales_tax: 5,
      welfare_threshold: 15,
      welfare_payout: 15,
      welfare_checks_payouts: 0
    },
    cabinet: {
      prime_minister: formattedMembers[0]?.name || "Thakorbhai",
      district_magistrate: formattedMembers[1]?.name || "Vasantiben",
      ministers: {
        finance: formattedMembers[2]?.name || "Vandan",
        education: formattedMembers[3]?.name || "Hetvi",
        infrastructure: formattedMembers[4]?.name || "V1"
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

/**
 * Accurately check if a player exists in MongoDB civilization_world (or civilization_auth)
 */
export async function playerExists(userId: string): Promise<boolean> {
  const cleanId = String(userId || "").trim().toLowerCase();
  if (!cleanId) return false;

  // 1. Check in-memory cache
  if (inMemoryCache[cleanId]) return true;

  // 2. Check MongoDB civilization_world.players
  try {
    const playersCol = await getWorldCollection("players");
    if (playersCol) {
      const doc = await playersCol.findOne({ user_id: cleanId });
      if (doc) return true;
    }
  } catch (err) {
    console.warn("[MongoDB playerExists World]:", err);
  }

  // 3. Check MongoDB civilization_auth.users
  try {
    const authCol = await getAuthCollection("users");
    if (authCol) {
      const u = await authCol.findOne({
        $or: [{ user_id: cleanId }, { email: cleanId }],
      });
      if (u) return true;
    }
  } catch (err) {
    console.warn("[MongoDB playerExists Auth]:", err);
  }

  return false;
}

/**
 * Fetch existing player from MongoDB civilization_world without creating a new default profile
 */
export async function getPlayer(userId: string): Promise<PlayerState | null> {
  const cleanId = String(userId || "").trim().toLowerCase();
  if (!cleanId) return null;

  const worldLocations = await loadWorldLocations();

  // 1. Check in-memory cache
  if (inMemoryCache[cleanId]) {
    inMemoryCache[cleanId].zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...(inMemoryCache[cleanId].zone_locations || {}),
      ...worldLocations,
    };
    return inMemoryCache[cleanId];
  }

  // 2. Fetch from MongoDB civilization_world.players
  try {
    const collection = await getWorldCollection("players");
    if (collection) {
      const data = await collection.findOne({ user_id: cleanId });
      if (data) {
        const playerState = data as unknown as PlayerState;
        const userPrivateHome = playerState.zone_locations?.my_home;
        playerState.zone_locations = {
          ...DEFAULT_WORLD_LOCATIONS,
          ...worldLocations,
          ...(playerState.zone_locations || {}),
          ...(userPrivateHome ? { my_home: userPrivateHome } : {}),
        };
        inMemoryCache[cleanId] = playerState;
        return playerState;
      }
    }
  } catch (err) {
    console.warn("[MongoDB getPlayer World Standby]:", err);
  }

  return null;
}

// Load player save for active gameplay (fetches from memory cache first, or MongoDB civilization_world)
export async function loadPlayer(userId: string): Promise<PlayerState> {
  const cleanId = String(userId || "citizen").trim().toLowerCase();
  const worldLocations = await loadWorldLocations();

  // Fast cache hit - return immediately without hitting MongoDB Atlas
  if (inMemoryCache[cleanId]) {
    const cached = inMemoryCache[cleanId];
    const userPrivateHome = cached.zone_locations?.my_home;
    cached.zone_locations = {
      ...DEFAULT_WORLD_LOCATIONS,
      ...worldLocations,
      ...(cached.zone_locations || {}),
      ...(userPrivateHome ? { my_home: userPrivateHome } : {}),
    };
    return cached;
  }

  try {
    const collection = await getWorldCollection("players");
    if (collection) {
      const data = await collection.findOne({ user_id: cleanId });
      if (data) {
        const defaultState = createNewPlayer(cleanId);
        const playerState: PlayerState = {
          ...defaultState,
          ...data,
          clock: data.clock || defaultState.clock,
          plots: Array.isArray(data.plots) && data.plots.length > 0 ? data.plots : defaultState.plots,
          buildings: Array.isArray(data.buildings) ? data.buildings : defaultState.buildings,
          build_queue: Array.isArray(data.build_queue) ? data.build_queue : defaultState.build_queue,
          inventory:
            data.inventory && Object.keys(data.inventory).length > 0
              ? data.inventory
              : defaultState.inventory,
          item_prices: data.item_prices || defaultState.item_prices,
          families:
            Array.isArray(data.families) && data.families.length > 0
              ? data.families
              : defaultState.families,
          shops:
            Array.isArray(data.shops) && data.shops.length > 0
              ? data.shops
              : defaultState.shops,
          industry: data.industry || defaultState.industry,
          cabinet: data.cabinet || defaultState.cabinet,
          news_feed:
            Array.isArray(data.news_feed) && data.news_feed.length > 0
              ? data.news_feed
              : defaultState.news_feed,
          agent_settings: data.agent_settings || defaultState.agent_settings,
          agent_logs: data.agent_logs || defaultState.agent_logs,
          government: data.government || defaultState.government,
        };
        let modified = false;

        if (!playerState.agent_settings) {
          const d = createNewPlayer(cleanId);
          playerState.agent_settings = d.agent_settings;
          playerState.agent_logs = d.agent_logs;
          playerState.item_prices = d.item_prices;
          playerState.last_price_update_day = d.last_price_update_day;
          modified = true;
        }
        if (!playerState.city_name) {
          const d = createNewPlayer(cleanId);
          playerState.city_name = d.city_name;
          playerState.city_treasury = d.city_treasury;
          playerState.tax_rate = d.tax_rate;
          playerState.city_projects = d.city_projects;
          playerState.household = d.household;
          modified = true;
        }
        if (!playerState.shops) {
          const d = createNewPlayer(cleanId);
          playerState.shops = d.shops;
          modified = true;
        } else if (!playerState.shops.some((s) => s.id === "farmers_market")) {
          const fm = createNewPlayer(cleanId).shops.find((s) => s.id === "farmers_market");
          if (fm) {
            playerState.shops.unshift(fm);
            modified = true;
          }
        }

        // Normalize bloated shop inventories
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
          const d = createNewPlayer(cleanId);
          playerState.industry = d.industry;
          modified = true;
        }

        if (!playerState.families) {
          const d = createNewPlayer(cleanId);
          playerState.families = d.families;
          playerState.government = d.government;
          modified = true;
        }
        if (playerState.families) {
          for (const fam of playerState.families) {
            if (!fam.type) {
              fam.type = fam.id.startsWith("hostel_") ? "hostel" : "house";
              modified = true;
            }
            if (fam.members) {
              fam.members.forEach((m, idx) => {
                if (!m.vehicle) {
                  if (m.role === "father" || m.role === "captain")
                    m.vehicle = idx === 0 ? "car" : "tractor";
                  else if (m.role === "mother" || m.role === "navigator") m.vehicle = "scooter";
                  else if (
                    m.role === "engineer" ||
                    m.role === "deck_officer" ||
                    m.role === "grocer"
                  )
                    m.vehicle = "truck";
                  else if (m.role === "merchant" || m.role === "inspector") m.vehicle = "car";
                  else if (
                    m.role === "chemist" ||
                    m.role === "technician" ||
                    m.role === "cashier"
                  )
                    m.vehicle = "scooter";
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
          const d = createNewPlayer(cleanId);
          playerState.cabinet = d.cabinet;
          playerState.news_feed = d.news_feed;
          playerState.city_manager_enabled = d.city_manager_enabled;
          modified = true;
        }

        const userPrivateHome = playerState.zone_locations?.my_home;
        playerState.zone_locations = {
          ...DEFAULT_WORLD_LOCATIONS,
          ...worldLocations,
          ...(playerState.zone_locations || {}),
          ...(userPrivateHome ? { my_home: userPrivateHome } : {}),
        };

        if (modified) {
          await savePlayer(playerState, true);
        }
        inMemoryCache[cleanId] = playerState;
        return playerState;
      } else {
        // Check if citizen registered in civilization_auth.users
        let authUser: any = null;
        try {
          const authCol = await getAuthCollection("users");
          if (authCol) {
            authUser = await authCol.findOne({ user_id: cleanId });
          }
        } catch {}

        const fresh = createNewPlayer(
          cleanId,
          authUser
            ? {
                name: authUser.name,
                address: authUser.address,
                lat: authUser.lat,
                lng: authUser.lng,
                members: authUser.members,
              }
            : undefined
        );

        fresh.zone_locations = {
          ...DEFAULT_WORLD_LOCATIONS,
          ...worldLocations,
          ...(fresh.zone_locations || {}),
          ...(authUser?.lat && authUser?.lng ? { my_home: [authUser.lat, authUser.lng] } : {}),
        };
        await savePlayer(fresh, true);
        inMemoryCache[cleanId] = fresh;
        return fresh;
      }
    }
  } catch (err) {
    console.warn("[MongoDB loadPlayer Standby]:", err);
  }

  // Fallback to fresh player
  const fresh = createNewPlayer(cleanId);
  fresh.zone_locations = {
    ...DEFAULT_WORLD_LOCATIONS,
    ...worldLocations,
    ...(fresh.zone_locations || {}),
  };
  await savePlayer(fresh, true);
  inMemoryCache[cleanId] = fresh;
  return fresh;
}

/**
 * Execute actual write operation to MongoDB
 */
async function writePlayerToDb(cleanId: string, player: PlayerState): Promise<void> {
  const safeName = cleanId.replace(/[^a-zA-Z0-9_-]/g, "");
  const myHomeFam =
    player.families?.find((f) => f.id === "my_home" || f.id === `house_${safeName}`) ||
    player.families?.[0];
  const myHomeCoords = player.zone_locations?.my_home || [20.9472, 72.9515];

  const extended = {
    ...player,
    home_name: myHomeFam?.name || `${cleanId.split(/[@_]/)[0]}'s Residence`,
    address: myHomeFam?.address || player.city_name || "Civilization Citizen Zone",
    coords: myHomeCoords,
    members_count: myHomeFam?.members?.length || 0,
    members_list: myHomeFam?.members?.map((m) => m.name) || [],
    last_saved_at: new Date().toISOString(),
  };

  try {
    const collection = await getWorldCollection("players");
    if (collection) {
      const { _id, ...cleanData } = extended as any;
      await collection.replaceOne({ user_id: cleanId }, cleanData, { upsert: true });
      lastSavedToDbTime[cleanId] = Date.now();
    }
  } catch (err) {
    console.warn("[MongoDB Save Player World Warning]:", err);
    await resetMongoConnection();
  }

  if (player.password_hash) {
    try {
      const authCol = await getAuthCollection("users");
      if (authCol) {
        await authCol.updateOne(
          { user_id: cleanId },
          {
            $set: {
              password_hash: player.password_hash,
              name: extended.home_name,
              address: extended.address,
              lat: myHomeCoords[0],
              lng: myHomeCoords[1],
              members: extended.members_list,
              last_login_at: new Date().toISOString(),
            },
          },
          { upsert: true }
        );
      }
    } catch {}
  }
}

// Save player with in-memory write-behind and smart debouncing
export async function savePlayer(player: PlayerState, forceImmediate: boolean = true): Promise<void> {
  const cleanId = String(player.user_id || "citizen").trim().toLowerCase();
  player.user_id = cleanId;

  // 1. Instantly update in-memory state
  inMemoryCache[cleanId] = player;

  // 2. If force immediate (user initiated actions), write directly now
  if (forceImmediate) {
    if (pendingSaveTimers[cleanId]) {
      clearTimeout(pendingSaveTimers[cleanId]);
      delete pendingSaveTimers[cleanId];
    }
    await writePlayerToDb(cleanId, player);
    return;
  }

  // 3. Debounced write-behind for simulation ticks (at most once every 4 seconds)
  const now = Date.now();
  const lastSaved = lastSavedToDbTime[cleanId] || 0;
  if (now - lastSaved >= 4000) {
    if (pendingSaveTimers[cleanId]) {
      clearTimeout(pendingSaveTimers[cleanId]);
      delete pendingSaveTimers[cleanId];
    }
    await writePlayerToDb(cleanId, player);
  } else if (!pendingSaveTimers[cleanId]) {
    // Schedule trailing debounced save
    pendingSaveTimers[cleanId] = setTimeout(async () => {
      delete pendingSaveTimers[cleanId];
      if (inMemoryCache[cleanId]) {
        await writePlayerToDb(cleanId, inMemoryCache[cleanId]);
      }
    }, 4000);
  }
}

// Fetch all registered players & their home residences with in-memory TTL caching
export async function listAllPlayers(): Promise<any[]> {
  const now = Date.now();
  if (cachedAllPlayersList && now < cachedAllPlayersExpiry) {
    return cachedAllPlayersList;
  }

  const playersMap = new Map<string, any>();

  const getCanonicalId = (rawId: string): string => {
    const clean = String(rawId || "").trim().toLowerCase();
    if (clean === "vandan_11" || clean === "vandan11patel@gmail.com") {
      return "vandan11patel@gmail.com";
    }
    return clean;
  };

  const normalizeMembers = (members: any[]): any[] => {
    if (!Array.isArray(members)) return [];
    return members.map((m: any, idx: number) => {
      if (typeof m === "string") {
        return {
          name: m,
          role: idx === 0 ? "Head of Family" : idx === 1 ? "Spouse" : "Family Member",
          vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle",
        };
      }
      return {
        name: m?.name || `Member #${idx + 1}`,
        role: m?.role || (idx === 0 ? "Head of Family" : "Resident"),
        age: m?.age || (idx === 0 ? 35 : 25),
        vehicle: m?.vehicle || (idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle"),
      };
    });
  };

  // 1. Fetch from MongoDB civilization_world.players with projection
  try {
    const collection = await getWorldCollection("players");
    if (collection) {
      const docs = await collection
        .find({}, {
          projection: {
            user_id: 1,
            city_name: 1,
            address: 1,
            money: 1,
            home_name: 1,
            name: 1,
            lat: 1,
            lng: 1,
            zone_locations: 1,
            families: 1,
            members: 1,
            last_saved_at: 1,
            clock: 1,
          },
        })
        .toArray();

      for (const doc of docs) {
        if (!doc.user_id) continue;
        const cId = getCanonicalId(doc.user_id);
        const myHomeFam =
          doc.families?.find(
            (f: any) =>
              f.id === "my_home" || f.id === `house_${cId.replace(/[^a-zA-Z0-9_-]/g, "")}`
          ) || doc.families?.[0];

        let myHomeCoords: [number, number] = generateUserResidencyCoords(cId);
        if (doc.lat && doc.lng) {
          myHomeCoords = [Number(doc.lat), Number(doc.lng)];
        } else if (doc.zone_locations?.my_home) {
          myHomeCoords = doc.zone_locations.my_home;
        } else if (myHomeFam?.coords && Array.isArray(myHomeFam.coords)) {
          myHomeCoords = myHomeFam.coords;
        } else if (doc.zone_locations?.[myHomeFam?.id]) {
          myHomeCoords = doc.zone_locations[myHomeFam.id];
        }

        const rawMembers = myHomeFam?.members || doc.members || [];
        const normMembers = normalizeMembers(rawMembers);

        playersMap.set(cId, {
          user_id: cId,
          city_name: doc.city_name || doc.address || "AI Civilization",
          money: doc.money || 500,
          home_name: myHomeFam?.name || doc.home_name || doc.name || `${cId.split(/[@_]/)[0]}'s Residence`,
          address: doc.address || doc.city_name || myHomeFam?.address || "Civilization Citizen Zone",
          coords: myHomeCoords,
          budget: myHomeFam?.budget || 150,
          members: normMembers,
          member_count: normMembers.length,
          all_families_count: doc.families?.length || 1,
          last_saved_at: doc.last_saved_at || doc.clock?.formatted || "Active",
        });
      }
    }
  } catch (err) {
    console.warn("[MongoDB List Players World]:", err);
  }

  // 2. Also check MongoDB civilization_auth.users
  try {
    const authCol = await getAuthCollection("users");
    if (authCol) {
      const authDocs = await authCol
        .find({}, {
          projection: {
            user_id: 1,
            email: 1,
            name: 1,
            home_name: 1,
            address: 1,
            city_name: 1,
            lat: 1,
            lng: 1,
            members: 1,
            last_login: 1,
            registered_at: 1,
            created_at: 1,
          },
        })
        .toArray();

      for (const u of authDocs) {
        if (!u.user_id) continue;
        const cId = getCanonicalId(u.user_id);
        const normMembers = normalizeMembers(u.members || []);
        const defaultCoords = generateUserResidencyCoords(cId);
        const coords: [number, number] = [
          u.lat ? Number(u.lat) : defaultCoords[0],
          u.lng ? Number(u.lng) : defaultCoords[1],
        ];
        const address = u.address || u.city_name || "Civilization Citizen Zone";

        if (playersMap.has(cId)) {
          const existing = playersMap.get(cId);
          if (u.lat && u.lng) existing.coords = coords;
          if (u.address) existing.address = address;
          if (u.home_name) existing.home_name = u.home_name;
          else if (u.name) existing.home_name = `${u.name}'s Residence`;
          if (normMembers.length > 0) {
            existing.members = normMembers;
            existing.member_count = normMembers.length;
          }
        } else {
          playersMap.set(cId, {
            user_id: cId,
            city_name: u.city_name || address,
            money: 500,
            home_name: u.home_name || (u.name ? `${u.name}'s Residence` : `${cId.split(/[@_]/)[0]}'s Residence`),
            address: address,
            coords: coords,
            budget: 150,
            members: normMembers,
            member_count: normMembers.length,
            all_families_count: 1,
            last_saved_at: u.last_login || u.registered_at || u.created_at || "Active",
          });
        }
      }
    }
  } catch {}

  const result = Array.from(playersMap.values());
  cachedAllPlayersList = result;
  cachedAllPlayersExpiry = Date.now() + 10000; // 10 seconds TTL
  return result;
}

// Permanently delete a citizen exclusively from MongoDB Atlas (civilization_world + civilization_auth) and memory
export async function deletePlayer(userId: string): Promise<boolean> {
  const cleanId = String(userId || "").trim().toLowerCase();

  // 1. Delete from in-memory cache
  if (inMemoryCache[cleanId]) {
    delete inMemoryCache[cleanId];
  }
  if (pendingSaveTimers[cleanId]) {
    clearTimeout(pendingSaveTimers[cleanId]);
    delete pendingSaveTimers[cleanId];
  }

  invalidatePlayersListCache();

  // 2. Delete from MongoDB civilization_world.players
  try {
    const collection = await getWorldCollection("players");
    if (collection) {
      await collection.deleteOne({ user_id: cleanId });
    }
  } catch (err) {
    console.warn("[MongoDB Delete World Standby]:", err);
  }

  // 3. Delete from MongoDB civilization_auth.users
  try {
    const authCol = await getAuthCollection("users");
    if (authCol) {
      await authCol.deleteOne({ $or: [{ user_id: cleanId }, { email: cleanId }] });
    }
  } catch (err) {
    console.warn("[MongoDB Delete Auth Standby]:", err);
  }

  return true;
}

// Complete database reset and initial seed matching 6 citizens architecture
export async function resetAndSeedDatabase(): Promise<boolean> {
  // Clear memory cache
  for (const key of Object.keys(inMemoryCache)) {
    delete inMemoryCache[key];
  }
  invalidatePlayersListCache();

  try {
    const worldCol = await getWorldCollection("players");
    if (worldCol) {
      await worldCol.deleteMany({});
    }
  } catch (err) {
    console.warn("[Reset DB World Warning]:", err);
  }

  try {
    const authCol = await getAuthCollection("users");
    if (authCol) {
      await authCol.deleteMany({});
    }
  } catch (err) {
    console.warn("[Reset DB Auth Warning]:", err);
  }

  const { createUser, hashPassword } = require("./auth");
  const defaultPass = hashPassword("1234");

  // 1. Seed Admin Account: vandan11patel@gmail.com (Admin)
  const adminEmail = "vandan11patel@gmail.com";
  await createUser({
    user_id: adminEmail,
    email: adminEmail,
    name: "Vandan Patel",
    password_hash: defaultPass,
    role: "admin",
    address: "Civilization Central Zone, Navsari",
    lat: 20.9472,
    lng: 72.9515,
    members: ["Thakorbhai", "Vasantiben", "Vandan", "Hetvi"]
  });

  const adminPlayer = createNewPlayer(adminEmail, {
    name: "Vandan Patel",
    address: "Civilization Central Zone, Navsari",
    lat: 20.9472,
    lng: 72.9515,
    members: ["Thakorbhai", "Vasantiben", "Vandan", "Hetvi"]
  });
  adminPlayer.password_hash = defaultPass;
  await savePlayer(adminPlayer, true);

  // Also register canonical vandan_11 admin alias
  const adminAlias = "vandan_11";
  await createUser({
    user_id: adminAlias,
    email: adminEmail,
    name: "Vandan Patel",
    password_hash: defaultPass,
    role: "admin",
    address: "Civilization Central Zone, Navsari",
    lat: 20.9472,
    lng: 72.9515,
    members: ["Thakorbhai", "Vasantiben", "Vandan", "Hetvi"]
  });
  const aliasPlayer = createNewPlayer(adminAlias, {
    name: "Vandan Patel",
    address: "Civilization Central Zone, Navsari",
    lat: 20.9472,
    lng: 72.9515,
    members: ["Thakorbhai", "Vasantiben", "Vandan", "Hetvi"]
  });
  aliasPlayer.password_hash = defaultPass;
  await savePlayer(aliasPlayer, true);

  // 2. Seed User Account: vpatelcode@gmail.com (User)
  const userEmail = "vpatelcode@gmail.com";
  await createUser({
    user_id: userEmail,
    email: userEmail,
    name: "VPatel Code",
    password_hash: defaultPass,
    role: "citizen",
    address: "West Coast Zone, Navsari",
    lat: 20.9460,
    lng: 72.9530,
    members: ["V1", "V2"]
  });

  const userPlayer = createNewPlayer(userEmail, {
    name: "VPatel Code",
    address: "West Coast Zone, Navsari",
    lat: 20.9460,
    lng: 72.9530,
    members: ["V1", "V2"]
  });
  userPlayer.password_hash = defaultPass;
  await savePlayer(userPlayer, true);

  invalidatePlayersListCache();
  return true;
}



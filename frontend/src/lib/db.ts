import { MongoClient, Db, Collection } from "mongodb";
import type { Document } from "mongodb";
import dns from "dns";

// Ensure resilient Google & Cloudflare DNS servers for MongoDB Atlas SRV resolution
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

// Direct Replica Set Connection String (bypasses SRV DNS lookup for 100% reliability on all networks/Windows)
export const DEFAULT_DIRECT_MONGODB_URI =
  "mongodb://vandan11patel_db_user:x1PeKhlVEIhI0I6z@ac-hfvqwrs-shard-00-00.zkzrq3s.mongodb.net:27017,ac-hfvqwrs-shard-00-01.zkzrq3s.mongodb.net:27017,ac-hfvqwrs-shard-00-02.zkzrq3s.mongodb.net:27017/?ssl=true&replicaSet=atlas-2908i9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

// MongoDB Primary Connection Configuration
export const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_DIRECT_MONGODB_URI;

// Multi-Database Names
export const DB_NAMES = {
  AUTH: process.env.MONGODB_DB_AUTH || "civilization_auth",
  WORLD: process.env.MONGODB_DB_WORLD || "civilization_world",
  CATALOG: process.env.MONGODB_DB_CATALOG || "civilization_catalog",
};

let cachedClient: MongoClient | null = null;
let isConnecting = false;
let connectPromise: Promise<MongoClient | null> | null = null;
let lastError: string | null = null;
let lastConnectedTime: number = 0;
let indexesInitialized = false;

/**
 * Connect to MongoDB Cluster with connection pooling and fast non-blocking recovery
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (cachedClient) {
    return cachedClient;
  }

  if (isConnecting && connectPromise) {
    return connectPromise;
  }

  isConnecting = true;
  connectPromise = (async () => {
    // 1. Try primary connection URI
    const targetUris = [MONGODB_URI];
    if (MONGODB_URI !== DEFAULT_DIRECT_MONGODB_URI) {
      targetUris.push(DEFAULT_DIRECT_MONGODB_URI);
    }

    for (const uri of targetUris) {
      try {
        const isDirect = !uri.startsWith("mongodb+srv://");
        const client = new MongoClient(uri, {
          connectTimeoutMS: 4000,
          serverSelectionTimeoutMS: 4000,
          socketTimeoutMS: 10000,
          maxPoolSize: 20,
          minPoolSize: 2,
        });

        await client.connect();
        cachedClient = client;
        lastConnectedTime = Date.now();
        lastError = null;
        console.log(
          `[MongoDB Cluster Connected] ${isDirect ? "Direct Replica Set" : "SRV"} connected for: ${Object.values(
            DB_NAMES
          ).join(", ")}`
        );

        // Initialize indexes in background
        if (!indexesInitialized) {
          indexesInitialized = true;
          initMultiDatabaseIndexes(client).catch((e) =>
            console.warn("[DB Index Warning]:", e.message)
          );
        }

        return client;
      } catch (err: any) {
        lastError = err?.message || String(err);
        // If it failed on SRV DNS querySrv, continue loop to try direct URI immediately
        if (uri.startsWith("mongodb+srv://")) {
          console.warn("[MongoDB DNS Notice] SRV lookup bypassed, falling back to direct replica set hosts...");
          continue;
        }
        console.error("[MongoDB Connection Error]:", lastError);
      }
    }

    cachedClient = null;
    return null;
  })();

  try {
    return await connectPromise;
  } finally {
    isConnecting = false;
    connectPromise = null;
  }
}

/**
 * Initialize database indexes across civilization databases
 */
async function initMultiDatabaseIndexes(client: MongoClient) {
  try {
    const authDb = client.db(DB_NAMES.AUTH);
    await authDb.collection("users").createIndex({ user_id: 1 }, { unique: true });
    await authDb.collection("users").createIndex({ email: 1 });
    await authDb.collection("otps").createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 });

    const worldDb = client.db(DB_NAMES.WORLD);
    await worldDb.collection("players").createIndex({ user_id: 1 }, { unique: true });

    const catalogDb = client.db(DB_NAMES.CATALOG);
    await catalogDb.collection("items").createIndex({ id: 1 });
    await catalogDb.collection("crops").createIndex({ id: 1 });
    await catalogDb.collection("recipes").createIndex({ id: 1 });
    await catalogDb.collection("buildings").createIndex({ id: 1 });
  } catch (err: any) {
    console.warn("[MongoDB Index Setup]:", err?.message || err);
  }
}

/**
 * Get the Auth Database (stores user credentials, OTPs, citizen registration details)
 */
export async function getAuthDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.AUTH);
}

/**
 * Get the World Database (stores players state, maps, zones, landmark coordinates)
 */
export async function getWorldDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.WORLD);
}

/**
 * Get the Catalog Database (stores dynamic item catalogs, crops, recipes, buildings, base prices)
 */
export async function getCatalogDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.CATALOG);
}

/**
 * Collection accessors for each database
 */
export async function getAuthCollection<T extends Document = any>(
  name: string
): Promise<Collection<T> | null> {
  const db = await getAuthDb();
  if (!db) return null;
  return db.collection<T>(name);
}

export async function getWorldCollection<T extends Document = any>(
  name: string
): Promise<Collection<T> | null> {
  const db = await getWorldDb();
  if (!db) return null;
  return db.collection<T>(name);
}

export async function getCatalogCollection<T extends Document = any>(
  name: string
): Promise<Collection<T> | null> {
  const db = await getCatalogDb();
  if (!db) return null;
  return db.collection<T>(name);
}

/**
 * Legacy compatibility helper: returns a collection in the WORLD database
 */
export async function getCollection(name: string) {
  return getWorldCollection(name);
}

/**
 * Legacy compatibility helper: returns client and world database
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return { client, db: client.db(DB_NAMES.WORLD) };
}

/**
 * Diagnostic health check across all MongoDB databases
 */
export async function getDbHealth() {
  const start = Date.now();
  const client = await getMongoClient();
  const latency = Date.now() - start;

  if (!client) {
    return {
      ok: false,
      status: "disconnected",
      error: lastError || "Failed to establish cluster connection",
      databases: DB_NAMES,
      connectedAt: null,
    };
  }

  try {
    const authDb = client.db(DB_NAMES.AUTH);
    const worldDb = client.db(DB_NAMES.WORLD);
    const catalogDb = client.db(DB_NAMES.CATALOG);

    const [userCount, playerCount, itemsCount] = await Promise.all([
      authDb.collection("users").countDocuments().catch(() => 0),
      worldDb.collection("players").countDocuments().catch(() => 0),
      catalogDb.collection("items").countDocuments().catch(() => 0),
    ]);

    return {
      ok: true,
      status: "connected",
      latencyMs: latency,
      connectedAt: new Date(lastConnectedTime).toISOString(),
      databases: {
        auth: { name: DB_NAMES.AUTH, users_count: userCount },
        world: { name: DB_NAMES.WORLD, players_count: playerCount },
        catalog: { name: DB_NAMES.CATALOG, items_count: itemsCount },
      },
    };
  } catch (err: any) {
    return {
      ok: false,
      status: "degraded",
      error: err?.message || String(err),
      latencyMs: latency,
      databases: DB_NAMES,
    };
  }
}


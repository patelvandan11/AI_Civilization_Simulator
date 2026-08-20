import { MongoClient, Db, Collection } from "mongodb";
import type { Document } from "mongodb";
import dns from "dns";

// Prefer public DNS resolvers so Atlas SRV/host lookups succeed on Windows networks.
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

// Direct replica-set URI (bypasses SRV lookup when DNS blocks querySrv).
const DEFAULT_DIRECT_MONGODB_URI =
  "mongodb://vandan11patel_db_user:x1PeKhlVEIhI0I6z@ac-hfvqwrs-shard-00-00.zkzrq3s.mongodb.net:27017,ac-hfvqwrs-shard-00-01.zkzrq3s.mongodb.net:27017,ac-hfvqwrs-shard-00-02.zkzrq3s.mongodb.net:27017/?ssl=true&replicaSet=atlas-2908i9-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

const DEFAULT_SRV_MONGODB_URI =
  "mongodb+srv://vandan11patel_db_user:x1PeKhlVEIhI0I6z@cluster0.zkzrq3s.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

function uniqueUris(...candidates: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  const uris: string[] = [];
  for (const candidate of candidates) {
    const uri = candidate?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    uris.push(uri);
  }
  return uris;
}

/** Ordered URI list: direct first (most reliable on Windows), then SRV fallbacks. */
function getConnectionUris(): string[] {
  return uniqueUris(
    process.env.MONGODB_URI,
    process.env.MONGODB_DIRECT_URI,
    DEFAULT_DIRECT_MONGODB_URI,
    process.env.MONGODB_SRV_URI,
    DEFAULT_SRV_MONGODB_URI
  );
}

export const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_DIRECT_MONGODB_URI;

// Multi-database names (legacy MONGODB_DB is ignored — data lives in the *_auth/world/catalog DBs).
export const DB_NAMES = {
  AUTH: process.env.MONGODB_DB_AUTH || "civilization_auth",
  WORLD: process.env.MONGODB_DB_WORLD || "civilization_world",
  CATALOG: process.env.MONGODB_DB_CATALOG || "civilization_catalog",
};

const CLIENT_OPTIONS = {
  connectTimeoutMS: 8000,
  serverSelectionTimeoutMS: 8000,
  socketTimeoutMS: 20000,
  maxPoolSize: 50,
  minPoolSize: 2,
  maxIdleTimeMS: 60000,
  waitQueueTimeoutMS: 8000,
  family: 4 as const,
  retryWrites: true,
  retryReads: true,
};

let cachedClient: MongoClient | null = null;
let isConnecting = false;
let connectPromise: Promise<MongoClient | null> | null = null;
let lastError: string | null = null;
let lastConnectedTime = 0;
let indexesInitialized = false;

async function isClientHealthy(client: MongoClient): Promise<boolean> {
  try {
    await client.db("admin").command({ ping: 1 }, { timeoutMS: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function resetMongoConnection(): Promise<void> {
  const client = cachedClient;
  cachedClient = null;
  if (client) {
    try {
      await client.close();
    } catch {}
  }
}

async function connectWithUri(uri: string): Promise<MongoClient> {
  const client = new MongoClient(uri, CLIENT_OPTIONS);
  await client.connect();
  await client.db("admin").command({ ping: 1 }, { timeoutMS: 5000 });
  return client;
}

/**
 * Connect to MongoDB with multi-URI fallback, pooling, and stale-connection recovery.
 */
export async function getMongoClient(): Promise<MongoClient | null> {
  if (cachedClient) {
    if (await isClientHealthy(cachedClient)) {
      return cachedClient;
    }
    console.warn("[MongoDB] Cached connection stale — reconnecting...");
    await resetMongoConnection();
  }

  if (isConnecting && connectPromise) {
    return connectPromise;
  }

  isConnecting = true;
  connectPromise = (async () => {
    const targetUris = getConnectionUris();

    for (const uri of targetUris) {
      const isDirect = !uri.startsWith("mongodb+srv://");
      try {
        const client = await connectWithUri(uri);
        cachedClient = client;
        lastConnectedTime = Date.now();
        lastError = null;
        console.log(
          `[MongoDB Cluster Connected] ${isDirect ? "Direct Replica Set" : "SRV"} connected for: ${Object.values(
            DB_NAMES
          ).join(", ")}`
        );

        if (!indexesInitialized) {
          indexesInitialized = true;
          initMultiDatabaseIndexes(client).catch((e) =>
            console.warn("[DB Index Warning]:", e.message)
          );
        }

        return client;
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (uri.startsWith("mongodb+srv://")) {
          console.warn("[MongoDB DNS Notice] SRV lookup failed, trying next URI...");
        } else {
          console.warn("[MongoDB Connection Error]:", lastError);
        }
      }
    }

    cachedClient = null;
    console.error("[MongoDB] All connection URIs failed:", lastError);
    return null;
  })();

  try {
    return await connectPromise;
  } finally {
    isConnecting = false;
    connectPromise = null;
  }
}

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

export async function getAuthDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.AUTH);
}

export async function getWorldDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.WORLD);
}

export async function getCatalogDb(): Promise<Db | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return client.db(DB_NAMES.CATALOG);
}

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

export async function getCollection(name: string) {
  return getWorldCollection(name);
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  const client = await getMongoClient();
  if (!client) return null;
  return { client, db: client.db(DB_NAMES.WORLD) };
}

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
    await resetMongoConnection();
    return {
      ok: false,
      status: "degraded",
      error: err?.message || String(err),
      latencyMs: latency,
      databases: DB_NAMES,
    };
  }
}

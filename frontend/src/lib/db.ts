import { MongoClient, Db } from "mongodb";
import dns from "dns";

try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

// MongoDB connection settings
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://vandan11patel_db_user:x1PeKhlVEIhI0I6z@cluster0.zkzrq3s.mongodb.net/?appName=Cluster0";
const MONGODB_DB = process.env.MONGODB_DB || "civilization";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;
let lastConnectAttempt = 0;
let isMongoDisabled = false;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Back off for 30s after a failed connection so we don't block requests
  const now = Date.now();
  if (isMongoDisabled && now - lastConnectAttempt < 30000) {
    return null;
  }
  lastConnectAttempt = now;

  try {
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    await client.connect();
    const db = client.db(MONGODB_DB);

    cachedClient = client;
    cachedDb = db;
    isMongoDisabled = false;
    console.log(`[MongoDB Connected] Successfully connected to database '${MONGODB_DB}'.`);
    return { client, db };
  } catch (err: any) {
    isMongoDisabled = true;
    console.warn("[MongoDB Connection Standby] Falling back to file storage:", err?.message || err);
    return null;
  }
}

export async function getCollection(name: string) {
  const connection = await connectToDatabase();
  if (!connection) return null;
  return connection.db.collection(name);
}

import { MongoClient, Db } from "mongodb";

// MongoDB connection settings
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/civilization";
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
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    const db = client.db(MONGODB_DB);

    cachedClient = client;
    cachedDb = db;
    isMongoDisabled = false;
    return { client, db };
  } catch (err) {
    isMongoDisabled = true;
    // Quiet fallback to disk storage
    return null;
  }
}

export async function getCollection(name: string) {
  const connection = await connectToDatabase();
  if (!connection) return null;
  return connection.db.collection(name);
}

import crypto from "crypto";
import { getAuthCollection } from "./db";

export interface UserDocument {
  _id?: any;
  user_id: string; // Canonical identifier (lowercased email or username)
  email?: string;
  name?: string;
  password_hash: string;
  role: "admin" | "citizen";
  address?: string;
  lat?: number;
  lng?: number;
  members?: string[];
  created_at: string;
  last_login_at?: string;
  is_verified?: boolean;
}

export interface OtpDocument {
  _id?: any;
  email: string;
  code: string;
  created_at: Date;
  expires_at: Date;
  used: boolean;
}

/**
 * Generates a cryptographically strong PBKDF2 password hash
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against various hash algorithms (PBKDF2, legacy SHA-256, plaintext)
 */
export function verifyPassword(
  password: string,
  storedHash?: string,
  storedSalt?: string
): boolean {
  if (!storedHash) return false;

  // 1. Check PBKDF2 format (salt:hash)
  if (storedHash.includes(":")) {
    const [salt, originalHash] = storedHash.split(":");
    if (!salt || !originalHash) return false;
    try {
      const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
      return hash === originalHash;
    } catch {
      return false;
    }
  }

  // 2. Check legacy Salted SHA-256 (if salt provided separately or 64-char sha256)
  if (storedSalt) {
    const hash1 = crypto.createHash("sha256").update(storedSalt + password).digest("hex");
    const hash2 = crypto.createHash("sha256").update(password + storedSalt).digest("hex");
    if (hash1 === storedHash || hash2 === storedHash) return true;
  }

  // 3. Check direct SHA-256
  const directSha256 = crypto.createHash("sha256").update(password).digest("hex");
  if (directSha256 === storedHash) return true;

  // 4. Plaintext fallback
  return storedHash === password;
}

/**
 * Check if a citizen account exists in the MongoDB auth database
 */
export async function userExists(identifier: string): Promise<boolean> {
  const cleanId = String(identifier || "").trim().toLowerCase();
  if (!cleanId) return false;

  try {
    const col = await getAuthCollection<UserDocument>("users");
    if (col) {
      const doc = await col.findOne({
        $or: [{ user_id: cleanId }, { email: cleanId }],
      });
      if (doc) return true;
    }
  } catch (err) {
    console.warn("[MongoDB Auth]: userExists check failed:", err);
  }

  return false;
}

/**
 * Retrieve user document from the MongoDB auth database
 */
export async function findUser(identifier: string): Promise<UserDocument | null> {
  const cleanId = String(identifier || "").trim().toLowerCase();
  if (!cleanId) return null;

  try {
    const col = await getAuthCollection<UserDocument>("users");
    if (col) {
      const doc = await col.findOne({
        $or: [{ user_id: cleanId }, { email: cleanId }],
      });
      if (doc) return doc;
    }
  } catch (err) {
    console.warn("[MongoDB Auth]: findUser query failed:", err);
  }

  return null;
}

/**
 * Create or register a new user in MongoDB civilization_auth database
 */
export async function createUser(userData: {
  user_id: string;
  email?: string;
  name?: string;
  password?: string;
  password_hash?: string;
  role?: "admin" | "citizen";
  address?: string;
  lat?: number;
  lng?: number;
  members?: string[];
}): Promise<UserDocument> {
  const cleanId = userData.user_id.trim().toLowerCase();
  const email = (userData.email || cleanId).trim().toLowerCase();
  const passwordHash = userData.password_hash || (userData.password ? hashPassword(userData.password) : "");

  const adminEmail = (process.env.ADMIN_EMAIL || "vandan11patel@gmail.com").toLowerCase().trim();
  const role: "admin" | "citizen" =
    userData.role || (cleanId === "vandan_11" || email === adminEmail ? "admin" : "citizen");

  const userDoc: UserDocument = {
    user_id: cleanId,
    email,
    name: userData.name || cleanId.split(/[@_]/)[0],
    password_hash: passwordHash,
    role,
    address: userData.address || "Civilization Citizen Zone",
    lat: userData.lat || 20.9472,
    lng: userData.lng || 72.9515,
    members: userData.members || [],
    created_at: new Date().toISOString(),
    last_login_at: new Date().toISOString(),
    is_verified: true,
  };

  try {
    const col = await getAuthCollection<UserDocument>("users");
    if (col) {
      await col.replaceOne({ user_id: cleanId }, userDoc, { upsert: true });
    }
  } catch (err) {
    console.error("[MongoDB Auth]: Failed to write user to MongoDB:", err);
  }

  return userDoc;
}

/**
 * Update user's password in MongoDB auth database
 */
export async function updateUserPassword(
  identifier: string,
  newPasswordHash: string
): Promise<boolean> {
  const cleanId = identifier.trim().toLowerCase();
  try {
    const col = await getAuthCollection<UserDocument>("users");
    if (col) {
      const res = await col.updateOne(
        { $or: [{ user_id: cleanId }, { email: cleanId }] },
        { $set: { password_hash: newPasswordHash, updated_at: new Date().toISOString() } }
      );
      return res.matchedCount > 0;
    }
  } catch (err) {
    console.error("[MongoDB Auth]: Password update error:", err);
  }
  return false;
}

/**
 * Record successful login in MongoDB auth database
 */
export async function recordUserLogin(identifier: string): Promise<void> {
  const cleanId = identifier.trim().toLowerCase();
  try {
    const col = await getAuthCollection<UserDocument>("users");
    if (col) {
      await col.updateOne(
        { $or: [{ user_id: cleanId }, { email: cleanId }] },
        { $set: { last_login_at: new Date().toISOString() } }
      );
    }
  } catch {}
}

/**
 * Store OTP in MongoDB civilization_auth.otps collection
 */
export async function storeOtpInDb(email: string, code: string, ttlMinutes = 10): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  try {
    const col = await getAuthCollection<OtpDocument>("otps");
    if (col) {
      await col.deleteMany({ email: cleanEmail }); // Clear previous OTPs
      await col.insertOne({
        email: cleanEmail,
        code: code.trim(),
        created_at: now,
        expires_at: expiresAt,
        used: false,
      });
    }
  } catch (err) {
    console.warn("[MongoDB Auth]: Failed to store OTP in Mongo:", err);
  }
}

/**
 * Verify OTP from MongoDB civilization_auth.otps collection
 */
export async function verifyOtpInDb(email: string, code: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.trim();

  try {
    const col = await getAuthCollection<OtpDocument>("otps");
    if (col) {
      const entry = await col.findOne({
        email: cleanEmail,
        code: cleanCode,
        used: false,
        expires_at: { $gt: new Date() },
      });

      if (entry) {
        await col.updateOne({ _id: entry._id }, { $set: { used: true } });
        return true;
      }
    }
  } catch (err) {
    console.warn("[MongoDB Auth]: Failed to verify OTP in Mongo:", err);
  }

  return false;
}


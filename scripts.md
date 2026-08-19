# 🛠️ AI Civilization Simulator — Scripts & Operational Tooling Reference

This document catalogs all build, development, testing, database seeding, and diagnostic scripts for the **Navsari AI Civilization Simulator**.

---

## 1. Development & Build Commands

All commands should be executed from within the `frontend/` directory:

```bash
# Navigate to frontend package
cd frontend

# Install dependencies
npm install

# Launch Next.js local development server (http://localhost:3000)
npm run dev

# Perform TypeScript strict static type checking (0 errors standard)
npx tsc --noEmit

# Build production bundle with optimized static & server rendering
npm run build

# Start production server
npm run start

# Run Next.js linter
npm run lint
```

---

## 2. Database & Environment Configuration

Create or verify `frontend/.env.local` with the following production keys:

```env
# MongoDB Atlas Multi-Tenant Cloud Connection String
MONGODB_URI=mongodb+srv://vandan11patel_db_user:x1PeKhlVEIhI0I6z@cluster0.zkzrq3s.mongodb.net/?appName=Cluster0
MONGODB_DB=civilization_db

# Supreme Administrator Identity
ADMIN_EMAIL=vandan11patel@gmail.com
NEXT_PUBLIC_ADMIN_EMAIL=vandan11patel@gmail.com

# SMTP Email Verification Provider (Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=vandan11patel@gmail.com
SMTP_PASS=your_gmail_app_password_here
SMTP_FROM="Navsari AI Civilization <vandan11patel@gmail.com>"
```

---

## 3. Account Seeding & Database Operations

### 3.1. Seeding Supreme Admin Account
To programmatically seed or reset the default supreme admin profile:

```javascript
// scratch/seed_user.js
const { MongoClient } = require("mongodb");

async function seedAdmin() {
  const uri = process.env.MONGODB_URI || "mongodb+srv://vandan11patel_db_user:x1PeKhlVEIhI0I6z@cluster0.zkzrq3s.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db("civilization_db");

  const adminState = {
    user_id: "vandan11patel@gmail.com",
    money: 10000,
    city_treasury: 5000,
    tax_rate: 10,
    clock: { total_seconds: 480, speed: 1, weather: "Clear" },
    automated_farming_enabled: true,
    city_manager_enabled: true
  };

  await db.collection("players").updateOne(
    { user_id: adminState.user_id },
    { $set: adminState },
    { upsert: true }
  );

  console.log("Admin seeded successfully.");
  await client.close();
}

seedAdmin();
```

---

## 4. Audio Asset Management

To add your own custom background music to the simulator:

1. Place any standard `.mp3`, `.wav`, or `.ogg` audio file at:
   ```
   frontend/public/audio/cozy_tunes.mp3
   ```
2. *(Alternative valid filenames)*:
   - `frontend/public/audio/cozy.mp3`
   - `frontend/public/audio/music.mp3`
   - `frontend/public/audio/ambient.mp3`
3. The built-in audio engine will automatically detect your MP3 track and loop it with volume and mute controls.
4. If no MP3 is present, the simulator falls back to the built-in Web Audio procedural Kalimba/Piano synthesizer.

---

## 5. API Testing via cURL & HTTP

### 5.1. Fetch Live Civilization Status:
```bash
curl -X GET "http://localhost:3000/api/status?user_id=vandan11patel@gmail.com"
```

### 5.2. Advance Multi-Speed Simulation:
```bash
curl -X POST "http://localhost:3000/api/action" \
  -H "Content-Type: application/json" \
  -d '{"action": "set_speed", "user_id": "vandan11patel@gmail.com", "speed": 10, "paused": false}'
```

### 5.3. Trigger Autonomous Kisan Farming Agent:
```bash
curl -X POST "http://localhost:3000/api/action" \
  -H "Content-Type: application/json" \
  -d '{"action": "run_kisan_agent", "user_id": "vandan11patel@gmail.com"}'
```

### 5.4. Trigger Autonomous Industrial Supply Chain Agent:
```bash
curl -X POST "http://localhost:3000/api/action" \
  -H "Content-Type: application/json" \
  -d '{"action": "run_industrial_agent", "user_id": "vandan11patel@gmail.com"}'
```

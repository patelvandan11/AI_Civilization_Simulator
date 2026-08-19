# 🏛️ AI Civilization Simulator — Navsari Micro-Nation

An autonomous, full-stack, real-time micro-nation simulation sandbox set in **Navsari, Gujarat, India** (`20.9467° N, 72.9520° E`). Designed with deep economic modeling, dynamic GIS satellite map navigation, multi-speed clock acceleration, industrial petroleum refining supply chains, democratic governance, autonomous LangChain AI agents, and a cozy aesthetic audio/visual experience.

---

> ### 📢 Playtester & Citizen Feedback
> **Share your experience, ratings, and feature requests via our live Google Form:**  
> 👉 **[Submit Your Review on Google Forms (https://forms.gle/1fZbiLkoaL3jP1fW9)](https://forms.gle/1fZbiLkoaL3jP1fW9)** 👈  
> *All submitted ratings and comments automatically sync to **[`review.md`](review.md)** in real time.*

---

## 📚 Complete Documentation Index

| Document | Description |
| :--- | :--- |
| 🔄 **[`workflow.md`](workflow.md)** | **End-to-End Operational Workflows**: Complete Mermaid sequence diagrams and step-by-step user journeys for citizen onboarding, OTP verification, geospatial commuting, multi-speed time engine, autonomous farming, petroleum supply chains, and democratic elections. |
| 🏗️ **[`system_design.md`](system_design.md)** | **Technical Architecture & Data Models**: Full TypeScript interface specifications (`PlayerState`, `FarmPlot`, `FamilyMember`, `Industry`), mathematical simulation formulas for clock acceleration & crop maturation, API endpoint contracts (`/api/status`, `/api/action`), and RBAC civic security. |
| 🛠️ **[`scripts.md`](scripts.md)** | **Tooling, Seeding & CLI Reference**: Quick command reference for Next.js build/dev workflows (`npm run dev`, `npx tsc --noEmit`), MongoDB Atlas configuration, admin account seeding scripts, audio asset paths, and cURL API test triggers. |
| 🌍 **[`overall_working.md`](overall_working.md)** | **Definitive Master Working Guide**: High-level functional manual explaining the simulation clock mechanics, 24-hr IST daily citizen life schedules, agricultural harvesting, 4 heavy industrial sectors, dynamic retail pricing, social welfare nets, and Day/Night mode styling. |
| 📝 **[`form.md`](form.md)** | **Playtester Evaluation Form & Rubric**: 1-to-5 star rating rubric, structured category questionnaires (Visuals, Audio, Simulation Pacing, Farming, Industry, GIS Map, Governance), and copy-paste Markdown submission template. |
| ⭐ **[`review.md`](review.md)** | **Live User Reviews & Ratings Feed**: Real-time community review hub directly integrated with our official **[Google Form (https://forms.gle/1fZbiLkoaL3jP1fW9)](https://forms.gle/1fZbiLkoaL3jP1fW9)**. |

---

## 🌟 Key Simulation Features

```mermaid
graph TB
    subgraph Core Simulation
        Clock[Multi-Speed IST Clock 1x to 1000x]
        GIS[Leaflet GPS Satellite Map & Road Commutes]
        Theme[Cozy Day Mode & Midnight Obsidian Mode]
        Audio[Dual-Mode Audio: MP3 Player + Procedural Lofi Synth]
    end

    subgraph Pillars of Civilization
        Agri[12 Crop Plots & Kisan LangChain AI Agent]
        Industry[4 Heavy Sectors: Shipyard, Refinery, Station, Smelter]
        Commerce[5 Retail Shops & Daily Dynamic Commodity Exchange]
        Gov[Democratic Elections, 10-Year Cycles & Social Welfare]
    end

    Clock --> Agri
    Clock --> Industry
    Clock --> Commerce
    Clock --> Gov
    GIS --> Core Simulation
```

### 1. 🕒 Multi-Speed Simulation Engine
- **1 In-Game Hour = 60 Seconds** (1 real-time minute at 1×).
- **1 In-Game Day = 1440 Seconds** (24 real-time minutes at 1×).
- Multi-speed multipliers: `⏸ PAUSE`, `1× (Normal)`, `10× (Fast)`, `60× (1 hr/sec)`, and `1000× (Super Warp)`.
- Dynamic hourly news bulletins with real-time in-game timestamps (`Day X • HH:MM hrs (IST)`).

### 2. 🌾 Agricultural Cultivation & Kisan LangChain Agent
- 12 interactive crop plots with growth countdowns and harvest triggers.
- Kisan Seed Market Depot with certified seeds for grain, vegetables, and fruit orchards.
- Autonomous Kisan AI Agent audits barn deficits, procures seeds, and plants empty soil.

### 3. 🏭 Heavy Industry & Energy Supply Chains
- **Sector 1 (Shipyard)**: Harbor fleet management (cargo vessels, ferries, trawlers) and deep-sea voyages.
- **Sector 2 (Oil Refinery)**: Catalytic distillation cracking crude into gasoline, diesel, and marine bunker fuel.
- **Sector 3 (Highway 48 Superstation)**: Automated citizen vehicle refueling with 10% city tax credits.
- **Sector 4 (Heavy Foundry)**: Blast furnaces converting raw iron ore into structural steel beams.

### 4. 🏛️ Democratic Governance & Welfare Safety Net
- Every 10 in-game years (10 days), citizens cast democratic ballots for Prime Minister, District Magistrate, and Cabinet Ministers.
- Automated social welfare subsidy payouts ($15) for low-budget households from the municipal treasury.

### 5. 🎵 Dual-Mode Audio Experience
- **Custom MP3 Music Track**: Place any audio file at `frontend/public/audio/cozy_tunes.mp3` for seamless looping background music.
- **Built-in Procedural Synthesizer**: Lush acoustic Kalimba & Piano chord progression with warm lowpass filters.

---

## 🚀 Quick Start & Installation

```bash
# Clone the repository
git clone https://github.com/patelvandan11/AI_Civilization_Simulator.git
cd AI_Civilization_Simulator/frontend

# Install dependencies
npm install

# Configure environment variables (.env.local)
# See scripts.md for full configuration

# Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

## 📜 License
Developed with Google DeepMind Advanced Agentic AI pair programming. MIT License.

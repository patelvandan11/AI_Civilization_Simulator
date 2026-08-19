# 🔄 AI Civilization Simulator — Comprehensive Workflow Guide

This document outlines the end-to-end operational workflows for citizens, administrators, autonomous AI agents, and system sub-modules in the **Navsari AI Civilization Simulator**.

---

## Table of Contents
1. [Citizen Onboarding & Authentication Workflow](#1-citizen-onboarding--authentication-workflow)
2. [Simulation Timeline & Multi-Speed Clock Workflow](#2-simulation-timeline--multi-speed-clock-workflow)
3. [Geospatial City Map & Dynamic Commute Workflow](#3-geospatial-city-map--dynamic-commute-workflow)
4. [Agricultural Farming & Kisan AI Agent Workflow](#4-agricultural-farming--kisan-ai-agent-workflow)
5. [Industrial Revolution & Petroleum Supply Chain Workflow](#5-industrial-revolution--petroleum-supply-chain-workflow)
6. [Household Commerce, Grocery & Market Restock Workflow](#6-household-commerce-grocery--market-restock-workflow)
7. [Governance, Cabinet PMO & Democratic Election Workflow](#7-governance-cabinet-pmo--democratic-election-workflow)
8. [Master Resource Inventory & Census Monitoring Workflow](#8-master-resource-inventory--census-monitoring-workflow)
9. [Audio & Theme Customization Workflow](#9-audio--theme-customization-workflow)

---

## 1. Citizen Onboarding & Authentication Workflow

```mermaid
graph TD
    A[Visitor Accesses Portal] --> B{Choose Auth Method}
    B -->|Email / Mobile OTP| C[Enter Email or Indian Mobile]
    B -->|Password Login| D[Enter Email/Username + Password]
    B -->|Magic Link| E[Direct Token Authentication]
    C --> F[System Generates 6-digit Secure OTP]
    F --> G[Dispatch via Nodemailer / SMS Provider]
    G --> H[User Submits OTP Verification Code]
    H --> I{User Exists in DB?}
    I -->|Yes| J[Load PlayerState from MongoDB Atlas]
    I -->|No| K[Open Citizen Profile Creation Dialog]
    K --> L[Select Residence Coordinates on Interactive Leaflet Map]
    L --> M[Enter Family Members & Household Name]
    M --> N[Initialize Base PlayerState & Assign Residence]
    D --> J
    E --> J
    N --> O[Access Civilization Dashboard]
    J --> O
```

### Key Steps:
1. **Interactive Registration**: New citizens pick their exact residential plot on a live satellite GIS map centered in Navsari (`20.9467° N, 72.9520° E`).
2. **Role & Household Initialization**: Default family members are assigned occupations (Farmer, Merchant, Factory Worker, Engineer, Teacher, Doctor, Student).
3. **Session Persistence**: Authentication state is stored securely in `localStorage` (`civilization_active_user`) and synced with MongoDB Atlas.

---

## 2. Simulation Timeline & Multi-Speed Clock Workflow

```mermaid
sequenceDiagram
    participant User as UI Controls
    participant Frontend as Next.js Client (page.tsx)
    participant ActionAPI as /api/action (POST)
    participant StatusAPI as /api/status (GET)
    participant SimEngine as simulation.ts

    User->>Frontend: Selects 10x / 60x / 1000x or Pause
    Frontend->>ActionAPI: POST { action: "set_speed", speed: 10, paused: false }
    ActionAPI->>SimEngine: Sets player.clock.speed = 10, paused = false
    ActionAPI-->>Frontend: Returns { ok: true, clock: {...} }
    
    loop Every 250ms (High-Frequency Ticker)
        Frontend->>ActionAPI: POST { action: "step_simulation", seconds: 2.5 }
        ActionAPI->>SimEngine: runSimulationTick(player, inGameDeltaSeconds: 2.5)
        SimEngine->>SimEngine: Advances total_seconds, ticks routines, crops, economy
        ActionAPI-->>Frontend: Updated Clock & State
        Frontend->>StatusAPI: Fast Poll (300ms)
        StatusAPI-->>Frontend: Fresh Plots, News, Vehicles, Citizens
    end
```

### Time Mechanics:
- **1 In-Game Hour** = `60 seconds` (1 real minute at 1× speed).
- **1 In-Game Day** = `1440 seconds` (24 real minutes at 1× speed).
- **Speed Multipliers**:
  - `1×`: Real-time baseline.
  - `10×`: 1 in-game hour passes in **6 real seconds**.
  - `60×`: 1 in-game hour passes in **1 real second**.
  - `1000×`: Super Warp mode for rapid century/era simulations.

---

## 3. Geospatial City Map & Dynamic Commute Workflow

```mermaid
flowchart TD
    Clock[Current In-Game Clock IST] --> Condition{Time of Day}
    Condition -->|00:00 - 08:00| Bed[Sleeping at Family Residence]
    Condition -->|08:00 - 08:30| Breakfast[Eating Breakfast & Prep]
    Condition -->|08:30 - 09:00| CommuteOut[Commute Along Road to Destination]
    Condition -->|09:00 - 17:00| Work[Work Shift: Farms / Factory / Shops / School]
    Condition -->|17:00 - 17:30| CommuteShop[Commute to Farmers Market & Dairy]
    Condition -->|17:30 - 18:00| Shopping[Grocery Shopping & Provisions]
    Condition -->|18:00 - 19:00| CommuteHome[Return Home Along Highway 48]
    Condition -->|19:00 - 22:00| Dinner[Family Dinner & Evening Leisure]
    Condition -->|22:00 - 00:00| Sleep[Night Curfew & Rest]

    CommuteOut --> Map[Leaflet GPS Interpolation]
    CommuteShop --> Map
    CommuteHome --> Map
    Map --> Render[Live Marker Render: 🚗 Car / 🛵 Scooter / 🚜 Tractor / 🚶 Walk]
```

---

## 4. Agricultural Farming & Kisan AI Agent Workflow

```mermaid
graph TD
    A[Farm Plots 1 to 12] --> B{Plot State}
    B -->|Empty| C[Plant Seeds from Kisan Depot]
    B -->|Growing| D[Clock Ticks: Remaining Seconds Decrement]
    B -->|Ready| E[Manual Harvest or Auto Kisan Agent]
    
    C -->|Choose Crop| C1[Wheat / Carrot / Corn / Broccoli / Chili / Apple / etc.]
    C1 --> C2[Deduct Seed from Bag, record planted_game_seconds]
    C2 --> D
    
    E --> F[Produce Added to Personal Bag + Farm Barn + Market Shelves]
    F --> G[Dynamic Market Price Applied]
    
    subgraph Autonomous Kisan AI Agent
        K1[Scan 12 Plots & Barn Stock] --> K2[Check Deficits < 5 Target]
        K2 --> K3[Harvest All Ready Crops]
        K3 --> K4[Procure Missing Seeds from Seed Depot]
        K4 --> K5[Auto-Plant Empty Soil Plots]
        K5 --> K6[Generate Detailed Execution Audit Report]
    end
```

---

## 5. Industrial Revolution & Petroleum Supply Chain Workflow

```mermaid
graph LR
    subgraph Sector 2: Gulf Oil Refinery
        Crude[Raw Coastal Crude Oil] --> Cracking[Catalytic Distillation Cracker]
        Cracking --> Petrol[High-Octane Petrol]
        Cracking --> Diesel[Heavy Diesel Fuel]
        Cracking --> Bunker[Marine Bunker Fuel]
    end

    subgraph Sector 3: Highway 48 Superstation
        Petrol --> FuelPump[Pump Petrol Dispenser]
        Diesel --> DieselPump[Pump Diesel Dispenser]
        FuelPump --> Citizens[Citizen Cars, Scooters, Tractors]
        Citizens --> Tax[10% Fuel Tax to Civic Treasury]
    end

    subgraph Sector 1: Coastal Shipyard
        Bunker --> Fleet[Cargo Ships, Ferries, Trawlers]
        Fleet --> Voyage[Maritime Trade Voyages]
        Voyage --> FishRevenue[Deep Sea Fish Catch & Cargo Export]
    end

    subgraph Sector 4: Heavy Foundry
        IronOre[Iron Ore Stock] --> Smelter[Blast Furnaces]
        Smelter --> SteelBeams[Structural Steel Beams]
        SteelBeams --> Infra[Civic Bridges, Berths & Roads]
    end
```

---

## 6. Household Commerce, Grocery & Market Restock Workflow

1. **Daily Wages Payout (17:00)**: Working citizens receive wages ($10 - $45/day) into their family household budget.
2. **Grocery Shopping (17:00 - 18:00)**:
   - Family heads visit **Farmers Market** & **Dairy Depot**.
   - Purchase fresh vegetables (Carrots, Broccoli, Cabbage, Corn, Wheat), Milk, and Eggs based on household member count.
   - Sales tax (5%) is collected directly into the **Civic Treasury**.
3. **Morning Merchant Restock (06:00)**:
   - Shopkeepers audit inventory shelves.
   - Buy bulk wholesale goods from Player Brokerage reserves, earning gold for the player.

---

## 7. Governance, Cabinet PMO & Democratic Election Workflow

```mermaid
stateDiagram-v2
    [*] --> ActiveGovernance
    ActiveGovernance --> MidnightAudit: In-Game 00:00 Midnight
    MidnightAudit --> TaxCollection: Collect Corporate Tax (10%) & Citizen Income Tax
    TaxCollection --> WelfareCheck: Audit Low Budgets (< $15)
    WelfareCheck --> IssueSubsidy: Payout $15 Welfare from Treasury
    
    ActiveGovernance --> MiddayCabinet: In-Game 12:00 Midday
    MiddayCabinet --> InfrastructureFunding: Auto-Allocate $50 to School/Hospital/Park/Roads
    MiddayCabinet --> TaxPolicyBalancing: Adjust Income Tax based on Treasury Health
    
    ActiveGovernance --> ElectionCycle: Every 10 In-Game Years (10 Days)
    ElectionCycle --> CitizenVoting: Cast Ballots for PM, DM & Ministers
    CitizenVoting --> NewCabinetPMO: Swear In New Democratic Government
```

---

## 8. Master Resource Inventory & Census Monitoring Workflow

- **Master Inventory Modal (`Ctrl+I` / Quick Pill)**:
  - Aggregates resource metrics across all 4 holding areas: **Barn/Silo**, **Warehouse**, **Market Shelves**, and **Family Pantries**.
  - Category filters: All, Crops & Grains, Livestock & Dairy, Textiles & Fiber, Heavy Materials & Fuels.
- **Master Citizen Census Modal**:
  - Lists all 7 core historical residences and custom worker hostels.
  - Search by citizen name, career, or residence.
  - Administrative actions: Edit Member Role, Change Vehicle, Build Residence, Transfer Citizen, Teleport Camera.

---

## 9. Audio & Theme Customization Workflow

```mermaid
graph TD
    Audio[Audio Engine sound.ts] --> CheckMP3{MP3 file in public/audio/cozy_tunes.mp3?}
    CheckMP3 -->|Found| HTML5[HTML5 Audio Player: Smooth Looping Ambient Track]
    CheckMP3 -->|Not Found| Synth[Web Audio Procedural Synthesizer]
    Synth --> Chords[Warm Lowpass Filtered Chords: Cmaj7, Am7, Fmaj7, G7]
    Synth --> Kalimba[Gentle Arpeggiated Kalimba Notes]
    Audio --> Click[Procedural Wooden UI Clicks & Success Chimes]

    Theme[Theme Engine] --> Mode{Theme Mode State}
    Mode -->|Day Mode| CozyDay[Warm Linen White / Cream / Amber Borders / Soft Parchment]
    Mode -->|Night Mode| Obsidian[Deep Obsidian / Midnight Slate / Neon Amber & Sky Blue]
    Mode -->|Auto| AutoTime[Auto Switched: Day 06:00-19:00, Night 19:00-06:00]
```

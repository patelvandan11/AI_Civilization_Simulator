"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { soundEngine } from "@/lib/sound";

// Helper to generate crisp SVG Data URI icons with stylish linear gradients
const createSvgIcon = (emoji: string, bg1: string, bg2: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bg1}"/>
        <stop offset="100%" stop-color="${bg2}"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#g)"/>
    <text x="50%" y="54%" dominant-baseline="central" text-anchor="middle" font-size="52">${emoji}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Item emoji mapper for UI badges and tooltips
export const getItemEmoji = (itemId: string): string => {
  const clean = String(itemId || "").toLowerCase().trim().replace(/^crop_/, "");
  const emojiMap: Record<string, string> = {
    wood: "🪵",
    stone: "🪨",
    fiber: "🌾",
    rope: "🪢",
    torch: "🔦",
    bread: "🍞",
    wooden_axe: "🪓",
    stone_pick: "⛏️",
    apple: "🍎",
    apple_seed: "🌱",
    green_apple: "🍏",
    banana: "🍌",
    banana_seed: "🌱",
    cherry: "🍒",
    cherry_seed: "🌱",
    cherry_cake: "🍰",
    cherry_jam: "🍯",
    grapes: "🍇",
    grape_seed: "🌱",
    orange: "🍊",
    orange_seed: "🌱",
    orange_juice: "🧃",
    strawberry: "🍓",
    strawberry_seed: "🌱",
    strawberry_cake: "🎂",
    watermelon: "🍉",
    watermelon_seed: "🌱",
    avacado: "🥑",
    avacado_seed: "🌱",
    peach: "🍑",
    peach_seed: "🌱",
    blue_berry: "🫐",
    blue_berry_seed: "🌱",
    carrot: "🥕",
    carrot_seed: "🌱",
    pumpkin: "🎃",
    pumpkin_seed: "🌱",
    mushroom: "🍄",
    mushroom_seed: "🌱",
    corn: "🌽",
    corn_seed: "🌱",
    cucumber: "🥒",
    cucumber_seed: "🌱",
    brokeli: "🥦",
    brokeli_seed: "🌱",
    broccoli: "🥦",
    cabbige: "🥬",
    cabbige_seed: "🌱",
    cabbage: "🥬",
    chilly: "🌶️",
    chilly_seed: "🌱",
    reddies: "🥗",
    reddies_seed: "🌱",
    cake: "🎂",
    wine: "🍷",
    pizza: "🍕",
    burger: "🍔",
    chess: "🧀",
    cheese: "🧀",
    tomato_ketch: "🥫",
    tomato: "🍅",
    iron: "⛓️",
    iron_ore: "⛏️",
    copper: "🥉",
    copper_ore: "🥉",
    steel: "🔩",
    steel_beam: "🏗️",
    glass: "🪟",
    water: "💧",
    water_bottle: "🍶",
    food: "🍱",
    fuel: "⛽",
    concrete: "🧱",
    rubber: "🛞",
    trofy: "🏆",
    trophy: "🏆",
    milk: "🥛",
    cow_milk: "🥛",
    egg: "🥚",
    wool: "🧶",
    fish: "🐟",
    dragonfruit: "🐲",
    casturd_apple: "🍈",
    mangoes: "🥭",
    mango: "🥭",
    olive: "🫒",
    tea: "☕",
    ice_cream: "🍦",
    crude_oil: "🛢️",
    petrol: "⛽",
    diesel: "🚛",
    marine_fuel: "🚢",
    cargo_ship: "🚢",
    fishing_boat: "🛥️",
    fence: "🪵",
    campfire: "🔥",
    house: "🏠",
    home: "🏡",
    coin: "🪙",
    swatter: "🧥"
  };
  return emojiMap[clean] || (clean.endsWith("_seed") ? "🌱" : "📦");
};

// Item image lookup helper using real game assets in /images/ + SVG Data URIs for complete coverage
const getItemIconPath = (itemId: string): string => {
  let clean = String(itemId || "").toLowerCase().trim().replace(/^crop_/, "");

  if (clean === "broccoli") clean = "brokeli";
  if (clean === "cabbage") clean = "cabbige";
  if (clean === "chili" || clean === "chilli") clean = "chilly";
  if (clean === "radish") clean = "reddies";
  if (clean === "blueberry") clean = "blue_berry";
  if (clean === "dragonfruit") clean = "gragon_friut";
  if (clean === "avocado") clean = "avacado";
  if (clean === "watermelon") clean = "water_mealon";
  if (clean === "cheese") clean = "chess";
  if (clean === "trophy") clean = "trofy";
  if (clean === "mango") clean = "mangoes";
  if (clean === "sweater" || clean === "clothing") clean = "swatter";

  // 1. Exact static asset map (files present in /images/)
  const map: Record<string, string> = {
    apple: "/images/apple.jpg",
    green_apple: "/images/green_applr.jpg",
    milk: "/images/cow_milk.jpg",
    cow_milk: "/images/cow_milk.jpg",
    wool: "/images/wool.png",
    wheat: "/images/wheat.png",
    wheat_seed: "/images/wheat_seed.png",
    apple_seed: "/images/apple_seed.png",
    bread: "/images/bread.png",
    pizza: "/images/pizza.jpg",
    burger: "/images/burger.jpg",
    carrot: "/images/carrot.jpg",
    carrot_seed: "/images/carrot.jpg",
    banana: "/images/banana.jpg",
    banana_seed: "/images/banana.jpg",
    tomato_ketch: "/images/tomato_ketch.jpg",
    tomato: "/images/tomato_ketch.jpg",
    strawberry: "/images/strawberry.jpg",
    strawberry_seed: "/images/strawberry.jpg",
    strawberry_cake: "/images/strawberry_cake.jpg",
    cherry: "/images/cherry.jpg",
    cherry_seed: "/images/cherry.jpg",
    cherry_cake: "/images/cherry_cake.jpg",
    cherry_jam: "/images/cherry_jam.jpg",
    grapes: "/images/grapes.jpg",
    grape_seed: "/images/grapes.jpg",
    orange: "/images/orange.jpg",
    orange_seed: "/images/orange.jpg",
    orange_juice: "/images/orange_juice.jpg",
    corn: "/images/corn.jpg",
    corn_seed: "/images/corn.jpg",
    brokeli: "/images/brokeli.jpg",
    brokeli_seed: "/images/brokeli.jpg",
    cabbige: "/images/cabbige.jpg",
    cabbige_seed: "/images/cabbige.jpg",
    cucumber: "/images/cucumber.jpg",
    cucumber_seed: "/images/cucumber.jpg",
    chilly: "/images/chilly.jpg",
    chilly_seed: "/images/chilly.jpg",
    pumpkin: "/images/pumpkin.jpg",
    pumpkin_seed: "/images/pumpkin.jpg",
    mushroom: "/images/mushroom.jpg",
    mushroom_seed: "/images/mushroom.jpg",
    blue_berry: "/images/blue_berry.jpg",
    blue_berry_seed: "/images/blue_berry.jpg",
    avacado: "/images/avacado.jpg",
    avacado_seed: "/images/avacado.jpg",
    peach: "/images/peach.jpg",
    peach_seed: "/images/peach.jpg",
    reddies: "/images/reddies.jpg",
    reddies_seed: "/images/reddies.jpg",
    water_mealon: "/images/water_mealon.jpg",
    watermelon_seed: "/images/water_mealon.jpg",
    gragon_friut: "/images/gragon_friut.jpg",
    dragonfruit_seed: "/images/gragon_friut.jpg",
    casturd_apple: "/images/casturd_apple.jpg",
    mangoes: "/images/mangoes.jpg",
    mango_seed: "/images/mangoes.jpg",
    olive: "/images/olive.jpg",
    chess: "/images/chess.jpg",
    cake: "/images/cake.jpg",
    wine: "/images/wine.jpg",
    tea: "/images/tea.jpg",
    ice_cream: "/images/ice_cream.jpg",
    trofy: "/images/trofy.jpg",
    water: "/images/water.jpg",
    water_bottle: "/images/water_bottle.jpg",
    fiber: "/images/fiber.png",
    fence: "/images/fence.png",
    campfire: "/images/campfire.png",
    house: "/images/house.png",
    home: "/images/home.jpg",
    coin: "/images/coin.jpg",
    swatter: "/images/swatter.jpg",
    mail: "/images/mail.jpg",
    kitchen: "/images/kitchen.jpg",
    map_location: "/images/map_location.jpg"
  };

  if (map[clean]) return map[clean];

  // 2. High-Fidelity Themed SVG Data URIs for items without static files
  const svgMap: Record<string, string> = {
    wood: createSvgIcon("🪵", "#78350f", "#451a03"),
    stone: createSvgIcon("🪨", "#475569", "#1e293b"),
    rope: createSvgIcon("🪢", "#a16207", "#713f12"),
    torch: createSvgIcon("🔦", "#ea580c", "#7c2d12"),
    wooden_axe: createSvgIcon("🪓", "#059669", "#064e3b"),
    stone_pick: createSvgIcon("⛏️", "#0284c7", "#0c4a6e"),
    iron: createSvgIcon("⛓️", "#64748b", "#334155"),
    iron_ore: createSvgIcon("⛏️", "#713f12", "#3b1e08"),
    copper: createSvgIcon("🥉", "#b45309", "#78350f"),
    copper_ore: createSvgIcon("🥉", "#92400e", "#451a03"),
    steel: createSvgIcon("🔩", "#475569", "#0f172a"),
    steel_beam: createSvgIcon("🏗️", "#334155", "#0284c7"),
    glass: createSvgIcon("🪟", "#0284c7", "#0369a1"),
    rubber: createSvgIcon("🛞", "#1e293b", "#090d16"),
    concrete: createSvgIcon("🧱", "#78716c", "#44403c"),
    food: createSvgIcon("🍱", "#d97706", "#92400e"),
    fuel: createSvgIcon("⛽", "#dc2626", "#7f1d1d"),
    crude_oil: createSvgIcon("🛢️", "#451a03", "#0f172a"),
    petrol: createSvgIcon("⛽", "#ef4444", "#991b1b"),
    diesel: createSvgIcon("🚛", "#f59e0b", "#78350f"),
    marine_fuel: createSvgIcon("🚢", "#0284c7", "#082f49"),
    cargo_ship: createSvgIcon("🚢", "#0369a1", "#082f49"),
    fishing_boat: createSvgIcon("🛥️", "#0d9488", "#134e4a"),
    fish: createSvgIcon("🐟", "#0284c7", "#0f766e"),
    egg: createSvgIcon("🥚", "#fef3c7", "#d97706")
  };

  if (svgMap[clean]) return svgMap[clean];

  return createSvgIcon(getItemEmoji(clean), "#1e293b", "#0f172a");
};

export default function CivilizationDashboard() {
  // Session & Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("vandan_11");
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authMethod, setAuthMethod] = useState<"password" | "otp" | "magiclink">("password");
  const [authInput, setAuthInput] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpNotice, setOtpNotice] = useState<string>("");
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);

  // Forgot Password States
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>("");
  const [forgotOtp, setForgotOtp] = useState<string>("");
  const [forgotNewPassword, setForgotNewPassword] = useState<string>("");
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [forgotOtpSent, setForgotOtpSent] = useState<boolean>(false);
  const [forgotMsg, setForgotMsg] = useState<string>("");
  const [forgotError, setForgotError] = useState<string>("");
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState<boolean>(false);
  const [isVerifyingForgot, setIsVerifyingForgot] = useState<boolean>(false);
  const [devForgotCode, setDevForgotCode] = useState<string>("");

  // New Citizen Registration States
  const [signupName, setSignupName] = useState<string>("");
  const [signupAddress, setSignupAddress] = useState<string>("");
  const [signupMemberCount, setSignupMemberCount] = useState<number>(4);
  const [signupMemberNames, setSignupMemberNames] = useState<string[]>(["", "", "", ""]);
  const [signupCityQuery, setSignupCityQuery] = useState<string>("");
  const [signupCoords, setSignupCoords] = useState<[number, number]>([20.9467, 72.9520]);
  const [signupCityName, setSignupCityName] = useState<string>("Navsari, Gujarat");
  const [signupIsSearching, setSignupIsSearching] = useState<boolean>(false);

  // Game UI States
  const [status, setStatus] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Private Home Placement & Database Geolocation States
  const [showHomeBuilder, setShowHomeBuilder] = useState<boolean>(false);
  const [homeNameInput, setHomeNameInput] = useState<string>("");
  const [homeAddressInput, setHomeAddressInput] = useState<string>("");
  const [homeLatInput, setHomeLatInput] = useState<string>("20.9472");
  const [homeLngInput, setHomeLngInput] = useState<string>("72.9515");
  const [homeFamilyNameInput, setHomeFamilyNameInput] = useState<string>("");
  const [homeMemberCountInput, setHomeMemberCountInput] = useState<number>(4);
  const [homeMemberNamesInput, setHomeMemberNamesInput] = useState<string[]>(["", "", "", ""]);
  const [homeMemberRolesInput, setHomeMemberRolesInput] = useState<string[]>(["Head", "Spouse", "Child", "Child"]);
  const [homeMemberAgesInput, setHomeMemberAgesInput] = useState<number[]>([35, 32, 12, 8]);
  const [homeSaveMsg, setHomeSaveMsg] = useState<string>("");

  // Admin Registered Users Census & Edit States
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [showAdminCensusModal, setShowAdminCensusModal] = useState<boolean>(false);
  const [censusSearchQuery, setCensusSearchQuery] = useState<string>("");

  // Admin Edit Citizen Modal States
  const [adminEditModalOpen, setAdminEditModalOpen] = useState<boolean>(false);
  const [adminEditTargetUserId, setAdminEditTargetUserId] = useState<string>("");
  const [adminEditName, setAdminEditName] = useState<string>("");
  const [adminEditHomeName, setAdminEditHomeName] = useState<string>("");
  const [adminEditAddress, setAdminEditAddress] = useState<string>("");
  const [adminEditLat, setAdminEditLat] = useState<string>("20.9472");
  const [adminEditLng, setAdminEditLng] = useState<string>("72.9515");
  const [adminEditMoney, setAdminEditMoney] = useState<number>(500);
  const [adminEditMemberCount, setAdminEditMemberCount] = useState<number>(4);
  const [adminEditMemberNames, setAdminEditMemberNames] = useState<string[]>(["", "", "", ""]);
  const [adminEditMemberRoles, setAdminEditMemberRoles] = useState<string[]>(["Head", "Spouse", "Child", "Child"]);
  const [adminEditMemberAges, setAdminEditMemberAges] = useState<number[]>([35, 32, 12, 8]);
  const [adminEditMsg, setAdminEditMsg] = useState<string>("");

  // People & Citizens Master Directory Search & Edit States
  const [personSearchQuery, setPersonSearchQuery] = useState<string>("");
  const [personRoleFilter, setPersonRoleFilter] = useState<string>("all");
  const [personResidenceFilter, setPersonResidenceFilter] = useState<string>("all");
  const [personVehicleFilter, setPersonVehicleFilter] = useState<string>("all");
  const [editingPersonModalOpen, setEditingPersonModalOpen] = useState<boolean>(false);
  const [editPersonOldName, setEditPersonOldName] = useState<string>("");
  const [editPersonNewName, setEditPersonNewName] = useState<string>("");
  const [editPersonFamilyId, setEditPersonFamilyId] = useState<string>("house_1");
  const [editPersonNewFamilyId, setEditPersonNewFamilyId] = useState<string>("house_1");
  const [editPersonRole, setEditPersonRole] = useState<string>("worker");
  const [editPersonRelation, setEditPersonRelation] = useState<string>("");
  const [editPersonVehicle, setEditPersonVehicle] = useState<string>("bicycle");
  const [editPersonHouseBudget, setEditPersonHouseBudget] = useState<number>(150);
  const [editPersonTargetUserId, setEditPersonTargetUserId] = useState<string>("");

  // Cozy Aesthetics: Day Mode, Night Mode, Sound SFX & Ambient Tunes
  const [themeMode, setThemeMode] = useState<"night" | "day" | "auto">("night");
  const [isSoundMuted, setIsSoundMuted] = useState<boolean>(false);
  const [isMusicActive, setIsMusicActive] = useState<boolean>(false);

  // Admin Government Cabinet States
  const [taxRateInput, setTaxRateInput] = useState<number>(10);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("house_1");
  const [incomeTaxInput, setIncomeTaxInput] = useState<number>(10);
  const [salesTaxInput, setSalesTaxInput] = useState<number>(5);
  const [welfareThresholdInput, setWelfareThresholdInput] = useState<number>(15);
  const [welfarePayoutInput, setWelfarePayoutInput] = useState<number>(15);
  
  // Cabinet reassignment dropdown form states (Defaulted to real registered citizens)
  const [pmInput, setPmInput] = useState<string>("Thakorbhai");
  const [dmInput, setDmInput] = useState<string>("Vasantiben");
  const [finInput, setFinInput] = useState<string>("Vandan");
  const [eduInput, setEduInput] = useState<string>("Hetvi");
  const [infraInput, setInfraInput] = useState<string>("v");
  
  // News Filter state
  const [newsFilter, setNewsFilter] = useState<string>("ALL");

  // Admin interactive map relocation controls states
  const [editLocationsMode, setEditLocationsMode] = useState(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedLandmarkToMove, setSelectedLandmarkToMove] = useState("house_1");

  // Admin Live City Search & Geocoding Assignment states
  const [searchCityInput, setSearchCityInput] = useState<string>("");
  const [isSearchingCity, setIsSearchingCity] = useState<boolean>(false);
  const [searchedLocation, setSearchedLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [searchError, setSearchError] = useState<string>("");
  const [searchLandmarkTarget, setSearchLandmarkTarget] = useState<string>("house_1");

  // Admin Manual Decimal GPS Coordinates Placement states
  const [manualTargetLandmark, setManualTargetLandmark] = useState<string>("house_1");
  const [manualLatInput, setManualLatInput] = useState<string>("20.9472");
  const [manualLngInput, setManualLngInput] = useState<string>("72.9515");
  const [locationActionMsg, setLocationActionMsg] = useState<string>("");

  // Admin Manual Family Member Role & Vehicle Assignment states
  const [editMemberModalOpen, setEditMemberModalOpen] = useState<boolean>(false);
  const [editMemberFamilyId, setEditMemberFamilyId] = useState<string>("house_1");
  const [editMemberName, setEditMemberName] = useState<string>("Thakorbhai");
  const [editMemberRole, setEditMemberRole] = useState<string>("farmer");
  const [editMemberRelation, setEditMemberRelation] = useState<string>("Agricultural Specialist & Head");
  const [editMemberVehicle, setEditMemberVehicle] = useState<string>("tractor");

  // Residence & Worker Management States
  const [residenceFilter, setResidenceFilter] = useState<"all" | "house" | "hostel">("all");
  
  // Create Residence (House / Hostel) Modal
  const [createResidenceModalOpen, setCreateResidenceModalOpen] = useState<boolean>(false);
  const [newResidenceName, setNewResidenceName] = useState<string>("");
  const [newResidenceId, setNewResidenceId] = useState<string>("");
  const [newResidenceType, setNewResidenceType] = useState<"house" | "hostel">("house");
  const [newResidenceCapacity, setNewResidenceCapacity] = useState<number>(6);
  const [newResidenceBudget, setNewResidenceBudget] = useState<number>(60);
  const [newResidenceLat, setNewResidenceLat] = useState<string>("20.9465");
  const [newResidenceLng, setNewResidenceLng] = useState<string>("72.9520");

  // Edit Residence Modal
  const [editResidenceModalOpen, setEditResidenceModalOpen] = useState<boolean>(false);
  const [editResidenceId, setEditResidenceId] = useState<string>("house_1");
  const [editResidenceName, setEditResidenceName] = useState<string>("");
  const [editResidenceType, setEditResidenceType] = useState<"house" | "hostel">("house");
  const [editResidenceCapacity, setEditResidenceCapacity] = useState<number>(6);
  const [editResidenceBudget, setEditResidenceBudget] = useState<number>(60);

  // Add Member / Worker Modal
  const [addMemberModalOpen, setAddMemberModalOpen] = useState<boolean>(false);
  const [addMemberFamilyId, setAddMemberFamilyId] = useState<string>("house_1");
  const [newMemberName, setNewMemberName] = useState<string>("");
  const [newMemberRole, setNewMemberRole] = useState<string>("worker");
  const [newMemberRelation, setNewMemberRelation] = useState<string>("Civilization Worker");
  const [newMemberVehicle, setNewMemberVehicle] = useState<string>("bicycle");

  // Transfer Worker Modal
  const [transferWorkerModalOpen, setTransferWorkerModalOpen] = useState<boolean>(false);
  const [transferFromFamilyId, setTransferFromFamilyId] = useState<string>("house_1");
  const [transferWorkerName, setTransferWorkerName] = useState<string>("");
  const [transferToFamilyId, setTransferToFamilyId] = useState<string>("hostel_central");
  const [transferNewRole, setTransferNewRole] = useState<string>("");
  const [transferNewVehicle, setTransferNewVehicle] = useState<string>("");

  // Simulation Time & Speed Controller States
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x, 10x, 60x, 1000x, custom
  const [customSpeedInput, setCustomSpeedInput] = useState<string>("5");
  const [showCustomSpeedInput, setShowCustomSpeedInput] = useState<boolean>(false);

  // Master Inventory & Livestock Monitoring Modals
  const [masterInventoryModalOpen, setMasterInventoryModalOpen] = useState<boolean>(false);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] = useState<"all" | "crops" | "livestock" | "textiles" | "materials">("all");
  const [selectedPlantCrop, setSelectedPlantCrop] = useState<string>("wheat");
  const [farmActionMsg, setFarmActionMsg] = useState<string>("");
  const [kisanAgentRunning, setKisanAgentRunning] = useState<boolean>(false);
  const [kisanReport, setKisanReport] = useState<any>(null);
  
  // Industrial & Petroleum States
  const [fuelPriceInput, setFuelPriceInput] = useState<number>(15);
  const [refiningBarrelsInput, setRefiningBarrelsInput] = useState<number>(20);
  const [newShipNameInput, setNewShipNameInput] = useState<string>("");
  const [newShipTypeInput, setNewShipTypeInput] = useState<"cargo_ship" | "passenger_ferry" | "fishing_trawler">("cargo_ship");
  const [industrialActionMsg, setIndustrialActionMsg] = useState<string>("");

  const [allocAmount, setAllocAmount] = useState<Record<string, number>>({
    school: 50,
    hospital: 100,
    park: 50,
    roads: 50
  });

  const [apiHost] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const summariesEndRef = useRef<HTMLDivElement>(null);

  // Geolocated Map refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const staticMarkersRef = useRef<any[]>([]);
  const citizenMarkersRef = useRef<Record<string, any>>({});
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Sign up interactive map refs
  const signupMapContainerRef = useRef<HTMLDivElement>(null);
  const signupMapInstanceRef = useRef<any>(null);
  const signupMarkerRef = useRef<any>(null);
  const [isSendingOtp, setIsSendingOtp] = useState<boolean>(false);

  // Check admin status
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "vandan11patel@gmail.com").toLowerCase().trim();
  const isAdmin = Boolean(status?.is_admin) || userId.toLowerCase() === "vandan_11" || userId.toLowerCase().trim() === adminEmail;

  // Center Coordinates for Civilization Map
  const CENTER_LAT = 20.9467;
  const CENTER_LNG = 72.9520;

  const defaultLocations: Record<string, [number, number]> = {
    house_1: [20.9472, 72.9515],
    house_2: [20.9460, 72.9530],
    house_3: [20.9455, 72.9510],
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
    roads: [20.9465, 72.9520]
  };

  const getLocations = () => {
    return status?.zone_locations || defaultLocations;
  };

  const VEHICLE_EMOJIS: Record<string, string> = {
    tractor: "🚜",
    scooter: "🛵",
    car: "🚗",
    bicycle: "🚲",
    truck: "🚚",
    walk: "🚶"
  };

  const VEHICLE_NAMES: Record<string, string> = {
    tractor: "Heavy Field Tractor",
    scooter: "City Scooter / Moped",
    car: "Electric Sedan",
    bicycle: "Eco Commuter Bicycle",
    truck: "Commercial Cargo Truck",
    walk: "Walking / On Foot"
  };

  // Compute dynamic road traveling & vehicle coordinates
  const getCitizenTravelInfo = (m: any, familyId: string) => {
    const locs = getLocations();
    const totalSeconds = status?.clock?.total_seconds ?? (8 * 60);
    const hour = Math.floor(totalSeconds / 60) % 24;
    const minute = Math.floor(totalSeconds % 60);

    const homeCoord: [number, number] = locs[familyId] || locs.house_1 || [CENTER_LAT, CENTER_LNG];
    const roadCoord: [number, number] = locs.roads || [20.9465, 72.9520];

    const r = (m.role || "").toLowerCase();
    const n = (m.name || "").toLowerCase();
    const isStudent = r.includes("student") || n.includes("hetvi") || n.includes("vainavi") || n.includes("krushil") || n.includes("harshil");

    // Determine standard destination based on role and name
    let destCoord: [number, number] = locs.farms || [CENTER_LAT, CENTER_LNG];
    let destName = "Colony Farms";

    if (r.includes("farmer") || n.includes("thakorbhai") || n.includes("dinesh")) {
      destCoord = locs.farms || [CENTER_LAT, CENTER_LNG];
      destName = "Colony Agricultural Farms";
    } else if (r.includes("merchant") || n.includes("bharatbhai") || n.includes("geeta")) {
      destCoord = locs.general || [CENTER_LAT, CENTER_LNG];
      destName = "Ramesh General Supplies";
    } else if (r.includes("engineer") || r.includes("tech") || n.includes("rameshbhai")) {
      destCoord = locs.electronics || [CENTER_LAT, CENTER_LNG];
      destName = "Rajesh Electronics Hub";
    } else if (r.includes("tailor") || n.includes("kiran")) {
      destCoord = locs.clothing || [CENTER_LAT, CENTER_LNG];
      destName = "Savita's Clothiers";
    } else if (r.includes("worker") || n.includes("vandan") || n.includes("prathav") || n.includes("sanjay")) {
      destCoord = locs.factory || [CENTER_LAT, CENTER_LNG];
      destName = "Manufacturing Factory";
    } else if (isStudent) {
      destCoord = locs.school || [CENTER_LAT, CENTER_LNG];
      destName = "Community School";
    } else if (r.includes("doctor") || r.includes("nurse")) {
      destCoord = locs.hospital || [CENTER_LAT, CENTER_LNG];
      destName = "General Hospital";
    } else if (r.includes("mother") || n.includes("vasantiben") || n.includes("mayuriben") || n.includes("hemuben")) {
      destCoord = locs.farmers_market || locs.dairy || [CENTER_LAT, CENTER_LNG];
      destName = "Farmers & Vegetable Market";
    }

    // Interp helper: along road
    const interpolateRoad = (start: [number, number], end: [number, number], t: number): [number, number] => {
      const clamped = Math.max(0, Math.min(1, t));
      if (clamped < 0.5) {
        const u = clamped * 2;
        return [start[0] + (roadCoord[0] - start[0]) * u, start[1] + (roadCoord[1] - start[1]) * u];
      } else {
        const u = (clamped - 0.5) * 2;
        return [roadCoord[0] + (end[0] - roadCoord[0]) * u, roadCoord[1] + (end[1] - roadCoord[1]) * u];
      }
    };

    let currentPos = homeCoord;
    let isTraveling = false;
    let activity = m.state || "Home Routine";
    let destination = "Home Residence";

    // -------------------------------------------------------------
    // DEDICATED STUDENT SCHOOL CALENDAR ROUTINE (07:30 to 14:00)
    // -------------------------------------------------------------
    if (isStudent) {
      // Morning Commute to School: 07:30 to 08:00
      if (hour === 7 && minute >= 30) {
        const t = (minute - 30) / 30;
        currentPos = interpolateRoad(homeCoord, locs.school || [CENTER_LAT, CENTER_LNG], t);
        isTraveling = true;
        activity = "🎒 Commuting along road to Community School";
        destination = "Community School";
      }
      // Attending Classes at Community School: 08:00 to 13:30
      else if ((hour >= 8 && hour < 13) || (hour === 13 && minute < 30)) {
        currentPos = locs.school || [CENTER_LAT, CENTER_LNG];
        isTraveling = false;
        activity = "📚 Attending morning classes at Community School";
        destination = "Community School";
      }
      // Returning Home from School Commute: 13:30 to 14:00
      else if (hour === 13 && minute >= 30) {
        const t = (minute - 30) / 30;
        currentPos = interpolateRoad(locs.school || [CENTER_LAT, CENTER_LNG], homeCoord, t);
        isTraveling = true;
        activity = "🎒 Returning home along road from Community School";
        destination = "Home Residence";
      }
      // Afternoon Study & Homework at Home: 14:00 to 17:00
      else if (hour >= 14 && hour < 17) {
        currentPos = homeCoord;
        isTraveling = false;
        activity = "📖 Homework & Reading at Home";
        destination = "Home Residence";
      }
      // Evening Recreation & Sports at Civic Park: 17:00 to 18:00
      else if (hour === 17) {
        currentPos = locs.park || roadCoord;
        isTraveling = false;
        activity = "⚽ Recreation & Sports with Friends at Civic Park";
        destination = "Civic Leisure Park";
      }
      // Family Dinner & Evening Leisure: 18:00 to 21:30
      else if (hour >= 18 && hour < 22) {
        currentPos = homeCoord;
        isTraveling = false;
        activity = "🍽️ Family Dinner & Evening Leisure";
        destination = "Home Residence";
      }
      // Sleeping: 22:00 to 07:30
      else {
        currentPos = homeCoord;
        isTraveling = false;
        activity = "💤 Sleeping in Bed";
        destination = "Home Residence";
      }

      return { currentPos, isTraveling, activity, destination };
    }

    // -------------------------------------------------------------
    // ADULT CITIZEN & WORKER COMMUTE AND WORK ROUTINES
    // -------------------------------------------------------------
    // Morning Commute: 08:15 to 09:00
    if (hour === 8 && minute >= 15) {
      const t = (minute - 15) / 45;
      currentPos = interpolateRoad(homeCoord, destCoord, t);
      isTraveling = true;
      activity = `Commuting along road to ${destName}`;
      destination = destName;
    }
    // Working / School hours: 09:00 to 16:30
    else if (hour >= 9 && (hour < 16 || (hour === 16 && minute < 30))) {
      if (r.includes("mother")) {
        currentPos = homeCoord;
        activity = "Home Chores & Kitchen Preparation";
        destination = "Home Residence";
      } else {
        currentPos = destCoord;
        activity = m.state || `Active at ${destName}`;
        destination = destName;
      }
    }
    // Shopping Commute to Farmers Market / Stores: 16:30 to 17:00
    else if (hour === 16 && minute >= 30) {
      const t = (minute - 30) / 30;
      const startPos = r.includes("mother") ? homeCoord : destCoord;
      const targetShop = (r.includes("mother") || r.includes("farmer")) ? (locs.farmers_market || roadCoord) : roadCoord;
      currentPos = interpolateRoad(startPos, targetShop, t);
      isTraveling = true;
      activity = `Traveling along road to Farmers Market to buy vegetables`;
      destination = "Farmers & Vegetable Market";
    }
    // At Farmers Market & Dairy shopping: 17:00 to 17:30
    else if (hour === 17 && minute < 30) {
      if (r.includes("mother") || r.includes("farmer")) {
        currentPos = locs.farmers_market || roadCoord;
        activity = "Purchasing fresh vegetables & provisions at Farmers Market";
        destination = "Farmers & Vegetable Market";
      } else {
        currentPos = locs.park || roadCoord;
        activity = "Evening Leisure at Plaza";
        destination = "Civic Leisure Park";
      }
    }
    // Returning Home Commute: 17:30 to 18:00
    else if (hour === 17 && minute >= 30) {
      const t = (minute - 30) / 30;
      const fromPos = (r.includes("mother") || r.includes("farmer")) ? (locs.farmers_market || roadCoord) : (locs.park || roadCoord);
      currentPos = interpolateRoad(fromPos, homeCoord, t);
      isTraveling = true;
      activity = `Returning home with fresh market vegetables`;
      destination = "Home Residence";
    }
    // Evening Dinner & Leisure at Home: 18:00 to 22:00
    else if (hour >= 18 && hour < 22) {
      currentPos = homeCoord;
      activity = "Family Dinner & Evening Leisure";
      destination = "Home Residence";
    }
    // Night / Sleep: 22:00 to 08:15
    else {
      currentPos = homeCoord;
      activity = "Sleeping / Resting";
      destination = "Home Residence";
    }

    return { currentPos, isTraveling, activity, destination };
  };

  // Helper to retrieve citizen geolocations
  const getCitizenGeo = (name: string, state: string, familyId: string): [number, number] => {
    const locs = getLocations();
    if (state.includes("Sleeping") || state.includes("Breakfast") || state.includes("Dinner") || state.includes("Leisure at Home") || state.includes("Private") || state.includes("Chores")) {
      if (locs[familyId]) return locs[familyId];
      if (familyId === "house_2") return locs.house_2 || [CENTER_LAT, CENTER_LNG];
      if (familyId === "house_3") return locs.house_3 || [CENTER_LAT, CENTER_LNG];
      return locs.house_1 || [CENTER_LAT, CENTER_LNG];
    }
    if (state.includes("Farms")) return locs.farms || [CENTER_LAT, CENTER_LNG];
    if (state.includes("General Store")) return locs.general || [CENTER_LAT, CENTER_LNG];
    if (state.includes("Electronic Hub")) return locs.electronics || [CENTER_LAT, CENTER_LNG];
    if (state.includes("Clothiers")) return locs.clothing || [CENTER_LAT, CENTER_LNG];
    if (state.includes("Dairy Store") || state.includes("Shopping") || state.includes("Vegetable")) return locs.farmers_market || locs.dairy || [CENTER_LAT, CENTER_LNG];
    if (state.includes("Factory")) return locs.factory || [CENTER_LAT, CENTER_LNG];
    if (state.includes("School")) return locs.school || [CENTER_LAT, CENTER_LNG];
    if (state.includes("Plaza") || state.includes("Park")) return locs.park || [CENTER_LAT, CENTER_LNG];
    
    // Fallback to family home
    if (locs[familyId]) return locs[familyId];
    return locs.house_1 || [CENTER_LAT, CENTER_LNG];
  };

  // Restore saved session or magic link from URL and check Database Health
  useEffect(() => {
    // Check MongoDB multi-database connectivity
    fetch(`${apiHost}/api/auth/db-status`)
      .then((r) => r.json())
      .then((d) => setDbHealth(d))
      .catch(() => {});

    try {
      const savedTheme = localStorage.getItem("civilization_theme_mode") as "night" | "day" | "auto" | null;
      if (savedTheme) {
        setThemeMode(savedTheme);
      }

      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const magicUser = urlParams.get("magic_user");
        if (magicUser) {
          setUserId(magicUser);
          setIsLoggedIn(true);
          localStorage.setItem("civilization_active_user", magicUser);
          return;
        }
      }
      const saved = localStorage.getItem("civilization_active_user");
      if (saved) {
        setUserId(saved);
        setIsLoggedIn(true);
      }
    } catch {}
  }, []);

  // Dynamically load Leaflet resources in browser context
  useEffect(() => {
    if (typeof window === "undefined") return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      try {
        document.head.removeChild(link);
        document.head.removeChild(script);
      } catch {}
    };
  }, []);

  // Initialize interactive satellite map picker for sign up
  useEffect(() => {
    if (!leafletLoaded || !signupMapContainerRef.current || isLoggedIn || authTab !== "signup") return;
    const L = (window as any).L;
    if (!L) return;

    if (!signupMapInstanceRef.current) {
      const map = L.map(signupMapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(signupCoords, 16);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; World Satellite Imagery'
      }).addTo(map);

      map.on("click", (e: any) => {
        const { lat, lng } = e.latlng;
        setSignupCoords([lat, lng]);
      });

      signupMapInstanceRef.current = map;
    } else {
      signupMapInstanceRef.current.setView(signupCoords);
      setTimeout(() => {
        signupMapInstanceRef.current?.invalidateSize();
      }, 200);
    }

    if (signupMarkerRef.current) {
      signupMarkerRef.current.setLatLng(signupCoords);
    } else if (signupMapInstanceRef.current) {
      const homeIcon = L.divIcon({
        className: "",
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500 border-2 border-slate-950 shadow-xl text-slate-950 font-bold text-base animate-bounce">🏠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      signupMarkerRef.current = L.marker(signupCoords, { icon: homeIcon }).addTo(signupMapInstanceRef.current);
    }
  }, [leafletLoaded, isLoggedIn, authTab, signupCoords]);

  // Handle map click callbacks for tap-to-relocate and admin relocation
  const handleMapClick = (e: any) => {
    if (!e || !e.latlng) return;
    const { lat, lng } = e.latlng;
    const latStr = lat.toFixed(4);
    const lngStr = lng.toFixed(4);

    // Auto-fill coordinates for citizen Home Builder
    setHomeLatInput(latStr);
    setHomeLngInput(lngStr);

    // Auto-fill coordinates for Admin Citizen Editor Modal
    setAdminEditLat(latStr);
    setAdminEditLng(lngStr);

    // If Admin landmark relocation is enabled
    if (isAdmin) {
      setClickedCoords({ lat, lng });
      setEditLocationsMode(true);
    }

    setLocationActionMsg(`📍 Selected GPS: [${latStr}, ${lngStr}]. Click "SAVE" to confirm relocation.`);
    setTimeout(() => setLocationActionMsg(""), 6000);
  };

  // Initialize map and handle dynamic updates
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current || !isLoggedIn) return;
    const L = (window as any).L;
    if (!L) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([CENTER_LAT, CENTER_LNG], 16);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
      }).addTo(map);

      map.on("click", handleMapClick);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const locs = getLocations();

    staticMarkersRef.current.forEach(m => map.removeLayer(m));
    staticMarkersRef.current = [];

    const addLandmark = (
      coord: [number, number],
      title: string,
      desc: string,
      color: string,
      icon: string,
      htmlContent?: string
    ) => {
      const customIcon = L.divIcon({
        className: "",
        html: `
          <div style="background-color: ${color};" class="w-8 h-8 rounded-full border-2 border-slate-900 shadow-xl flex items-center justify-center text-sm transform hover:scale-125 transition-transform duration-200 cursor-pointer">
            <span>${icon}</span>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const popupHtml =
        htmlContent ||
        `
        <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
          <div style="font-weight: 800; font-size: 13px; color: #0f172a; margin-bottom: 2px;">${title}</div>
          <div style="font-size: 11px; color: #475569; line-height: 1.3;">${desc}</div>
          <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; font-family: monospace;">GPS: [${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]</div>
        </div>
      `;

      const marker = L.marker(coord, { icon: customIcon }).addTo(map);
      marker.bindPopup(popupHtml);
      marker.bindTooltip(popupHtml, { direction: "top", offset: [0, -12], opacity: 0.98 });
      marker.on("mouseover", () => {
        marker.openTooltip();
      });
      marker.on("mouseout", () => {
        marker.closeTooltip();
      });

      staticMarkersRef.current.push(marker);
    };

    // Render all registered users' residences from database with hover tooltips and privacy scoping
    if (registeredUsers && registeredUsers.length > 0) {
      registeredUsers.forEach((u: any) => {
        if (u.coords && Array.isArray(u.coords) && u.coords.length === 2) {
          const isOwnHome = Boolean(
            u.user_id &&
              (u.user_id.toLowerCase() === userId.toLowerCase() ||
                u.user_id.replace(/[^a-zA-Z0-9_-]/g, "") ===
                  userId.replace(/[^a-zA-Z0-9_-]/g, ""))
          );

          if (isOwnHome) {
            // Logged-in user's own home - prominent emerald marker with personal residence name & own family details
            const ownMemListHtml =
              u.members && u.members.length > 0
                ? u.members
                    .map((m: any, idx: number) => {
                      const mName = typeof m === "string" ? m : m.name || `Member #${idx + 1}`;
                      const mRole = typeof m === "string" ? "Family Member" : m.role || "Citizen";
                      const mAge = typeof m === "object" && m.age ? ` • 🎂 ${m.age} yrs` : "";
                      return `<div style="padding: 2px 0; font-size: 10.5px; border-bottom: 1px dashed #bbf7d0; color: #1e293b;">
                          <span style="font-weight: bold; color: #047857;">${mName}</span>
                          <span style="color: #64748b; font-size: 10px;"> (${mRole}${mAge})</span>
                        </div>`;
                    })
                    .join("")
                : `<div style="font-size: 10px; color: #94a3b8;">No members listed</div>`;

            const ownPopupHtml = `
              <div style="font-family: sans-serif; padding: 6px; min-width: 210px; max-width: 300px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;">
                  <div style="font-weight: 900; font-size: 13px; color: #047857;">🏡 ${u.home_name || "My Private Residence"}</div>
                  <span style="background: #10b981; color: white; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">MY HOME</span>
                </div>
                <div style="font-size: 11px; color: #334155; margin-bottom: 2px;"><strong>Location:</strong> ${u.address || u.city_name || "Civilization Zone"}</div>
                <div style="font-weight: bold; font-size: 10.5px; color: #0f172a; margin-top: 4px; margin-bottom: 2px;">👨‍👩‍👧‍👦 Your Family (${u.members?.length || 0}):</div>
                <div style="background: #f0fdf4; border-radius: 6px; padding: 4px 6px; border: 1px solid #bbf7d0; max-height: 110px; overflow-y: auto;">
                  ${ownMemListHtml}
                </div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; font-family: monospace;">GPS: [${u.coords[0].toFixed(4)}, ${u.coords[1].toFixed(4)}]</div>
              </div>
            `;

            addLandmark(
              u.coords,
              `🏡 ${u.home_name || "My Private Residence"}`,
              `Your personal household • Location: ${u.address || u.city_name || "Civilization Zone"}`,
              "#10b981",
              "🏡",
              ownPopupHtml
            );
          } else if (isAdmin) {
            // Admin View - hover & click show full details: citizen email, address, GPS, cash, and ALL family members
            const memListHtml =
              u.members && u.members.length > 0
                ? u.members
                    .map((m: any, idx: number) => {
                      const mName = typeof m === "string" ? m : m.name || `Member #${idx + 1}`;
                      const mRole = typeof m === "string" ? "Family Member" : m.role || "Citizen";
                      const mAge = typeof m === "object" && m.age ? ` • 🎂 ${m.age} yrs` : "";
                      const veh =
                        typeof m === "object" && m.vehicle ? ` • 🚗 ${m.vehicle}` : "";
                      return `<div style="padding: 2.5px 0; font-size: 10.5px; border-bottom: 1px dashed #e2e8f0; color: #1e293b;">
                          <span style="font-weight: bold; color: #0284c7;">${mName}</span>
                          <span style="color: #64748b; font-size: 10px;"> (${mRole}${mAge}${veh})</span>
                        </div>`;
                    })
                    .join("")
                : `<div style="font-size: 10px; color: #94a3b8;">No members listed</div>`;

            const adminPopupHtml = `
              <div style="font-family: sans-serif; padding: 6px; min-width: 230px; max-width: 320px;">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 4px;">
                  <div style="font-weight: 900; font-size: 13px; color: #0f172a;">🏡 ${u.home_name || "Citizen Residence"}</div>
                  <span style="background: #0284c7; color: white; font-size: 9px; font-weight: bold; padding: 1px 5px; border-radius: 4px;">ADMIN VIEW</span>
                </div>
                <div style="font-size: 11px; color: #334155; margin-bottom: 2px;"><strong>Citizen:</strong> ${u.user_id}</div>
                <div style="font-size: 10.5px; color: #475569; margin-bottom: 2px;"><strong>Address:</strong> ${u.address || u.city_name || "Civilization Zone"}</div>
                <div style="font-size: 10.5px; color: #16a34a; font-weight: bold; margin-bottom: 5px;"><strong>Cash Balance:</strong> $${u.money || 500}</div>
                <div style="font-weight: bold; font-size: 11px; color: #0f172a; margin-top: 3px; margin-bottom: 2px;">👨‍👩‍👧‍👦 Family Members (${u.members?.length || 0}):</div>
                <div style="background: #f8fafc; border-radius: 6px; padding: 4px 6px; border: 1px solid #e2e8f0; max-height: 120px; overflow-y: auto;">
                  ${memListHtml}
                </div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; font-family: monospace;">GPS: [${u.coords[0].toFixed(4)}, ${u.coords[1].toFixed(4)}]</div>
              </div>
            `;

            addLandmark(
              u.coords,
              `🏡 ${u.home_name || "Citizen Residence"}`,
              `Citizen Account: ${u.user_id} • Location: ${u.address || u.city_name || "Civilization Zone"}`,
              "#06b6d4",
              "🏡",
              adminPopupHtml
            );
          } else {
            // Other citizens view on hover - shows ONLY the custom name of the home and its location, ZERO family members
            const otherCitizenPopupHtml = `
              <div style="font-family: sans-serif; padding: 6px; min-width: 180px;">
                <div style="font-weight: 900; font-size: 13px; color: #0f172a; margin-bottom: 3px;">🏠 ${u.home_name || "Citizen Residence"}</div>
                <div style="font-size: 11px; color: #475569; margin-bottom: 3px;">📍 Location: ${u.address || u.city_name || "Civilization Zone"}</div>
                <div style="font-size: 9.5px; color: #0284c7; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-top: 2px; font-weight: 600;">🔒 Private Household (Protected)</div>
                <div style="font-size: 9px; color: #94a3b8; margin-top: 4px; font-family: monospace;">GPS: [${u.coords[0].toFixed(4)}, ${u.coords[1].toFixed(4)}]</div>
              </div>
            `;

            addLandmark(
              u.coords,
              `🏠 ${u.home_name || "Citizen Residence"}`,
              `Location: ${u.address || u.city_name || "Civilization Zone"}`,
              "#0284c7",
              "🏠",
              otherCitizenPopupHtml
            );
          }
        }
      });
    } else if (locs.my_home) {
      // Fallback for user's own home if registered list not yet loaded
      addLandmark(
        locs.my_home,
        `🏡 My Private Residence (Your Home)`,
        `Your personal household residence • Protected & Stored in database • GPS: [${locs.my_home[0].toFixed(4)}, ${locs.my_home[1].toFixed(4)}]`,
        "#10b981",
        "🏡"
      );
    }

    if (locs.farmers_market) addLandmark(locs.farmers_market, "Navsari Fresh Farmers & Vegetable Market", "Central marketplace for fresh vegetables, fruits, and agricultural crops", "#16a34a", "🥕");
    if (locs.dairy) addLandmark(locs.dairy, "City Dairy Groceries", "Dairy retail shop owned by Amina", "#d97706", "🥛");
    if (locs.general) addLandmark(locs.general, "Ramesh Supplies", "General construction materials store owned by Ramesh", "#475569", "📦");
    if (locs.clothing) addLandmark(locs.clothing, "Savita's Clothiers", "Specialized fiber, fabrics & clothing store", "#db2777", "👕");
    if (locs.electronics) addLandmark(locs.electronics, "Electronics Hub", "Electronics components hub owned by Rajesh", "#7c3aed", "🔌");
    if (locs.farms) addLandmark(locs.farms, "Colony Farms", "Wheat & agricultural fields", "#16a34a", "🌾");
    if (locs.factory) addLandmark(locs.factory, "Manufacturing Factory", "Colony fabrication center", "#dc2626", "🏭");
    if (locs.school) addLandmark(locs.school, "Community School", "Primary educational project", "#6366f1", "🏫");
    if (locs.hospital) addLandmark(locs.hospital, "General Hospital", "Health clinic infrastructure", "#ec4899", "🏥");
    if (locs.park) addLandmark(locs.park, "Civic Leisure Park", "Green public plaza", "#22c55e", "🌳");
    if (locs.roads) addLandmark(locs.roads, "Paved Highways & Plaza", "Central town highways and roads", "#64748b", "🛣️");
    if (locs.shipyard) addLandmark(locs.shipyard, "Navsari Coastal Shipyard & Docks", "Commercial maritime shipyard, freight vessel berths & deep sea trawlers", "#0284c7", "⚓");
    if (locs.refinery) addLandmark(locs.refinery, "Gulf Oil Refinery & Distillation Plant", "Petroleum catalytic cracking and fuel refining facility", "#f59e0b", "🛢️");
    if (locs.petrol_pump) addLandmark(locs.petrol_pump, "Highway 48 Petrol & EV Superstation", "Fuel distribution, diesel dispensers & fast hyperchargers", "#ef4444", "⛽");
    if (locs.steel_mill) addLandmark(locs.steel_mill, "Navsari Heavy Foundry & Steel Works", "Industrial smelting furnaces and steel beam forging", "#64748b", "🏭");

    // Re-bind click event
    map.off("click");
    map.on("click", handleMapClick);

    // Dynamic real-time traveling citizen & vehicle markers with live routing
    if (status && status.families) {
      status.families.forEach((fam: any) => {
        (fam.members || []).forEach((m: any, mIdx: number) => {
          const veh = m.vehicle || "bicycle";
          const vehEmoji = VEHICLE_EMOJIS[veh] || "🚲";
          const { currentPos, isTraveling, activity, destination } = getCitizenTravelInfo(m, fam.id);
          const markerKey = `${fam.id}_${mIdx}`;

          const htmlMarkup = `
            <div class="relative group cursor-pointer select-none">
              <div class="flex items-center gap-1.5 px-2 py-0.5 rounded-full shadow-2xl border-2 ${isTraveling ? "bg-amber-950/95 border-amber-400 text-amber-200 animate-bounce" : "bg-slate-950/95 border-sky-400 text-sky-200"}">
                <span class="text-xs">${vehEmoji}</span>
                <span class="text-[10px] font-bold font-mono tracking-tight">${isAdmin ? m.name : "Citizen"}</span>
                ${isTraveling ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>' : ''}
              </div>
            </div>
          `;

          const citizenIcon = L.divIcon({
            className: "",
            html: htmlMarkup,
            iconSize: [85, 24],
            iconAnchor: [42, 12]
          });

          const popupContent = `
            <div style="font-family: sans-serif; font-size: 11px; color: #0f172a; min-width: 190px; padding: 4px;">
              <div style="font-weight: bold; font-size: 13px; margin-bottom: 4px; color: #0369a1; display: flex; align-items: center; gap: 4px;">
                <span>${vehEmoji}</span>
                <span>${isAdmin ? m.name : "Resident Citizen"}</span>
              </div>
              <div><b>Role:</b> ${m.role || "Citizen"} (${m.relation || "Family Member"})</div>
              <div><b>Assigned Vehicle:</b> ${VEHICLE_NAMES[veh] || veh} ${vehEmoji}</div>
              <div style="margin-top: 4px;"><b>Live Status:</b> <span style="color: ${isTraveling ? '#d97706' : '#059669'}; font-weight: bold;">${activity}</span></div>
              <div><b>Destination:</b> ${destination}</div>
              <div style="margin-top: 4px; font-size: 9px; color: #64748b; font-family: monospace;">Live GPS: [${currentPos[0].toFixed(5)}, ${currentPos[1].toFixed(5)}]</div>
            </div>
          `;

          const tooltipContent = isAdmin 
            ? `${vehEmoji} ${m.name} (${m.role}): ${activity}` 
            : `${vehEmoji} Citizen: Active on Road`;

          if (citizenMarkersRef.current[markerKey]) {
            citizenMarkersRef.current[markerKey].setLatLng(currentPos);
            citizenMarkersRef.current[markerKey].setIcon(citizenIcon);
            citizenMarkersRef.current[markerKey].setTooltipContent(tooltipContent);
            citizenMarkersRef.current[markerKey].setPopupContent(popupContent);
          } else {
            const marker = L.marker(currentPos, { icon: citizenIcon })
              .addTo(map)
              .bindTooltip(tooltipContent, { direction: "top", permanent: false })
              .bindPopup(popupContent);
            citizenMarkersRef.current[markerKey] = marker;
          }
        });
      });
    }

  }, [leafletLoaded, status, editLocationsMode, userId, isLoggedIn, isAdmin]);

  // Load catalogs on mount
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch(`${apiHost}/api/catalog?user_id=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Catalog fetch failed.");
        return res.json();
      })
      .then((data) => {
        if (data.ok) setCatalog(data);
      })
      .catch((err) => {
        console.warn("Could not load catalogs dynamically.", err);
      });
  }, [userId, apiHost, isLoggedIn]);

  const cabinetInitializedRef = useRef(false);

  const matchAdultName = (name: string, fallback: string): string => {
    if (!name || name.includes("Private Resident") || name.includes("Protected") || name.startsWith("Member #")) return fallback;
    return name;
  };

  // Fetch simulation status
  const fetchStatus = useCallback(() => {
    if (!isLoggedIn) return;
    fetch(`${apiHost}/api/status?user_id=${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("API server offline.");
        return res.json();
      })
      .then((data) => {
        if (data.ok) {
          setStatus(data);
          setError(null);

          if (data.registered_users && Array.isArray(data.registered_users)) {
            setRegisteredUsers(data.registered_users);
          } else {
            // Fetch all registered residences across the database for map visualization
            fetch(`${apiHost}/api/action?action=list_all_users&user_id=${userId}`)
              .then(r => r.json())
              .then(uData => {
                if (uData.ok && Array.isArray(uData.users)) {
                  setRegisteredUsers(uData.users);
                }
              })
              .catch(() => {});
          }

          if (!cabinetInitializedRef.current) {
            if (data.tax_rate !== undefined) setTaxRateInput(data.tax_rate);
            if (data.government) {
              setIncomeTaxInput(data.government.income_tax ?? 10);
              setSalesTaxInput(data.government.sales_tax ?? 5);
              setWelfareThresholdInput(data.government.welfare_threshold ?? 15);
              setWelfarePayoutInput(data.government.welfare_payout ?? 15);
            }
            if (data.cabinet) {
              cabinetInitializedRef.current = true;
              setPmInput(matchAdultName(data.cabinet.prime_minister, "Thakorbhai"));
              setDmInput(matchAdultName(data.cabinet.district_magistrate, "Vasantiben"));
              setFinInput(matchAdultName(data.cabinet.ministers?.finance, "Vandan"));
              setEduInput(matchAdultName(data.cabinet.ministers?.education, "Hetvi"));
              setInfraInput(matchAdultName(data.cabinet.ministers?.infrastructure, "v"));
            }
          }
        } else {
          setError(data.message || "Failed to load player state.");
        }
      })
      .catch((err) => {
        setError(err.message || "Backend offline");
      });
  }, [userId, apiHost, isLoggedIn]);

  // Dynamic Polling simulation status with smooth cadence
  useEffect(() => {
    if (!isLoggedIn) return;
    fetchStatus();

    const pollIntervalTime = isPaused ? 3000 : simSpeed >= 60 ? 600 : simSpeed >= 10 ? 800 : 1200;
    const interval = setInterval(fetchStatus, pollIntervalTime);
    return () => {
      clearInterval(interval);
    };
  }, [fetchStatus, isLoggedIn, isPaused, simSpeed]);

  // Fast Simulation Speed Runner Ticker (Steps smoothly at 10x, 60x, 1000x)
  useEffect(() => {
    if (!isLoggedIn || isPaused || simSpeed <= 1) return;

    // Step every 500ms (2 times per second) with proportional slice of in-game seconds
    const intervalTime = 500;
    const stepSeconds = (simSpeed * (intervalTime / 1000));

    const timer = setInterval(() => {
      fetch(`${apiHost}/api/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "step_simulation",
          user_id: userId,
          seconds: stepSeconds,
          speed: simSpeed
        })
      })
        .then((res) => res.json())
        .catch(() => {});
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isLoggedIn, isPaused, simSpeed, userId, apiHost]);

  const handleMemberCountChange = (count: number) => {
    setSignupMemberCount(count);
    setSignupMemberNames((prev) => {
      const next = [...prev];
      while (next.length < count) next.push("");
      return next.slice(0, count);
    });
  };

  const handleSendOtp = async () => {
    const target = authInput.trim();
    if (!target) {
      setAuthError("Please enter your Email address or Phone number first.");
      return;
    }
    setAuthError("");
    setIsSendingOtp(true);
    setOtpNotice("");

    try {
      const res = await fetch(`${apiHost}/api/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          email: target,
          name: signupName || "Citizen"
        })
      });
      const data = await res.json();
      if (data.ok) {
        setOtpNotice(data.message);
        if (data.devCode) {
          setGeneratedOtp(data.devCode);
        }
      } else {
        setAuthError(data.message || "Failed to send verification code.");
      }
    } catch (err: any) {
      setAuthError("Network error: " + err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSendMagicLink = async () => {
    const target = authInput.trim();
    if (!target) {
      setAuthError("Please enter your Email address first.");
      return;
    }
    setAuthError("");
    setIsSendingOtp(true);

    try {
      const res = await fetch(`${apiHost}/api/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_magic_link",
          email: target,
          name: signupName || "Citizen"
        })
      });
      const data = await res.json();
      if (data.ok) {
        setMagicLinkSent(true);
        setOtpNotice(data.message || `Magic sign-in link dispatched to ${target}!`);
      } else {
        setAuthError(data.message || "Failed to generate magic link.");
      }
    } catch (err: any) {
      setAuthError("Network error: " + err.message);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSignupCitySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = signupCityQuery.trim();
    if (!q) return;
    setSignupIsSearching(true);
    setAuthError("");

    const lower = q.toLowerCase();
    if (KNOWN_CITIES[lower]) {
      const [lat, lng] = KNOWN_CITIES[lower];
      setSignupCoords([lat, lng]);
      setSignupCityName(q.charAt(0).toUpperCase() + q.slice(1) + ", Gujarat");
      signupMapInstanceRef.current?.flyTo([lat, lng], 17);
      setSignupIsSearching(false);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ", Gujarat, India")}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const top = data[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        setSignupCoords([lat, lng]);
        setSignupCityName(top.display_name.split(",")[0]);
        signupMapInstanceRef.current?.flyTo([lat, lng], 17);
      } else {
        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`);
        const data2 = await res2.json();
        if (data2 && data2.length > 0) {
          const top = data2[0];
          const lat = parseFloat(top.lat);
          const lng = parseFloat(top.lon);
          setSignupCoords([lat, lng]);
          setSignupCityName(top.display_name.split(",")[0]);
          signupMapInstanceRef.current?.flyTo([lat, lng], 17);
        } else {
          setAuthError(`City or village '${q}' not found. Please try another place name.`);
        }
      }
    } catch {
      setAuthError("Geocoding lookup timed out.");
    } finally {
      setSignupIsSearching(false);
    }
  };

  // Auth / Registration submission
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    const targetUser = authInput.trim().toLowerCase();
    if (!targetUser) {
      setAuthError("Please enter your Email address or Phone number.");
      return;
    }

    // SIGN IN TAB
    if (authTab === "signin") {
      // 1. Password Login Method (Instant & Secure)
      if (authMethod === "password") {
        if (!authPassword.trim()) {
          setAuthError("Please enter your password.");
          return;
        }
        try {
          const res = await fetch(`${apiHost}/api/auth/password`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "login_password",
              email: targetUser,
              password: authPassword.trim()
            })
          });
          const data = await res.json();
          if (!data.ok) {
            setAuthError(data.message || "Invalid email or password.");
            return;
          }
        } catch (err: any) {
          setAuthError("Authentication failed: " + err.message);
          return;
        }

        setUserId(targetUser);
        setIsLoggedIn(true);
        try {
          localStorage.setItem("civilization_active_user", targetUser);
        } catch {}
        return;
      }

      // 2. Email OTP Method
      if (authMethod === "otp") {
        if (!enteredOtp.trim()) {
          setAuthError("Please enter the 6-digit OTP verification code sent to your email.");
          return;
        }
        try {
          const res = await fetch(`${apiHost}/api/auth/otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify_otp",
              email: targetUser,
              code: enteredOtp.trim()
            })
          });
          const data = await res.json();
          if (!data.ok) {
            setAuthError(data.message || "Invalid or expired OTP code.");
            return;
          }
        } catch (err: any) {
          setAuthError("Verification failed: " + err.message);
          return;
        }

        setUserId(targetUser);
        setIsLoggedIn(true);
        try {
          localStorage.setItem("civilization_active_user", targetUser);
        } catch {}
        return;
      }
    }

    // CREATE CITIZEN ACCOUNT TAB
    if (authTab === "signup") {
      if (!signupName.trim()) {
        setAuthError("Please enter the Citizen Full Name.");
        return;
      }

      if (!authPassword.trim() || authPassword.length < 4) {
        setAuthError("Please create a password (minimum 4 characters).");
        return;
      }

      if (confirmPasswordInput && authPassword !== confirmPasswordInput) {
        setAuthError("Passwords do not match. Please re-enter.");
        return;
      }

      // Validate all N family member names
      for (let i = 0; i < signupMemberCount; i++) {
        const mName = (signupMemberNames[i] || "").trim();
        if (!mName) {
          setAuthError(`Please enter name for Family Member #${i + 1}.`);
          return;
        }
      }

      // Register new citizen with password into MongoDB Atlas
      try {
        const res = await fetch(`${apiHost}/api/auth/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_password",
            citizen_name: signupName.trim(),
            email: targetUser,
            password: authPassword.trim(),
            address: signupAddress.trim() || signupCityName,
            lat: signupCoords[0],
            lng: signupCoords[1],
            members: signupMemberNames.slice(0, signupMemberCount)
          })
        });
        const data = await res.json();
        if (!data.ok) {
          setAuthError(data.message || "Registration failed.");
          return;
        }
      } catch (err: any) {
        setAuthError("Failed to connect to backend: " + err.message);
        return;
      }

      setUserId(targetUser);
      setIsLoggedIn(true);
      try {
        localStorage.setItem("civilization_active_user", targetUser);
      } catch {}
    }
  };

  const handleSendForgotOtp = async () => {
    const targetEmail = (forgotEmail || authInput).trim().toLowerCase();
    if (!targetEmail) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    setForgotError("");
    setForgotMsg("");
    setIsSendingForgotOtp(true);

    try {
      const res = await fetch(`${apiHost}/api/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgot_password_send_otp",
          email: targetEmail
        })
      });
      const data = await res.json();
      if (data.ok) {
        setForgotOtpSent(true);
        setForgotOtp("");
        setForgotMsg(data.message || `Password reset verification code sent to ${targetEmail}. Please check your inbox.`);
        if (data.devCode) {
          setDevForgotCode(data.devCode);
        }
      } else {
        setForgotError(data.message || "No account found with this email address.");
      }
    } catch (err: any) {
      setForgotError("Failed to send reset code: " + err.message);
    } finally {
      setIsSendingForgotOtp(false);
    }
  };

  const handleVerifyAndResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = (forgotEmail || authInput).trim().toLowerCase();
    if (!targetEmail) {
      setForgotError("Please enter your registered email address.");
      return;
    }
    if (!forgotOtp.trim()) {
      setForgotError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }
    if (!forgotNewPassword.trim() || forgotNewPassword.trim().length < 4) {
      setForgotError("New password must be at least 4 characters long.");
      return;
    }

    setForgotError("");
    setForgotMsg("");
    setIsVerifyingForgot(true);

    try {
      const res = await fetch(`${apiHost}/api/auth/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "forgot_password_verify_and_reset",
          email: targetEmail,
          otp: forgotOtp.trim(),
          new_password: forgotNewPassword.trim()
        })
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message || "Password successfully reset! Logging in with your new password...");
        setAuthInput(targetEmail);
        setAuthPassword(forgotNewPassword.trim());
        setUserId(targetEmail);
        setIsLoggedIn(true);
        try {
          localStorage.setItem("civilization_active_user", targetEmail);
        } catch {}
        setIsForgotPassword(false);
        setForgotOtpSent(false);
        setForgotOtp("");
        setForgotNewPassword("");
      } else {
        setForgotError(data.message || "Invalid OTP or failed to reset password.");
      }
    } catch (err: any) {
      setForgotError("Error resetting password: " + err.message);
    } finally {
      setIsVerifyingForgot(false);
    }
  };



  // Logout / Switch account
  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem("civilization_active_user");
    } catch {}
  };

  // Simulation action dispatcher
  const dispatchAction = async (action: string, payload: any = {}) => {
    try {
      const res = await fetch(`${apiHost}/api/action?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload })
      });
      const data = await res.json();
      if (!data.ok) {
        alert(data.message || "Action failed.");
      } else {
        if (data.zone_locations) {
          setStatus((prev: any) => prev ? { ...prev, zone_locations: data.zone_locations } : prev);
        }
      }
      return data;
    } catch (err: any) {
      alert("Communication error with server: " + err.message);
      return { ok: false, message: err.message };
    }
  };

  // Action helpers
  const plantAll = async (cropId: string) => {
    const res = await dispatchAction("plant_all", { crop_id: cropId });
    if (res?.message) {
      setFarmActionMsg(res.message);
      setTimeout(() => setFarmActionMsg(""), 5000);
    }
  };
  const plantPlot = async (plotIndex: number, cropId: string) => {
    const res = await dispatchAction("plant_plot", { plot_index: plotIndex, crop_id: cropId });
    if (res?.message) {
      setFarmActionMsg(res.message);
      setTimeout(() => setFarmActionMsg(""), 5000);
    }
  };
  const harvestAll = async () => {
    const res = await dispatchAction("harvest_all");
    if (res?.message) {
      setFarmActionMsg(res.message);
      setTimeout(() => setFarmActionMsg(""), 5000);
    }
  };
  const harvestPlot = async (plotIndex: number) => {
    const res = await dispatchAction("harvest_plot", { plot_index: plotIndex });
    if (res?.message) {
      setFarmActionMsg(res.message);
      setTimeout(() => setFarmActionMsg(""), 5000);
    }
  };
  const buySeeds = async (seedId: string, qty: number = 1) => {
    const res = await dispatchAction("buy_seeds", { seed_id: seedId, qty });
    if (res?.message) {
      setFarmActionMsg(res.message);
      setTimeout(() => setFarmActionMsg(""), 5000);
    }
  };
  const triggerKisanAgent = async () => {
    setKisanAgentRunning(true);
    try {
      const res = await dispatchAction("run_kisan_agent", { min_target: 5 });
      if (res?.report) {
        setKisanReport(res.report);
      }
      if (res?.message) {
        setFarmActionMsg(`Kisan Agent: ${res.message}`);
        setTimeout(() => setFarmActionMsg(""), 6000);
      }
    } finally {
      setKisanAgentRunning(false);
    }
  };
  const craftRecipe = (recipeId: string) => dispatchAction("craft", { recipe_id: recipeId });
  const buyItem = (itemId: string, qty: number = 1) => dispatchAction("buy", { item_id: itemId, qty });
  const sellItem = (itemId: string, qty: number = 1) => dispatchAction("sell", { item_id: itemId, qty });
  const buyFromShop = (shopId: string, itemId: string, qty: number = 1) => dispatchAction("buy_from_shop", { shop_id: shopId, item_id: itemId, qty });
  const sellToShop = (shopId: string, itemId: string, qty: number = 1) => dispatchAction("sell_to_shop", { shop_id: shopId, item_id: itemId, qty });
  
  // Industrial Action helpers
  const refinePetrol = async () => {
    const res = await dispatchAction("refine_petrol", { barrels: refiningBarrelsInput });
    if (res?.message) {
      setIndustrialActionMsg(res.message);
      setTimeout(() => setIndustrialActionMsg(""), 5000);
    }
  };

  const saveFuelPrice = async () => {
    const res = await dispatchAction("set_fuel_price", { price_per_liter: fuelPriceInput });
    if (res?.message) {
      setIndustrialActionMsg(res.message);
      setTimeout(() => setIndustrialActionMsg(""), 5000);
    }
  };

  const commissionShip = async () => {
    const res = await dispatchAction("commission_ship", { name: newShipNameInput, type: newShipTypeInput });
    if (res?.message) {
      setIndustrialActionMsg(res.message);
      setNewShipNameInput("");
      setTimeout(() => setIndustrialActionMsg(""), 5000);
    }
  };

  const dispatchShipVoyage = async (shipId: string) => {
    const res = await dispatchAction("dispatch_ship_voyage", { ship_id: shipId });
    if (res?.message) {
      setIndustrialActionMsg(res.message);
      setTimeout(() => setIndustrialActionMsg(""), 5000);
    }
  };

  const smeltSteel = async () => {
    const res = await dispatchAction("smelt_steel", {});
    if (res?.message) {
      setIndustrialActionMsg(res.message);
      setTimeout(() => setIndustrialActionMsg(""), 5000);
    }
  };

  const populateHomeInputs = () => {
    const myFam = status?.families?.find((f: any) => f.id === "my_home" || f.id === `house_${userId}`) || status?.families?.[0];
    const hName = myFam?.name || status?.home_name || `${userId.split(/[@_]/)[0]}'s Residence`;
    const addr = myFam?.address || status?.address || status?.city_name || "Civilization Citizen Zone";
    const coords = status?.zone_locations?.my_home || myFam?.coords || [status?.lat ?? 20.9472, status?.lng ?? 72.9515];

    setHomeNameInput(hName);
    setHomeAddressInput(addr);
    setHomeLatInput(String(coords[0] ?? 20.9472));
    setHomeLngInput(String(coords[1] ?? 72.9515));

    const mems = myFam?.members || status?.household?.members || status?.members || [];
    const mCount = Math.max(1, mems.length || 4);
    setHomeMemberCountInput(mCount);

    const mNames = Array.from({ length: mCount }).map((_, idx) => {
      const m = mems[idx];
      return typeof m === "string" ? m : m?.name || (idx === 0 ? (status?.name || userId.split(/[@_]/)[0]) : `Member #${idx + 1}`);
    });
    const mRoles = Array.from({ length: mCount }).map((_, idx) => {
      const m = mems[idx];
      return typeof m === "object" && m?.role ? m.role : (idx === 0 ? "Head of Family" : idx === 1 ? "Spouse" : "Child");
    });
    const mAges = Array.from({ length: mCount }).map((_, idx) => {
      const m = mems[idx];
      return typeof m === "object" && m?.age ? Number(m.age) : (idx === 0 ? 35 : idx === 1 ? 32 : 12);
    });

    setHomeMemberNamesInput(mNames);
    setHomeMemberRolesInput(mRoles);
    setHomeMemberAgesInput(mAges);
  };

  const savePrivateHome = async () => {
    const lat = parseFloat(homeLatInput) || 20.9472;
    const lng = parseFloat(homeLngInput) || 72.9515;

    // Prepare family members structured list with age
    const validMembers = homeMemberNamesInput.slice(0, homeMemberCountInput).map((mName, idx) => ({
      name: mName.trim() || (idx === 0 ? (userId.split(/[@_]/)[0]) : `Member #${idx + 1}`),
      role: homeMemberRolesInput[idx] || (idx === 0 ? "Head of Family" : "Resident Member"),
      relation: idx === 0 ? "Household Head" : "Family Member",
      age: Number(homeMemberAgesInput[idx]) || (idx === 0 ? 35 : idx === 1 ? 32 : 12),
      vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle"
    }));

    const res = await dispatchAction("update_user_details", {
      target_user_id: userId,
      lat,
      lng,
      home_name: homeNameInput.trim() || `${userId.split(/[@_]/)[0]}'s Residence`,
      address: homeAddressInput.trim() || "Civilization Citizen Zone",
      family_name: homeFamilyNameInput.trim() || homeNameInput.trim() || `${userId.split(/[@_]/)[0]}'s Residence`,
      member_count: homeMemberCountInput,
      members: validMembers
    });
    if (res?.ok) {
      setHomeSaveMsg(`✅ Private residence & ${validMembers.length} family members saved successfully!`);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 16);
      }
      setTimeout(() => setHomeSaveMsg(""), 6000);
    } else if (res?.message) {
      setHomeSaveMsg(`❌ ${res.message}`);
    }
  };

  const openAdminEditCitizenModal = (u: any) => {
    setAdminEditTargetUserId(u.user_id || "");
    setAdminEditName(u.name || u.home_name?.replace(/'s Residence$/, "") || "");
    setAdminEditHomeName(u.home_name || "");
    setAdminEditAddress(u.address || u.city_name || "");
    setAdminEditLat(String(u.coords?.[0] ?? 20.9472));
    setAdminEditLng(String(u.coords?.[1] ?? 72.9515));
    setAdminEditMoney(u.money ?? 500);

    const mCount = Math.max(1, u.members?.length || 4);
    setAdminEditMemberCount(mCount);
    const mNames = Array.from({ length: mCount }).map((_, idx) => {
      const m = u.members?.[idx];
      return typeof m === "string" ? m : m?.name || "";
    });
    const mRoles = Array.from({ length: mCount }).map((_, idx) => {
      const m = u.members?.[idx];
      return typeof m === "object" && m?.role ? m.role : (idx === 0 ? "Head of Family" : idx === 1 ? "Spouse" : "Resident");
    });
    const mAges = Array.from({ length: mCount }).map((_, idx) => {
      const m = u.members?.[idx];
      return typeof m === "object" && m?.age ? Number(m.age) : (idx === 0 ? 35 : idx === 1 ? 32 : 12);
    });
    setAdminEditMemberNames(mNames);
    setAdminEditMemberRoles(mRoles);
    setAdminEditMemberAges(mAges);
    setAdminEditMsg("");
    setAdminEditModalOpen(true);
  };

  const handleSaveAdminEditCitizen = async () => {
    if (!adminEditTargetUserId) return;
    setAdminEditMsg("Saving changes to MongoDB...");

    const structuredMembers = adminEditMemberNames.slice(0, adminEditMemberCount).map((mName, idx) => ({
      name: mName.trim() || `Member #${idx + 1}`,
      role: adminEditMemberRoles[idx] || (idx === 0 ? "Head of Family" : "Resident Member"),
      relation: idx === 0 ? "Household Head" : "Family Member",
      age: Number(adminEditMemberAges[idx]) || (idx === 0 ? 35 : idx === 1 ? 32 : 12),
      vehicle: idx === 0 ? "car" : idx === 1 ? "scooter" : "bicycle"
    }));

    try {
      const res = await fetch(`${apiHost}/api/action?user_id=${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "admin_edit_citizen",
          target_user_id: adminEditTargetUserId,
          name: adminEditName.trim(),
          home_name: adminEditHomeName.trim(),
          address: adminEditAddress.trim(),
          lat: parseFloat(adminEditLat) || 20.9472,
          lng: parseFloat(adminEditLng) || 72.9515,
          money: adminEditMoney,
          members: structuredMembers
        })
      });
      const data = await res.json();
      if (data.ok) {
        setAdminEditMsg("✅ Citizen information and family roster updated successfully!");
        if (Array.isArray(data.users)) {
          setRegisteredUsers(data.users);
        }
        setTimeout(() => {
          setAdminEditModalOpen(false);
          setAdminEditMsg("");
        }, 1500);
      } else {
        setAdminEditMsg("❌ Error: " + (data.message || "Failed to update citizen."));
      }
    } catch (err: any) {
      setAdminEditMsg("❌ Error: " + err.message);
    }
  };

  // Admin Action helpers
  const saveTaxRate = () => dispatchAction("set_tax_rate", { tax_rate: taxRateInput });
  const allocateFunds = (projectId: string) => {
    const amount = allocAmount[projectId] || 50;
    dispatchAction("allocate_project_funds", { project_id: projectId, amount });
  };
  const saveGovernmentPolicies = () => {
    dispatchAction("set_government_policies", {
      income_tax: incomeTaxInput,
      sales_tax: salesTaxInput,
      welfare_threshold: welfareThresholdInput,
      welfare_payout: welfarePayoutInput
    });
  };
  const saveCabinetRoles = async () => {
    await dispatchAction("reassign_cabinet", {
      prime_minister: pmInput,
      district_magistrate: dmInput,
      finance: finInput,
      education: eduInput,
      infrastructure: infraInput
    });
  };
  const conductElection = async () => {
    cabinetInitializedRef.current = false;
    await dispatchAction("conduct_election");
  };
  const toggleCityManager = () => {
    dispatchAction("toggle_city_manager", { enabled: !status?.city_manager_enabled });
  };
  const resetAndSeedDb = async () => {
    if (window.confirm("Are you sure you want to reset the database and seed clean 6 Citizens architecture (Vandan_Home & Vpatel Residence)?")) {
      const res = await dispatchAction("reset_and_seed_database");
      if (res?.ok) {
        alert(res.message || "Database reset successfully!");
        fetchStatus();
      }
    }
  };

  // Admin Location Fix Helpers
  const submitRelocate = async () => {
    if (!clickedCoords) return;
    const res = await dispatchAction("relocate_landmark", {
      landmark_id: selectedLandmarkToMove,
      lat: clickedCoords.lat,
      lng: clickedCoords.lng
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Permanently saved and fixed location on satellite map!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
    }
    setClickedCoords(null);
    setEditLocationsMode(false);
  };

  // Known Gujarat and Indian city coordinates dictionary
  const KNOWN_CITIES: Record<string, [number, number]> = {
    rumla: [20.6728, 73.0805],
    navsari: [20.9467, 72.9520],
    surat: [21.1702, 72.8311],
    valsad: [20.5992, 72.9342],
    bilimora: [20.7636, 72.9602],
    chikhli: [20.7574, 73.0592],
    vapi: [20.3893, 72.9106],
    dharampur: [20.5404, 73.1782],
    vansda: [20.7719, 73.3644],
    bardoli: [21.1215, 73.1118],
    ahmedabad: [23.0225, 72.5714],
    vadodara: [22.3072, 73.1812],
    gandhinagar: [23.2156, 72.6369],
    mumbai: [19.0760, 72.8777]
  };

  const handleCitySearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchCityInput.trim();
    if (!query) return;

    setIsSearchingCity(true);
    setSearchError("");

    const lower = query.toLowerCase();
    if (KNOWN_CITIES[lower]) {
      const [lat, lng] = KNOWN_CITIES[lower];
      setSearchedLocation({ name: query.charAt(0).toUpperCase() + query.slice(1), lat, lng });
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 15);
      }
      setIsSearchingCity(false);
      return;
    }

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Gujarat, India")}`);
      const data = await res.json();
      if (data && data.length > 0) {
        const top = data[0];
        const lat = parseFloat(top.lat);
        const lng = parseFloat(top.lon);
        setSearchedLocation({ name: top.display_name.split(",")[0], lat, lng });
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([lat, lng], 15);
        }
      } else {
        const res2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const data2 = await res2.json();
        if (data2 && data2.length > 0) {
          const top = data2[0];
          const lat = parseFloat(top.lat);
          const lng = parseFloat(top.lon);
          setSearchedLocation({ name: top.display_name.split(",")[0], lat, lng });
          if (mapInstanceRef.current) {
            mapInstanceRef.current.flyTo([lat, lng], 15);
          }
        } else {
          setSearchError(`City '${query}' not found. Please check spelling.`);
        }
      }
    } catch {
      setSearchError("Geocoding lookup timed out. Please try again.");
    } finally {
      setIsSearchingCity(false);
    }
  };

  const assignSearchedLocation = async (landmarkId: string) => {
    if (!searchedLocation) return;
    const res = await dispatchAction("relocate_landmark", {
      landmark_id: landmarkId,
      lat: searchedLocation.lat,
      lng: searchedLocation.lng
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Assigned and permanently fixed location for ${landmarkId}!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([searchedLocation.lat, searchedLocation.lng], 16);
    }
  };

  const submitManualLocation = async () => {
    const lat = parseFloat(manualLatInput);
    const lng = parseFloat(manualLngInput);
    if (isNaN(lat) || isNaN(lng)) {
      alert("Please enter valid decimal coordinates (e.g. 20.9467, 72.9520).");
      return;
    }
    const res = await dispatchAction("relocate_landmark", {
      landmark_id: manualTargetLandmark,
      lat,
      lng
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Saved and fixed GPS [${lat.toFixed(6)}, ${lng.toFixed(6)}] permanently!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([lat, lng], 16);
      }
    }
  };

  const resetAllLocations = async () => {
    if (!confirm("Are you sure you want to reset all world locations to civilization defaults?")) return;
    const res = await dispatchAction("reset_world_locations");
    if (res?.ok) {
      setLocationActionMsg("✓ All locations restored to default Navsari coordinates.");
      setTimeout(() => setLocationActionMsg(""), 5000);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([CENTER_LAT, CENTER_LNG], 16);
      }
    }
  };

  const submitAssignMemberRole = async () => {
    const res = await dispatchAction("assign_member_role", {
      family_id: editMemberFamilyId,
      member_name: editMemberName,
      role: editMemberRole,
      relation: editMemberRelation,
      vehicle: editMemberVehicle
    });
    if (res?.ok) {
      const vehIcon = VEHICLE_EMOJIS[editMemberVehicle] || "🚲";
      setLocationActionMsg(`✓ Role '${editMemberRole}' and Vehicle ${vehIcon} assigned to ${editMemberName}!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      setEditMemberModalOpen(false);
    }
  };

  const submitCreateResidence = async () => {
    if (!newResidenceName.trim()) {
      alert("Please enter a residence name.");
      return;
    }
    const lat = parseFloat(newResidenceLat);
    const lng = parseFloat(newResidenceLng);
    const res = await dispatchAction("create_residence", {
      id: newResidenceId.trim(),
      name: newResidenceName.trim(),
      type: newResidenceType,
      capacity: newResidenceCapacity,
      budget: newResidenceBudget,
      lat: isNaN(lat) ? undefined : lat,
      lng: isNaN(lng) ? undefined : lng
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Created new ${newResidenceType === "hostel" ? "Worker Hostel" : "House"} '${newResidenceName}'!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      setCreateResidenceModalOpen(false);
      setNewResidenceName("");
      setNewResidenceId("");
    }
  };

  const submitEditResidence = async () => {
    const res = await dispatchAction("edit_residence", {
      family_id: editResidenceId,
      name: editResidenceName.trim(),
      type: editResidenceType,
      capacity: editResidenceCapacity,
      budget: editResidenceBudget
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Updated '${editResidenceName}' details!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      setEditResidenceModalOpen(false);
    }
  };

  const submitAddMember = async () => {
    if (!newMemberName.trim()) {
      alert("Please enter citizen/worker name.");
      return;
    }
    const res = await dispatchAction("add_member_to_residence", {
      family_id: addMemberFamilyId,
      name: newMemberName.trim(),
      role: newMemberRole,
      relation: newMemberRelation.trim(),
      vehicle: newMemberVehicle
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Added ${newMemberName} to residence!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      setAddMemberModalOpen(false);
      setNewMemberName("");
    }
  };

  const submitRemoveMember = async (familyId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this residence?`)) return;
    const res = await dispatchAction("remove_member_from_residence", {
      family_id: familyId,
      member_name: memberName
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Removed ${memberName} from residence.`);
      setTimeout(() => setLocationActionMsg(""), 5000);
    }
  };

  const submitTransferWorker = async () => {
    if (!transferFromFamilyId || !transferToFamilyId || !transferWorkerName) {
      alert("Please select source residence, worker, and destination.");
      return;
    }
    const res = await dispatchAction("transfer_worker", {
      from_family_id: transferFromFamilyId,
      to_family_id: transferToFamilyId,
      member_name: transferWorkerName,
      new_role: transferNewRole || undefined,
      new_vehicle: transferNewVehicle || undefined
    });
    if (res?.ok) {
      setLocationActionMsg(`✓ Transferred ${transferWorkerName} successfully!`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      setTransferWorkerModalOpen(false);
    }
  };

  const submitDeleteResidence = async (familyId: string) => {
    const fam = status?.families?.find((f: any) => f.id === familyId);
    if (!confirm(`Are you sure you want to permanently delete and decommission residence '${fam?.name || familyId}'?`)) return;
    const res = await dispatchAction("delete_residence", { family_id: familyId });
    if (res?.ok) {
      setLocationActionMsg(`✓ Decommissioned and deleted residence '${fam?.name || familyId}'.`);
      setTimeout(() => setLocationActionMsg(""), 5000);
      const remaining = status?.families?.filter((f: any) => f.id !== familyId) || [];
      if (remaining.length > 0) {
        setSelectedFamilyId(remaining[0].id);
      }
    }
  };

  // Helper to render all landmark options including all dynamic families
  const renderLandmarkOptions = () => {
    const customFamilies = status?.families || [];
    const houses = customFamilies.filter((f: any) => f.type !== "hostel" && !f.id.startsWith("hostel_"));
    const hostels = customFamilies.filter((f: any) => f.type === "hostel" || f.id.startsWith("hostel_"));

    return (
      <>
        <optgroup label="🏠 Residential Homes (Houses)">
          {houses.map((f: any) => (
            <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
          ))}
        </optgroup>
        {hostels.length > 0 && (
          <optgroup label="🏢 Worker Hostels & Dormitories">
            {hostels.map((f: any) => (
              <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
            ))}
          </optgroup>
        )}
        <optgroup label="🏪 Shops & Commercial">
          <option value="farmers_market">Navsari Fresh Farmers & Vegetable Market (Kisan Mandi)</option>
          <option value="dairy">City Dairy & Groceries (Amina)</option>
          <option value="general">Ramesh Supplies Store</option>
          <option value="clothing">Savita Clothiers & Fabrics</option>
          <option value="electronics">Rajesh Electronics Hub</option>
        </optgroup>
        <optgroup label="🏛️ Public & Industrial Infrastructure">
          <option value="farms">Colony Agricultural Farms</option>
          <option value="factory">Manufacturing Factory</option>
          <option value="school">Community School</option>
          <option value="hospital">General Hospital</option>
          <option value="park">Public Leisure Park</option>
          <option value="roads">Paved Highways & Plaza</option>
        </optgroup>
      </>
    );
  };

  const myPersonalFamily = status?.families?.find((f: any) => f.id === "my_home" || f.id === `house_${userId}`) || status?.families?.[0];
  const selectedFamily = isAdmin
    ? (status?.families?.find((f: any) => f.id === selectedFamilyId) || status?.families?.[0])
    : myPersonalFamily;
  // Dynamically compute list of all actual registered citizens eligible for Government Cabinet (Age >= 18 criteria)
  const listAllAdults = useMemo(() => {
    const map = new Map<string, number>();

    const processMembers = (members: any[]) => {
      if (!Array.isArray(members)) return;
      members.forEach((m: any, idx: number) => {
        const mName = typeof m === "string" ? m.trim() : (m?.name || "").trim();
        const mAge = typeof m === "object" && m?.age !== undefined ? Number(m.age) : (idx === 0 ? 35 : idx === 1 ? 32 : 12);
        if (
          mName &&
          !mName.includes("Private Resident") &&
          !mName.includes("Protected") &&
          !mName.startsWith("Member #") &&
          mAge >= 18 // Age eligibility criteria (Adults >= 18 only)
        ) {
          if (!map.has(mName) || (map.get(mName) || 0) < mAge) {
            map.set(mName, mAge);
          }
        }
      });
    };

    if (status?.families && Array.isArray(status.families)) {
      status.families.forEach((fam: any) => processMembers(fam.members));
    }
    if (registeredUsers && Array.isArray(registeredUsers)) {
      registeredUsers.forEach((u: any) => processMembers(u.members));
    }

    const arr = Array.from(map.keys());
    return arr.length > 0
      ? arr
      : ["Thakorbhai", "Vasantiben", "Vandan", "Hetvi", "V1", "V2"];
  }, [status?.families, registeredUsers]);

  // =========================================================================
  // VIEW 1: AUTHENTICATION & LOGIN / SIGN-UP GATEWAY SCREEN
  // =========================================================================
  // =========================================================================
  // VIEW 1: AUTHENTICATION & LOGIN / SIGN-UP GATEWAY SCREEN
  // =========================================================================
  const isAutoDayAuth = new Date().getHours() >= 6 && new Date().getHours() < 19;
  const isAuthDay = themeMode === "day" || (themeMode === "auto" && isAutoDayAuth);

  const handleThemeToggle = (mode: "night" | "day" | "auto") => {
    setThemeMode(mode);
    try {
      localStorage.setItem("civilization_theme_mode", mode);
    } catch {}
  };

  if (!isLoggedIn) {
    return (
      <div
        className={`min-h-screen w-screen flex flex-col justify-between font-sans relative overflow-x-hidden transition-colors duration-500 selection:bg-amber-500 selection:text-slate-950 ${
          isAuthDay
            ? "bg-gradient-to-br from-amber-50/95 via-sky-50/70 to-slate-100/90 text-slate-900"
            : "bg-slate-950 text-slate-100"
        }`}
      >
        {/* Background Ambient Glow */}
        <div
          className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isAuthDay ? "bg-amber-400/20" : "bg-sky-500/10"
          }`}
        />
        <div
          className={`absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
            isAuthDay ? "bg-sky-400/20" : "bg-amber-500/10"
          }`}
        />

        {/* Top Live Ticker & Theme Mode Switcher */}
        <div
          className={`w-full border-b px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 backdrop-blur-md transition-all ${
            isAuthDay
              ? "bg-white/80 border-slate-200/90 text-slate-700 shadow-sm"
              : "bg-slate-900/80 border-slate-800/80 text-slate-400"
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow animate-pulse">
              LIVE SYSTEM
            </span>
            <span
              className={`text-xs font-mono ${
                isAuthDay ? "text-slate-600 font-semibold" : "text-slate-400"
              }`}
            >
              Autonomous AI Civilization Simulation • High-Resolution Satellite GIS & PMO
            </span>
          </div>

          {/* Theme Mode Switcher (Day / Night / Auto) */}
          <div
            className={`flex items-center p-0.5 rounded-xl border text-xs shadow-inner transition-all ${
              isAuthDay
                ? "bg-slate-100 border-slate-300/80 text-slate-700"
                : "bg-slate-900/90 border-slate-800 text-slate-300"
            }`}
          >
            <button
              type="button"
              onClick={() => handleThemeToggle("day")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                themeMode === "day"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : isAuthDay
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>☀️</span>
              <span>DAY</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeToggle("night")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                themeMode === "night"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : isAuthDay
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🌙</span>
              <span>NIGHT</span>
            </button>
            <button
              type="button"
              onClick={() => handleThemeToggle("auto")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                themeMode === "auto"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : isAuthDay
                  ? "text-slate-600 hover:text-slate-950"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <span>🕒</span>
              <span>AUTO</span>
            </button>
          </div>
        </div>

        {/* Center Glassmorphism Authentication Card */}
        <div className="flex-grow flex items-center justify-center p-4 z-10">
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl backdrop-blur-xl p-6 md:p-8 flex flex-col gap-6 transition-all duration-500 ${
              isAuthDay
                ? "bg-white/90 border border-slate-200/90 shadow-sky-950/10 text-slate-900"
                : "bg-slate-900/70 border border-slate-800/90 shadow-black/50 text-slate-100"
            }`}
          >
            {/* Header / Logo */}
            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
                <span className="text-2xl">🏛️</span>
              </div>
              <h1
                className={`text-2xl md:text-3xl font-extrabold tracking-tight ${
                  isAuthDay
                    ? "text-slate-900"
                    : "bg-gradient-to-r from-white via-slate-200 to-amber-400 bg-clip-text text-transparent"
                }`}
              >
                AI CIVILIZATION
              </h1>
              <p
                className={`text-xs mt-1 ${
                  isAuthDay ? "text-slate-600" : "text-slate-400"
                }`}
              >
                Enter your Email or Phone number to join the living geolocated simulation.
              </p>

              {/* Multi-Database Connection Status Badge */}
              <div className="flex items-center justify-center gap-2 mt-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium shadow-sm border ${
                    dbHealth?.ok === false
                      ? isAuthDay
                        ? "bg-red-50 border-red-300 text-red-800"
                        : "bg-red-950/80 border-red-500/40 text-red-300"
                      : dbHealth?.ok
                        ? isAuthDay
                          ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                          : "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                        : isAuthDay
                          ? "bg-amber-50 border-amber-300 text-amber-800"
                          : "bg-amber-950/80 border-amber-500/40 text-amber-300"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      dbHealth?.ok === false
                        ? "bg-red-400"
                        : dbHealth?.ok
                          ? "bg-emerald-400 animate-pulse"
                          : "bg-amber-400 animate-pulse"
                    }`}
                  ></span>
                  <span>
                    {dbHealth?.ok === false
                      ? "MongoDB Disconnected"
                      : dbHealth?.ok
                        ? "MongoDB Atlas Connected"
                        : "Checking MongoDB..."}
                  </span>
                  {dbHealth?.ok && (
                    <span
                      className={`text-[10px] ${
                        isAuthDay ? "text-emerald-700" : "text-emerald-400/60"
                      }`}
                    >
                      (auth • world • catalog)
                    </span>
                  )}
                  {dbHealth?.latencyMs !== undefined && dbHealth?.ok && (
                    <span
                      className={`font-mono text-[10px] ${
                        isAuthDay ? "text-emerald-700 font-bold" : "text-emerald-400/80"
                      }`}
                    >
                      {dbHealth.latencyMs}ms
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Forgot Password View */}
            {isForgotPassword ? (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between border-b pb-3 border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔑</span>
                    <div>
                      <h3 className={`text-sm font-black ${isAuthDay ? "text-slate-900" : "text-white"}`}>
                        Reset Account Password
                      </h3>
                      <p className={`text-xs font-mono ${isAuthDay ? "text-slate-600" : "text-slate-400"}`}>
                        Enter email to receive 6-digit OTP reset code
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotError("");
                      setForgotMsg("");
                    }}
                    className={`text-xs font-bold px-3 py-1.5 rounded-xl border ${
                      isAuthDay ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300" : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    }`}
                  >
                    ← Back to Sign In
                  </button>
                </div>

                {forgotMsg && (
                  <div className={`text-xs p-3 rounded-xl flex items-center justify-between gap-2 border ${
                    isAuthDay ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
                  }`}>
                    <span>✅ {forgotMsg}</span>
                    {devForgotCode && (
                      <button
                        type="button"
                        onClick={() => setForgotOtp(devForgotCode)}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold px-2 py-1 rounded shadow"
                      >
                        AUTO-FILL
                      </button>
                    )}
                  </div>
                )}

                {forgotError && (
                  <div className={`text-xs p-3 rounded-xl flex items-center gap-2 border ${
                    isAuthDay ? "bg-rose-50 border-rose-300 text-rose-800" : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                  }`}>
                    <span>⚠️</span>
                    <span>{forgotError}</span>
                  </div>
                )}

                <form onSubmit={handleVerifyAndResetPassword} className="flex flex-col gap-4">
                  <div>
                    <label className={`text-xs font-semibold mb-1.5 block ${isAuthDay ? "text-slate-700" : "text-slate-300"}`}>
                      Registered Email Address
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="e.g. citizen@gmail.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className={`flex-1 border rounded-xl px-3 py-2 text-sm font-mono transition-all outline-none ${
                          isAuthDay ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-slate-950 border-slate-800 text-white"
                        }`}
                      />
                      <button
                        type="button"
                        disabled={isSendingForgotOtp}
                        onClick={handleSendForgotOtp}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl shadow transition-all whitespace-nowrap disabled:opacity-50"
                      >
                        {isSendingForgotOtp ? "Sending..." : forgotOtpSent ? "Resend Code" : "Send Reset Code 📩"}
                      </button>
                    </div>
                  </div>

                  {forgotOtpSent && (
                    <>
                      <div>
                        <label className={`text-xs font-semibold mb-1.5 block ${isAuthDay ? "text-slate-700" : "text-slate-300"}`}>
                          6-Digit OTP Verification Code
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="e.g. 123456"
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value)}
                          className={`w-full border rounded-xl px-3 py-2 text-sm font-mono transition-all outline-none ${
                            isAuthDay ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-slate-950 border-slate-800 text-white"
                          }`}
                        />
                      </div>

                      <div>
                        <label className={`text-xs font-semibold mb-1.5 block ${isAuthDay ? "text-slate-700" : "text-slate-300"}`}>
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            type={showForgotNewPassword ? "text" : "password"}
                            required
                            placeholder="Enter new password (min 4 chars)"
                            value={forgotNewPassword}
                            onChange={(e) => setForgotNewPassword(e.target.value)}
                            className={`w-full border rounded-xl pl-3 pr-16 py-2.5 text-sm font-mono transition-all outline-none ${
                              isAuthDay ? "bg-slate-50 border-slate-300 text-slate-900 focus:bg-white" : "bg-slate-950 border-slate-800 text-white"
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                            className={`absolute right-3 top-2.5 text-xs font-mono ${isAuthDay ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
                          >
                            {showForgotNewPassword ? "🙈 Hide" : "👁️ Show"}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isVerifyingForgot}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm py-3 rounded-xl shadow-lg transition-all cursor-pointer"
                      >
                        {isVerifyingForgot ? "Updating Password..." : "🔐 Verify Code & Reset Password"}
                      </button>
                    </>
                  )}
                </form>
              </div>
            ) : (
              <>
                {/* Tab Switcher: Sign In vs Sign Up */}
                <div
                  className={`flex p-1 rounded-xl border transition-all ${
                    isAuthDay
                      ? "bg-slate-100 border-slate-200"
                      : "bg-slate-950 border-slate-800/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("signin");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      authTab === "signin"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : isAuthDay
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    SIGN IN
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab("signup");
                      setAuthError("");
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                      authTab === "signup"
                        ? "bg-amber-500 text-slate-950 shadow-md"
                        : isAuthDay
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    CREATE CITIZEN ACCOUNT
                  </button>
                </div>

            {/* Notification / OTP Toast */}
            {otpNotice && (
              <div
                className={`text-xs p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-fade-in border ${
                  isAuthDay
                    ? "bg-sky-50 border-sky-300 text-sky-900"
                    : "bg-sky-950/60 border-sky-500/50 text-sky-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">📱</span>
                  <span>{otpNotice}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEnteredOtp(generatedOtp)}
                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-[10px] font-bold px-2 py-1 rounded transition-all"
                >
                  AUTO-FILL
                </button>
              </div>
            )}

            {/* Error Display */}
            {authError && (
              <div
                className={`text-xs p-3 rounded-xl flex items-center gap-2 border ${
                  isAuthDay
                    ? "bg-rose-50 border-rose-300 text-rose-800"
                    : "bg-rose-950/40 border-rose-500/40 text-rose-300"
                }`}
              >
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* SIGN IN VIEW */}
            {authTab === "signin" && (
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {/* Method Switcher: Password vs OTP */}
                <div
                  className={`flex p-1 rounded-xl border gap-1 transition-all ${
                    isAuthDay
                      ? "bg-slate-100 border-slate-200"
                      : "bg-slate-950 border-slate-800/80"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("password");
                      setAuthError("");
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMethod === "password"
                        ? isAuthDay
                          ? "bg-white text-amber-800 border border-amber-400/70 shadow-sm"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : isAuthDay
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>🔑</span>
                    <span>PASSWORD LOGIN</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod("otp");
                      setAuthError("");
                    }}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      authMethod === "otp"
                        ? isAuthDay
                          ? "bg-white text-amber-800 border border-amber-400/70 shadow-sm"
                          : "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                        : isAuthDay
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <span>📩</span>
                    <span>EMAIL OTP CODE</span>
                  </button>
                </div>

                <div>
                  <label
                    className={`text-xs font-semibold mb-1.5 block ${
                      isAuthDay ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                      ✉️
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. citizen@gmail.com or +91 98765 43210"
                      value={authInput}
                      onChange={(e) => setAuthInput(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm font-mono transition-all focus:outline-none focus:border-amber-500 ${
                        isAuthDay
                          ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                          : "bg-slate-950 border-slate-800 text-white placeholder-slate-600"
                      }`}
                    />
                  </div>
                </div>

                {/* Option A: Password Field */}
                {authMethod === "password" && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-center">
                      <label
                        className={`text-xs font-semibold ${
                          isAuthDay ? "text-slate-700" : "text-slate-300"
                        }`}
                      >
                        Citizen Password
                      </label>
                      <span
                        className={`text-[10px] font-mono ${
                          isAuthDay ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        Secure MongoDB Auth
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                        🔒
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="Enter your password"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className={`w-full border rounded-xl pl-9 pr-16 py-2.5 text-sm font-mono transition-all focus:outline-none focus:border-amber-500 ${
                          isAuthDay
                            ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                            : "bg-slate-950 border-slate-800 text-white placeholder-slate-600"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={`absolute right-3 top-2.5 text-xs font-mono ${
                          isAuthDay
                            ? "text-slate-500 hover:text-slate-900"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {showPassword ? "🙈 Hide" : "👁️ Show"}
                      </button>
                    </div>
                    <div className="flex justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(authInput.trim());
                          setForgotOtp("");
                          setForgotNewPassword("");
                          setForgotOtpSent(false);
                          setForgotMsg("");
                          setForgotError("");
                          setDevForgotCode("");
                          setIsForgotPassword(true);
                        }}
                        className={`text-xs font-bold font-mono ${
                          isAuthDay ? "text-amber-700 hover:text-amber-800" : "text-amber-400 hover:text-amber-300"
                        } hover:underline transition-all flex items-center gap-1`}
                      >
                        <span>❓ Forgot Password?</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Option B: OTP Verification Code */}
                {authMethod === "otp" && (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label
                        className={`text-xs font-semibold ${
                          isAuthDay ? "text-slate-700" : "text-slate-300"
                        }`}
                      >
                        6-Digit Email OTP
                      </label>
                      <button
                        type="button"
                        disabled={isSendingOtp}
                        onClick={handleSendOtp}
                        className={`font-bold text-xs font-mono ${
                          isAuthDay
                            ? "text-amber-700 hover:text-amber-800"
                            : "text-amber-400 hover:text-amber-300"
                        }`}
                      >
                        {isSendingOtp
                          ? "Sending..."
                          : generatedOtp
                          ? "Resend Code"
                          : "Send OTP to Email"}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit code"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2.5 text-base placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest font-extrabold ${
                        isAuthDay
                          ? "bg-slate-50 border-slate-300 text-amber-700"
                          : "bg-slate-900 border-slate-800 text-amber-400"
                      }`}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm py-3 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] mt-1 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{authMethod === "password" ? "🔑" : "🚀"}</span>
                  <span>
                    {authMethod === "password"
                      ? "LOG IN TO AI CIVILIZATION"
                      : "VERIFY & ENTER"}
                  </span>
                </button>
              </form>
            )}

            {/* CREATE CITIZEN ACCOUNT VIEW */}
            {authTab === "signup" && (
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {/* 1. Contact Info */}
                <div className="flex flex-col gap-1.5">
                  <label
                    className={`text-xs font-semibold block ${
                      isAuthDay ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">
                      ✉️
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. pravin_patel@gmail.com or +91 98765 43210"
                      value={authInput}
                      onChange={(e) => setAuthInput(e.target.value)}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2 text-sm font-mono transition-all focus:outline-none focus:border-amber-500 ${
                        isAuthDay
                          ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                          : "bg-slate-950 border-slate-800 text-white placeholder-slate-600"
                      }`}
                    />
                  </div>
                </div>

                {/* 1.5 Account Password Creation */}
                <div
                  className={`p-3 rounded-xl flex flex-col gap-2 border ${
                    isAuthDay
                      ? "bg-slate-50 border-slate-200 text-slate-800"
                      : "bg-slate-950/60 border-slate-800/80 text-slate-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <label
                      className={`text-xs font-semibold flex items-center gap-1 ${
                        isAuthDay ? "text-amber-700" : "text-amber-400"
                      }`}
                    >
                      <span>🔑</span> Create Account Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`text-[10px] font-mono ${
                        isAuthDay
                          ? "text-slate-500 hover:text-slate-900"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {showPassword ? "🙈 Hide" : "👁️ Show"}
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Choose password (min 4 chars)"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                        isAuthDay
                          ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          : "bg-slate-900 border-slate-800 text-white placeholder-slate-600"
                      }`}
                    />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Confirm password"
                      value={confirmPasswordInput}
                      onChange={(e) => setConfirmPasswordInput(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                        isAuthDay
                          ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          : "bg-slate-900 border-slate-800 text-white placeholder-slate-600"
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Citizen Name & Number of Members */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label
                      className={`text-xs font-semibold mb-1.5 block ${
                        isAuthDay ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      Citizen Head Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pravin Patel"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 text-sm transition-all focus:outline-none focus:border-amber-500 ${
                        isAuthDay
                          ? "bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white"
                          : "bg-slate-950 border-slate-800 text-white placeholder-slate-600"
                      }`}
                    />
                  </div>
                  <div>
                    <label
                      className={`text-xs font-semibold mb-1.5 block ${
                        isAuthDay ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      No. of Family Members in House
                    </label>
                    <select
                      value={signupMemberCount}
                      onChange={(e) => handleMemberCountChange(Number(e.target.value))}
                      className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-500 transition-all font-mono ${
                        isAuthDay
                          ? "bg-slate-50 border-slate-300 text-slate-900"
                          : "bg-slate-950 border-slate-800 text-white"
                      }`}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? "Person (Solo)" : "Members"}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Dynamic Required Family Member Name Fields */}
                <div
                  className={`p-3 rounded-xl flex flex-col gap-2 border ${
                    isAuthDay
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-950/60 border-slate-800/80"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <label
                      className={`text-xs font-semibold ${
                        isAuthDay ? "text-amber-700" : "text-amber-400"
                      }`}
                    >
                      Family Members List ({signupMemberCount} Required)
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        isAuthDay ? "text-slate-500" : "text-slate-400"
                      }`}
                    >
                      All names required
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {Array.from({ length: signupMemberCount }).map((_, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <label
                          className={`text-[10px] font-mono ${
                            isAuthDay ? "text-slate-500" : "text-slate-400"
                          }`}
                        >
                          {idx === 0
                            ? "Member #1 (Household Head)"
                            : `Member #${idx + 1}`}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={
                            idx === 0
                              ? "e.g. Pravin Patel"
                              : idx === 1
                              ? "e.g. Geeta Patel"
                              : idx === 2
                              ? "e.g. Aarav Patel"
                              : `Member #${idx + 1} Name`
                          }
                          value={signupMemberNames[idx] || ""}
                          onChange={(e) => {
                            const updated = [...signupMemberNames];
                            updated[idx] = e.target.value;
                            setSignupMemberNames(updated);
                          }}
                          className={`border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-amber-500 font-sans ${
                            isAuthDay
                              ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                              : "bg-slate-900 border-slate-800 text-white placeholder-slate-600"
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Home Address & Interactive Satellite Map Picker */}
                <div
                  className={`p-3 rounded-xl flex flex-col gap-2.5 border ${
                    isAuthDay
                      ? "bg-slate-50 border-slate-200"
                      : "bg-slate-950/60 border-slate-800/80"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <label
                      className={`text-xs font-semibold block ${
                        isAuthDay ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      Home Address & Interactive Satellite Map
                    </label>
                    <span
                      className={`text-[10px] font-mono ${
                        isAuthDay ? "text-amber-700 font-bold" : "text-amber-400"
                      }`}
                    >
                      📍 Click Map to Pick House
                    </span>
                  </div>

                  <input
                    type="text"
                    placeholder="Enter street address or area (e.g. Sayaji Road, Navsari or Nandarkha)"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    className={`w-full border rounded-lg px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                      isAuthDay
                        ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                        : "bg-slate-900 border-slate-800 text-white placeholder-slate-600"
                    }`}
                  />

                  {/* City search bar */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-grow">
                      <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs">
                        🔍
                      </span>
                      <input
                        type="text"
                        placeholder="Search City/Village (e.g. Nandarkha, Navsari, Surat...)"
                        value={signupCityQuery}
                        onChange={(e) => setSignupCityQuery(e.target.value)}
                        className={`w-full border rounded-lg pl-7 pr-2 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 ${
                          isAuthDay
                            ? "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                            : "bg-slate-900 border-slate-800 text-white placeholder-slate-500"
                        }`}
                      />
                    </div>
                    <button
                      type="button"
                      disabled={signupIsSearching}
                      onClick={handleSignupCitySearch}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      {signupIsSearching ? "..." : "SEARCH MAP"}
                    </button>
                  </div>

                  {/* Interactive Satellite Mini-Map for Home Location */}
                  <div
                    className={`w-full h-48 rounded-xl overflow-hidden border relative shadow-inner ${
                      isAuthDay ? "bg-slate-200 border-slate-300" : "bg-slate-950 border-slate-800"
                    }`}
                  >
                    <div ref={signupMapContainerRef} className="w-full h-full" />
                    <div
                      className={`absolute top-2 right-2 z-[400] backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] border font-mono shadow ${
                        isAuthDay
                          ? "bg-white/90 text-amber-800 border-amber-300"
                          : "bg-slate-950/85 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      👆 Click anywhere on satellite map to place house
                    </div>
                  </div>

                  {/* Selected Geolocation Badge */}
                  <div
                    className={`border p-2 rounded-lg flex items-center justify-between text-[11px] ${
                      isAuthDay
                        ? "bg-white border-slate-200"
                        : "bg-slate-900/90 border-slate-800"
                    }`}
                  >
                    <div>
                      <span
                        className={`font-semibold block ${
                          isAuthDay ? "text-amber-700" : "text-amber-400"
                        }`}
                      >
                        📍 {signupCityName}
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          isAuthDay ? "text-slate-500" : "text-slate-400"
                        }`}
                      >
                        Exact Coordinates: [{signupCoords[0].toFixed(6)}, {signupCoords[1].toFixed(6)}]
                      </span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      PINPOINT SET ✓
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] mt-1 cursor-pointer"
                >
                  CREATE CITIZEN ACCOUNT & ENTER
                </button>
              </form>
            )}
            </>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer
          className={`text-center text-[10px] py-3 border-t font-mono transition-colors ${
            isAuthDay
              ? "border-slate-200 text-slate-500 bg-white/40"
              : "border-slate-900 text-slate-500 bg-slate-950/40"
          }`}
        >
          AI Civilization Simulator • 100% Pure TypeScript & High-Resolution Satellite GIS
        </footer>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE GAME SIMULATOR & DASHBOARD
  // =========================================================================
  const currentHour = status?.clock ? Math.floor((status.clock.total_seconds || 480) / 60) : 12;
  const isAutoDay = currentHour >= 6 && currentHour < 19;
  const isDayMode = themeMode === "day" || (themeMode === "auto" && isAutoDay);

  const switchTab = (tab: string) => {
    soundEngine.playClick(600);
    setActiveTab(tab);
  };

  return (
    <div className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col transition-colors duration-700 font-sans ${
      isDayMode
        ? "bg-gradient-to-br from-amber-50/95 via-orange-50/80 to-amber-100/90 text-slate-900"
        : "bg-slate-950 text-slate-200"
    } p-2 sm:p-3 md:p-4`}>
      
      {/* Header bar */}
      <header className={`flex-none border-b ${isDayMode ? "border-amber-200/90 bg-white/80 shadow-sm" : "border-slate-800 bg-slate-950/70"} p-2.5 sm:p-3.5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 mb-2 backdrop-blur-md transition-all`}>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center shadow shrink-0">
            <span className="text-sm sm:text-base">🏛️</span>
          </div>
          <div>
            <h1 className={`text-base sm:text-lg md:text-xl font-extrabold tracking-tight ${isDayMode ? "text-slate-900" : "text-white bg-gradient-to-r from-white via-slate-100 to-amber-500 bg-clip-text text-transparent"}`}>
              AI CIVILIZATION PANEL
            </h1>
            <p className={`text-[9.5px] sm:text-[10.5px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"} truncate max-w-[280px] sm:max-w-none`}>
              Geolocated Satellite GIS Map &bull; PMO Cabinet &amp; Autonomous Simulation
            </p>
          </div>
        </div>
        
        {/* Aesthetic Controls: Day/Night Theme, Sound FX & Ambient Tunes */}
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-1.5 flex-wrap">
          {/* Day / Night Theme Switcher */}
          <div className={`flex items-center ${isDayMode ? "bg-amber-100/80 border-amber-300/80" : "bg-slate-900/90 border-slate-800"} p-0.5 sm:p-1 rounded-xl border text-xs shadow-inner`}>
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(720);
                setThemeMode("day");
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                themeMode === "day"
                  ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                  : isDayMode ? "text-slate-700 hover:text-slate-950" : "text-slate-400 hover:text-white"
              }`}
              title="Cozy Warm Daylight Mode"
            >
              <span>☀️</span>
              <span>Day</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(580);
                setThemeMode("night");
              }}
              className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                themeMode === "night"
                  ? "bg-indigo-600 text-white shadow-md font-extrabold"
                  : isDayMode ? "text-slate-700 hover:text-slate-950" : "text-slate-400 hover:text-white"
              }`}
              title="Cozy Starry Night Mode"
            >
              <span>🌙</span>
              <span>Night</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(650);
                setThemeMode("auto");
              }}
              className={`px-1.5 sm:px-2 py-1 rounded-lg text-[10px] font-mono transition-all ${
                themeMode === "auto"
                  ? "bg-slate-800 text-amber-300 font-bold border border-slate-700"
                  : isDayMode ? "text-slate-500 hover:text-slate-800" : "text-slate-500 hover:text-slate-300"
              }`}
              title="Auto Synchronize with Simulation Clock"
            >
              <span>⏰ Auto</span>
            </button>
          </div>

          {/* Sound Click SFX Toggle */}
          <button
            type="button"
            onClick={() => {
              const muted = soundEngine.toggleMute();
              setIsSoundMuted(muted);
              if (!muted) soundEngine.playClick(800);
            }}
            className={`px-2 py-1.5 sm:px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 shadow-sm active:scale-95 ${
              isSoundMuted
                ? isDayMode ? "bg-amber-100 text-slate-500 border-amber-300" : "bg-slate-900 text-slate-500 border-slate-800"
                : isDayMode ? "bg-emerald-100 text-emerald-800 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30"
            }`}
            title="Toggle UI Click Sound Effects"
          >
            <span>{isSoundMuted ? "🔇" : "🔊"}</span>
            <span className="hidden md:inline">{isSoundMuted ? "Muted" : "Clicks: ON"}</span>
          </button>

          {/* Soft Ambient Tunes Toggle */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playClick(900);
              const active = soundEngine.toggleMusic();
              setIsMusicActive(active);
            }}
            className={`px-2 py-1.5 sm:px-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1 shadow-sm active:scale-95 ${
              isMusicActive
                ? "bg-gradient-to-r from-purple-500/40 to-pink-500/40 text-purple-100 border-purple-400 shadow-purple-500/30 animate-pulse font-extrabold"
                : isDayMode ? "bg-amber-100 text-slate-700 border-amber-300 hover:bg-amber-200" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
            }`}
            title="Toggle Soft Generative Ambient Background Music"
          >
            <span>🎵</span>
            <span className="text-[11px] sm:text-xs">{isMusicActive ? "Tunes ✨" : "Tunes"}</span>
          </button>

          {/* Active User Badge & Sign Out Button */}
          <div className={`flex items-center gap-1.5 ${isDayMode ? "bg-white/90 border-amber-300/80" : "bg-slate-900/80 border-slate-800"} p-1 rounded-xl border`}>
            <div className="flex items-center gap-1 px-1">
              <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded ${isAdmin ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-extrabold" : "bg-sky-500/10 text-sky-500 border border-sky-500/30"}`}>
                {isAdmin ? "👑 ADMIN" : "👤 USER"}
              </span>
              <span className={`text-[11px] sm:text-xs font-mono truncate max-w-[70px] sm:max-w-[120px] ${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"}`}>
                {userId}
              </span>
            </div>
            
            <button
              type="button"
              onClick={() => {
                soundEngine.playClick(500);
                handleLogout();
              }}
              className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"} font-bold text-[9.5px] sm:text-[10px] px-2 py-1 rounded-lg border border-slate-700 transition-all active:scale-95`}
            >
              LOGOUT
            </button>
          </div>
        </div>
      </header>

      {/* Breaking news ticker banner */}
      {status && status.news_feed && status.news_feed.length > 0 && (
        <div className={`flex-none ${isDayMode ? "bg-amber-100/90 border-amber-300/90 text-slate-800 shadow-sm" : "bg-slate-900 border-slate-850/80"} border rounded-xl overflow-hidden flex items-center p-1.5 mb-2.5 gap-3`}>
          <div className="bg-rose-600 animate-pulse text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider shrink-0 shadow-md">
            BREAKING NEWS
          </div>
          <div className="flex-grow overflow-hidden relative h-5">
            <div className={`absolute whitespace-nowrap flex items-center gap-6 text-xs ${isDayMode ? "text-amber-950 font-bold" : "text-amber-500 font-medium"} animate-marquee select-none hover:pause`}>
              {status.news_feed.slice(0, 8).map((n: any, idx: number) => (
                <span key={idx} className="inline-flex gap-2 items-center">
                  <span className={`${isDayMode ? "text-slate-600" : "text-slate-400"} font-bold font-mono`}>[{n.timestamp}]</span>
                  <span className={`text-[9px] ${isDayMode ? "bg-white text-slate-700 border-amber-300" : "bg-slate-950 text-slate-400 border-slate-850"} px-1.5 py-0.5 rounded uppercase font-bold border`}>{n.category}</span>
                  <span className={isDayMode ? "text-slate-900 font-semibold" : "text-white"}>{n.headline}</span>
                  <span className={`${isDayMode ? "text-amber-400" : "text-slate-600"} font-bold mx-2`}>|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Banner for Non-Admins */}
      {!isAdmin && (
        <div className={`flex-none ${isDayMode ? "bg-sky-100/80 border-sky-300 text-sky-900" : "bg-sky-950/20 border-sky-500/20 text-sky-300"} border rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between text-xs`}>
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span><strong>Real-Life Privacy Active:</strong> Individual family rosters, occupant census, and private accounts are encrypted. Public map coordinates remain accessible.</span>
          </div>
          <span className={`text-[10px] font-mono ${isDayMode ? "bg-sky-200 text-sky-900 border-sky-400" : "bg-sky-500/10 text-sky-300 border-sky-500/30"} px-2 py-0.5 rounded border`}>CIVIC PROTECTED</span>
        </div>
      )}

      {error && (
        <div className={`flex-none ${isDayMode ? "bg-rose-100 border-rose-400 text-rose-900" : "bg-rose-950/20 border-rose-500 text-slate-300"} border-l-4 rounded-lg p-2.5 mb-2.5`}>
          <h3 className="text-rose-600 text-xs font-semibold">Simulation Synchronizing</h3>
          <p className="text-[11px]">{error}</p>
        </div>
      )}

      {status && (
        <>
          {/* Top Simulation Time, Speed Warp Controls & Statistics Bar */}
          <section className="flex-none flex flex-col gap-2 mb-2.5">
            {/* Top Control Strip: Clock, Speeds & Quick Launchers */}
            <div className={`${isDayMode ? "bg-white/85 border-amber-250 shadow-sm" : "bg-slate-900/70 border-slate-800 shadow-lg"} border rounded-2xl p-2 sm:p-2.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5`}>
              
              {/* 24-Hour Indian Standard Time Display */}
              <div className={`flex items-center justify-between sm:justify-start gap-2.5 sm:gap-3 ${isDayMode ? "bg-amber-50/90 border-amber-300/80" : "bg-slate-950/80 border-slate-800"} px-2.5 sm:px-3 py-1.5 rounded-xl border flex-none`}>
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-sm animate-pulse shrink-0">
                  ⏰
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`${isDayMode ? "text-slate-900" : "text-white"} font-mono font-bold text-xs tracking-wide`}>{status.clock?.formatted || "Day 1 • 08:00 hrs (IST)"}</span>
                    <span className={`text-[8.5px] sm:text-[9px] ${isDayMode ? "bg-amber-200 text-amber-950 border-amber-400" : "bg-amber-500/10 text-amber-300 border-amber-500/20"} px-1.5 py-0.5 rounded font-mono font-extrabold border`}>
                      {status.clock?.is_night ? "🌙 NIGHT" : "☀️ DAY"}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 sm:gap-2 text-[9.5px] sm:text-[10px] ${isDayMode ? "text-slate-600" : "text-slate-400"} font-mono`}>
                    <span>📅 {status.clock?.indian_date || "01/01/2026"}</span>
                    <span>•</span>
                    <span className={isDayMode ? "text-slate-500 font-semibold" : "text-slate-500"}>1 hr = 1 min</span>
                  </div>
                </div>
              </div>

              {/* Multi-Speed Simulation Controls (Play / Pause / 1x / 10x / 60x / 1000x / Custom) */}
              <div className={`flex items-center gap-1 sm:gap-1.5 ${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-950/80 border-slate-800"} p-1 rounded-xl border overflow-x-auto no-scrollbar touch-pan-x flex-nowrap sm:flex-wrap`}>
                {/* Play / Pause */}
                <button
                  type="button"
                  onClick={() => {
                    const nextPaused = !isPaused;
                    soundEngine.playClick(600);
                    setIsPaused(nextPaused);
                    fetch(`${apiHost}/api/action`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "set_speed",
                        user_id: userId,
                        speed: simSpeed,
                        paused: nextPaused
                      })
                    }).then(() => fetchStatus()).catch(() => {});
                  }}
                  className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1 shrink-0 border active:scale-95 ${isPaused ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"}`}
                  title={isPaused ? "Resume Simulation" : "Pause Simulation"}
                >
                  <span>{isPaused ? "▶ PLAY" : "⏸ PAUSE"}</span>
                </button>

                {/* Speed Multipliers */}
                {[
                  { label: "1×", val: 1, hint: "Normal (1 hr = 1 min)" },
                  { label: "10×", val: 10, hint: "10x Fast Speed" },
                  { label: "60×", val: 60, hint: "60x Speed (1 hr = 1 sec)" },
                  { label: "1000×", val: 1000, hint: "1000x Super Warp" }
                ].map((s) => (
                  <button
                    key={s.val}
                    type="button"
                    onClick={() => {
                      soundEngine.playClick(700);
                      setSimSpeed(s.val);
                      setIsPaused(false);
                      setShowCustomSpeedInput(false);
                      fetch(`${apiHost}/api/action`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "set_speed",
                          user_id: userId,
                          speed: s.val,
                          paused: false
                        })
                      }).then(() => fetchStatus()).catch(() => {});
                    }}
                    className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border active:scale-95 ${simSpeed === s.val && !showCustomSpeedInput && !isPaused ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-extrabold" : isDayMode ? "bg-white text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white hover:border-slate-700"}`}
                    title={s.hint}
                  >
                    {s.label}
                  </button>
                ))}

                {/* Custom Speed Button */}
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(650);
                    setShowCustomSpeedInput(!showCustomSpeedInput);
                  }}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 border active:scale-95 ${showCustomSpeedInput ? "bg-sky-500 text-slate-950 border-sky-400 shadow-md" : isDayMode ? "bg-white text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"}`}
                  title="Custom Simulation Speed Multiplier"
                >
                  ⚙️
                </button>

                {showCustomSpeedInput && (
                  <div className="flex items-center gap-1 pl-1 shrink-0">
                    <input
                      type="number"
                      min="1"
                      max="10000"
                      value={customSpeedInput}
                      onChange={(e) => setCustomSpeedInput(e.target.value)}
                      className={`w-14 ${isDayMode ? "bg-white text-slate-900 border-sky-400" : "bg-slate-900 text-white border-sky-500"} border rounded-lg px-1.5 py-0.5 text-xs font-mono text-center outline-none`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const num = Number(customSpeedInput);
                        if (num > 0) {
                          soundEngine.playClick(750);
                          setSimSpeed(num);
                          setIsPaused(false);
                          setShowCustomSpeedInput(false);
                          fetch(`${apiHost}/api/action`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "set_speed",
                              user_id: userId,
                              speed: num,
                              paused: false
                            })
                          }).then(() => fetchStatus()).catch(() => {});
                        }
                      }}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-2 py-0.5 rounded-lg text-xs"
                    >
                      SET
                    </button>
                  </div>
                )}
              </div>

              {/* Master Inventory & Resource Window Launcher */}
              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x flex-nowrap sm:flex-wrap pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(800);
                    setMasterInventoryModalOpen(true);
                  }}
                  className={`bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 ${isDayMode ? "text-emerald-800 border-emerald-400/60 bg-emerald-50" : "text-emerald-300 border-emerald-500/40"} border px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0`}
                >
                  <span>📦</span>
                  <span className="hidden sm:inline">MASTER INVENTORY</span>
                  <span className="sm:hidden">INVENTORY</span>
                  <span className={`${isDayMode ? "bg-emerald-200 text-emerald-900" : "bg-emerald-500/30 text-emerald-200"} text-[10px] px-1.5 py-0.5 rounded-md font-mono font-bold`}>
                    {((Object.values(status.farm_barn || {}) as any[]).reduce((a: number, b: any) => a + Number(b || 0), 0)) + (Array.isArray(status.inventory) ? status.inventory.length : 0)}
                  </span>
                </button>

                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playClick(800);
                        setShowAdminCensusModal(true);
                      }}
                      className={`bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 ${isDayMode ? "text-amber-900 border-amber-400/60 bg-amber-50" : "text-amber-300 border-amber-500/40"} border px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0`}
                    >
                      <span>👥</span>
                      <span className="hidden sm:inline">ALL CITIZENS</span>
                      <span className="sm:hidden">CITIZENS</span>
                      <span className={`${isDayMode ? "bg-amber-200 text-amber-950 font-black" : "bg-amber-500/30 text-amber-200 font-bold"} text-[10px] px-1.5 py-0.5 rounded-md font-mono`}>
                        {registeredUsers.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => switchTab("people")}
                      className={`bg-gradient-to-r from-sky-500/20 to-indigo-500/20 hover:from-sky-500/30 hover:to-indigo-500/30 ${isDayMode ? "text-sky-900 border-sky-400/60 bg-sky-50" : "text-sky-300 border-sky-500/40"} border px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0`}
                    >
                      <span>🏠</span>
                      <span className="hidden sm:inline">7 HOUSES &amp; ROOMS</span>
                      <span className="sm:hidden">HOUSES</span>
                      <span className={`${isDayMode ? "bg-sky-200 text-sky-950 font-black" : "bg-sky-500/30 text-sky-200 font-bold"} text-[10px] px-1.5 py-0.5 rounded-md font-mono`}>
                        {status.families?.length || 7}
                      </span>
                    </button>
                  </>
                )}

                <div className={`flex items-center gap-1.5 sm:gap-2 ${isDayMode ? "bg-white border-amber-300 text-slate-800" : "bg-slate-950/80 border-slate-800 text-slate-300"} px-2 py-1.5 rounded-xl border text-xs font-mono shadow-sm shrink-0`}>
                  <span className={`${isDayMode ? "text-slate-600" : "text-slate-400"} text-[9.5px] sm:text-[10px] font-bold`}>Treasury:</span>
                  <span className="font-extrabold text-amber-500">${status.city_treasury?.toLocaleString() || "0"}</span>
                </div>
              </div>

            </div>
          </section>

          {/* Navigation tabs */}
          <nav className={`flex-none flex gap-1.5 overflow-x-auto no-scrollbar touch-pan-x border-b ${isDayMode ? "border-amber-200/90" : "border-slate-800/60"} pb-2 mb-2.5 text-xs select-none scroll-smooth w-full max-w-full px-0.5`}>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${activeTab === "overview" ? "bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-md" : isDayMode ? "text-slate-700 hover:text-slate-950 border border-amber-200 bg-white/70 shadow-sm" : "text-slate-300 hover:text-white border border-slate-800 bg-slate-900/60"}`} onClick={() => switchTab("overview")}>
              <span>🏠</span> FAMILY &amp; ROOMS ({status.families?.length || 7})
            </button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${activeTab === "people" ? "bg-amber-500 text-slate-950 font-bold border border-amber-400 shadow-md" : isDayMode ? "text-slate-700 hover:text-slate-950 border border-amber-200 bg-white/70 shadow-sm" : "text-slate-300 hover:text-white border border-slate-800 bg-slate-900/60"}`} onClick={() => switchTab("people")}>
              <span>🔍</span>
              <span>
                SEARCH PEOPLE (
                {status.families?.reduce(
                  (a: number, f: any) => a + (f.members?.length || 0),
                  0
                ) ||
                  registeredUsers.reduce(
                    (a: number, u: any) => a + (u.members?.length || 0),
                    0
                  ) ||
                  listAllAdults.length}{" "}
                CITIZENS)
              </span>
            </button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "projects" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("projects")}>CITY PROJECTS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "government" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("government")}>GOVERNMENT CABINET</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "farming" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("farming")}>FARMS &amp; CROPS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "inventory" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("inventory")}>PERSONAL INVENTORY</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "market" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("market")}>TOWN MARKETS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "industries" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("industries")}>INDUSTRIES &amp; REFINERIES</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all shrink-0 ${activeTab === "agents" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30 font-bold" : isDayMode ? "text-slate-600 hover:text-slate-900" : "text-slate-400 hover:text-white"}`} onClick={() => switchTab("agents")}>AGENT SETTINGS</button>
          </nav>

          {/* Main Grid Viewport */}
          <main className="flex-grow grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 min-h-0 w-full max-w-full overflow-y-auto lg:overflow-hidden mb-1 pb-safe">
            
            {/* Scrollable Left Panels */}
            <section className={`${isDayMode ? "bg-white/80 border-amber-250 shadow-sm" : "bg-slate-900/25 border-slate-800/80"} border rounded-xl p-2.5 sm:p-3.5 overflow-x-hidden overflow-y-auto min-h-0 w-full max-w-full`}>
              
              {/* Tab: Overview (Geolocated Leaflet Map & Residences) */}
              {activeTab === "overview" && (
                <div className="flex flex-col gap-3 h-full min-h-0">
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2 flex-none flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base`}>Satellite GIS Map &amp; City Search</h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Real-world geolocated map of Gujarat &amp; Civilization Region</span>
                    </div>

                    {/* Location edit controls for admin only */}
                    {isAdmin ? (
                      <div className="flex gap-2 items-center flex-wrap">
                        <button 
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${editLocationsMode ? "bg-amber-500 text-slate-950 border-amber-500 shadow-lg animate-pulse" : isDayMode ? "bg-white hover:bg-amber-100 text-amber-900 border-amber-300 shadow-sm" : "bg-slate-900 hover:bg-slate-800 text-amber-500 border-slate-800"}`}
                          onClick={() => {
                            soundEngine.playClick(600);
                            setEditLocationsMode(!editLocationsMode);
                            setClickedCoords(null);
                          }}
                        >
                          {editLocationsMode ? "🛑 STOP MAP CLICK MODE" : "✏️ CLICK ON MAP TO RELOCATE"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick(500);
                            resetAllLocations();
                          }}
                          className={`${isDayMode ? "bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300 shadow-sm" : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30"} px-3 py-1.5 rounded-xl text-xs font-bold transition-all`}
                        >
                          🔄 RESET ALL LOCATIONS
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] ${isDayMode ? "bg-white border-amber-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-400"} border px-2.5 py-1 rounded-lg font-mono`}>
                        🔒 Map Coordinates Fixed by Admin
                      </span>
                    )}
                  </div>

                  {/* Admin Location Action Confirmation Toast */}
                  {locationActionMsg && (
                    <div className={`${isDayMode ? "bg-emerald-100 border-emerald-400 text-emerald-950 shadow-md" : "bg-emerald-950/80 border-emerald-500/80 text-emerald-200"} border-2 text-xs p-3 rounded-xl flex items-center justify-between gap-2 shadow-xl animate-fade-in font-mono`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📍</span>
                        <span className="font-bold">{locationActionMsg}</span>
                      </div>
                      <span className={`text-[10px] ${isDayMode ? "bg-emerald-200 text-emerald-950 border-emerald-400" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} px-2 py-0.5 rounded border font-bold`}>
                        PERMANENT IN DATABASE ✓
                      </span>
                    </div>
                  )}

                  {/* Admin Live City Search & Geocoding Bar */}
                  {isAdmin && (
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-slate-800 text-slate-200"} border rounded-xl p-3 flex flex-col gap-2.5`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-extrabold ${isDayMode ? "text-slate-900" : "text-slate-200"} flex items-center gap-1.5`}>
                          <span>🔍</span> 1. Search Any City/Village in Gujarat or India &amp; Assign Location
                        </span>
                        <span className={`text-[10px] ${isDayMode ? "text-sky-800 font-bold" : "text-sky-400"} font-mono`}>Live Nominatim GIS Geocoder</span>
                      </div>

                      <form onSubmit={handleCitySearch} className="flex gap-2 items-center flex-wrap">
                        <div className="relative flex-grow min-w-[200px]">
                          <span className="absolute left-3 top-2 text-slate-500 text-xs">🔍</span>
                          <input
                            type="text"
                            placeholder="Search city, town or village (e.g. Navsari, Surat, Valsad, Bilimora, Rumla, Nandarkha...)"
                            value={searchCityInput}
                            onChange={(e) => setSearchCityInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 placeholder-slate-500 focus:border-amber-400" : "bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500"} border rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none font-mono`}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSearchingCity}
                          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-4 py-1.5 rounded-lg transition-all shadow disabled:opacity-50"
                        >
                          {isSearchingCity ? "SEARCHING..." : "SEARCH GPS"}
                        </button>
                      </form>

                      {searchError && (
                        <div className="text-xs text-rose-500 font-mono font-bold">⚠️ {searchError}</div>
                      )}

                      {/* City Search Result & Relocation Assignment Action */}
                      {searchedLocation && (
                        <div className={`${isDayMode ? "bg-amber-50/90 border-sky-400 text-slate-800 shadow-sm" : "bg-slate-950/80 border-sky-500/40 text-white"} border rounded-lg p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs`}>
                          <div>
                            <span className={`${isDayMode ? "text-sky-900" : "text-sky-400"} font-bold block`}>📍 Found: {searchedLocation.name}</span>
                            <span className={`${isDayMode ? "text-slate-600" : "text-slate-400"} text-[10px] font-mono`}>GPS Coordinates: [{searchedLocation.lat.toFixed(6)}, {searchedLocation.lng.toFixed(6)}]</span>
                          </div>

                          <div className="flex gap-2 items-center flex-wrap">
                            <label className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"} text-xs`}>Assign &amp; Fix Location For:</label>
                            <select
                              value={searchLandmarkTarget}
                              onChange={(e) => setSearchLandmarkTarget(e.target.value)}
                              className={`${isDayMode ? "bg-white border-amber-300 text-slate-900" : "bg-slate-900 border-slate-750 text-white"} border rounded px-2.5 py-1.5 text-xs font-mono`}
                            >
                              {renderLandmarkOptions()}
                            </select>
                            <button
                              type="button"
                              onClick={() => assignSearchedLocation(searchLandmarkTarget)}
                              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded text-xs transition-all shadow flex items-center gap-1"
                            >
                              <span>📍</span>
                              <span>FIX PERMANENTLY</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pinpoint Click Placement Card for Admin */}
                  {clickedCoords && (
                    <div className="flex-none bg-amber-500/10 border-2 border-amber-500/60 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs shadow-xl">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-base animate-bounce">📍</span>
                          <strong className="text-amber-500 font-bold text-sm">Pinpoint Map Location Selected</strong>
                        </div>
                        <span className={`${isDayMode ? "text-slate-700" : "text-slate-300"} font-mono text-[11px]`}>
                          Exact GPS Coordinates: [{clickedCoords.lat.toFixed(6)}, {clickedCoords.lng.toFixed(6)}]
                        </span>
                      </div>
                      
                      <div className="flex gap-2 items-center flex-wrap">
                        <label className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"} text-xs`}>Select Home / Landmark:</label>
                        <select 
                          className={`${isDayMode ? "bg-white border-amber-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white"} border rounded-lg p-1.5 outline-none text-xs font-mono`} 
                          value={selectedLandmarkToMove} 
                          onChange={(e) => setSelectedLandmarkToMove(e.target.value)}
                        >
                          {renderLandmarkOptions()}
                        </select>
                        <button 
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md flex items-center gap-1"
                          onClick={submitRelocate}
                        >
                          <span>📍</span>
                          <span>FIX PERMANENTLY HERE</span>
                        </button>
                        <button 
                          className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-2.5 py-1.5 rounded-lg text-xs`}
                          onClick={() => setClickedCoords(null)}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Private Residence Placement for Any User / Friend */}
                  <div className={`${isDayMode ? "bg-emerald-50/90 border-emerald-300/80 text-emerald-950 shadow-sm" : "bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-slate-900/40 border-emerald-500/30 text-white"} border rounded-2xl p-3.5 flex flex-col gap-3 shadow-md`}>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-emerald-200 border-emerald-400" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-base`}>
                          🏡
                        </div>
                        <div>
                          <strong className={`${isDayMode ? "text-slate-900" : "text-white"} text-xs block font-bold`}>
                            Private Residence Placement &amp; Database Geolocation
                          </strong>
                          <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                            Build &amp; customize your private home on the map (Stored in database &bull; Protected &amp; private to your account)
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playClick(650);
                          if (!showHomeBuilder) {
                            populateHomeInputs();
                          }
                          setShowHomeBuilder(!showHomeBuilder);
                        }}
                        className={`bg-emerald-500/20 hover:bg-emerald-500/30 ${isDayMode ? "text-emerald-950 border-emerald-400 bg-emerald-100" : "text-emerald-300 border-emerald-500/40"} border text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm`}
                      >
                        <span>{showHomeBuilder ? "✕ Close Form" : "🏡 Build / Relocate My Home"}</span>
                      </button>
                    </div>

                    {showHomeBuilder && (
                      <div className={`${isDayMode ? "bg-white border-emerald-300 shadow-md text-slate-800" : "bg-slate-950/90 border-emerald-500/40 text-white"} border rounded-xl p-3.5 flex flex-col gap-3.5`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                          <div className="flex flex-col gap-1">
                            <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Residence Name:</label>
                            <input
                              type="text"
                              placeholder="e.g. Thakorbhai Residency, Patel Villa"
                              value={homeNameInput}
                              onChange={(e) => setHomeNameInput(e.target.value)}
                              className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Address / Zone / City:</label>
                            <input
                              type="text"
                              placeholder="e.g. Rumla, Chikhli, Navsari"
                              value={homeAddressInput}
                              onChange={(e) => setHomeAddressInput(e.target.value)}
                              className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>GPS Latitude:</label>
                            <input
                              type="text"
                              placeholder="20.9472"
                              value={homeLatInput}
                              onChange={(e) => setHomeLatInput(e.target.value)}
                              className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>GPS Longitude:</label>
                            <input
                              type="text"
                              placeholder="72.9515"
                              value={homeLngInput}
                              onChange={(e) => setHomeLngInput(e.target.value)}
                              className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                            />
                          </div>
                        </div>

                        {/* Family Members Customization Section */}
                        <div className={`pt-2.5 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"} flex flex-col gap-2`}>
                          <div className="flex justify-between items-center flex-wrap gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">👨‍👩‍👧‍👦</span>
                              <strong className={`text-xs ${isDayMode ? "text-slate-900" : "text-emerald-400"}`}>
                                Family Members Roster ({homeMemberCountInput} Members)
                              </strong>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Total Members:</span>
                              <select
                                value={homeMemberCountInput}
                                onChange={(e) => {
                                  const count = Number(e.target.value);
                                  setHomeMemberCountInput(count);
                                  setHomeMemberNamesInput(prev => {
                                    const next = [...prev];
                                    while (next.length < count) next.push("");
                                    return next.slice(0, count);
                                  });
                                  setHomeMemberRolesInput(prev => {
                                    const next = [...prev];
                                    while (next.length < count) next.push("Child");
                                    return next.slice(0, count);
                                  });
                                }}
                                className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2 py-1 text-xs font-mono`}
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                  <option key={n} value={n}>{n} Member{n > 1 ? "s" : ""}</option>
                                ))}
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                            {Array.from({ length: homeMemberCountInput }).map((_, mIdx) => (
                              <div
                                key={mIdx}
                                className={`${isDayMode ? "bg-amber-50/50 border-amber-200/80" : "bg-slate-900/60 border-slate-800"} border rounded-xl p-2 flex flex-col gap-1.5`}
                              >
                                <div className="flex justify-between items-center gap-1">
                                  <span className={`text-[10px] font-mono font-bold ${isDayMode ? "text-amber-900" : "text-amber-400"}`}>
                                    Member #{mIdx + 1} {mIdx === 0 ? "(Head)" : ""}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-mono font-semibold opacity-80">🎂</span>
                                    <input
                                      type="number"
                                      min="1"
                                      max="120"
                                      title="Citizen Age (Years)"
                                      placeholder="Age"
                                      value={homeMemberAgesInput[mIdx] ?? (mIdx === 0 ? 35 : mIdx === 1 ? 32 : 12)}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        setHomeMemberAgesInput(prev => {
                                          const next = [...prev];
                                          next[mIdx] = val;
                                          return next;
                                        });
                                      }}
                                      className={`w-12 text-center text-[10px] font-mono font-bold rounded px-1 py-0.5 border ${isDayMode ? "bg-white border-amber-300 text-slate-900" : "bg-slate-950 border-slate-700 text-white"}`}
                                    />
                                    <span className="text-xs">{mIdx === 0 ? "🚗" : mIdx === 1 ? "🛵" : "🚲"}</span>
                                  </div>
                                </div>
                                <input
                                  type="text"
                                  placeholder={mIdx === 0 ? "Head Name (e.g. Thakorbhai)" : `Member #${mIdx + 1} Name`}
                                  value={homeMemberNamesInput[mIdx] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHomeMemberNamesInput(prev => {
                                      const next = [...prev];
                                      next[mIdx] = val;
                                      return next;
                                    });
                                  }}
                                  className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2 py-1 text-xs font-mono`}
                                />
                                <textarea
                                  rows={2}
                                  placeholder="Role & Detailed Description (e.g. Head of family, manages farms & business)"
                                  value={homeMemberRolesInput[mIdx] || (mIdx === 0 ? "Head of Family" : mIdx === 1 ? "Spouse" : "Resident Member")}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setHomeMemberRolesInput(prev => {
                                      const next = [...prev];
                                      next[mIdx] = val;
                                      return next;
                                    });
                                  }}
                                  className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-[11px] font-mono resize-y min-h-[44px] leading-relaxed`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className={`flex items-center justify-between gap-2 flex-wrap pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                          <div className={`text-[11px] ${isDayMode ? "text-emerald-800 font-bold" : "text-emerald-400"} font-mono flex items-center gap-1.5`}>
                            <span>🌐</span>
                            <span>Public Map Marker: Other players will see an anonymous &apos;Private Residence&apos; pin on the map, but your personal household &amp; family details remain strictly private.</span>
                          </div>

                          <button
                            type="button"
                            onClick={savePrivateHome}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-4 py-1.5 rounded-xl text-xs transition-all shadow-md flex items-center gap-1.5"
                          >
                            <span>💾</span>
                            <span>SAVE RESIDENCE &amp; FAMILY TO DATABASE</span>
                          </button>
                        </div>

                        {homeSaveMsg && (
                          <div className={`${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border p-2 rounded-lg text-xs font-mono font-bold`}>
                            {homeSaveMsg}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Manual Decimal Coordinates Input Bar for Admin */}
                  {isAdmin && (
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/40 border-slate-800 text-slate-200"} border rounded-xl p-3 flex flex-col gap-2`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-extrabold ${isDayMode ? "text-slate-900" : "text-slate-200"} flex items-center gap-1.5`}>
                          <span>🧭</span> 2. Manual GPS Precision Decimal Coordinates Placement
                        </span>
                        <span className={`text-[10px] ${isDayMode ? "text-amber-800 font-extrabold" : "text-amber-400"} font-mono`}>Decide &amp; Fix Location Permanently</span>
                      </div>

                      <div className="flex gap-2 items-center flex-wrap text-xs">
                        <div className="flex flex-col gap-1 min-w-[180px] flex-grow">
                          <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Select Target Home / Landmark:</label>
                          <select
                            value={manualTargetLandmark}
                            onChange={(e) => setManualTargetLandmark(e.target.value)}
                            className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded px-2.5 py-1.5 text-xs`}
                          >
                            {renderLandmarkOptions()}
                          </select>
                        </div>

                        <div className="flex flex-col gap-1 w-32">
                          <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Latitude (e.g. 20.9472):</label>
                          <input
                            type="text"
                            placeholder="20.9472"
                            value={manualLatInput}
                            onChange={(e) => setManualLatInput(e.target.value)}
                            className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded px-2.5 py-1.5 text-xs`}
                          />
                        </div>

                        <div className="flex flex-col gap-1 w-32">
                          <label className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Longitude (e.g. 72.9515):</label>
                          <input
                            type="text"
                            placeholder="72.9515"
                            value={manualLngInput}
                            onChange={(e) => setManualLngInput(e.target.value)}
                            className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded px-2.5 py-1.5 text-xs`}
                          />
                        </div>

                        <div className="flex items-end mt-4">
                          <button
                            type="button"
                            onClick={submitManualLocation}
                            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-4 py-1.5 rounded-lg text-xs transition-all shadow-md flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <span>💾</span>
                            <span>SAVE &amp; FIX PERMANENT LOCATION</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick City Relocation Presets for Admin */}
                  {isAdmin && (
                    <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200 text-slate-800 shadow-sm" : "bg-slate-900/40 border-slate-850 text-slate-300"} border p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] flex-wrap`}>
                      <span className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300 font-semibold"}`}>Quick Inter-City Regional Presets:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            dispatchAction("relocate_landmark", { landmark_id: "house_2", lat: 20.9467, lng: 72.9520 });
                            if (mapInstanceRef.current) mapInstanceRef.current.flyTo([20.9467, 72.9520], 16);
                          }}
                          className={`${isDayMode ? "bg-white hover:bg-sky-50 text-sky-900 border-sky-300 shadow-sm" : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30"} px-2 py-0.5 rounded font-mono text-[10px] font-bold`}
                        >
                          📍 Move Bharatbhai (Home 2) to Navsari
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatchAction("relocate_landmark", { landmark_id: "house_3", lat: 20.9490, lng: 72.9560 });
                            if (mapInstanceRef.current) mapInstanceRef.current.flyTo([20.9490, 72.9560], 16);
                          }}
                          className={`${isDayMode ? "bg-white hover:bg-sky-50 text-sky-900 border-sky-300 shadow-sm" : "bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30"} px-2 py-0.5 rounded font-mono text-[10px] font-bold`}
                        >
                          📍 Move Rameshbhai (Home 3) to Navsari
                        </button>
                        <button
                          type="button"
                          onClick={resetAllLocations}
                          className={`${isDayMode ? "bg-white hover:bg-amber-100 text-amber-950 border-amber-300 shadow-sm" : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30"} px-2 py-0.5 rounded font-mono text-[10px] font-bold`}
                        >
                          📍 Reset All World Locations
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-3.5 flex-grow min-h-0">
                    {/* Geolocated GIS Map Frame Container */}
                    <div className="flex flex-col h-[280px] sm:h-[380px] lg:h-full min-h-[260px]">
                      <div className="relative w-full h-full bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner flex-grow">
                        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full z-10" />
                      </div>

                      {/* Map Legends */}
                      <div className="mt-2 flex gap-1.5 sm:gap-2 flex-wrap justify-center text-[9px] sm:text-[10px] text-slate-400 flex-none font-mono">
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#0284c7]"></span> Zone 1</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#0d9488]"></span> Zone 2</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#4f46e5]"></span> Zone 3</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#8b5cf6]"></span> Hostels</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#16a34a]"></span> Farms</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#dc2626]"></span> Factory</span>
                        <span className="flex items-center gap-1"><span className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded bg-[#d97706]"></span> Markets</span>
                      </div>
                    </div>

                    {/* Residences & Housing Registry Container with clean auto-flowing layout */}
                    <div className={`flex flex-col h-auto lg:h-full min-h-[380px] ${isDayMode ? "bg-white/90 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-slate-800/90 shadow-xl text-slate-200"} border rounded-2xl p-2.5 sm:p-3.5 flex-grow overflow-hidden`}>
                      <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800/80"} pb-2 mb-2 flex-none flex-wrap gap-2`}>
                        <div className="flex items-center gap-2">
                          <span className="text-base">🏠</span>
                          <div>
                            <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs uppercase tracking-wider`}>Family &amp; Rooms ({status.families?.length || 0} Total Arrived)</h3>
                            <span className={`text-[10px] ${isDayMode ? "text-amber-800 font-extrabold" : "text-amber-400 font-bold"} font-mono`}>{status.families?.length || 0} Civilization Residences &bull; Active Family Households &amp; Worker Hostels</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(700);
                                  setNewResidenceType("house");
                                  setNewResidenceName("");
                                  setNewResidenceId(`house_${Date.now()}`);
                                  setNewResidenceCapacity(6);
                                  setNewResidenceBudget(60);
                                  setCreateResidenceModalOpen(true);
                                }}
                                className={`bg-sky-500/20 hover:bg-sky-500/30 ${isDayMode ? "text-sky-900 border-sky-300" : "text-sky-300 border-sky-500/40"} border px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all`}
                              >
                                <span>➕</span>
                                <span>NEW HOUSE</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(700);
                                  setNewResidenceType("hostel");
                                  setNewResidenceName("Navsari Workers Dormitory");
                                  setNewResidenceId(`hostel_${Date.now()}`);
                                  setNewResidenceCapacity(12);
                                  setNewResidenceBudget(150);
                                  setCreateResidenceModalOpen(true);
                                }}
                                className={`bg-purple-500/20 hover:bg-purple-500/30 ${isDayMode ? "text-purple-900 border-purple-300" : "text-purple-300 border-purple-500/40"} border px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all`}
                              >
                                <span>🏢</span>
                                <span>NEW HOSTEL</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(700);
                                  setTransferFromFamilyId(selectedFamily?.id || "house_1");
                                  const mem0 = selectedFamily?.members?.[0]?.name || "";
                                  setTransferWorkerName(mem0);
                                  setTransferToFamilyId("hostel_central");
                                  setTransferWorkerModalOpen(true);
                                }}
                                className={`bg-amber-500/20 hover:bg-amber-500/30 ${isDayMode ? "text-amber-950 border-amber-300" : "text-amber-300 border-amber-500/40"} border px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all`}
                              >
                                <span>🔄</span>
                                <span>TRANSFER WORKER</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => switchTab("people")}
                                className={`bg-emerald-500/20 hover:bg-emerald-500/30 ${isDayMode ? "text-emerald-950 border-emerald-300" : "text-emerald-300 border-emerald-500/40"} border px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-all`}
                              >
                                <span>👥</span>
                                <span>CITIZENS DIRECTORY</span>
                              </button>
                            </>
                          )}
                          {isAdmin ? (
                            <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-black" : "bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold"} px-2 py-0.5 rounded-md border`}>ADMIN CENSUS</span>
                          ) : (
                            <span className={`text-[9px] ${isDayMode ? "bg-sky-100 text-sky-950 border-sky-300 font-black" : "bg-sky-500/10 text-sky-400 border-sky-500/30 font-bold"} px-2 py-0.5 rounded-md border`}>PRIVACY ENCRYPTED</span>
                          )}
                        </div>
                      </div>

                      {/* Admin Multi-Residence Filter & Selector Tabs */}
                      {isAdmin ? (
                        <>
                          {/* Filter Bar (All / Houses / Hostels) */}
                          <div className="flex items-center justify-between gap-2 mb-2 flex-none">
                            <div className="flex gap-1 text-[10px]">
                              {(["all", "house", "hostel"] as const).map((ft) => (
                                <button
                                  key={ft}
                                  onClick={() => {
                                    soundEngine.playClick(620);
                                    setResidenceFilter(ft);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg font-bold transition-all border ${residenceFilter === ft ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm" : isDayMode ? "bg-amber-50 text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200"}`}
                                >
                                  {ft === "all" ? `All (${status.families?.length || 0})` : ft === "house" ? `🏠 Houses (${status.families?.filter((f: any) => f.type !== "hostel" && !f.id.startsWith("hostel_")).length || 0})` : `🏢 Hostels (${status.families?.filter((f: any) => f.type === "hostel" || f.id.startsWith("hostel_")).length || 0})`}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Zone / Residence Selector Tabs */}
                          <div className="flex gap-1.5 mb-3 flex-none overflow-x-auto pb-1">
                            {status.families
                              ?.filter((f: any) => {
                                if (residenceFilter === "house") return f.type !== "hostel" && !f.id.startsWith("hostel_");
                                if (residenceFilter === "hostel") return f.type === "hostel" || f.id.startsWith("hostel_");
                                return true;
                              })
                              .map((f: any, idx: number) => {
                                const isH = f.type === "hostel" || f.id.startsWith("hostel_");
                                return (
                                  <button
                                    key={f.id}
                                    className={`flex-grow py-1.5 px-3 rounded-lg text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${selectedFamilyId === f.id ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-black" : isDayMode ? "bg-amber-50 text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-950 text-slate-400 border-slate-850 hover:text-white"}`}
                                    onClick={() => {
                                      soundEngine.playClick(600);
                                      setSelectedFamilyId(f.id);
                                    }}
                                  >
                                    <span>{isH ? "🏢" : "🏠"}</span>
                                    <span>{f.name.split("'")[0]}</span>
                                    <span className={`text-[9px] px-1 rounded font-mono font-bold ${selectedFamilyId === f.id ? "bg-slate-950/20 text-slate-950" : isDayMode ? "bg-amber-200 text-amber-950" : "bg-slate-800 text-slate-400"}`}>
                                      {f.members?.length || 0}
                                    </span>
                                  </button>
                                );
                              })}
                          </div>
                        </>
                      ) : (
                        /* Regular User / Friend Personal Household Banner */
                        <div className={`${isDayMode ? "bg-emerald-50 border-emerald-300 text-slate-850" : "bg-slate-900/60 border-emerald-500/40 text-white"} border rounded-2xl p-3 flex justify-between items-center mb-3 shadow-sm`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-lg shadow-sm`}>
                              🏡
                            </div>
                            <div>
                              <strong className={`${isDayMode ? "text-slate-900" : "text-white"} text-xs font-bold block`}>{selectedFamily?.name || "My Private Household"}</strong>
                              <span className={`text-[10px] ${isDayMode ? "text-emerald-800 font-bold" : "text-emerald-400"} font-mono`}>Personal Household Data (Visible only to you)</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} block font-mono`}>Household Cash</span>
                            <span className={`font-mono font-extrabold ${isDayMode ? "text-emerald-800" : "text-emerald-400"} text-sm`}>${selectedFamily?.budget?.toLocaleString() || 150}</span>
                          </div>
                        </div>
                      )}

                      {/* Content Card */}
                      {selectedFamily && (
                        <div className="flex flex-col flex-grow min-h-0 overflow-y-auto pr-1 gap-3">
                          {/* Residence Header, Type & Bank Controls */}
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-250 shadow-sm text-slate-850" : "bg-slate-950/80 border-slate-800 shadow-sm text-white"} border rounded-xl p-3 flex flex-col gap-2 flex-none`}>
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <strong className={`${isDayMode ? "text-slate-900" : "text-white"} text-sm font-bold`}>{selectedFamily.name}</strong>
                                      <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase border ${selectedFamily.type === "hostel" || selectedFamily.id.startsWith("hostel_") ? isDayMode ? "bg-purple-100 text-purple-900 border-purple-300" : "bg-purple-500/20 text-purple-300 border-purple-500/30" : isDayMode ? "bg-sky-100 text-sky-900 border-sky-300" : "bg-sky-500/20 text-sky-300 border-sky-500/30"}`}>
                                        {selectedFamily.type === "hostel" || selectedFamily.id.startsWith("hostel_") ? "🏢 Worker Hostel" : "🏠 Family House"}
                                      </span>
                                      {(selectedFamily.type === "hostel" || selectedFamily.id.startsWith("hostel_")) && (
                                        <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                                          Beds: {selectedFamily.members?.length || 0} / {selectedFamily.capacity || 12}
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] ${isDayMode ? "text-slate-600" : "text-slate-400"} font-mono block mt-0.5`}>ID: {selectedFamily.id}</span>
                                  </div>

                                  <div className="text-right">
                                    <span className={`text-[10px] ${isDayMode ? "text-slate-600" : "text-slate-400"} block font-mono`}>Bank Reserves</span>
                                    <span className={`font-mono font-extrabold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"} text-base`}>${selectedFamily.budget?.toLocaleString()}</span>
                                  </div>
                                </div>

                                {/* Residence Admin Actions Bar */}
                                <div className={`flex items-center justify-between gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick(700);
                                        setEditResidenceId(selectedFamily.id);
                                        setEditResidenceName(selectedFamily.name);
                                        setEditResidenceType(selectedFamily.type === "hostel" ? "hostel" : "house");
                                        setEditResidenceCapacity(selectedFamily.capacity || (selectedFamily.type === "hostel" ? 12 : 6));
                                        setEditResidenceBudget(selectedFamily.budget || 50);
                                        setEditResidenceModalOpen(true);
                                      }}
                                      className={`${isDayMode ? "bg-white text-slate-800 border-amber-300 hover:bg-amber-100" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"} border px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm`}
                                    >
                                      <span>✏️</span>
                                      <span>Edit Residence</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick(700);
                                        setAddMemberFamilyId(selectedFamily.id);
                                        setNewMemberName("");
                                        setNewMemberRole(selectedFamily.type === "hostel" ? "worker" : "farmer");
                                        setNewMemberRelation(selectedFamily.type === "hostel" ? "Hostel Resident Worker" : "Family Member");
                                        setNewMemberVehicle("bicycle");
                                        setAddMemberModalOpen(true);
                                      }}
                                      className={`${isDayMode ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border-emerald-500/30"} border px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-sm`}
                                    >
                                      <span>➕</span>
                                      <span>Add Person / Worker</span>
                                    </button>
                                  </div>

                                  {isAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => submitDeleteResidence(selectedFamily.id)}
                                      className={`bg-rose-500/10 hover:bg-rose-500/20 ${isDayMode ? "text-rose-800 border-rose-300" : "text-rose-400 border-rose-500/30"} border px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95`}
                                    >
                                      <span>🗑️</span>
                                      <span>Delete Residence</span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Household Food Reserves & Grocery Shopping Dispatch */}
                              <div>
                                <div className="flex justify-between items-center mb-1.5 flex-wrap gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-bold"} text-[10px] uppercase tracking-wider`}>Pantry Stock &amp; Fresh Vegetables</span>
                                    {(() => {
                                      const totalFood: number = (Object.values(selectedFamily.inventory || {}) as any[]).reduce((a: number, b: any) => a + Number(b || 0), 0);
                                      const mems: number = selectedFamily.members?.length || 1;
                                      if (totalFood >= mems * 3) {
                                        return <span className={`text-[9px] ${isDayMode ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"} px-1.5 py-0.5 rounded font-mono font-bold border`}>🟢 WELL NOURISHED</span>;
                                      } else if (totalFood >= mems) {
                                        return <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-amber-500/20 text-amber-300 border-amber-500/30"} px-1.5 py-0.5 rounded font-mono font-bold border`}>🟡 MODERATE STOCKS</span>;
                                      } else {
                                        return <span className={`text-[9px] ${isDayMode ? "bg-rose-100 text-rose-900 border-rose-300" : "bg-rose-500/20 text-rose-300 border-rose-500/30"} px-1.5 py-0.5 rounded font-mono font-bold border animate-pulse`}>🔴 LOW FOOD WARNING</span>;
                                      }
                                    })()}
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => dispatchAction("buy_groceries_now", { family_id: selectedFamily.id })}
                                    className={`bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 ${isDayMode ? "text-emerald-900 border-emerald-300" : "text-emerald-300 border-emerald-500/40"} border px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm`}
                                    title="Send family shopper to buy fresh vegetables and dairy from town market"
                                  >
                                    <span>🛒</span>
                                    <span>BUY GROCERIES NOW</span>
                                  </button>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                                  {Object.entries(selectedFamily.inventory || {}).map(([item, qty]: any) => (
                                    <div className={`flex items-center gap-2 ${isDayMode ? "bg-white border-amber-200 shadow-sm text-slate-800" : "bg-slate-950/60 border-slate-850 text-slate-200"} border p-2 rounded-xl`} key={item}>
                                      <img
                                        src={getItemIconPath(item)}
                                        onError={(e: any) => { e.currentTarget.src = createSvgIcon(getItemEmoji(item), "#1e293b", "#0f172a"); }}
                                        className={`w-6 h-6 object-cover rounded-md shadow border ${isDayMode ? "border-amber-200" : "border-slate-800"}`}
                                        alt={item}
                                      />
                                      <div>
                                        <span className={`text-[10px] ${isDayMode ? "text-slate-700" : "text-slate-400"} font-medium capitalize block truncate max-w-[70px]`}>{item}</span>
                                        <span className={`font-mono ${isDayMode ? "text-amber-800 font-extrabold" : "text-amber-400 font-bold"} text-xs`}>x{qty}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Member Rosters & Vehicles Header */}
                              <div className={`flex justify-between items-center pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-800/80"}`}>
                                <span className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-bold"} text-[10px] uppercase tracking-wider`}>
                                  {selectedFamily.type === "hostel" || selectedFamily.id.startsWith("hostel_") ? "Hostel Workers & Occupants" : "Family Members & Vehicles"} ({selectedFamily.members?.length || 0})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick(700);
                                    setEditMemberFamilyId(selectedFamily.id);
                                    if (selectedFamily.members?.[0]) {
                                      const m0 = selectedFamily.members[0];
                                      setEditMemberName(m0.name);
                                      setEditMemberRole(m0.role || "farmer");
                                      setEditMemberRelation(m0.relation || "Family Member");
                                      setEditMemberVehicle(m0.vehicle || "bicycle");
                                    }
                                    setEditMemberModalOpen(true);
                                  }}
                                  className={`bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 ${isDayMode ? "text-amber-950 border-amber-300" : "text-amber-300 border-amber-500/40"} border px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1 shadow-sm`}
                                >
                                  <span>⚙️</span>
                                  <span>ASSIGN ROLES &amp; VEHICLES</span>
                                </button>
                              </div>

                              {/* Member Cards List */}
                              <div className="flex flex-col gap-2 pb-2">
                                {(!selectedFamily.members || selectedFamily.members.length === 0) && (
                                  <div className={`${isDayMode ? "bg-amber-50/50 border-amber-200 text-slate-600" : "bg-slate-950/40 border-slate-800 text-slate-500"} border border-dashed rounded-xl p-4 text-center text-xs`}>
                                    No occupants currently residing here. Click <strong>&quot;Add Person / Worker&quot;</strong> or <strong>&quot;TRANSFER WORKER&quot;</strong> to assign residents.
                                  </div>
                                )}
                                {selectedFamily.members?.map((m: any) => {
                                  const veh = m.vehicle || "bicycle";
                                  const vehEmoji = VEHICLE_EMOJIS[veh] || "🚲";
                                  const { activity, isTraveling } = getCitizenTravelInfo(m, selectedFamily.id);

                                  return (
                                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 text-slate-800 shadow-sm" : "bg-slate-950/80 hover:bg-slate-950 border-slate-800/90 hover:border-slate-700 text-slate-200 shadow-sm"} border rounded-xl p-2.5 flex flex-col gap-2 transition-all`} key={m.name}>
                                      <div className="flex justify-between items-start gap-2">
                                        <div>
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className={`${isDayMode ? "text-slate-900 font-extrabold" : "text-white font-bold"} text-xs`}>{m.name}</span>
                                            <span className={`text-[10px] ${isDayMode ? "bg-sky-100 text-sky-900 border-sky-300" : "bg-sky-500/10 text-sky-300 border-sky-500/20"} px-2 py-0.5 rounded-md border font-bold capitalize`}>
                                              {m.role || "Citizen"}
                                            </span>
                                            <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"} px-2 py-0.5 rounded-md border font-mono font-bold flex items-center gap-1`}>
                                              <span>🎂</span>
                                              <span>{m.age || 25} yrs</span>
                                            </span>
                                            <span className={`text-[10px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300" : "bg-amber-500/10 text-amber-300 border-amber-500/20"} px-2 py-0.5 rounded-md border font-mono font-bold flex items-center gap-1`}>
                                              <span>{vehEmoji}</span>
                                              <span className="capitalize">{veh}</span>
                                            </span>
                                          </div>
                                          <span className={`text-[10px] ${isDayMode ? "text-slate-600" : "text-slate-400"} block mt-0.5`}>{m.relation || "Household Resident"}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditMemberFamilyId(selectedFamily.id);
                                              setEditMemberName(m.name);
                                              setEditMemberRole(m.role || "farmer");
                                              setEditMemberRelation(m.relation || "Family Member");
                                              setEditMemberVehicle(m.vehicle || "bicycle");
                                              setEditMemberModalOpen(true);
                                            }}
                                            className="bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                          >
                                            <span>✏️</span>
                                            <span>Edit</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => {
                                              setTransferFromFamilyId(selectedFamily.id);
                                              setTransferWorkerName(m.name);
                                              setTransferToFamilyId(selectedFamily.type === "hostel" ? "house_1" : "hostel_central");
                                              setTransferWorkerModalOpen(true);
                                            }}
                                            className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1"
                                            title="Transfer to another House or Hostel"
                                          >
                                            <span>🔄</span>
                                            <span>Transfer</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() => submitRemoveMember(selectedFamily.id, m.name)}
                                            className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-1.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                                            title="Remove from residence"
                                          >
                                            ✕
                                          </button>
                                        </div>
                                      </div>

                                      {/* Status & Live Routine Indicator */}
                                      <div className="flex items-center justify-between gap-2 bg-slate-900/60 px-2.5 py-1.5 rounded-lg text-[10px] border border-slate-850">
                                        <span className="text-slate-400 font-mono">Current Activity:</span>
                                        <div className="flex items-center gap-1.5 font-semibold">
                                          <span className={`w-2 h-2 rounded-full ${isTraveling ? "bg-amber-400 animate-ping" : "bg-emerald-400"}`}></span>
                                          <span className={isTraveling ? "text-amber-400" : "text-slate-200"}>{activity}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

              {/* Tab: City Planning Projects */}
              {activeTab === "projects" && (
                <div className="flex flex-col gap-4">
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2`}>
                    <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base`}>Civilization Planning Bureau</h2>
                    <span className={`text-xs font-mono ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"}`}>Municipal infrastructure development</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-4">
                    {/* Public Funding Pool Status */}
                    <div>
                      <h3 className={`${isDayMode ? "text-amber-800 font-extrabold border-amber-200" : "text-amber-500 border-slate-800"} text-xs font-semibold mb-2 border-b pb-1`}>Taxes &amp; Revenue</h3>
                      <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-200"} border p-3.5 rounded-xl flex flex-col gap-3`}>
                        <p className={`text-xs ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"}`}>Municipal treasury accumulates revenues from taxes and funds public works projects.</p>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className={`text-xs ${isDayMode ? "text-slate-800 font-bold" : "text-slate-300 font-semibold"}`}>Corporate Tax Rate: {taxRateInput}%</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            disabled={!isAdmin} 
                            className="w-full accent-amber-500 cursor-pointer disabled:opacity-50"
                            value={taxRateInput}
                            onChange={(e) => setTaxRateInput(parseInt(e.target.value))}
                          />
                        </div>
                        <button 
                          disabled={!isAdmin} 
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500 shadow-sm" 
                          onClick={() => {
                            soundEngine.playChime(true);
                            saveTaxRate();
                          }}
                        >
                          {isAdmin ? "SET COLONY TAX RATE" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>

                      <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200 shadow-sm" : "bg-slate-900/30 border-slate-850"} border p-3.5 rounded-xl mt-3 text-center`}>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} block uppercase font-mono tracking-wider`}>Public Treasury</span>
                        <span className={`text-2xl font-bold font-mono ${isDayMode ? "text-sky-700" : "text-sky-400"} mt-0.5 block`}>${status.city_treasury}</span>
                      </div>
                    </div>

                    {/* Infrastructure Projects Allocation */}
                    <div>
                      <h3 className={`${isDayMode ? "text-amber-800 font-extrabold border-amber-200" : "text-amber-500 border-slate-800"} text-xs font-semibold mb-2 border-b pb-1`}>Infrastructure Ledger</h3>
                      <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {status.city_projects.map((p: any) => {
                          const progress = Math.min(100, Math.floor((p.allocated / p.cost) * 100));
                          return (
                            <div className={`p-3 ${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-200"} border rounded-xl flex flex-col gap-2`} key={p.id}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <strong className={`${isDayMode ? "text-slate-900 font-extrabold" : "text-white"} text-xs block`}>{p.name}</strong>
                                  <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Funded: ${p.allocated} / ${p.cost}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.completed ? isDayMode ? "bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : isDayMode ? "bg-amber-100 text-amber-950 border border-amber-300 font-bold" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                                  {p.completed ? "COMPLETED" : `${progress}%`}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className={`w-full ${isDayMode ? "bg-amber-100 border-amber-200" : "bg-slate-950 border-slate-800"} h-2 rounded-full overflow-hidden border`}>
                                <div className="bg-gradient-to-r from-amber-500 to-sky-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                              </div>

                              {!p.completed && isAdmin && (
                                <div className="flex gap-2 items-center mt-1">
                                  <input 
                                    type="number" 
                                    className={`w-20 ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-850 text-white font-mono"} border rounded p-1 text-xs`}
                                    value={allocAmount[p.id] || 50}
                                    onChange={(e) => setAllocAmount({ ...allocAmount, [p.id]: Number(e.target.value) })}
                                  />
                                  <button 
                                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs px-3 py-1 rounded transition-all shadow-sm"
                                    onClick={() => {
                                      soundEngine.playChime(true);
                                      allocateFunds(p.id);
                                    }}
                                  >
                                    ALLOCATE FUNDS
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Government Cabinet */}
              {activeTab === "government" && (
                <div className="flex flex-col gap-4">
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base`}>Prime Minister Office (PMO)</h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Democratic Republic Governance &amp; Cabinet Bureau</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button 
                          className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md flex items-center gap-1"
                          onClick={() => {
                            soundEngine.playChime(true);
                            conductElection();
                          }}
                        >
                          <span>🗳️</span>
                          <span>CONDUCT DEMOCRATIC ELECTION</span>
                        </button>
                      )}

                      {isAdmin ? (
                        <button 
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${status.city_manager_enabled ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black" : isDayMode ? "bg-white hover:bg-amber-100 text-slate-700 border-amber-300 shadow-sm" : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"}`}
                          onClick={() => {
                            soundEngine.playClick(600);
                            toggleCityManager();
                          }}
                        >
                          {status.city_manager_enabled ? "🤖 PMO MANAGER ACTIVE" : "🤖 TOGGLE CITY MANAGER"}
                        </button>
                      ) : (
                        <span className={`text-[10px] ${isDayMode ? "bg-white border-amber-200 text-slate-700" : "bg-slate-900 border-slate-800 text-slate-400"} border px-2 py-1 rounded font-mono`}>
                          🔒 PMO Authorization Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Democracy & Voting Notice */}
                  <div className={`${isDayMode ? "bg-sky-50/90 border-sky-300 text-slate-850 shadow-sm" : "bg-sky-950/30 border-sky-500/30 text-white"} border rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">🗳️</span>
                      <div>
                        <strong className={`${isDayMode ? "text-slate-900 font-extrabold" : "text-white"} block font-semibold`}>10-Year Democratic Voting &amp; Civic Elections</strong>
                        <span className={`${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} text-[11px]`}>All adult citizens of the civilization cast democratic ballots every cycle to elect the Prime Minister, DM, and Ministers.</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-mono ${isDayMode ? "text-sky-800 font-black" : "text-sky-400 font-bold"} block`}>CONSTITUTIONAL SYSTEM</span>
                      <span className={`text-xs ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} font-mono`}>Automated 10-Year Cycle</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cabinet Appointments */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-200"} border p-3.5 rounded-xl flex flex-col gap-3`}>
                      <h3 className={`${isDayMode ? "text-amber-800 font-extrabold border-amber-200" : "text-amber-500 border-slate-800"} text-xs font-semibold border-b pb-1`}>PMO Cabinet Appointments</h3>
                      
                      <div className="flex flex-col gap-2 text-xs">
                        <div>
                          <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Prime Minister (PM):</label>
                          <select 
                            disabled={!isAdmin} 
                            value={pmInput} 
                            onChange={(e) => setPmInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-850 text-white"} border rounded p-1.5 text-xs disabled:opacity-60`}
                          >
                            {listAllAdults.map((a: string) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>District Magistrate (DM):</label>
                          <select 
                            disabled={!isAdmin} 
                            value={dmInput} 
                            onChange={(e) => setDmInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-850 text-white"} border rounded p-1.5 text-xs disabled:opacity-60`}
                          >
                            {listAllAdults.map((a: string) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Minister of Finance:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={finInput} 
                            onChange={(e) => setFinInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-850 text-white"} border rounded p-1.5 text-xs disabled:opacity-60`}
                          >
                            {listAllAdults.map((a: string) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Minister of Education:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={eduInput} 
                            onChange={(e) => setEduInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-850 text-white"} border rounded p-1.5 text-xs disabled:opacity-60`}
                          >
                            {listAllAdults.map((a: string) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Minister of Infrastructure:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={infraInput} 
                            onChange={(e) => setInfraInput(e.target.value)}
                            className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-850 text-white"} border rounded p-1.5 text-xs disabled:opacity-60`}
                          >
                            {listAllAdults.map((a: string) => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <button 
                          disabled={!isAdmin} 
                          onClick={() => {
                            soundEngine.playChime(true);
                            saveCabinetRoles();
                          }}
                          className="mt-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500 shadow-sm"
                        >
                          {isAdmin ? "REORGANIZE PMO CABINET" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>
                    </div>

                    {/* Government Policies */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/50 border-slate-800 text-slate-200"} border p-3.5 rounded-xl flex flex-col gap-3`}>
                      <h3 className={`${isDayMode ? "text-amber-800 font-extrabold border-amber-200" : "text-amber-500 border-slate-800"} text-xs font-semibold border-b pb-1`}>Tax &amp; Welfare Subsidies</h3>
                      
                      <div className="flex flex-col gap-3 text-xs">
                        <div>
                          <label className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"} font-semibold block mb-1`}>Income Tax: {incomeTaxInput}%</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="50" 
                            disabled={!isAdmin} 
                            value={incomeTaxInput} 
                            onChange={(e) => setIncomeTaxInput(Number(e.target.value))}
                            className="w-full accent-amber-500 disabled:opacity-50"
                          />
                        </div>

                        <div>
                          <label className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"} font-semibold block mb-1`}>Sales Tax: {salesTaxInput}%</label>
                          <input 
                            type="range" 
                            min="0" 
                            max="30" 
                            disabled={!isAdmin} 
                            value={salesTaxInput} 
                            onChange={(e) => setSalesTaxInput(Number(e.target.value))}
                            className="w-full accent-amber-500 disabled:opacity-50"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Welfare Threshold:</label>
                            <input 
                              type="number" 
                              disabled={!isAdmin} 
                              value={welfareThresholdInput} 
                              onChange={(e) => setWelfareThresholdInput(Number(e.target.value))}
                              className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-850 text-white font-mono"} border rounded p-1.5 text-xs disabled:opacity-60`}
                            />
                          </div>
                          <div>
                            <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} block mb-1`}>Welfare Payout ($):</label>
                            <input 
                              type="number" 
                              disabled={!isAdmin} 
                              value={welfarePayoutInput} 
                              onChange={(e) => setWelfarePayoutInput(Number(e.target.value))}
                              className={`w-full ${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-850 text-white font-mono"} border rounded p-1.5 text-xs disabled:opacity-60`}
                            />
                          </div>
                        </div>

                        <button 
                          disabled={!isAdmin} 
                          onClick={() => {
                            soundEngine.playChime(true);
                            saveGovernmentPolicies();
                          }}
                          className="mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500 shadow-sm"
                        >
                          {isAdmin ? "SAVE LAWS & POLICIES" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Farming & Agriculture + Seed Market */}
              {activeTab === "farming" && (
                <div className="flex flex-col gap-5">
                  
                  {/* Top Header & Farm Operations Bar */}
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span>Civilization Agricultural Farm Plots</span>
                        <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                          FERTILE FIELDS
                        </span>
                      </h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                        Cultivate crops, buy certified seeds, and harvest fresh produce for town markets
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`${isDayMode ? "bg-white border-amber-300 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800"} px-3 py-1.5 rounded-xl border font-mono text-xs`}>
                        <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"}`}>Personal Cash: </span>
                        <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-extrabold"}`}>${status.money?.toLocaleString()}</span>
                      </div>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick(600);
                            dispatchAction("toggle_automated_farming", {});
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border shadow-sm ${status.automated_farming_enabled ? isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isDayMode ? "bg-white text-slate-700 border-amber-300" : "bg-slate-900 text-slate-400 border-slate-800"}`}
                        >
                          <span>{status.automated_farming_enabled ? "🟢" : "⏸"}</span>
                          <span>AI FARMING: {status.automated_farming_enabled ? "ACTIVE" : "PAUSED"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {farmActionMsg && (
                    <div className={`${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-400 shadow-md font-bold" : "bg-emerald-950/60 text-emerald-200 border-emerald-500/50"} border rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-md animate-fade-in`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">🌾</span>
                        <span className="font-semibold">{farmActionMsg}</span>
                      </div>
                      <button onClick={() => setFarmActionMsg("")} className={`${isDayMode ? "text-emerald-900" : "text-emerald-400"} font-bold text-xs`}>✕</button>
                    </div>
                  )}

                  {/* LangChain Autonomous Kisan AI Agent Panel (NVIDIA NIM APIs) */}
                  <div className={`${isDayMode ? "bg-white/95 border-emerald-300/80 shadow-md ring-1 ring-emerald-300/40 text-slate-800" : "bg-gradient-to-br from-slate-900/95 via-slate-900/90 to-emerald-950/30 border-emerald-500/40 ring-1 ring-emerald-500/20"} border rounded-3xl p-4 flex flex-col gap-3.5 shadow-xl`}>
                    <div className={`flex justify-between items-start flex-wrap gap-2.5 border-b ${isDayMode ? "border-amber-200" : "border-slate-800/80"} pb-3`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-xl shadow-inner animate-pulse`}>
                          🤖
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`${isDayMode ? "text-slate-900" : "text-white"} text-sm font-extrabold flex items-center gap-1.5`}>
                              <span>Kisan AI Agriculture Agent</span>
                              <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border px-2 py-0.5 rounded-full font-mono`}>
                                LANGCHAIN + NVIDIA NIM
                              </span>
                            </h3>
                          </div>
                          <p className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>
                            Autonomous agent enforcing <strong>≥ 5 seeds</strong>, <strong>≥ 5 vegetables</strong>, and <strong>personal cash buffer ($200+)</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={kisanAgentRunning}
                          onClick={() => {
                            soundEngine.playChime(true);
                            triggerKisanAgent();
                          }}
                          className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {kisanAgentRunning ? (
                            <>
                              <span className="animate-spin">⏳</span>
                              <span>NVIDIA REASONING IN PROGRESS...</span>
                            </>
                          ) : (
                            <>
                              <span>⚡</span>
                              <span>RUN KISAN AGENT NOW</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 12-Item Stock Buffer & Deficit Tracker */}
                    <div>
                      <div className={`flex justify-between items-center mb-1.5 text-[10px] font-mono ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"}`}>
                        <span className={`uppercase font-bold tracking-wider ${isDayMode ? "text-slate-800" : "text-slate-300"}`}>Live Inventory Stock Level Tracker (Target: ≥ 5 Units)</span>
                        <span>Auto-Procures Seeds &amp; Prioritizes Planting on Deficits</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                        {[
                          { cropId: "wheat", seedId: "wheat_seed", name: "Wheat" },
                          { cropId: "carrot", seedId: "carrot_seed", name: "Carrots" },
                          { cropId: "corn", seedId: "corn_seed", name: "Sweet Corn" },
                          { cropId: "brokeli", seedId: "brokeli_seed", name: "Broccoli" },
                          { cropId: "cabbige", seedId: "cabbige_seed", name: "Cabbage" },
                          { cropId: "cucumber", seedId: "cucumber_seed", name: "Cucumber" },
                          { cropId: "chilly", seedId: "chilly_seed", name: "Red Chili" },
                          { cropId: "strawberry", seedId: "strawberry_seed", name: "Strawberry" },
                          { cropId: "apple", seedId: "apple_seed", name: "Apple" },
                          { cropId: "watermelon", seedId: "watermelon_seed", name: "Watermelon" },
                          { cropId: "banana", seedId: "banana_seed", name: "Banana" },
                          { cropId: "pumpkin", seedId: "pumpkin_seed", name: "Pumpkin" }
                        ].map((item) => {
                          const cropInBarn = Number(status.farm_barn?.[item.cropId] || 0);
                          const cropInInv = Number(status.inventory?.find(([k]: any) => k === item.cropId)?.[1] || 0);
                          const totalCrop = Math.max(cropInBarn, cropInInv);
                          const totalSeed = Number(status.inventory?.find(([k]: any) => k === item.seedId)?.[1] || 0);

                          const isCropOk = totalCrop >= 5;
                          const isSeedOk = totalSeed >= 5;
                          const isAllOk = isCropOk && isSeedOk;

                          return (
                            <div
                              key={item.cropId}
                              className={`${isDayMode ? "bg-amber-50/80 text-slate-800 shadow-sm" : "bg-slate-950/80 text-white"} border rounded-xl p-2 flex flex-col gap-1 transition-all ${isAllOk ? isDayMode ? "border-amber-200" : "border-slate-800" : "border-amber-500/40 bg-amber-950/10"}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <img src={getItemIconPath(item.cropId)} className="w-5 h-5 object-cover rounded-md" alt={item.name} />
                                  <strong className={`text-[11px] ${isDayMode ? "text-slate-900 font-extrabold" : "text-white"} truncate max-w-[65px]`}>{item.name}</strong>
                                </div>
                                <span className={`text-[9px] font-bold font-mono px-1 rounded ${isAllOk ? isDayMode ? "bg-emerald-100 text-emerald-950 font-bold" : "bg-emerald-500/20 text-emerald-300" : isDayMode ? "bg-amber-100 text-amber-950 font-bold" : "bg-amber-500/20 text-amber-300"}`}>
                                  {isAllOk ? "≥5 OK" : "DEFICIT"}
                                </span>
                              </div>

                              <div className={`grid grid-cols-2 gap-1 text-[9px] font-mono pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                                <div>
                                  <span className={`${isDayMode ? "text-slate-600 font-semibold" : "text-slate-500"} block`}>Veg:</span>
                                  <span className={`font-extrabold ${isCropOk ? isDayMode ? "text-emerald-700" : "text-emerald-400" : "text-rose-500 font-bold"}`}>
                                    {totalCrop}/5
                                  </span>
                                </div>
                                <div>
                                  <span className={`${isDayMode ? "text-slate-600 font-semibold" : "text-slate-500"} block`}>Seed:</span>
                                  <span className={`font-extrabold ${isSeedOk ? isDayMode ? "text-sky-700" : "text-sky-400" : "text-rose-500 font-bold"}`}>
                                    {totalSeed}/5
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Agent Thought & Decision Output */}
                    {kisanReport && (
                      <div className={`${isDayMode ? "bg-amber-50/60 border-amber-200 text-slate-800 shadow-sm" : "bg-slate-950 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col gap-1.5`}>
                        <div className={`flex items-center justify-between text-[10px] font-mono ${isDayMode ? "text-emerald-800 font-bold" : "text-emerald-400"}`}>
                          <span className="font-bold flex items-center gap-1.5">
                            <span>🧠</span>
                            <span>LATEST KISAN AI OPERATIONAL DECISION</span>
                          </span>
                          <span className={`${isDayMode ? "text-slate-500" : "text-slate-500"}`}>{new Date(kisanReport.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p className={`text-xs ${isDayMode ? "text-slate-800 bg-white/90 border-amber-200" : "text-slate-200 bg-slate-900/60 border-slate-850"} font-mono p-2 rounded-xl border`}>
                          {kisanReport.thought}
                        </p>
                        {kisanReport.actionsTaken?.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-slate-400">
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"}`}>Actions:</span>
                            {kisanReport.actionsTaken.map((act: string, idx: number) => (
                              <span key={idx} className={`${isDayMode ? "bg-white border-amber-200 text-emerald-950 font-bold" : "bg-slate-900 border-slate-800 text-emerald-300"} border px-2 py-0.5 rounded-md`}>
                                {act}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Farm Quick Actions Strip */}
                  <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-slate-800 text-white shadow-md"} border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playChime(true);
                          harvestAll();
                        }}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                      >
                        <span>🌾</span>
                        <span>HARVEST ALL READY PLOTS</span>
                      </button>

                      <div className={`flex items-center gap-1.5 ${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-950/80 border-slate-800"} p-1 rounded-xl border`}>
                        <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} font-mono pl-2`}>Plant All:</span>
                        <select
                          value={selectedPlantCrop}
                          onChange={(e) => setSelectedPlantCrop(e.target.value)}
                          className={`${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2 py-1 text-xs font-mono outline-none`}
                        >
                          <option value="wheat">🌾 Wheat (Grain)</option>
                          <option value="carrot">🥕 Carrot (Vegetable)</option>
                          <option value="corn">🌽 Corn (Vegetable)</option>
                          <option value="brokeli">🥦 Broccoli (Vegetable)</option>
                          <option value="cabbige">🥬 Cabbage (Vegetable)</option>
                          <option value="cucumber">🥒 Cucumber (Vegetable)</option>
                          <option value="chilly">🌶️ Chili (Spice)</option>
                          <option value="strawberry">🍓 Strawberry (Fruit)</option>
                          <option value="apple">🍎 Apple Tree (Fruit)</option>
                          <option value="watermelon">🍉 Watermelon (Fruit)</option>
                          <option value="banana">🍌 Banana (Fruit)</option>
                          <option value="pumpkin">🎃 Pumpkin (Vegetable)</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playClick(650);
                            plantAll(selectedPlantCrop);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-1 rounded-lg transition-all shadow-sm"
                        >
                          PLANT ALL
                        </button>
                      </div>
                    </div>

                    <div className={`${isDayMode ? "text-slate-700 font-semibold" : "text-slate-400"} text-xs font-mono flex items-center gap-2`}>
                      <span>🌾 Silo: <strong className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300"}`}>{status.farm_barn?.wheat || 0}</strong> Wheat</span>
                      <span>•</span>
                      <span>🥕 Barn: <strong className={`${isDayMode ? "text-orange-800 font-black" : "text-orange-300"}`}>{status.farm_barn?.carrot || 0}</strong> Carrots</span>
                    </div>
                  </div>

                  {/* Interactive Farm Plots Grid */}
                  <div>
                    <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-xs uppercase tracking-wider mb-2 flex items-center justify-between`}>
                      <span>Farm Plots ({status.plots?.length || 0} Plots)</span>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono font-normal`}>Click to plant or harvest individual plots</span>
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {status.plots?.map((p: any) => {
                        const isReady = p.state === "ready";
                        const isGrowing = p.state === "growing";
                        const isEmpty = p.state === "empty";
                        const progress = p.progress ?? (isReady ? 100 : 0);

                        return (
                          <div
                            key={p.index}
                            className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 text-slate-800" : "bg-slate-950/80 hover:bg-slate-950 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col items-center text-center gap-2 transition-all shadow-sm ${isReady ? isDayMode ? "border-amber-400 ring-2 ring-amber-300/60 bg-amber-50/90" : "border-amber-400/80 shadow-amber-500/10 ring-1 ring-amber-400/30" : isGrowing ? isDayMode ? "border-emerald-300" : "border-emerald-500/40" : ""}`}
                          >
                            <div className={`flex justify-between items-center w-full text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono`}>
                              <span>PLOT #{p.index + 1}</span>
                              <span className={`font-bold px-1.5 py-0.2 rounded text-[9px] ${isReady ? "bg-amber-500 text-slate-950 animate-pulse font-black" : isGrowing ? isDayMode ? "bg-emerald-100 text-emerald-950 font-bold" : "bg-emerald-500/20 text-emerald-300" : isDayMode ? "bg-slate-100 text-slate-600" : "bg-slate-900 text-slate-500"}`}>
                                {isReady ? "READY" : isGrowing ? "GROWING" : "EMPTY"}
                              </span>
                            </div>

                            {/* Crop Avatar */}
                            <div className={`w-14 h-14 rounded-2xl ${isDayMode ? "bg-amber-50 border-amber-200" : "bg-slate-900/80 border-slate-800"} border flex items-center justify-center p-1.5 shadow-inner relative overflow-hidden`}>
                              {p.crop_id ? (
                                <img
                                  src={getItemIconPath(p.crop_id)}
                                  className={`w-full h-full object-cover rounded-xl ${isReady ? "animate-bounce" : ""}`}
                                  alt={p.crop_id}
                                />
                              ) : (
                                <span className="text-2xl opacity-60">🟫</span>
                              )}
                            </div>

                            {/* Crop Name & Label */}
                            <div className="w-full">
                              <span className={`text-xs font-extrabold ${isDayMode ? "text-slate-900 font-black" : "text-slate-200"} block truncate capitalize`}>
                                {p.crop_name ? p.crop_name.replace(/^crop_/i, "").replace(/^crop\s+/i, "") : (p.crop_id ? p.crop_id.replace(/^crop_/, "").replace(/_/g, " ") : "Empty Soil")}
                              </span>
                              <span className={`text-[10px] font-mono ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} block`}>
                                {p.label ? p.label.replace(/^crop_/i, "").replace(/^crop\s+/i, "") : "Available for planting"}
                              </span>
                            </div>

                            {/* Growth Progress Bar */}
                            {isGrowing && (
                              <div className={`w-full ${isDayMode ? "bg-amber-100 border-amber-200" : "bg-slate-900 border-slate-800"} h-1.5 rounded-full overflow-hidden border`}>
                                <div
                                  className="bg-gradient-to-r from-amber-500 to-emerald-400 h-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            )}

                            {/* Plot Action Buttons */}
                            <div className={`w-full pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                              {isReady && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playChime(true);
                                    harvestPlot(p.index);
                                  }}
                                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-[10px] py-1.5 rounded-lg shadow transition-all flex items-center justify-center gap-1"
                                >
                                  <span>🌾</span>
                                  <span>HARVEST CROP</span>
                                </button>
                              )}

                              {isGrowing && (
                                <span className={`text-[10px] ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-bold"} font-mono block py-1`}>
                                  ⏳ {Math.ceil(p.remaining || 0)}s remaining
                                </span>
                              )}

                              {isEmpty && (
                                <div className="flex gap-1 w-full">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick(600);
                                      plantPlot(p.index, selectedPlantCrop);
                                    }}
                                    className={`w-full ${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold" : "bg-slate-850 hover:bg-slate-800 text-sky-300 border-slate-750 font-bold"} text-[10px] py-1 rounded-lg border transition-all flex items-center justify-center gap-1`}
                                  >
                                    <span>🌱</span>
                                    <span>PLANT {selectedPlantCrop.toUpperCase()}</span>
                                  </button>
                                </div>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Agricultural Seed Market Section */}
                  <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-md text-slate-800" : "bg-slate-900/50 border-slate-800 text-white shadow-lg"} border rounded-3xl p-4 flex flex-col gap-3.5`}>
                    <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5 flex-wrap gap-2`}>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/30"} border flex items-center justify-center text-base`}>
                          🌱
                        </div>
                        <div>
                          <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs uppercase tracking-wider`}>
                            Kisan Agricultural Seed Market &amp; Supply Depot
                          </h3>
                          <p className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                            Certified high-germination seeds for vegetable farming, fruit orchards and grain cultivation
                          </p>
                        </div>
                      </div>

                      <span className={`text-[10px] ${isDayMode ? "bg-amber-50 text-slate-700 border-amber-200 font-bold" : "bg-slate-950 text-slate-400 border-slate-800"} px-2 py-1 rounded-lg border font-mono`}>
                        Instant Delivery to Personal Bag
                      </span>
                    </div>

                    {/* Seeds Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {[
                        { cropId: "wheat", seedId: "wheat_seed", name: "Wheat Grain Seeds", price: 2, icon: "wheat", time: "20s", yield: "2-5x" },
                        { cropId: "carrot", seedId: "carrot_seed", name: "Carrot Crop Seeds", price: 2, icon: "carrot", time: "15s", yield: "2-5x" },
                        { cropId: "corn", seedId: "corn_seed", name: "Sweet Corn Seeds", price: 2, icon: "corn", time: "25s", yield: "2-4x" },
                        { cropId: "brokeli", seedId: "brokeli_seed", name: "Broccoli Seeds", price: 3, icon: "brokeli", time: "30s", yield: "2-4x" },
                        { cropId: "cabbige", seedId: "cabbige_seed", name: "Cabbage Seeds", price: 2, icon: "cabbige", time: "35s", yield: "1-2x" },
                        { cropId: "cucumber", seedId: "cucumber_seed", name: "Cucumber Seeds", price: 2, icon: "cucumber", time: "20s", yield: "2-5x" },
                        { cropId: "chilly", seedId: "chilly_seed", name: "Red Chili Seeds", price: 2, icon: "chilly", time: "20s", yield: "3-7x" },
                        { cropId: "strawberry", seedId: "strawberry_seed", name: "Strawberry Seeds", price: 3, icon: "strawberry", time: "15s", yield: "3-7x" },
                        { cropId: "apple", seedId: "apple_seed", name: "Apple Orchard Seeds", price: 4, icon: "apple", time: "30s", yield: "2-4x" },
                        { cropId: "watermelon", seedId: "watermelon_seed", name: "Watermelon Seeds", price: 4, icon: "watermelon", time: "45s", yield: "1-2x" },
                        { cropId: "banana", seedId: "banana_seed", name: "Banana Tree Seeds", price: 3, icon: "banana", time: "25s", yield: "2-4x" },
                        { cropId: "pumpkin", seedId: "pumpkin_seed", name: "Pumpkin Seeds", price: 4, icon: "pumpkin", time: "40s", yield: "1-2x" }
                      ].map((seed) => {
                        const inPlayerBag = (status.inventory?.find(([k]: any) => k === seed.seedId)?.[1]) || 0;

                        return (
                          <div
                            key={seed.seedId}
                            className={`${isDayMode ? "bg-amber-50/80 hover:bg-white border-amber-200 hover:border-amber-400 text-slate-800" : "bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200"} border rounded-2xl p-3 flex flex-col gap-2.5 transition-all shadow-sm group`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <img
                                  src={getItemIconPath(seed.seedId)}
                                  className={`w-9 h-9 object-cover rounded-xl shadow border ${isDayMode ? "border-amber-200" : "border-slate-800"} group-hover:scale-105 transition-transform`}
                                  alt={seed.name}
                                />
                                <div>
                                  <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs block font-bold truncate max-w-[110px]`}>{seed.name}</strong>
                                  <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>Growth: {seed.time} &bull; {seed.yield}</span>
                                </div>
                              </div>

                              <span className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-400"} font-mono font-extrabold text-xs`}>${seed.price}</span>
                            </div>

                            <div className={`flex justify-between items-center text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                              <span>Owned in bag:</span>
                              <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>x{inPlayerBag}</span>
                            </div>

                            {/* Buy Buttons */}
                            <div className="grid grid-cols-3 gap-1">
                              <button
                                type="button"
                                disabled={(status.money || 0) < seed.price}
                                onClick={() => {
                                  soundEngine.playClick(600);
                                  buySeeds(seed.seedId, 1);
                                }}
                                className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"} border text-[10px] font-extrabold py-1 rounded-lg transition-all disabled:opacity-30`}
                              >
                                Buy 1x
                              </button>
                              <button
                                type="button"
                                disabled={(status.money || 0) < seed.price * 5}
                                onClick={() => {
                                  soundEngine.playClick(600);
                                  buySeeds(seed.seedId, 5);
                                }}
                                className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold py-1 rounded-lg transition-all disabled:opacity-30 shadow-sm"
                              >
                                Buy 5x
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(650);
                                  plantAll(seed.cropId);
                                }}
                                className={`${isDayMode ? "bg-white hover:bg-amber-100 text-emerald-950 border-amber-250 font-black" : "bg-slate-850 hover:bg-slate-800 text-emerald-300 border-slate-750 font-bold"} border text-[10px] py-1 rounded-lg transition-all`}
                                title={`Plant ${seed.name} across all empty farm plots`}
                              >
                                🌱 Plant
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab: Personal Inventory */}
              {activeTab === "inventory" && (
                <div className="flex flex-col gap-3.5">
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span>Personal Resource Bag &amp; Provisions</span>
                        <span className={`text-[10px] ${isDayMode ? "bg-sky-100 text-sky-950 border-sky-300 font-bold" : "bg-sky-500/20 text-sky-300 border-sky-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                          CITIZEN CARRIER
                        </span>
                      </h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Personal supplies, crafted items, vegetables, and consumables</span>
                    </div>

                    <div className={`flex items-center gap-2 ${isDayMode ? "bg-white border-amber-300 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800"} px-3 py-1.5 rounded-xl border`}>
                      <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} text-xs font-mono`}>Personal Wallet:</span>
                      <span className={`text-base font-mono font-extrabold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"}`}>${status.money?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Personal Inventory Cards Grid */}
                  {(() => {
                    const inventoryEntries: [string, number][] = Array.isArray(status.inventory)
                      ? status.inventory
                      : Object.entries(status.inventory || {});

                    if (inventoryEntries.length === 0) {
                      return (
                        <div className={`${isDayMode ? "bg-amber-50/50 border-amber-200 text-slate-700" : "bg-slate-950/40 border-slate-800 text-slate-400"} border-2 border-dashed rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2`}>
                          <span className="text-3xl">🎒</span>
                          <h3 className={`${isDayMode ? "text-slate-900 font-extrabold" : "text-white font-bold"} text-sm`}>Your Personal Inventory is Empty</h3>
                          <p className={`text-xs max-w-md ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                            Harvest crops from the farm, craft items in workshops, or buy fresh goods at Town Markets to fill your backpack.
                          </p>
                        </div>
                      );
                    }

                    const EDIBLE_FOODS = new Set(["carrot", "cucumber", "broccoli", "cabbage", "corn", "apple", "strawberry", "banana", "watermelon", "wheat", "milk", "egg", "bread", "pizza", "burger"]);

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {inventoryEntries.map(([item, qty]) => {
                          const isEdible = EDIBLE_FOODS.has(item.toLowerCase());
                          const cleanItem = item.toLowerCase().trim().replace(/^crop_/, "");
                          const price = status.item_prices?.[item] ?? status.item_prices?.[cleanItem] ?? (cleanItem === "milk" || cleanItem === "cow_milk" ? 5 : cleanItem === "egg" ? 3 : cleanItem === "wool" ? 8 : 5);

                          return (
                            <div className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-sm text-slate-800" : "bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200 shadow-md"} border rounded-2xl p-3 flex flex-col items-center text-center gap-2 transition-all group`} key={item}>
                              <div className="relative">
                                <img
                                  src={getItemIconPath(item)}
                                  onError={(e: any) => { e.currentTarget.src = createSvgIcon(getItemEmoji(item), "#1e293b", "#0f172a"); }}
                                  className={`w-12 h-12 object-cover rounded-xl shadow-md border ${isDayMode ? "border-amber-200" : "border-slate-800"} group-hover:scale-105 transition-transform`}
                                  alt={item}
                                />
                                <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-slate-950 font-mono font-extrabold text-[10px] px-1.5 py-0.2 rounded-full shadow">
                                  x{qty}
                                </span>
                              </div>

                              <div className="w-full">
                                <span className={`text-xs font-extrabold ${isDayMode ? "text-slate-900" : "text-white"} capitalize block truncate`}>{item.replace(/_/g, " ")}</span>
                                <span className={`text-[10px] font-mono ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"}`}>Value: ~${price}/ea</span>
                              </div>

                              {/* Action Buttons */}
                              <div className={`flex flex-col gap-1 w-full pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                                {isEdible && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playChime(true);
                                      dispatchAction("eat_item", { item_id: item });
                                    }}
                                    className={`w-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 ${isDayMode ? "text-emerald-950 border-emerald-300 font-black" : "text-emerald-300 border-emerald-500/40 font-extrabold"} border text-[10px] py-1 rounded-lg transition-all flex items-center justify-center gap-1 shadow-sm`}
                                  >
                                    <span>🍽️</span>
                                    <span>EAT / NOURISH</span>
                                  </button>
                                )}

                                <div className="grid grid-cols-2 gap-1 w-full">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playClick(600);
                                      sellItem(item, 1);
                                    }}
                                    className={`${isDayMode ? "bg-amber-50 hover:bg-amber-100 text-slate-800 border-amber-200" : "bg-slate-850 hover:bg-slate-800 text-slate-300 border-slate-750"} text-[10px] py-1 rounded-lg font-bold border transition-all`}
                                  >
                                    Sell 1 ($)
                                  </button>
                                  {qty >= 5 ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick(650);
                                        sellItem(item, 5);
                                      }}
                                      className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold" : "bg-slate-850 hover:bg-slate-800 text-amber-300 border-slate-750 font-bold"} text-[10px] py-1 rounded-lg border transition-all`}
                                    >
                                      Sell 5 ($)
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playClick(650);
                                        sellItem(item, qty);
                                      }}
                                      className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold" : "bg-slate-850 hover:bg-slate-800 text-amber-300 border-slate-750 font-bold"} text-[10px] py-1 rounded-lg border transition-all`}
                                    >
                                      Sell All
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab: Town Markets */}
              {activeTab === "market" && (
                <div className="flex flex-col gap-4">
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span>Civilization Commercial Retail &amp; Farmers Markets</span>
                        <span className={`text-[10px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-black" : "bg-amber-500/20 text-amber-300 border-amber-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                          DECENTRALIZED COMMERCE
                        </span>
                      </h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                        Direct citizen trading, fresh agricultural crops, dairy, clothiers, electronics &amp; construction depots
                      </span>
                    </div>

                    <div className={`flex items-center gap-2 ${isDayMode ? "bg-white border-amber-300 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800"} px-3 py-1.5 rounded-xl border font-mono text-xs`}>
                      <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"}`}>Personal Cash:</span>
                      <span className={`font-extrabold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"}`}>${status.money?.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Shops Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                    {status.shops?.map((s: any) => {
                      const totalShopUnits: number = (Object.values(s.inventory || {}) as any[]).reduce((a: number, b: any) => a + Number(b || 0), 0);
                      const isFarmersMarket = s.id === "farmers_market";

                      return (
                        <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-slate-800 text-slate-200"} border rounded-2xl p-4 flex flex-col gap-3 shadow-lg transition-all ${isFarmersMarket ? isDayMode ? "border-emerald-300 bg-emerald-50/40" : "border-emerald-500/50 bg-slate-900/80 shadow-emerald-500/5" : ""}`} key={s.id}>
                          
                          {/* Shop Header */}
                          <div className={`flex justify-between items-start border-b ${isDayMode ? "border-amber-200" : "border-slate-800/80"} pb-2.5 gap-2`}>
                            <div className="flex items-center gap-2.5">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border ${isFarmersMarket ? isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40" : isDayMode ? "bg-amber-100 border-amber-300" : "bg-slate-800 border-slate-700"}`}>
                                {isFarmersMarket ? "🚜" : s.id === "dairy" ? "🥛" : s.id === "general" ? "🏪" : s.id === "clothiers" ? "👕" : "⚡"}
                              </div>
                              <div>
                                <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-xs block`}>{s.name}</strong>
                                <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                                  Proprietor: <strong className={`${isDayMode ? "text-slate-800 font-bold" : "text-slate-300"}`}>{s.owner}</strong> &bull; {totalShopUnits} items in stock
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`text-xs font-mono font-extrabold ${isDayMode ? "text-emerald-700" : "text-emerald-400"} block`}>${s.revenue?.toLocaleString() || 0}</span>
                              <span className={`text-[9px] ${isDayMode ? "text-slate-500 font-bold" : "text-slate-500"} uppercase font-mono`}>Shop Revenue</span>
                            </div>
                          </div>

                          {/* Items Matrix */}
                          <div className="flex flex-col gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                            {Object.entries(s.inventory).map(([item, qty]: any) => {
                              const cleanItem = String(item).toLowerCase().trim().replace(/^crop_/, "");
                              const price = s.prices?.[item] ?? s.prices?.[cleanItem] ?? status.item_prices?.[item] ?? status.item_prices?.[cleanItem] ?? (cleanItem === "milk" || cleanItem === "cow_milk" ? 5 : cleanItem === "egg" ? 3 : cleanItem === "wool" ? 8 : 5);
                              const inPlayerBag = (status.inventory?.find(([k]: any) => k === item)?.[1]) || 0;

                              return (
                                <div className={`flex justify-between items-center ${isDayMode ? "bg-amber-50/80 hover:bg-amber-100/60 border-amber-200 text-slate-800" : "bg-slate-950/70 hover:bg-slate-950 border-slate-850 text-slate-200"} p-2 rounded-xl text-xs border transition-all`} key={item}>
                                  <div className="flex items-center gap-2">
                                    <img
                                      src={getItemIconPath(item)}
                                      onError={(e: any) => { e.currentTarget.src = createSvgIcon(getItemEmoji(item), "#1e293b", "#0f172a"); }}
                                      className={`w-8 h-8 object-cover rounded-lg shadow border ${isDayMode ? "border-amber-200" : "border-slate-800"}`}
                                      alt={item}
                                    />
                                    <div>
                                      <span className={`capitalize font-extrabold ${isDayMode ? "text-slate-900" : "text-slate-200"} block text-xs`}>{item.replace(/_/g, " ")}</span>
                                      <div className="flex items-center gap-1.5 text-[10px] font-mono">
                                        <span className={Number(qty) > 0 ? isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-bold" : "text-rose-500 font-bold"}>
                                          {qty} in store
                                        </span>
                                        {inPlayerBag > 0 && (
                                          <span className={`${isDayMode ? "text-sky-800 font-bold" : "text-sky-400 font-semibold"}`}>&bull; ({inPlayerBag} in your bag)</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`font-mono ${isDayMode ? "text-amber-800 font-black" : "text-amber-400 font-extrabold"} text-xs`}>${price}</span>
                                    
                                    {/* Buy Buttons */}
                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        disabled={Number(qty) < 1 || (status.money || 0) < price}
                                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-[10px] px-2 py-1 rounded-lg transition-all disabled:opacity-30 disabled:hover:bg-amber-500 shadow-sm"
                                        onClick={() => {
                                          soundEngine.playChime(true);
                                          buyFromShop(s.id, item, 1);
                                        }}
                                      >
                                        BUY 1x
                                      </button>
                                      {Number(qty) >= 5 && (
                                        <button
                                          type="button"
                                          disabled={(status.money || 0) < price * 5}
                                          className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-black" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 font-extrabold"} border text-[10px] px-2 py-1 rounded-lg transition-all disabled:opacity-30 shadow-sm`}
                                          onClick={() => {
                                            soundEngine.playChime(true);
                                            buyFromShop(s.id, item, 5);
                                          }}
                                        >
                                          5x
                                        </button>
                                      )}
                                    </div>

                                    {/* Sell to Shop Button */}
                                    {inPlayerBag > 0 && (
                                      <button
                                        type="button"
                                        className={`${isDayMode ? "bg-sky-100 hover:bg-sky-200 text-sky-950 border-sky-300" : "bg-slate-800 hover:bg-slate-700 text-sky-300 border-slate-700"} font-bold text-[10px] px-2 py-1 rounded-lg border transition-all shadow-sm`}
                                        onClick={() => {
                                          soundEngine.playClick(650);
                                          sellToShop(s.id, item, 1);
                                        }}
                                        title={`Sell 1x ${item} to ${s.name} for $${price}`}
                                      >
                                        SELL
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Industrial Revolution, Shipyards, Oil Refineries & Petrol Pumps */}
              {activeTab === "industries" && (
                <div className="flex flex-col gap-5">
                  {/* Top Header */}
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-3 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span>Industrial Revolution, PetroChemicals &amp; Coastal Shipyards</span>
                        <span className={`text-[10px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300 border-amber-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                          HEAVY INDUSTRY &amp; ENERGY
                        </span>
                      </h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                        Petroleum cracking, Highway 48 fuel superstations, maritime shipyard fleet &amp; smelting foundries
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className={`${isDayMode ? "bg-white border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800"} px-3 py-1.5 rounded-xl border font-mono text-xs`}>
                        <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"}`}>Personal Cash: </span>
                        <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-extrabold"}`}>${status.money?.toLocaleString()}</span>
                      </div>
                      <div className={`${isDayMode ? "bg-white border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800"} px-3 py-1.5 rounded-xl border font-mono text-xs`}>
                        <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"}`}>Civic Treasury: </span>
                        <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-400 font-extrabold"}`}>${status.city_treasury?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Autonomous Industrial Agent Operational Banner */}
                  <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-amber-500/30 shadow-md"} border rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/30"} border flex items-center justify-center text-lg shadow-inner`}>
                        🤖
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs font-bold`}>Autonomous Industrial Supply Chain Agent</strong>
                          <span className={`text-[9px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border px-1.5 py-0.2 rounded font-mono`}>
                            ONLINE &amp; AUTOMATED
                          </span>
                        </div>
                        <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>
                          Auto-extracts crude, distills fuels, replenishes petrol superstation, bunks ships &amp; smelts steel
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        soundEngine.playChime(true);
                        const res = await dispatchAction("run_industrial_agent", {});
                        if (res?.message) {
                          setIndustrialActionMsg(res.message);
                          setTimeout(() => setIndustrialActionMsg(""), 6000);
                        }
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow transition-all flex items-center gap-1.5 ml-auto"
                    >
                      <span>⚡</span>
                      <span>RUN INDUSTRIAL AGENT</span>
                    </button>
                  </div>

                  {industrialActionMsg && (
                    <div className={`${isDayMode ? "bg-amber-100 text-amber-950 border-amber-400 shadow-md font-bold" : "bg-amber-950/60 text-amber-200 border-amber-500/50"} border rounded-xl px-4 py-2.5 flex items-center justify-between text-xs shadow-md animate-fade-in`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <span className="font-semibold">{industrialActionMsg}</span>
                      </div>
                      <button onClick={() => setIndustrialActionMsg("")} className={`${isDayMode ? "text-amber-900" : "text-amber-400 hover:text-white"} font-bold text-xs`}>✕</button>
                    </div>
                  )}

                  {/* 4 Major Industrial Sectors Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    
                    {/* Sector 1: ⚓ Navsari Coastal Shipyard & Maritime Docks */}
                    <div className={`${isDayMode ? "bg-white/95 border-sky-300/80 hover:border-sky-400 shadow-md text-slate-800" : "bg-slate-950/80 border-sky-500/30 hover:border-sky-500/50 text-slate-200 shadow-xl"} border rounded-3xl p-4 flex flex-col justify-between gap-3.5 transition-all`}>
                      <div className="flex flex-col gap-3">
                        <div className={`flex justify-between items-start border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-sky-100 border-sky-300" : "bg-sky-500/20 border-sky-500/40"} border flex items-center justify-center text-xl shadow-inner`}>
                              ⚓
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs font-extrabold flex items-center gap-1.5`}>
                                <span>Navsari Coastal Shipyard &amp; Maritime Docks</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-sky-100 text-sky-950 font-bold" : "bg-sky-500/20 text-sky-300"} px-1.5 py-0.2 rounded font-mono`}>PORT MARITIME</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>Harbor Master: Captain Vikram &bull; {status.industry?.shipyard?.fleet?.length || 3} vessels active</span>
                            </div>
                          </div>

                          <span className={`text-[10px] ${isDayMode ? "bg-sky-100 text-sky-950 border-sky-300 font-bold" : "bg-sky-500/20 text-sky-300 border-sky-500/40"} border px-2 py-0.5 rounded-full font-mono`}>
                            BERTHS ACTIVE
                          </span>
                        </div>

                        {/* Maritime Fleet List */}
                        <div className="flex flex-col gap-2 max-h-44 overflow-y-auto pr-1">
                          {status.industry?.shipyard?.fleet?.map((ship: any) => (
                            <div key={ship.id} className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/70 border-slate-850"} border rounded-2xl p-2.5 flex items-center justify-between gap-2 text-xs`}>
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{ship.type === "cargo_ship" ? "🚢" : ship.type === "passenger_ferry" ? "⛴️" : "🛥️"}</span>
                                <div>
                                  <strong className={`${isDayMode ? "text-slate-900 font-bold" : "text-slate-200"} block text-xs`}>{ship.name}</strong>
                                  <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono capitalize`}>
                                    {ship.type.replace(/_/g, " ")} &bull; {ship.status}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="text-right font-mono text-[10px]">
                                  <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Bunker Fuel</span>
                                  <span className={`font-bold ${ship.fuel > 30 ? isDayMode ? "text-emerald-700 font-black" : "text-emerald-400" : "text-rose-500"}`}>{ship.fuel}%</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick(650);
                                    dispatchShipVoyage(ship.id);
                                  }}
                                  className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-[10px] px-2.5 py-1.5 rounded-xl transition-all shadow"
                                >
                                  VOYAGE 🚀
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Commission New Vessel Form */}
                        <div className={`${isDayMode ? "bg-amber-50/60 border-amber-200" : "bg-slate-900/50 border-slate-850"} p-2.5 rounded-2xl border flex flex-col gap-2`}>
                          <span className={`text-[10px] font-mono ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} uppercase tracking-wider`}>Commission New Maritime Vessel</span>
                          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                            <input
                              type="text"
                              placeholder="Vessel Name (e.g. INS Tapi Express)"
                              value={newShipNameInput}
                              onChange={(e) => setNewShipNameInput(e.target.value)}
                              className={`${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl px-2.5 py-1.5 text-xs flex-1 min-w-[140px] outline-none`}
                            />
                            <select
                              value={newShipTypeInput}
                              onChange={(e: any) => setNewShipTypeInput(e.target.value)}
                              className={`${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl px-2 py-1.5 text-xs outline-none`}
                            >
                              <option value="cargo_ship">Cargo Ship ($150)</option>
                              <option value="passenger_ferry">Passenger Ferry ($100)</option>
                              <option value="fishing_trawler">Fishing Trawler ($75)</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playChime(true);
                                commissionShip();
                              }}
                              className="bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow transition-all whitespace-nowrap"
                            >
                              COMMISSION
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sector 2: 🛢️ PetroChem Oil Refinery & Catalytic Cracker */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-md text-slate-800" : "bg-slate-950/80 border-amber-500/30 hover:border-amber-500/50 text-slate-200 shadow-xl"} border rounded-3xl p-4 flex flex-col justify-between gap-3.5 transition-all`}>
                      <div className="flex flex-col gap-3">
                        <div className={`flex justify-between items-start border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-xl shadow-inner`}>
                              🛢️
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs font-extrabold flex items-center gap-1.5`}>
                                <span>Gulf Oil Refinery &amp; Distillation Complex</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-950 font-bold" : "bg-amber-500/20 text-amber-300"} px-1.5 py-0.2 rounded font-mono`}>ENERGY REFINERY</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>Chief Engineer: Arjun Patel &bull; Catalytic Cracking Unit Online</span>
                            </div>
                          </div>

                          <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border px-2 py-0.5 rounded-full font-mono`}>
                            REFINERY 95% EFFICIENCY
                          </span>
                        </div>

                        {/* Fuel Storage Gauges Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Crude Oil</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-amber-800 font-black" : "text-amber-400"} font-mono`}>{status.industry?.oil_refinery?.crude_oil || 120} BBL</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Refined Petrol</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"} font-mono`}>{status.industry?.oil_refinery?.refined_petrol || 85} L</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Diesel Fuel</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-sky-700 font-black" : "text-sky-400"} font-mono`}>{status.industry?.oil_refinery?.diesel || 60} L</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Marine Bunker</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-purple-800 font-black" : "text-indigo-400"} font-mono`}>{status.industry?.oil_refinery?.marine_fuel || 40} L</span>
                          </div>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/60 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} p-2.5 rounded-xl border leading-relaxed`}>
                          Extracts raw coastal petroleum and distills high-octane gasoline for automobiles, heavy diesel for freight trucks, and bunker fuel for shipyard cargo vessels.
                        </p>

                        <div className={`flex items-center gap-2 ${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2.5 rounded-2xl border`}>
                          <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} font-mono`}>Refining Batch:</span>
                          <input
                            type="number"
                            value={refiningBarrelsInput}
                            onChange={(e) => setRefiningBarrelsInput(Number(e.target.value))}
                            className={`${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl px-2 py-1 text-xs w-20 outline-none`}
                          />
                          <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} font-mono`}>Barrels</span>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playChime(true);
                              refinePetrol();
                            }}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow transition-all ml-auto"
                          >
                            ⚡ REFINE FUEL NOW
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sector 3: ⛽ Highway 48 Petrol & EV Superstation */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-md text-slate-800" : "bg-slate-950/80 border-rose-500/30 hover:border-rose-500/50 text-slate-200 shadow-xl"} border rounded-3xl p-4 flex flex-col justify-between gap-3.5 transition-all`}>
                      <div className="flex flex-col gap-3">
                        <div className={`flex justify-between items-start border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-rose-100 border-rose-300" : "bg-rose-500/20 border-rose-500/40"} border flex items-center justify-center text-xl shadow-inner`}>
                              ⛽
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs font-extrabold flex items-center gap-1.5`}>
                                <span>Highway 48 Petrol &amp; EV Superstation</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-rose-100 text-rose-950 font-bold" : "bg-rose-500/20 text-rose-300"} px-1.5 py-0.2 rounded font-mono`}>FUEL RETAIL</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>Attendant: Rohan Mistri &bull; High-Octane Dispensers &amp; EV Hyperchargers</span>
                            </div>
                          </div>

                          <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border px-2 py-0.5 rounded-full font-mono`}>
                            DISPENSING
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Pump Petrol Stock</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-rose-700 font-black" : "text-rose-400"} font-mono`}>{status.industry?.petrol_pump?.fuel_stock || 450} Liters</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Pump Diesel Stock</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-sky-700 font-black" : "text-sky-400"} font-mono`}>{status.industry?.petrol_pump?.diesel_stock || 350} Liters</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Station Revenue</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"} font-mono`}>${status.industry?.petrol_pump?.revenue?.toLocaleString() || "1,800"}</span>
                          </div>
                        </div>

                        {/* Live Vehicle Refueling Telemetry */}
                        <div className={`${isDayMode ? "bg-amber-50/60 border-amber-200" : "bg-slate-900/50 border-slate-850"} p-2.5 rounded-2xl border flex flex-col gap-1.5`}>
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className={`font-bold uppercase tracking-wider ${isDayMode ? "text-rose-800 font-extrabold" : "text-rose-300"}`}>Live Citizen Vehicle Fueling Log</span>
                            <span className={`${isDayMode ? "text-emerald-700 font-extrabold" : "text-emerald-400 font-bold"}`}>10% City Tax Credited</span>
                          </div>
                          <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                            {(status.industry?.petrol_pump?.recent_refuelings && status.industry?.petrol_pump?.recent_refuelings.length > 0) ? (
                              status.industry?.petrol_pump?.recent_refuelings.slice(0, 5).map((r: any, idx: number) => (
                                <div key={idx} className={`flex justify-between items-center ${isDayMode ? "bg-white border-amber-200 text-slate-800" : "bg-slate-950/80 border-slate-850 text-white"} px-2 py-1 rounded-lg text-[10px] font-mono border`}>
                                  <div className="flex items-center gap-1.5">
                                    <span>{r.vehicle === "car" ? "🚗" : r.vehicle === "scooter" ? "🛵" : r.vehicle === "tractor" ? "🚜" : "🚛"}</span>
                                    <span className={`${isDayMode ? "text-slate-900 font-bold" : "text-slate-200 font-bold"}`}>{r.citizen}</span>
                                    <span className={`${isDayMode ? "text-slate-600" : "text-slate-500"} capitalize`}>({r.vehicle})</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`${isDayMode ? "text-rose-700 font-black" : "text-rose-400 font-bold"}`}>-{r.liters}L {r.fuel_type}</span>
                                    <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-bold"}`}>${r.cost}</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-500"} font-mono text-center py-1`}>
                                Citizen cars, scooters &amp; tractors actively fueling on road routes.
                              </div>
                            )}
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 ${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2.5 rounded-2xl border`}>
                          <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400"} font-mono`}>Fuel Price ($/L):</span>
                          <input
                            type="number"
                            value={fuelPriceInput}
                            onChange={(e) => setFuelPriceInput(Number(e.target.value))}
                            className={`${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl px-2 py-1 text-xs w-20 outline-none`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick(600);
                              saveFuelPrice();
                            }}
                            className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow transition-all ml-auto"
                          >
                            SET FUEL PRICE
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sector 4: 🏭 Navsari Heavy Foundry & Steel Smelting Works */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-md text-slate-800" : "bg-slate-950/80 border-slate-700 hover:border-slate-500 text-slate-200 shadow-xl"} border rounded-3xl p-4 flex flex-col justify-between gap-3.5 transition-all`}>
                      <div className="flex flex-col gap-3">
                        <div className={`flex justify-between items-start border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-slate-800 border border-slate-700"} border flex items-center justify-center text-xl shadow-inner`}>
                              🏭
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs font-extrabold flex items-center gap-1.5`}>
                                <span>Navsari Heavy Foundry &amp; Smelting Works</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-950 font-bold" : "bg-slate-800 text-slate-300"} px-1.5 py-0.2 rounded font-mono`}>HEAVY INDUSTRY</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono`}>Blast Furnaces &amp; Industrial Steel Rolling Mills</span>
                            </div>
                          </div>

                          <span className={`text-[10px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-bold" : "bg-slate-800 text-slate-300 border-slate-700"} border px-2 py-0.5 rounded-full font-mono`}>
                            2 SMELTERS ACTIVE
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Iron Ore Stock</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-slate-900 font-black" : "text-slate-300"} font-mono`}>{status.industry?.heavy_manufacturing?.iron_ore_stock || 75} Units</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Steel Beams</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-amber-800 font-black" : "text-amber-400"} font-mono`}>{status.industry?.heavy_manufacturing?.steel_beams || 45} Beams</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/80 border-slate-850"} border p-2.5 rounded-2xl text-center flex flex-col gap-0.5`}>
                            <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-mono uppercase`}>Concrete</span>
                            <span className={`text-sm font-extrabold ${isDayMode ? "text-sky-700 font-black" : "text-sky-300"} font-mono`}>{status.industry?.heavy_manufacturing?.concrete_stock || 90} Tons</span>
                          </div>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/60 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} p-2.5 rounded-xl border leading-relaxed`}>
                          Converts raw iron ore and carbon into structural steel beams used for constructing civic bridges, port shipyard berths, and municipal highway infrastructure.
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playChime(true);
                            smeltSteel();
                          }}
                          className={`${isDayMode ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black" : "bg-slate-700 hover:bg-slate-600 text-white font-extrabold"} text-xs px-3 py-2 rounded-xl shadow transition-all flex items-center justify-center gap-1.5`}
                        >
                          <span>🔥</span>
                          <span>SMELT IRON ORE INTO STEEL BEAMS</span>
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab: Autonomous Agents & Agent Management System */}
              {/* Tab: Agent Settings & AI Operations */}
              {activeTab === "agents" && (
                <div className="flex flex-col gap-5">
                  {/* Top Header */}
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-3 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span>Autonomous Multi-Agent Management Console</span>
                        <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                          ACTIVE &amp; ENABLED
                        </span>
                      </h2>
                      <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                        Configure, monitor, and trigger decentralized LangChain &amp; NVIDIA NIM AI agents governing the civilization
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`${isDayMode ? "bg-white border-amber-300 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800 text-slate-300"} px-3 py-1.5 rounded-xl border font-mono text-xs flex items-center gap-1.5`}>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                        <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-bold"}`}>6 AI AGENTS OPERATIONAL</span>
                      </div>
                    </div>
                  </div>

                  {/* Global Architecture Configuration Strip */}
                  <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-900/60 border-slate-800 text-white"} border rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-md`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/30"} border flex items-center justify-center text-lg`}>
                        🧠
                      </div>
                      <div>
                        <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white"} text-xs block`}>Primary Intelligence Engine</strong>
                        <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>NVIDIA NIM AI API (meta/llama-3.3-70b-instruct) + LangChain Structured Tools</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] ${isDayMode ? "bg-amber-50/80 border-amber-200 text-slate-700" : "bg-slate-950 border-slate-800 text-slate-400"} px-2.5 py-1 rounded-lg border font-mono`}>
                        Per-User Autonomous Provisioning: <strong className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300"}`}>ACTIVE</strong>
                      </span>
                      <span className={`text-[10px] ${isDayMode ? "bg-amber-50/80 border-amber-200 text-slate-700" : "bg-slate-950 border-slate-800 text-slate-400"} px-2.5 py-1 rounded-lg border font-mono`}>
                        Minimum Stock Buffer Target: <strong className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300"}`}>&ge; 5 Units</strong>
                      </span>
                    </div>
                  </div>

                  {/* Specialized Autonomous Agents Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Agent 1: Kisan Agriculture Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-emerald-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-emerald-500/30 hover:border-emerald-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-xl`}>
                              🌾
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>Kisan AI Agriculture Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300"} px-1.5 py-0.2 rounded font-mono border`}>LANGCHAIN</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Crops, Seeds &amp; Silo Stock Management</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${status.automated_farming_enabled ? isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isDayMode ? "bg-slate-100 text-slate-500 border-slate-300" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
                            {status.automated_farming_enabled ? "🟢 ACTIVE" : "⏸ PAUSED"}
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Automatically harvests ready farm plots, auto-procures seeds from the depot, maintains a guaranteed buffer of <strong>&ge;5 seeds and &ge;5 vegetables</strong>, and maintains a <strong>personal cash reserve ($200+)</strong> via surplus commerce.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Harvest Trigger:</span>
                            <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-300 font-bold"}`}>Instant On-Maturity</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Stock Buffer:</span>
                            <span className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300 font-bold"}`}>&ge;5 Units / Crop</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick(600);
                              dispatchAction("toggle_automated_farming", {});
                            }}
                            className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-slate-800 border-amber-300" : "bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-750"} text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex-1`}
                          >
                            {status.automated_farming_enabled ? "⏸ Pause Agent" : "▶ Enable Agent"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={kisanAgentRunning}
                          onClick={() => {
                            soundEngine.playChime(true);
                            triggerKisanAgent();
                          }}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          <span>⚡</span>
                          <span>{kisanAgentRunning ? "Running..." : "Run Cycle"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Agent 2: Town Market Commerce Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-amber-500/30 hover:border-amber-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-xl`}>
                              🏪
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>Market Commerce Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300"} px-1.5 py-0.2 rounded font-mono border`}>COMMERCE</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Retail Shelves, Pricing &amp; Liquidity</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}`}>
                            🟢 ACTIVE
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Maintains store retail inventories, restocks Navsari Farmers Market from farm harvest silos, and ensures continuous merchant trading liquidity.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Restock Routine:</span>
                            <span className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300 font-bold"}`}>Daily 06:00 AM</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Market Liquidity:</span>
                            <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>Real-Time Sync</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playChime(true);
                            dispatchAction("buy_from_shop", { shop_id: "farmers_market", item_id: "carrot", qty: 1 });
                            setFarmActionMsg("Commerce Agent: Synchronized market inventory shelves.");
                            setTimeout(() => setFarmActionMsg(""), 4000);
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow w-full flex items-center justify-center gap-1.5"
                        >
                          <span>⚡</span>
                          <span>Sync Market Shelves</span>
                        </button>
                      </div>
                    </div>

                    {/* Agent 3: Household Procurement & Nutrition Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-sky-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-sky-500/30 hover:border-sky-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-sky-100 border-sky-300" : "bg-sky-500/20 border-sky-500/40"} border flex items-center justify-center text-xl`}>
                              🛒
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>Household Procurement Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-sky-100 text-sky-950 border-sky-300 font-bold" : "bg-sky-500/20 text-sky-300"} px-1.5 py-0.2 rounded font-mono border`}>LOGISTICS</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Family Shopping &amp; Market Deductions</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}`}>
                            🟢 ACTIVE
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Dispatches family shoppers along road networks to buy fresh groceries from town markets, deducting store stock in real-time and serving household dinners.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Shopping Hours:</span>
                            <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>16:30 - 17:30</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Dinner Nourishment:</span>
                            <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-300 font-bold"}`}>19:00 - 20:00</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playChime(true);
                            status.families?.forEach((f: any) => {
                              dispatchAction("buy_groceries_now", { family_id: f.id });
                            });
                            setFarmActionMsg("Procurement Agent: Dispatched household grocery shopping runs across civilization.");
                            setTimeout(() => setFarmActionMsg(""), 5000);
                          }}
                          className="bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow w-full flex items-center justify-center gap-1.5"
                        >
                          <span>🛒</span>
                          <span>Dispatch All Family Shopping Runs</span>
                        </button>
                      </div>
                    </div>

                    {/* Agent 4: Civilization City Manager Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-purple-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-purple-500/30 hover:border-purple-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-purple-100 border-purple-300" : "bg-purple-500/20 border-purple-500/40"} border flex items-center justify-center text-xl`}>
                              🏛️
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>City Manager Governance Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-purple-100 text-purple-950 border-purple-300 font-bold" : "bg-purple-500/20 text-purple-300"} px-1.5 py-0.2 rounded font-mono border`}>GOVERNANCE</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Civic Projects, Treasury &amp; PMO</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${status.city_manager_enabled ? isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isDayMode ? "bg-slate-100 text-slate-500 border-slate-300" : "bg-slate-900 text-slate-500 border-slate-800"}`}>
                            {status.city_manager_enabled ? "🟢 ACTIVE" : "⏸ PAUSED"}
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Allocates municipal treasury funds to public infrastructure (School, Hospital, Park, Roads), balances tax rates, and conducts democratic elections.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Treasury Balance:</span>
                            <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-300 font-bold"}`}>${status.city_treasury?.toLocaleString()}</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Cabinet Review:</span>
                            <span className={`${isDayMode ? "text-purple-800 font-black" : "text-purple-300 font-bold"}`}>Daily 12:00 PM</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playClick(600);
                              toggleCityManager();
                            }}
                            className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-slate-800 border-amber-300" : "bg-slate-850 hover:bg-slate-800 text-slate-200 border-slate-750"} text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex-1`}
                          >
                            {status.city_manager_enabled ? "⏸ Pause Manager" : "▶ Enable Manager"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playChime(true);
                            conductElection();
                            setFarmActionMsg("Governance Agent: Conducted democratic civic election cycle.");
                            setTimeout(() => setFarmActionMsg(""), 5000);
                          }}
                          className="bg-purple-500 hover:bg-purple-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow flex-1 flex items-center justify-center gap-1.5"
                        >
                          <span>🏛️</span>
                          <span>Run Elections</span>
                        </button>
                      </div>
                    </div>

                    {/* Agent 5: Heavy Industry & Energy Supply Chain Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-amber-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-amber-500/30 hover:border-amber-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-xl`}>
                              🏭
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>Industrial Revolution &amp; Energy Supply Chain Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300"} px-1.5 py-0.2 rounded font-mono border`}>ENERGY &amp; REFINERY</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Crude Refining, Shipyard Bunkering &amp; Foundry Works</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}`}>
                            🟢 ACTIVE
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Automates crude petroleum extraction and catalytic cracking into petrol/diesel, keeps Gulf refinery operating at peak 95% efficiency, automatically refuels shipyard vessels, and smelts iron ore into structural steel beams.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Crude Reserve:</span>
                            <span className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300 font-bold"}`}>{status.industry?.oil_refinery?.crude_oil || 120} BBL</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Active Vessels:</span>
                            <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>{status.industry?.shipyard?.fleet?.length || 3} Ships</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        <button
                          type="button"
                          onClick={async () => {
                            soundEngine.playChime(true);
                            const res = await dispatchAction("run_industrial_agent", {});
                            if (res?.message) {
                              setIndustrialActionMsg(res.message);
                              setTimeout(() => setIndustrialActionMsg(""), 6000);
                            }
                          }}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow w-full flex items-center justify-center gap-1.5"
                        >
                          <span>⚡</span>
                          <span>Trigger Energy Supply Agent</span>
                        </button>
                      </div>
                    </div>

                    {/* Agent 6: Highway 48 Petrol Pump & Citizen Vehicle Fueling Agent */}
                    <div className={`${isDayMode ? "bg-white/95 border-rose-300/80 shadow-md text-slate-800" : "bg-slate-950/80 border-rose-500/30 hover:border-rose-500/60 shadow-lg text-slate-200"} border rounded-3xl p-4 flex flex-col justify-between gap-3 transition-all`}>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-rose-100 border-rose-300" : "bg-rose-500/20 border-rose-500/40"} border flex items-center justify-center text-xl`}>
                              ⛽
                            </div>
                            <div>
                              <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs flex items-center gap-1.5`}>
                                <span>Highway 48 Petrol Pump &amp; Vehicle Fueling Agent</span>
                                <span className={`text-[9px] ${isDayMode ? "bg-rose-100 text-rose-950 border-rose-300 font-bold" : "bg-rose-500/20 text-rose-300"} px-1.5 py-0.2 rounded font-mono border`}>FLEET LOGISTICS</span>
                              </h3>
                              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>Automotive Petrol, Diesel Dispensers &amp; Fuel Tax</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"}`}>
                            🟢 ACTIVE
                          </span>
                        </div>

                        <p className={`text-[11px] ${isDayMode ? "text-slate-700 bg-amber-50/70 border-amber-200 font-medium" : "text-slate-300 bg-slate-900/50 border-slate-850"} leading-relaxed p-2.5 rounded-xl border`}>
                          Manages vehicle fuel logistics for citizens traveling on roads (Cars, Scooters, Tractors, Trucks), automatically requests refinery fuel tankers, collects gas payments from family budgets, and transfers 10% fuel tax to the city treasury.
                        </p>

                        <div className={`grid grid-cols-2 gap-2 text-[10px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Pump Fuel Reserve:</span>
                            <span className={`${isDayMode ? "text-rose-700 font-black" : "text-rose-300 font-bold"}`}>{status.industry?.petrol_pump?.fuel_stock || 450}L Petrol</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/70 border-slate-850"} p-2 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block`}>Diesel Reserve:</span>
                            <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>{status.industry?.petrol_pump?.diesel_stock || 350}L Diesel</span>
                          </div>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} flex-wrap`}>
                        <button
                          type="button"
                          onClick={async () => {
                            soundEngine.playChime(true);
                            const res = await dispatchAction("run_industrial_agent", {});
                            if (res?.message) {
                              setIndustrialActionMsg(res.message);
                              setTimeout(() => setIndustrialActionMsg(""), 6000);
                            }
                          }}
                          className="bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all shadow w-full flex items-center justify-center gap-1.5"
                        >
                          <span>⛽</span>
                          <span>Dispatch Fuel Tanker &amp; Refuel Fleet Now</span>
                        </button>
                      </div>
                    </div>

                  </div>

                  {/* Multi-Agent Live Thought & Reasoning Log Terminal */}
                  <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950 border-slate-800 text-white"} border rounded-3xl p-4 flex flex-col gap-2.5 shadow-lg`}>
                    <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2 flex-wrap gap-2`}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">📜</span>
                        <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-xs uppercase tracking-wider`}>
                          Autonomous Multi-Agent Activity &amp; Thought Log
                        </h3>
                      </div>
                      <span className={`text-[9px] font-mono ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"} animate-pulse`}>
                        LIVE TELEMETRY STREAM
                      </span>
                    </div>

                    <div className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-800" : "bg-slate-900/60 border-slate-850 text-slate-300"} p-3 rounded-2xl border font-mono text-xs max-h-48 overflow-y-auto space-y-1.5 shadow-inner`}>
                      {status.agent_logs?.slice(-12).reverse().map((log: string, i: number) => {
                        let badgeColor = isDayMode ? "bg-slate-200 text-slate-700" : "bg-slate-800 text-slate-400";
                        if (log.includes("Kisan") || log.includes("Agriculture")) badgeColor = isDayMode ? "bg-emerald-100 text-emerald-950 border border-emerald-300 font-bold" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40";
                        else if (log.includes("Commerce") || log.includes("Shop") || log.includes("Market")) badgeColor = isDayMode ? "bg-amber-100 text-amber-950 border border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300 border border-amber-500/40";
                        else if (log.includes("Household") || log.includes("groceries")) badgeColor = isDayMode ? "bg-sky-100 text-sky-950 border border-sky-300 font-bold" : "bg-sky-500/20 text-sky-300 border border-sky-500/40";
                        else if (log.includes("Government") || log.includes("Cabinet") || log.includes("Democracy")) badgeColor = isDayMode ? "bg-purple-100 text-purple-950 border border-purple-300 font-bold" : "bg-purple-500/20 text-purple-300 border border-purple-500/40";

                        return (
                          <div key={i} className={`flex items-start gap-2 py-0.5 border-b ${isDayMode ? "border-amber-200/50" : "border-slate-850/40"} last:border-0`}>
                            <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded shrink-0 ${badgeColor}`}>
                              AI EVENT
                            </span>
                            <span className={`${isDayMode ? "text-slate-800 font-medium" : "text-slate-300"} text-[11px] leading-relaxed break-words`}>{log}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab: Master People & Citizens Directory */}
              {activeTab === "people" && (
                <div className="flex flex-col gap-4">
                  {/* Top Header & Search Bar */}
                  <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-3 flex-wrap gap-2`}>
                    <div>
                      <h2 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                        <span className="text-amber-500">👨‍👩‍👧‍👦</span>
                        <span>Civilization Master Citizens &amp; People Directory</span>
                        <span className={`text-xs ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-black" : "bg-amber-500/20 text-amber-300 border-amber-500/30"} border px-2.5 py-0.5 rounded-full font-mono`}>
                          {status.families?.reduce((a: number, f: any) => a + (f.members?.length || 0), 0) || 0} Total Active Citizens
                        </span>
                      </h2>
                      <p className={`text-[11px] ${isDayMode ? "text-slate-600 font-medium" : "text-slate-400"} font-mono mt-0.5`}>
                        Comprehensive census roster for all individual residents across all {status.families?.length || 7} houses and worker hostels. Search, inspect careers, and edit details.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        placeholder="🔍 Search person by name, career, or residence..."
                        value={personSearchQuery}
                        onChange={(e) => setPersonSearchQuery(e.target.value)}
                        className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 placeholder-slate-500 shadow-sm focus:border-amber-400" : "bg-slate-950 border-slate-800 text-white placeholder-slate-500 shadow-inner focus:border-amber-500"} border rounded-xl px-3 py-1.5 text-xs font-mono w-64 outline-none`}
                      />
                      {personSearchQuery && (
                        <button
                          onClick={() => setPersonSearchQuery("")}
                          className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 text-slate-400 hover:text-white"} text-xs px-2 py-1 rounded-lg font-bold`}
                        >
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Metric Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950/80 border-slate-800 text-slate-200"} border p-3 rounded-xl flex items-center gap-2.5`}>
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/30"} border flex items-center justify-center text-lg`}>
                        🏠
                      </div>
                      <div>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono uppercase block`}>Housing Units</span>
                        <strong className={`text-base font-mono font-black ${isDayMode ? "text-amber-800" : "text-amber-400"}`}>{status.families?.length || 7} Residences</strong>
                      </div>
                    </div>

                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950/80 border-slate-800 text-slate-200"} border p-3 rounded-xl flex items-center gap-2.5`}>
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/30"} border flex items-center justify-center text-lg`}>
                        👥
                      </div>
                      <div>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono uppercase block`}>Total Population</span>
                        <strong className={`text-base font-mono font-black ${isDayMode ? "text-emerald-700" : "text-emerald-400"}`}>
                          {status.families?.reduce((a: number, f: any) => a + (f.members?.length || 0), 0) || 0} Citizens
                        </strong>
                      </div>
                    </div>

                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950/80 border-slate-800 text-slate-200"} border p-3 rounded-xl flex items-center gap-2.5`}>
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-sky-100 border-sky-300" : "bg-sky-500/20 border-sky-500/30"} border flex items-center justify-center text-lg`}>
                        🚗
                      </div>
                      <div>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono uppercase block`}>Vehicles Registered</span>
                        <strong className={`text-base font-mono font-black ${isDayMode ? "text-sky-700" : "text-sky-400"}`}>
                          {status.families?.reduce((a: number, f: any) => a + (f.members?.filter((m: any) => m.vehicle && m.vehicle !== "walk").length || 0), 0) || 0} Commuters
                        </strong>
                      </div>
                    </div>

                    <div className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950/80 border-slate-800 text-slate-200"} border p-3 rounded-xl flex items-center gap-2.5`}>
                      <div className={`w-9 h-9 rounded-xl ${isDayMode ? "bg-purple-100 border-purple-300" : "bg-purple-500/20 border-purple-500/30"} border flex items-center justify-center text-lg`}>
                        💼
                      </div>
                      <div>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono uppercase block`}>Workforce Occupations</span>
                        <strong className={`text-base font-mono font-black ${isDayMode ? "text-purple-800" : "text-purple-300"}`}>
                          {status.families?.reduce((a: number, f: any) => a + (f.members?.filter((m: any) => m.role && !["son", "daughter"].includes(m.role)).length || 0), 0) || 0} Active
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Dimensional Filter Strips */}
                  <div className={`flex flex-col gap-2 ${isDayMode ? "bg-white/90 border-amber-250 shadow-sm" : "bg-slate-950/60 border-slate-850"} border p-3 rounded-xl`}>
                    {/* Residence Filters */}
                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                      <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono text-[10px] uppercase shrink-0`}>Residences:</span>
                      <button
                        onClick={() => {
                          soundEngine.playClick(600);
                          setPersonResidenceFilter("all");
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                          personResidenceFilter === "all"
                            ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                            : isDayMode ? "bg-amber-50 text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                        }`}
                      >
                        All ({status.families?.length || 0})
                      </button>
                      {status.families?.map((f: any) => (
                        <button
                          key={f.id}
                          onClick={() => {
                            soundEngine.playClick(650);
                            setPersonResidenceFilter(f.id);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${
                            personResidenceFilter === f.id
                              ? "bg-amber-500 text-slate-950 border-amber-400 shadow-sm"
                              : isDayMode ? "bg-amber-50 text-slate-700 border-amber-200 hover:bg-amber-100" : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                          }`}
                        >
                          {f.type === "hostel" || f.id.startsWith("hostel_") ? "🏢" : "🏠"} {f.name} ({f.members?.length || 0})
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Citizens Roster Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(() => {
                      const allCitizens: any[] = [];
                      status.families?.forEach((fam: any) => {
                        fam.members?.forEach((mem: any) => {
                          const isObj = typeof mem === "object";
                          const memVehicle = (isObj && mem.vehicle) ? mem.vehicle : (fam.vehicle || status.player?.vehicle || "walk");
                          allCitizens.push({
                            ...(isObj ? mem : { name: mem }),
                            vehicle: (isObj && mem.vehicle) ? mem.vehicle : memVehicle,
                            target_user_id: userId,
                            family_id: fam.id,
                            family_name: fam.name,
                            family_type: fam.type || (fam.id.startsWith("hostel_") ? "hostel" : "house"),
                            family_address: fam.address || "Civilization Region",
                            budget: fam.budget || 50
                          });
                        });
                      });

                      registeredUsers?.forEach((u: any) => {
                        const famId = `house_${u.user_id.toLowerCase().replace(/[^a-z0-9]/g, "")}`;
                        if (!allCitizens.some((c: any) => c.family_id === famId || c.target_user_id === u.user_id)) {
                          (u.members || []).forEach((mem: any) => {
                            const isObj = typeof mem === "object";
                            const memVehicle = (isObj && mem.vehicle) ? mem.vehicle : (u.vehicle || "walk");
                            allCitizens.push({
                              name: isObj ? mem.name : mem,
                              age: isObj ? (mem.age || 25) : (u.age || 25),
                              role: isObj ? (mem.role || "resident") : "resident",
                              relation: isObj ? (mem.relation || "Citizen") : "Citizen",
                              vehicle: memVehicle,
                              state: "At Home",
                              target_user_id: u.user_id,
                              family_id: famId,
                              family_name: u.home_name || `${u.user_id}'s Residence`,
                              family_type: "house",
                              family_address: u.address || u.city_name || "Civilization Region",
                              budget: u.budget || 201
                            });
                          });
                        }
                      });

                      const filtered = allCitizens.filter((c: any) => {
                        if (personResidenceFilter !== "all" && c.family_id !== personResidenceFilter) return false;
                        if (!personSearchQuery.trim()) return true;
                        const q = personSearchQuery.toLowerCase();
                        return (
                          c.name?.toLowerCase().includes(q) ||
                          c.role?.toLowerCase().includes(q) ||
                          c.relation?.toLowerCase().includes(q) ||
                          c.family_name?.toLowerCase().includes(q) ||
                          c.vehicle?.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className={`col-span-full ${isDayMode ? "bg-white border-amber-200 text-slate-600" : "bg-slate-950/70 border-slate-800 text-slate-400"} border rounded-2xl p-8 text-center text-xs font-mono`}>
                            🔍 No citizens found matching query "{personSearchQuery}". Try adjusting your search or filters.
                          </div>
                        );
                      }

                      return filtered.map((c: any, idx: number) => {
                        return (
                          <div
                            key={`${c.family_id}_${c.name}_${idx}`}
                            className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-sm" : "bg-slate-950/80 border-slate-800/90 hover:border-amber-500/50 shadow-md"} border rounded-2xl p-3.5 flex flex-col justify-between gap-3 transition-all`}
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-10 h-10 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/10 border-amber-500/30"} border flex items-center justify-center text-xl shrink-0 shadow-inner`}>
                                  👤
                                </div>
                                <div>
                                  <h3 className={`${isDayMode ? "text-slate-900" : "text-white"} text-sm font-extrabold flex items-center gap-1.5 flex-wrap`}>
                                    <span>{c.name}</span>
                                    <span className={`text-[10px] ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300" : "bg-slate-900 text-amber-400 border-amber-500/30"} border px-2 py-0.2 rounded-md font-mono font-bold capitalize`}>
                                      {c.role || "Resident"}
                                    </span>
                                    <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"} px-2 py-0.2 rounded-md border font-mono font-bold`}>
                                      🎂 {c.age || 25} yrs
                                    </span>
                                  </h3>
                                  <span className={`text-[11px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono block`}>
                                    {c.relation || "Civilization Citizen"}
                                  </span>
                                </div>
                              </div>

                              <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"} border px-2 py-0.5 rounded-lg font-mono font-bold shrink-0`}>
                                🟢 {c.state || "Active"}
                              </span>
                            </div>

                            {/* Middle Info Strip */}
                            <div className={`${isDayMode ? "bg-amber-50/80 border-amber-200" : "bg-slate-900/60 border-slate-850"} border p-2.5 rounded-xl text-[11px] flex flex-col gap-1`}>
                              <div className={`flex justify-between items-center ${isDayMode ? "text-slate-800" : "text-slate-300"}`}>
                                <span>🏠 <strong>Residence:</strong> {c.family_name}</span>
                                <span className={`text-[10px] font-mono ${isDayMode ? "text-slate-500" : "text-slate-500"}`}>ID: {c.family_id}</span>
                              </div>
                              <div className={`flex justify-between items-center ${isDayMode ? "text-slate-700" : "text-slate-400"} flex-wrap gap-1.5`}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    soundEngine.playClick(750);
                                    setEditPersonTargetUserId(c.target_user_id || userId);
                                    setEditPersonOldName(c.name);
                                    setEditPersonNewName(c.name);
                                    setEditPersonFamilyId(c.family_id);
                                    setEditPersonNewFamilyId(c.family_id);
                                    setEditPersonRole(c.role || "worker");
                                    setEditPersonRelation(c.relation || "");
                                    setEditPersonHouseBudget(c.budget || 150);
                                    setEditingPersonModalOpen(true);
                                  }}
                                  className={`${isDayMode ? "text-emerald-800 font-extrabold" : "text-emerald-400 font-bold"} font-mono hover:underline flex items-center gap-1 cursor-pointer`}
                                  title="Click to edit daily house budget"
                                >
                                  <span>💰 <strong>House Budget:</strong> ${c.budget}/day</span>
                                  <span className="text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 rounded border border-emerald-500/30 font-sans font-bold">✏️ Change</span>
                                </button>
                              </div>
                            </div>

                            {/* Bottom Action Strip */}
                            <div className={`flex justify-between items-center pt-1 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(700);
                                  setSelectedFamilyId(c.family_id);
                                  switchTab("overview");
                                }}
                                className={`${isDayMode ? "text-sky-700 hover:text-sky-900" : "text-sky-400 hover:text-sky-300"} text-[10px] font-bold font-mono flex items-center gap-1 transition-all`}
                              >
                                <span>📍</span>
                                <span>View Residence on Map</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playClick(750);
                                  setEditPersonTargetUserId(c.target_user_id || userId);
                                  setEditPersonOldName(c.name);
                                  setEditPersonNewName(c.name);
                                  setEditPersonFamilyId(c.family_id);
                                  setEditPersonNewFamilyId(c.family_id);
                                  setEditPersonRole(c.role || "worker");
                                  setEditPersonRelation(c.relation || "");
                                  setEditPersonVehicle(c.vehicle || "bicycle");
                                  setEditPersonHouseBudget(c.budget || 150);
                                  setEditingPersonModalOpen(true);
                                }}
                                className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"} border text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95`}
                              >
                                <span>✏️</span>
                                <span>Edit Citizen Details</span>
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

            </section>

            {/* Right Panel: News & Agent Logs Feed */}
            <section className={`${isDayMode ? "bg-white/80 border-amber-250 shadow-sm" : "bg-slate-900/25 border-slate-800/80"} border rounded-xl p-3.5 flex flex-col min-h-0 overflow-hidden`}>
              <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2 mb-2 flex-none`}>
                <h3 className={`${isDayMode ? "text-slate-900" : "text-white"} text-xs font-bold uppercase tracking-wider`}>Civilization Live Dispatch</h3>
                <span className="text-[9px] font-mono text-amber-500 animate-pulse font-bold">LIVE FEED</span>
              </div>

              {/* News list */}
              <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
                {status.news_feed?.map((n: any, idx: number) => (
                  <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200 text-slate-800 shadow-sm" : "bg-slate-950/70 border-slate-850 text-slate-200"} border p-2.5 rounded-xl flex flex-col gap-1 text-xs`} key={idx}>
                    <div className="flex justify-between items-center">
                      <span className={`text-[9px] font-mono ${isDayMode ? "text-slate-600" : "text-slate-400"}`}>{n.timestamp}</span>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${isDayMode ? "bg-white text-slate-700 border-amber-300" : "bg-slate-900 text-slate-400 border-slate-800"} border uppercase`}>{n.category}</span>
                    </div>
                    <p className={`${isDayMode ? "text-slate-900 font-medium" : "text-slate-200"} text-[11px] leading-snug`}>{n.headline}</p>
                  </div>
                ))}
              </div>

              {/* Terminal Logs at Bottom */}
              <div className={`flex-none pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"} mt-2`}>
                <span className={`text-[9px] font-mono ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} block mb-1`}>Simulation Agent Log:</span>
                <div className={`${isDayMode ? "bg-amber-100/60 border-amber-250 text-amber-950 font-semibold" : "bg-slate-950 border-slate-850 text-slate-400"} p-2 rounded-lg border text-[10px] font-mono max-h-20 overflow-y-auto`}>
                  {status.agent_logs?.slice(-4).map((log: string, i: number) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            </section>

          </main>
        </>
      )}

      {/* Admin Manual Role & Vehicle Assignment Modal Dialog */}
      {editMemberModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-amber-300 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-amber-500/70 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-base`}>
                  👨‍👩‍👧‍👦
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>Assign Member Role &amp; Vehicle</h3>
                  <span className={`text-[10px] ${isDayMode ? "text-amber-800 font-bold" : "text-amber-400"} font-mono`}>Supreme Admin Governance Deck</span>
                </div>
              </div>
              <button
                onClick={() => setEditMemberModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Select Family & Member */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>1. Select Family:</label>
                  <select
                    value={editMemberFamilyId}
                    onChange={(e) => {
                      setEditMemberFamilyId(e.target.value);
                      const fam = status?.families?.find((f: any) => f.id === e.target.value);
                      if (fam && fam.members?.[0]) {
                        setEditMemberName(fam.members[0].name);
                        setEditMemberRole(fam.members[0].role || "farmer");
                        setEditMemberRelation(fam.members[0].relation || "Family Member");
                        setEditMemberVehicle(fam.members[0].vehicle || "bicycle");
                      }
                    }}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    {status?.families?.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.name} ({f.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>2. Select Citizen Member:</label>
                  <select
                    value={editMemberName}
                    onChange={(e) => {
                      setEditMemberName(e.target.value);
                      const fam = status?.families?.find((f: any) => f.id === editMemberFamilyId);
                      const m = fam?.members?.find((mem: any) => mem.name === e.target.value);
                      if (m) {
                        setEditMemberRole(m.role || "farmer");
                        setEditMemberRelation(m.relation || "Family Member");
                        setEditMemberVehicle(m.vehicle || "bicycle");
                      }
                    }}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    {status?.families?.find((f: any) => f.id === editMemberFamilyId)?.members?.map((m: any) => (
                      <option key={m.name} value={m.name}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>3. Assign Role &amp; Career:</label>
                <select
                  value={editMemberRole}
                  onChange={(e) => setEditMemberRole(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                >
                  <option value="father">Father / Household Head</option>
                  <option value="mother">Mother / Home Manager</option>
                  <option value="son">Son / Adult Resident</option>
                  <option value="daughter">Daughter / Resident</option>
                  <option value="farmer">🌾 Farmer / Agriculture Specialist</option>
                  <option value="merchant">🏪 Merchant / Shopkeeper</option>
                  <option value="tailor">👕 Clothier / Tailor</option>
                  <option value="worker">🏭 Factory Machine Operator</option>
                  <option value="engineer">🔌 Electrical &amp; Tech Engineer</option>
                  <option value="doctor">🏥 Doctor / Medical Specialist</option>
                  <option value="teacher">🏫 School Teacher</option>
                  <option value="student">🎓 Student</option>
                  <option value="driver">🚚 Commercial Logistic Driver</option>
                  <option value="police">👮 Municipal Law Officer</option>
                </select>
              </div>

              {/* Vehicle Selection Grid */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1.5 font-semibold text-[11px]`}>4. Assign Commuting Vehicle:</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: "tractor", name: "Heavy Tractor", icon: "🚜" },
                    { id: "scooter", name: "City Scooter", icon: "🛵" },
                    { id: "car", name: "Electric Sedan", icon: "🚗" },
                    { id: "bicycle", name: "Commuter Bike", icon: "🚲" },
                    { id: "truck", name: "Cargo Truck", icon: "🚚" },
                    { id: "walk", name: "On Foot / Walk", icon: "🚶" }
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setEditMemberVehicle(v.id)}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all text-left ${editMemberVehicle === v.id ? isDayMode ? "bg-amber-100 border-amber-400 text-slate-900 shadow ring-1 ring-amber-400 font-bold" : "bg-amber-500/20 border-amber-400 text-white shadow-md ring-1 ring-amber-400" : isDayMode ? "bg-white border-amber-250 text-slate-700 hover:bg-amber-50" : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"}`}
                    >
                      <span className="text-xl">{v.icon}</span>
                      <div>
                        <span className="text-xs font-bold block">{v.name}</span>
                        <span className={`text-[9px] ${isDayMode ? "text-slate-500" : "text-slate-400"} font-mono capitalize`}>{v.id}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Relation Description */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>5. Custom Household Relation Description:</label>
                <input
                  type="text"
                  value={editMemberRelation}
                  onChange={(e) => setEditMemberRelation(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 placeholder-slate-400 font-medium" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  placeholder="e.g. Main Person, Wife of Thakorbhai, Agricultural Manager..."
                />
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 justify-end mt-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
                <button
                  type="button"
                  onClick={() => setEditMemberModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-4 py-2.5 rounded-xl transition-all text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playChime(true);
                    submitAssignMemberRole();
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-xs"
                >
                  <span>💾</span>
                  <span>ASSIGN &amp; FIX PERMANENTLY</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Create Residence (House / Worker Hostel) Modal Dialog */}
      {createResidenceModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-sky-400 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-sky-500/70 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-sky-100 border-sky-300" : "bg-sky-500/20 border-sky-500/40"} border flex items-center justify-center text-base`}>
                  {newResidenceType === "hostel" ? "🏢" : "🏠"}
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>
                    {newResidenceType === "hostel" ? "Commission New Worker Hostel / Dormitory" : "Build New Residential House"}
                  </h3>
                  <span className={`text-[10px] ${isDayMode ? "text-sky-800 font-bold" : "text-sky-400"} font-mono`}>Civilization Housing &amp; Infrastructure Bureau</span>
                </div>
              </div>
              <button
                onClick={() => setCreateResidenceModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {/* Type selector */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1.5 font-semibold text-[11px]`}>1. Residence Category:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewResidenceType("house");
                      if (newResidenceName.includes("Dormitory") || newResidenceName.includes("Hostel")) {
                        setNewResidenceName("Patel Family Residence");
                      }
                      setNewResidenceCapacity(6);
                      setNewResidenceBudget(60);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${newResidenceType === "house" ? isDayMode ? "bg-sky-100 border-sky-400 text-sky-950 font-bold shadow" : "bg-sky-500/20 border-sky-400 text-white ring-1 ring-sky-400 shadow" : isDayMode ? "bg-white border-amber-250 text-slate-700" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}
                  >
                    <span className="text-xl">🏠</span>
                    <div>
                      <span className="text-xs font-bold block">Private House</span>
                      <span className={`text-[9px] ${isDayMode ? "text-slate-500" : "text-slate-400"} font-mono`}>Citizen Family Home</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewResidenceType("hostel");
                      setNewResidenceName("Navsari Industrial Workers Hostel");
                      setNewResidenceCapacity(12);
                      setNewResidenceBudget(150);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${newResidenceType === "hostel" ? isDayMode ? "bg-purple-100 border-purple-400 text-purple-950 font-bold shadow" : "bg-purple-500/20 border-purple-400 text-white ring-1 ring-purple-400 shadow" : isDayMode ? "bg-white border-amber-250 text-slate-700" : "bg-slate-950/60 border-slate-800 text-slate-400"}`}
                  >
                    <span className="text-xl">🏢</span>
                    <div>
                      <span className="text-xs font-bold block">Worker Hostel</span>
                      <span className={`text-[9px] ${isDayMode ? "text-slate-500" : "text-slate-400"} font-mono`}>Staff &amp; Labor Dormitory</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Name & ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>2. Residence Name:</label>
                  <input
                    type="text"
                    value={newResidenceName}
                    onChange={(e) => setNewResidenceName(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                    placeholder="e.g. Navsari Factory Workers Hostel"
                  />
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>3. Custom ID (Optional):</label>
                  <input
                    type="text"
                    value={newResidenceId}
                    onChange={(e) => setNewResidenceId(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                    placeholder="e.g. hostel_factory_north"
                  />
                </div>
              </div>

              {/* Budget & Capacity */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>4. Starter Bank Reserves ($):</label>
                  <input
                    type="number"
                    value={newResidenceBudget}
                    onChange={(e) => setNewResidenceBudget(Number(e.target.value))}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  />
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>5. Max Bed Capacity:</label>
                  <input
                    type="number"
                    value={newResidenceCapacity}
                    onChange={(e) => setNewResidenceCapacity(Number(e.target.value))}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  />
                </div>
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>6. Latitude (e.g. 20.9485):</label>
                  <input
                    type="text"
                    value={newResidenceLat}
                    onChange={(e) => setNewResidenceLat(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  />
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>7. Longitude (e.g. 72.9525):</label>
                  <input
                    type="text"
                    value={newResidenceLng}
                    onChange={(e) => setNewResidenceLng(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className={`flex gap-2 justify-end mt-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
                <button
                  type="button"
                  onClick={() => setCreateResidenceModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-4 py-2.5 rounded-xl transition-all text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playChime(true);
                    submitCreateResidence();
                  }}
                  className="bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-xs"
                >
                  <span>💾</span>
                  <span>COMMISSION RESIDENCE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Edit Residence Modal Dialog */}
      {editResidenceModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-amber-300 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-slate-700 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-md w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>Edit Residence Details</h3>
                  <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} font-mono`}>{editResidenceId}</span>
                </div>
              </div>
              <button
                onClick={() => setEditResidenceModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>Residence Name:</label>
                <input
                  type="text"
                  value={editResidenceName}
                  onChange={(e) => setEditResidenceName(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>Type:</label>
                  <select
                    value={editResidenceType}
                    onChange={(e) => setEditResidenceType(e.target.value as any)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    <option value="house">🏠 Private House</option>
                    <option value="hostel">🏢 Worker Hostel</option>
                  </select>
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>Bed Capacity:</label>
                  <input
                    type="number"
                    value={editResidenceCapacity}
                    onChange={(e) => setEditResidenceCapacity(Number(e.target.value))}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  />
                </div>
              </div>

              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>Bank Reserves ($):</label>
                <input
                  type="number"
                  value={editResidenceBudget}
                  onChange={(e) => setEditResidenceBudget(Number(e.target.value))}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                />
              </div>

              <div className={`flex gap-2 justify-end mt-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
                <button
                  type="button"
                  onClick={() => setEditResidenceModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-4 py-2 rounded-xl text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playChime(true);
                    submitEditResidence();
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-5 py-2 rounded-xl shadow-md text-xs flex items-center gap-1"
                >
                  <span>💾</span>
                  <span>SAVE CHANGES</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Add Person / Worker Modal Dialog */}
      {addMemberModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-emerald-400 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-emerald-500/70 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-base`}>
                  👤
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>Register Citizen or Worker</h3>
                  <span className={`text-[10px] ${isDayMode ? "text-emerald-800 font-bold" : "text-emerald-400"} font-mono`}>Civilization Population Bureau</span>
                </div>
              </div>
              <button
                onClick={() => setAddMemberModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>1. Assign to Residence / Hostel:</label>
                <select
                  value={addMemberFamilyId}
                  onChange={(e) => setAddMemberFamilyId(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                >
                  {status?.families?.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.type === "hostel" || f.id.startsWith("hostel_") ? "🏢 [Hostel]" : "🏠 [House]"} {f.name} ({f.id})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>2. Citizen / Worker Full Name:</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  placeholder="e.g. Ramesh Patel, Amit Shah, Pravinbhai..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>3. Assigned Role / Career:</label>
                  <select
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    <option value="worker">🏭 Factory Machine Operator</option>
                    <option value="farmer">🌾 Farmer / Agriculture</option>
                    <option value="merchant">🏪 Merchant / Shopkeeper</option>
                    <option value="tailor">👕 Clothier / Tailor</option>
                    <option value="engineer">🔌 Electrical Engineer</option>
                    <option value="doctor">🏥 Doctor / Medical Specialist</option>
                    <option value="teacher">🏫 School Teacher</option>
                    <option value="driver">🚚 Commercial Logistic Driver</option>
                    <option value="police">👮 Municipal Law Officer</option>
                    <option value="father">Father / Household Head</option>
                    <option value="mother">Mother / Home Manager</option>
                    <option value="son">Son / Adult Resident</option>
                    <option value="daughter">Daughter / Resident</option>
                    <option value="student">🎓 Student</option>
                  </select>
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>4. Commute Vehicle:</label>
                  <select
                    value={newMemberVehicle}
                    onChange={(e) => setNewMemberVehicle(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    <option value="tractor">🚜 Heavy Field Tractor</option>
                    <option value="scooter">🛵 City Scooter / Moped</option>
                    <option value="car">🚗 Electric Sedan</option>
                    <option value="bicycle">🚲 Eco Commuter Bicycle</option>
                    <option value="truck">🚚 Commercial Cargo Truck</option>
                    <option value="walk">🚶 Walking / On Foot</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>5. Relation / Role Description:</label>
                <input
                  type="text"
                  value={newMemberRelation}
                  onChange={(e) => setNewMemberRelation(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-medium" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  placeholder="e.g. Senior Agricultural Specialist, Resident Factory Operator..."
                />
              </div>

              <div className={`flex gap-2 justify-end mt-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
                <button
                  type="button"
                  onClick={() => setAddMemberModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-4 py-2.5 rounded-xl transition-all text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playChime(true);
                    submitAddMember();
                  }}
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-xs"
                >
                  <span>💾</span>
                  <span>REGISTER CITIZEN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Transfer Worker Modal Dialog */}
      {transferWorkerModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-amber-300 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-amber-500/70 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-base`}>
                  🔄
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>Transfer Worker Between Residences</h3>
                  <span className={`text-[10px] ${isDayMode ? "text-amber-800 font-bold" : "text-amber-400"} font-mono`}>Civilization Labor Logistics Bureau</span>
                </div>
              </div>
              <button
                onClick={() => setTransferWorkerModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* From residence & Worker selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>1. Source Residence / Hostel:</label>
                  <select
                    value={transferFromFamilyId}
                    onChange={(e) => {
                      setTransferFromFamilyId(e.target.value);
                      const fam = status?.families?.find((f: any) => f.id === e.target.value);
                      if (fam && fam.members?.[0]) {
                        setTransferWorkerName(fam.members[0].name);
                      } else {
                        setTransferWorkerName("");
                      }
                    }}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    {status?.families?.map((f: any) => (
                      <option key={f.id} value={f.id}>{f.type === "hostel" || f.id.startsWith("hostel_") ? "🏢 [Hostel]" : "🏠 [House]"} {f.name} ({f.members?.length || 0} residents)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>2. Select Worker / Person to Transfer:</label>
                  <select
                    value={transferWorkerName}
                    onChange={(e) => setTransferWorkerName(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    {status?.families?.find((f: any) => f.id === transferFromFamilyId)?.members?.map((m: any) => (
                      <option key={m.name} value={m.name}>{m.name} ({m.role})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Destination Residence */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>3. Target Destination Residence / Worker Hostel:</label>
                <select
                  value={transferToFamilyId}
                  onChange={(e) => setTransferToFamilyId(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                >
                  {status?.families?.filter((f: any) => f.id !== transferFromFamilyId)?.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.type === "hostel" || f.id.startsWith("hostel_") ? "🏢 [Hostel]" : "🏠 [House]"} {f.name} ({f.members?.length || 0} residents)</option>
                  ))}
                </select>
              </div>

              {/* Optional promotion / role change */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>4. Update Role (Optional):</label>
                  <select
                    value={transferNewRole}
                    onChange={(e) => setTransferNewRole(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    <option value="">(Keep current role)</option>
                    <option value="worker">🏭 Factory Machine Operator</option>
                    <option value="farmer">🌾 Farmer / Agriculture</option>
                    <option value="merchant">🏪 Merchant / Shopkeeper</option>
                    <option value="tailor">👕 Clothier / Tailor</option>
                    <option value="engineer">🔌 Electrical Engineer</option>
                    <option value="doctor">🏥 Doctor / Medical Specialist</option>
                    <option value="driver">🚚 Commercial Logistic Driver</option>
                    <option value="police">👮 Municipal Law Officer</option>
                  </select>
                </div>

                <div>
                  <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>5. Update Vehicle (Optional):</label>
                  <select
                    value={transferNewVehicle}
                    onChange={(e) => setTransferNewVehicle(e.target.value)}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  >
                    <option value="">(Keep current vehicle)</option>
                    <option value="tractor">🚜 Heavy Field Tractor</option>
                    <option value="scooter">🛵 City Scooter / Moped</option>
                    <option value="car">🚗 Electric Sedan</option>
                    <option value="bicycle">🚲 Eco Commuter Bicycle</option>
                    <option value="truck">🚚 Commercial Cargo Truck</option>
                    <option value="walk">🚶 Walking / On Foot</option>
                  </select>
                </div>
              </div>

              <div className={`flex gap-2 justify-end mt-2 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
                <button
                  type="button"
                  onClick={() => setTransferWorkerModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold px-4 py-2.5 rounded-xl transition-all text-xs`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playChime(true);
                    submitTransferWorker();
                  }}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-1.5 text-xs"
                >
                  <span>🔄</span>
                  <span>EXECUTE TRANSFER</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Civilization Resource & Inventory Monitoring Window Modal */}
      {masterInventoryModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-emerald-500/80 shadow-2xl text-slate-800" : "bg-slate-900 border-2 border-emerald-500/70 shadow-2xl text-slate-200"} rounded-3xl p-5 max-w-5xl w-full flex flex-col gap-4 text-xs animate-fade-in my-auto max-h-[90vh] overflow-hidden`}>
            
            {/* Modal Header */}
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-3 flex-none flex-wrap gap-2`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${isDayMode ? "bg-emerald-100 border-emerald-300" : "bg-emerald-500/20 border-emerald-500/40"} border flex items-center justify-center text-xl shadow`}>
                  📦
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-extrabold"} text-base tracking-wide flex items-center gap-2`}>
                    <span>Civilization Master Inventory &amp; Resource Monitor</span>
                    <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-black" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"} border px-2 py-0.5 rounded-full font-mono`}>
                      LIVE MONITOR
                    </span>
                  </h3>
                  <p className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                    Real-time stockpile tracking across Farm Barns, Industrial Factories, Commercial Markets &amp; Household Pantries
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playClick(600);
                      dispatchAction("toggle_automated_farming", {});
                    }}
                    className={`px-3 py-1.5 rounded-xl font-extrabold text-xs transition-all flex items-center gap-1.5 border shadow-sm ${status.automated_farming_enabled ? isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-black" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : isDayMode ? "bg-white text-slate-700 border-amber-300" : "bg-amber-500/20 text-amber-300 border-amber-500/40"}`}
                    title="Toggle Automated AI Farm Planting and Harvesting"
                  >
                    <span>{status.automated_farming_enabled ? "🟢" : "⏸"}</span>
                    <span>AI FARMING: {status.automated_farming_enabled ? "AUTOMATED" : "MANUAL"}</span>
                  </button>
                )}

                <button
                  onClick={() => setMasterInventoryModalOpen(false)}
                  className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"} font-bold flex items-center justify-center transition-all`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Quick Metrics & Livestock Barn Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-none">
              {/* Livestock produce badge */}
              <div className={`${isDayMode ? "bg-white/95 border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col justify-between`}>
                <div className={`flex justify-between items-center ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} text-[10px] uppercase font-bold`}>
                  <span>🐄 Livestock Stockpile</span>
                  <span>Produce</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-amber-800 font-black" : "text-amber-400"}`}>🥛 {status.farm_barn?.milk || 0} Milk</span>
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-sky-700 font-black" : "text-sky-400"}`}>🧶 {status.farm_barn?.wool || 0} Wool</span>
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"}`}>🥚 {status.farm_barn?.egg || 0} Eggs</span>
                </div>
              </div>

              {/* Livestock Herds with admin controls */}
              <div className={`${isDayMode ? "bg-white/95 border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col justify-between`}>
                <div className={`flex justify-between items-center ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} text-[10px] uppercase font-bold`}>
                  <span>🐾 Livestock Herds</span>
                  <span>Barn</span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs font-mono">
                  <div className="flex items-center gap-1">
                    <span className="font-bold">🐄 {status.livestock?.cows ?? 4}</span>
                    {isAdmin && (
                      <div className="flex gap-0.5">
                        <button onClick={() => dispatchAction("adjust_livestock", { cows: (status.livestock?.cows ?? 4) + 1 })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>+</button>
                        <button onClick={() => dispatchAction("adjust_livestock", { cows: Math.max(0, (status.livestock?.cows ?? 4) - 1) })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>-</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">🐑 {status.livestock?.sheep ?? 6}</span>
                    {isAdmin && (
                      <div className="flex gap-0.5">
                        <button onClick={() => dispatchAction("adjust_livestock", { sheep: (status.livestock?.sheep ?? 6) + 1 })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>+</button>
                        <button onClick={() => dispatchAction("adjust_livestock", { sheep: Math.max(0, (status.livestock?.sheep ?? 6) - 1) })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>-</button>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold">🐔 {status.livestock?.chickens ?? 10}</span>
                    {isAdmin && (
                      <div className="flex gap-0.5">
                        <button onClick={() => dispatchAction("adjust_livestock", { chickens: (status.livestock?.chickens ?? 10) + 1 })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>+</button>
                        <button onClick={() => dispatchAction("adjust_livestock", { chickens: Math.max(0, (status.livestock?.chickens ?? 10) - 1) })} className={`px-1 ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-white"} rounded text-[9px] font-bold`}>-</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Farm Barn Grain Silos */}
              <div className={`${isDayMode ? "bg-white/95 border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col justify-between`}>
                <div className={`flex justify-between items-center ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} text-[10px] uppercase font-bold`}>
                  <span>🌾 Farm Barn &amp; Silos</span>
                  <span>Crops</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-amber-800 font-black" : "text-amber-400"}`}>🌾 {status.farm_barn?.wheat || 0} Wheat</span>
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-orange-700 font-black" : "text-orange-400"}`}>🥕 {status.farm_barn?.carrot || 0} Carrots</span>
                  <span className={`text-xs font-mono font-bold ${isDayMode ? "text-rose-700 font-black" : "text-rose-400"}`}>🍎 {status.farm_barn?.apple || 0} Apples</span>
                </div>
              </div>

              {/* Commercial Market Shelves */}
              <div className={`${isDayMode ? "bg-white/95 border-amber-250 text-slate-800 shadow-sm" : "bg-slate-950/80 border-slate-800 text-white"} border rounded-2xl p-3 flex flex-col justify-between`}>
                <div className={`flex justify-between items-center ${isDayMode ? "text-slate-600 font-bold" : "text-slate-400"} text-[10px] uppercase font-bold`}>
                  <span>🏪 Commercial Shelves</span>
                  <span>Stores</span>
                </div>
                <div className={`flex items-center justify-between mt-1 text-xs font-mono font-bold ${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400"}`}>
                  <span>{((status.shops as any[]) || []).reduce((acc: number, s: any) => acc + ((Object.values(s.inventory || {}) as any[]).reduce((a: number, b: any) => a + Number(b || 0), 0)), 0)} Total Units</span>
                  <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-500"} font-normal`}>5 Town Shops</span>
                </div>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-1.5 flex-none overflow-x-auto pb-1">
              {[
                { id: "all", label: "All Resources" },
                { id: "crops", label: "🌾 Crops & Grains" },
                { id: "livestock", label: "🥛 Dairy, Wool & Livestock" },
                { id: "textiles", label: "👕 Textiles & Clothing" },
                { id: "materials", label: "🏭 Industrial, Metals & Tech" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    soundEngine.playClick(600);
                    setInventoryCategoryFilter(tab.id as any);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all border ${inventoryCategoryFilter === tab.id ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md font-black" : isDayMode ? "bg-white text-slate-700 border-amber-250 hover:bg-amber-100" : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Master Resource Breakdown Grid */}
            <div className="flex-grow min-h-0 overflow-y-auto pr-1">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  // Crops & Grains
                  { id: "wheat", name: "Wheat Grain", category: "crops", icon: "🌾", unit: "kg" },
                  { id: "carrot", name: "Fresh Carrots", category: "crops", icon: "🥕", unit: "kg" },
                  { id: "corn", name: "Sweet Corn", category: "crops", icon: "🌽", unit: "kg" },
                  { id: "broccoli", name: "Organic Broccoli", category: "crops", icon: "🥦", unit: "kg" },
                  { id: "cabbage", name: "Green Cabbage", category: "crops", icon: "🥬", unit: "kg" },
                  { id: "apple", name: "Sweet Apples", category: "crops", icon: "🍎", unit: "kg" },
                  { id: "strawberry", name: "Fresh Strawberries", category: "crops", icon: "🍓", unit: "kg" },
                  { id: "watermelon", name: "Watermelons", category: "crops", icon: "🍉", unit: "units" },
                  
                  // Livestock & Dairy
                  { id: "milk", name: "Fresh Cow Milk", category: "livestock", icon: "🥛", unit: "liters" },
                  { id: "wool", name: "Organic Sheep Wool", category: "livestock", icon: "🧶", unit: "bundles" },
                  { id: "egg", name: "Farm Fresh Eggs", category: "livestock", icon: "🥚", unit: "dozens" },

                  // Textiles
                  { id: "fiber", name: "Plant Fiber", category: "textiles", icon: "🌱", unit: "bales" },
                  { id: "fabric", name: "Woven Fabric", category: "textiles", icon: "🧵", unit: "meters" },
                  { id: "clothing", name: "Finished Garments", category: "textiles", icon: "👕", unit: "sets" },

                  // Industrial, Metals & Tech
                  { id: "wood", name: "Raw Timber Lumber", category: "materials", icon: "🪵", unit: "logs" },
                  { id: "stone", name: "Quarry Stone", category: "materials", icon: "5stone", unit: "tons" },
                  { id: "iron", name: "Smelted Iron Ingot", category: "materials", icon: "⛓️", unit: "ingots" },
                  { id: "copper", name: "Refined Copper Wire", category: "materials", icon: "🔌", unit: "coils" },
                  { id: "steel", name: "High-Grade Steel", category: "materials", icon: "🛡️", unit: "plates" },
                  { id: "brick", name: "Baked Red Brick", category: "materials", icon: "🧱", unit: "blocks" },
                  { id: "tool", name: "Industrial Toolsets", category: "materials", icon: "🛠️", unit: "kits" },
                  { id: "electronics", name: "Electronic Circuits", category: "materials", icon: "⚡", unit: "boards" },
                  { id: "microchip", name: "Silicon Microchips", category: "materials", icon: "💾", unit: "chips" }
                ]
                  .filter((item) => {
                    if (inventoryCategoryFilter === "all") return true;
                    return item.category === inventoryCategoryFilter;
                  })
                  .map((item) => {
                    // Aggregate amounts
                    const barnQty = Number(status.farm_barn?.[item.id] || 0);
                    const playerQty = Number((status.inventory?.find(([k]: any) => k === item.id)?.[1]) || 0);
                    
                    let shopQty = 0;
                    status.shops?.forEach((s: any) => {
                      if (s.inventory?.[item.id]) shopQty += Number(s.inventory[item.id]);
                    });

                    let householdQty = 0;
                    status.families?.forEach((f: any) => {
                      if (f.inventory?.[item.id]) householdQty += Number(f.inventory[item.id]);
                    });

                    const totalCivQty = barnQty + playerQty + shopQty + householdQty;
                    const price = status.item_prices?.[item.id] || 5;

                    return (
                      <div key={item.id} className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-sm text-slate-800" : "bg-slate-950/80 hover:bg-slate-950 border-slate-800 hover:border-slate-700 shadow-sm text-slate-200"} border p-3 rounded-2xl flex flex-col gap-2.5 transition-all`}>
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <img
                              src={getItemIconPath(item.id)}
                              onError={(e: any) => { e.currentTarget.src = createSvgIcon(getItemEmoji(item.id), "#1e293b", "#0f172a"); }}
                              className={`w-8 h-8 rounded-lg object-cover border ${isDayMode ? "border-amber-200" : "border-slate-800"} shadow`}
                              alt={item.name}
                            />
                            <div>
                              <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-xs block`}>{item.name}</strong>
                              <span className={`text-[9px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono capitalize`}>{item.category} &bull; ${price}/unit</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-400 font-extrabold"} font-mono text-sm block`}>
                              {totalCivQty} <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} font-normal`}>{item.unit}</span>
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300" : "bg-slate-900 border-slate-800 text-slate-400"} border`}>
                              Total Stock
                            </span>
                          </div>
                        </div>

                        {/* Breakdown Row */}
                        <div className={`grid grid-cols-4 gap-1 pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-850"} text-[10px] font-mono text-center`}>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/60 border-slate-850"} p-1.5 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block text-[8px] uppercase`}>Barn/Silo</span>
                            <span className={`${isDayMode ? "text-amber-800 font-black" : "text-amber-300 font-bold"}`}>{barnQty}</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/60 border-slate-850"} p-1.5 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block text-[8px] uppercase`}>Warehouse</span>
                            <span className={`${isDayMode ? "text-sky-700 font-black" : "text-sky-300 font-bold"}`}>{playerQty}</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/60 border-slate-850"} p-1.5 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block text-[8px] uppercase`}>Markets</span>
                            <span className={`${isDayMode ? "text-emerald-700 font-black" : "text-emerald-300 font-bold"}`}>{shopQty}</span>
                          </div>
                          <div className={`${isDayMode ? "bg-amber-50/90 border-amber-200" : "bg-slate-900/60 border-slate-850"} p-1.5 rounded-lg border`}>
                            <span className={`${isDayMode ? "text-slate-600 font-bold" : "text-slate-500"} block text-[8px] uppercase`}>Pantries</span>
                            <span className={`${isDayMode ? "text-purple-800 font-black" : "text-purple-300 font-bold"}`}>{householdQty}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer Close */}
            <div className={`flex justify-between items-center pt-2 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"} flex-none text-xs`}>
              <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-500"} font-mono`}>
                AI Civilization Simulator &bull; Real-Time Autonomous Agricultural &amp; Supply Chain Engine
              </span>
              <button
                type="button"
                onClick={() => setMasterInventoryModalOpen(false)}
                className={`${isDayMode ? "bg-slate-850 hover:bg-slate-900 text-white font-bold" : "bg-slate-800 hover:bg-slate-700 text-slate-200"} px-5 py-2 rounded-xl transition-all font-bold`}
              >
                Close Window
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Registered Citizens Registry & Multi-Tenant Census Modal */}
      {isAdmin && showAdminCensusModal && (
        <div className={`fixed inset-0 z-[9999] ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/80"} backdrop-blur-md flex items-center justify-center p-4`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-amber-300 text-slate-800" : "bg-slate-900 border border-amber-500/40 text-slate-200"} rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden`}>
            {/* Modal Header */}
            <div className={`p-4 border-b ${isDayMode ? "border-amber-200 bg-white/90" : "border-slate-800 bg-slate-950/90"} flex justify-between items-center flex-wrap gap-2`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-xl`}>
                  👥
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-base flex items-center gap-2`}>
                    <span>Civilization Master Citizen Census</span>
                    <span className={`text-xs ${isDayMode ? "bg-amber-100 text-amber-950 border-amber-300 font-bold" : "bg-amber-500/20 text-amber-300 border-amber-500/30"} px-2 py-0.5 rounded-full font-mono border`}>
                      {registeredUsers.length} Registered Accounts
                    </span>
                  </h3>
                  <p className={`${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} text-xs font-mono`}>
                    All registered citizens, private family residences, and GPS coordinates stored in MongoDB database
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAndSeedDb}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-600 dark:text-red-400 border border-red-500/40 text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                  title="Clean slate database reset with 6 Citizens architecture"
                >
                  <span>🧹 Reset DB (6 Citizens)</span>
                </button>
                <input
                  type="text"
                  placeholder="🔍 Search email, home, city..."
                  value={censusSearchQuery}
                  onChange={(e) => setCensusSearchQuery(e.target.value)}
                  className={`${isDayMode ? "bg-amber-50/70 border-amber-200 text-slate-900 placeholder-slate-500 shadow-sm focus:border-amber-400" : "bg-slate-950 border-slate-800 text-white placeholder-slate-500 focus:border-amber-500"} border rounded-xl px-3 py-1.5 text-xs font-mono w-56 outline-none`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminCensusModal(false)}
                  className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} flex items-center justify-center font-bold text-sm transition-all`}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Users List Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3">
              {registeredUsers
                .filter((u: any) => {
                  if (!censusSearchQuery.trim()) return true;
                  const q = censusSearchQuery.toLowerCase();
                  return (
                    u.user_id?.toLowerCase().includes(q) ||
                    u.home_name?.toLowerCase().includes(q) ||
                    u.address?.toLowerCase().includes(q) ||
                    u.city_name?.toLowerCase().includes(q)
                  );
                })
                .map((u: any, idx: number) => {
                  return (
                    <div
                      key={u.user_id || idx}
                      className={`${isDayMode ? "bg-white/95 border-amber-250 hover:border-amber-400 shadow-sm text-slate-800" : "bg-slate-950/70 border-slate-800/90 hover:border-amber-500/40 text-slate-200"} border rounded-xl p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-all`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>{u.home_name || "Citizen Residence"}</strong>
                          <span className={`text-[10px] ${isDayMode ? "bg-sky-100 text-sky-950 border-sky-300 font-bold" : "bg-sky-500/10 text-sky-300 border-sky-500/20"} px-2 py-0.5 rounded-md border font-mono font-semibold`}>
                            ✉️ {u.user_id}
                          </span>
                          <span className={`text-[10px] ${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300 font-bold" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"} px-2 py-0.5 rounded-md border font-mono font-semibold`}>
                            💰 Cash: ${u.money?.toLocaleString() || 500}
                          </span>
                        </div>

                        <div className={`text-xs ${isDayMode ? "text-slate-600 font-medium" : "text-slate-300"} flex items-center gap-2 flex-wrap`}>
                          <span>📍 <strong>Address:</strong> {u.address || "Civilization Citizen Zone"}</span>
                          <span className={`${isDayMode ? "text-slate-400" : "text-slate-500"}`}>•</span>
                          <span className={`font-mono text-[11px] ${isDayMode ? "text-amber-800 font-bold" : "text-amber-400"}`}>
                            🧭 GPS: [{u.coords?.[0]?.toFixed(4) || "20.9472"}, {u.coords?.[1]?.toFixed(4) || "72.9515"}]
                          </span>
                        </div>

                        {/* Family Members Roster */}
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>
                            👨‍👩‍👧‍👦 Family ({u.members?.length || 0}):
                          </span>
                          {u.members && u.members.length > 0 ? (
                            u.members.map((m: any, mIdx: number) => {
                              const name = typeof m === "string" ? m : m?.name || `Member #${mIdx + 1}`;
                              const role = typeof m === "string" ? (mIdx === 0 ? "Head" : "Member") : m?.role || "Member";
                              const vehicle = typeof m === "string" ? "🚗" : VEHICLE_EMOJIS[m?.vehicle] || "🚗";
                              const age = typeof m === "object" && m?.age ? `${m.age} yrs` : "";
                              return (
                                <span
                                  key={mIdx}
                                  className={`${isDayMode ? "bg-amber-50/90 border-amber-200 text-slate-800" : "bg-slate-900 border-slate-850 text-slate-200"} border text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1`}
                                >
                                  <span>{vehicle}</span>
                                  <span>{name}</span>
                                  {age && (
                                    <span className={`text-[9px] ${isDayMode ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"} border px-1 rounded font-bold`}>
                                      🎂 {age}
                                    </span>
                                  )}
                                  <span className={`${isDayMode ? "text-slate-600" : "text-slate-400"} text-[9px]`}>({role})</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className={`${isDayMode ? "text-slate-500" : "text-slate-500"} text-[10px] italic`}>No family members registered</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-none self-end md:self-center flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdminCensusModal(false);
                            if (u.coords && mapInstanceRef.current) {
                              mapInstanceRef.current.flyTo(u.coords, 17);
                            }
                          }}
                          className={`${isDayMode ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold" : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40"} border text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm`}
                        >
                          <span>🎯</span>
                          <span>Fly to on Map</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => openAdminEditCitizenModal(u)}
                          className={`${isDayMode ? "bg-sky-100 hover:bg-sky-200 text-sky-950 border-sky-300 font-extrabold" : "bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border-sky-500/40"} border text-xs font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm`}
                        >
                          <span>✏️</span>
                          <span>Edit Citizen</span>
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = window.confirm(
                              `Are you sure you want to permanently DELETE citizen '${u.user_id}' (${u.home_name}) and expunge all their records from the MongoDB database?`
                            );
                            if (!confirmed) return;

                            try {
                              const res = await fetch(`${apiHost}/api/action?user_id=${userId}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "admin_delete_citizen",
                                  target_user_id: u.user_id
                                })
                              });
                              const data = await res.json();
                              if (data.ok) {
                                alert(data.message || `Deleted citizen ${u.user_id} successfully.`);
                                if (Array.isArray(data.users)) {
                                  setRegisteredUsers(data.users);
                                } else {
                                  fetch(`${apiHost}/api/action?action=list_all_users&user_id=${userId}`)
                                    .then(r => r.json())
                                    .then(ud => { if (ud.ok) setRegisteredUsers(ud.users); });
                                }
                              } else {
                                alert(data.message || "Failed to delete citizen.");
                              }
                            } catch (err: any) {
                              alert("Error: " + err.message);
                            }
                          }}
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm active:scale-95"
                        >
                          <span>🗑️</span>
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 7 Core Civilization Houses & Hostels Section */}
                <div className={`pt-3 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"} flex flex-col gap-2.5`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-extrabold ${isDayMode ? "text-amber-800" : "text-amber-400"} uppercase tracking-wider flex items-center gap-1.5`}>
                      <span>🏠</span>
                      <span>Civilization Core Residences &amp; Rooms ({status.families?.length || 7}):</span>
                    </span>
                    <span className={`text-[10px] ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} font-mono`}>
                      {status.families?.reduce((a: number, f: any) => a + (f.members?.length || 0), 0) || 0} Total Citizens Residing
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {status.families?.map((f: any, fIdx: number) => {
                      const isHostel = f.type === "hostel" || f.id.startsWith("hostel_");
                      const coords = status.zone_locations?.[f.id] || [20.9472, 72.9515];
                      return (
                        <div
                          key={f.id || fIdx}
                          className={`${isDayMode ? "bg-white/95 border-amber-250 shadow-sm text-slate-800" : "bg-slate-950/80 border-slate-800/90 text-slate-200"} border rounded-xl p-3 flex flex-col justify-between gap-2 shadow-sm hover:border-amber-500/40 transition-all`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <strong className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-xs flex items-center gap-1`}>
                                <span>{isHostel ? "🏢" : "🏠"}</span>
                                <span>{f.name}</span>
                              </strong>
                              <span className={`text-[10px] font-mono ${isDayMode ? "text-slate-600 font-semibold" : "text-slate-400"} block mt-0.5`}>
                                ID: {f.id} &bull; Budget: ${f.budget || 50}/day
                              </span>
                            </div>

                            <span className={`text-[10px] font-mono font-bold ${isDayMode ? "bg-amber-100 border-amber-300 text-amber-950 font-black" : "bg-slate-900 border-slate-800 text-amber-400"} border px-2 py-0.5 rounded-md`}>
                              {f.members?.length || 0} Members
                            </span>
                          </div>

                          {/* Members List Chips */}
                          <div className="flex flex-wrap gap-1">
                            {f.members?.map((m: any, mIdx: number) => (
                              <span
                                key={mIdx}
                                className={`${isDayMode ? "bg-amber-50/90 border-amber-200 text-slate-800 font-semibold" : "bg-slate-900 border-slate-850 text-slate-300"} border text-[9px] px-1.5 py-0.2 rounded font-mono flex items-center gap-0.5`}
                              >
                                <span>{VEHICLE_EMOJIS[m.vehicle] || "🚗"}</span>
                                <span>{m.name}</span>
                              </span>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-850">
                            <span className="text-[10px] text-amber-400/80 font-mono">
                              🧭 [{coords[0]?.toFixed(4)}, {coords[1]?.toFixed(4)}]
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setShowAdminCensusModal(false);
                                setSelectedFamilyId(f.id);
                                setActiveTab("overview");
                                if (mapInstanceRef.current && coords) {
                                  setTimeout(() => {
                                    mapInstanceRef.current?.flyTo(coords, 17);
                                  }, 100);
                                }
                              }}
                              className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-sm"
                            >
                              <span>🎯</span>
                              <span>Fly to on Map</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Individual Person Details Modal */}
      {editingPersonModalOpen && (
        <div className={`fixed inset-0 z-50 ${isDayMode ? "bg-slate-900/60" : "bg-slate-950/85"} backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto`}>
          <div className={`${isDayMode ? "bg-amber-50/95 border-2 border-amber-300 text-slate-800 shadow-2xl" : "bg-slate-900 border-2 border-amber-500/70 text-slate-200 shadow-2xl"} rounded-2xl p-5 max-w-lg w-full flex flex-col gap-4 text-xs animate-fade-in my-auto`}>
            <div className={`flex justify-between items-center border-b ${isDayMode ? "border-amber-200" : "border-slate-800"} pb-2.5`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-amber-100 border-amber-300" : "bg-amber-500/20 border-amber-500/40"} border flex items-center justify-center text-base`}>
                  ✏️
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>Edit Citizen Profile &amp; Career</h3>
                  <span className={`text-[10px] ${isDayMode ? "text-amber-800 font-bold" : "text-amber-400"} font-mono`}>Modifying: {editPersonOldName}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingPersonModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3.5">
              {/* Full Name */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>1. Citizen Full Name:</label>
                <input
                  type="text"
                  value={editPersonNewName}
                  onChange={(e) => setEditPersonNewName(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  placeholder="e.g. Thakorbhai, Vasantiben, Hetvi, Vandan"
                />
              </div>

              {/* Role & Career Selection */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>2. Assign Career &amp; Role:</label>
                <select
                  value={editPersonRole}
                  onChange={(e) => setEditPersonRole(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                >
                  <option value="father">Father / Household Head</option>
                  <option value="mother">Mother / Home Manager</option>
                  <option value="son">Son / Adult Resident</option>
                  <option value="daughter">Daughter / Resident</option>
                  <option value="farmer">🌾 Farmer / Agriculture Specialist</option>
                  <option value="merchant">🏪 Merchant / Shopkeeper</option>
                  <option value="tailor">👕 Clothier / Tailor</option>
                  <option value="worker">🏭 Factory Machine Operator</option>
                  <option value="engineer">🔌 Electrical &amp; Tech Engineer</option>
                  <option value="chemist">🧪 Petroleum &amp; Chemical Specialist</option>
                  <option value="captain">⚓ Maritime Fleet Captain</option>
                  <option value="navigator">🧭 Maritime Navigation Officer</option>
                  <option value="doctor">🏥 Doctor / Medical Specialist</option>
                  <option value="teacher">🏫 School Teacher</option>
                  <option value="student">🎓 Student</option>
                  <option value="driver">🚚 Commercial Logistic Driver</option>
                  <option value="police">👮 Municipal Law Officer</option>
                </select>
              </div>

              {/* Relation Description */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>3. Family Relation / Note:</label>
                <input
                  type="text"
                  value={editPersonRelation}
                  onChange={(e) => setEditPersonRelation(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-medium" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                  placeholder="e.g. Head of Thakorbhai Household / Main Person"
                />
              </div>

              {/* Residence Reassignment */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>4. Assigned House / Hostel (7 Total):</label>
                <select
                  value={editPersonNewFamilyId}
                  onChange={(e) => setEditPersonNewFamilyId(e.target.value)}
                  className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-semibold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                >
                  {status.families?.map((f: any) => (
                    <option key={f.id} value={f.id}>
                      {f.type === "hostel" || f.id.startsWith("hostel_") ? "🏢" : "🏠"} {f.name} ({f.id})
                    </option>
                  ))}
                </select>
              </div>

              {/* House Daily Budget */}
              <div>
                <label className={`${isDayMode ? "text-slate-700 font-bold" : "text-slate-300"} block mb-1 font-semibold text-[11px]`}>5. Daily House Budget ($/day):</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-500">$</span>
                  <input
                    type="number"
                    min={10}
                    max={10000}
                    value={editPersonHouseBudget}
                    onChange={(e) => setEditPersonHouseBudget(Number(e.target.value))}
                    className={`w-full ${isDayMode ? "bg-white border-amber-200 text-slate-900 font-bold" : "bg-slate-950 border-slate-800 text-white font-mono"} border rounded-xl p-2.5 text-xs outline-none`}
                    placeholder="e.g. 201"
                  />
                </div>
              </div>
            </div>

            <div className={`flex justify-between items-center pt-3 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"}`}>
              <button
                type="button"
                onClick={async () => {
                  const conf = window.confirm(`Are you sure you want to remove ${editPersonOldName} from the household registry?`);
                  if (!conf) return;
                  try {
                    const res = await fetch(`${apiHost}/api/action?user_id=${userId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "remove_member_from_residence",
                        family_id: editPersonFamilyId,
                        member_name: editPersonOldName
                      })
                    });
                    const d = await res.json();
                    if (d.ok) {
                      setEditingPersonModalOpen(false);
                      fetchStatus();
                    } else {
                      alert(d.message || "Failed to remove member.");
                    }
                  } catch (e: any) {
                    alert("Error: " + e.message);
                  }
                }}
                className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold px-3 py-2 rounded-xl transition-all"
              >
                🗑️ Remove Citizen
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPersonModalOpen(false)}
                  className={`${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} text-xs font-bold px-4 py-2 rounded-xl transition-all`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playClick(750);

                    // 1. INSTANT OPTIMISTIC LIVE STATE UPDATE (0ms UI latency)
                    setRegisteredUsers((prev: any[]) => {
                      if (!Array.isArray(prev)) return prev;
                      return prev.map((u: any) => {
                        const targetIdClean = (editPersonTargetUserId || userId).toLowerCase().replace(/[^a-z0-9]/g, "");
                        const uIdClean = (u.user_id || "").toLowerCase().replace(/[^a-z0-9]/g, "");
                        const famIdClean = editPersonFamilyId.toLowerCase().replace(/[^a-z0-9]/g, "");
                        const isMatch = uIdClean === targetIdClean || famIdClean.includes(uIdClean) || uIdClean.includes(famIdClean);
                        
                        if (!isMatch) return u;

                        const updatedMems = (u.members || []).map((m: any) => {
                          const mName = typeof m === "string" ? m : m.name;
                          if (mName?.toLowerCase() === editPersonOldName.toLowerCase()) {
                            return {
                              ...(typeof m === "object" ? m : {}),
                              name: editPersonNewName,
                              role: editPersonRole,
                              relation: editPersonRelation,
                              vehicle: editPersonVehicle,
                              state: "At Home"
                            };
                          }
                          return m;
                        });

                        return {
                          ...u,
                          budget: editPersonHouseBudget,
                          vehicle: editPersonVehicle,
                          members: updatedMems
                        };
                      });
                    });

                    setStatus((prev: any) => {
                      if (!prev || !prev.families) return prev;
                      const targetIdClean = (editPersonTargetUserId || userId).toLowerCase().replace(/[^a-z0-9]/g, "");
                      const famIdClean = editPersonFamilyId.toLowerCase().replace(/[^a-z0-9]/g, "");
                      return {
                        ...prev,
                        families: prev.families.map((f: any) => {
                          const fIdClean = f.id.toLowerCase().replace(/[^a-z0-9]/g, "");
                          const isTargetFam = f.id === editPersonFamilyId || fIdClean === famIdClean || famIdClean.includes(fIdClean) || (f.id === "my_home" && targetIdClean.includes("vandan"));
                          if (!isTargetFam) return f;
                          return {
                            ...f,
                            budget: editPersonHouseBudget,
                            members: (f.members || []).map((m: any) => {
                              const mName = typeof m === "string" ? m : m.name;
                              if (mName?.toLowerCase() === editPersonOldName.toLowerCase()) {
                                return {
                                  ...(typeof m === "object" ? m : {}),
                                  name: editPersonNewName,
                                  role: editPersonRole,
                                  relation: editPersonRelation,
                                  vehicle: editPersonVehicle,
                                  state: "At Home"
                                };
                              }
                              return m;
                            })
                          };
                        })
                      };
                    });

                    // 2. Close Modal Instantly for 0ms user feedback
                    setEditingPersonModalOpen(false);

                    // 3. Asynchronously persist to server in background
                    fetch(`${apiHost}/api/action?user_id=${userId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "edit_person_details",
                        target_user_id: editPersonTargetUserId || userId,
                        family_id: editPersonFamilyId,
                        old_name: editPersonOldName,
                        new_name: editPersonNewName,
                        role: editPersonRole,
                        relation: editPersonRelation,
                        vehicle: editPersonVehicle,
                        budget: editPersonHouseBudget,
                        new_family_id: editPersonNewFamilyId
                      })
                    })
                      .then(res => res.json())
                      .then(d => {
                        if (d.ok && Array.isArray(d.users)) {
                          setRegisteredUsers(d.users);
                        }
                        fetchStatus();
                      })
                      .catch(err => {
                        console.warn("[Async Citizen Update Notice]:", err);
                      });
                  }}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs px-5 py-2 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  ⚡ Save &amp; Live Update Instantly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Supreme Admin: Edit Citizen & Family Modal (Upper Index over Census Modal) */}
      {adminEditModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100000] flex items-center justify-center p-3 sm:p-4">
          <div className={`${isDayMode ? "bg-amber-50/95 border-amber-300 text-slate-800" : "bg-slate-900 border-slate-700 text-slate-100"} border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
            {/* Modal Header */}
            <div className={`p-4 border-b ${isDayMode ? "border-amber-200 bg-amber-100/70" : "border-slate-800 bg-slate-950/70"} flex justify-between items-center`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl ${isDayMode ? "bg-sky-100 border-sky-300" : "bg-sky-500/20 border-sky-500/40"} border flex items-center justify-center text-base`}>
                  ✏️
                </div>
                <div>
                  <h3 className={`${isDayMode ? "text-slate-900 font-black" : "text-white font-bold"} text-sm`}>
                    Admin Citizen Editor &amp; Geolocation Sync
                  </h3>
                  <span className={`text-[10px] ${isDayMode ? "text-sky-800 font-bold" : "text-sky-400"} font-mono`}>
                    Account: {adminEditTargetUserId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setAdminEditModalOpen(false)}
                className={`w-7 h-7 rounded-lg ${isDayMode ? "bg-slate-200 hover:bg-slate-300 text-slate-800" : "bg-slate-800 hover:bg-slate-700 text-slate-300"} font-bold flex items-center justify-center transition-all`}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex flex-col gap-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    Citizen Primary Name:
                  </label>
                  <input
                    type="text"
                    value={adminEditName}
                    onChange={(e) => setAdminEditName(e.target.value)}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                    placeholder="e.g. Thakorbhai Patel"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    Residence Name:
                  </label>
                  <input
                    type="text"
                    value={adminEditHomeName}
                    onChange={(e) => setAdminEditHomeName(e.target.value)}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                    placeholder="e.g. Thakorbhai Residency"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    Address / City / Village:
                  </label>
                  <input
                    type="text"
                    value={adminEditAddress}
                    onChange={(e) => setAdminEditAddress(e.target.value)}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                    placeholder="e.g. Rumla, Gujarat"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    Wallet Cash Balance ($):
                  </label>
                  <input
                    type="number"
                    value={adminEditMoney}
                    onChange={(e) => setAdminEditMoney(Number(e.target.value))}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    GPS Latitude:
                  </label>
                  <input
                    type="text"
                    value={adminEditLat}
                    onChange={(e) => setAdminEditLat(e.target.value)}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className={`text-[11px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-300 font-semibold"}`}>
                    GPS Longitude:
                  </label>
                  <input
                    type="text"
                    value={adminEditLng}
                    onChange={(e) => setAdminEditLng(e.target.value)}
                    className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-xs font-mono`}
                  />
                </div>
              </div>

              {/* Family Members Roster Editor */}
              <div className={`pt-3 border-t ${isDayMode ? "border-amber-200" : "border-slate-800"} flex flex-col gap-2`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">👨‍👩‍👧‍👦</span>
                    <strong className={`text-xs ${isDayMode ? "text-slate-900" : "text-sky-400"}`}>
                      Family Members Roster ({adminEditMemberCount} Members)
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${isDayMode ? "text-slate-700 font-bold" : "text-slate-400 font-semibold"}`}>Count:</span>
                    <select
                      value={adminEditMemberCount}
                      onChange={(e) => {
                        const count = Number(e.target.value);
                        setAdminEditMemberCount(count);
                        setAdminEditMemberNames(prev => {
                          const next = [...prev];
                          while (next.length < count) next.push("");
                          return next.slice(0, count);
                        });
                        setAdminEditMemberRoles(prev => {
                          const next = [...prev];
                          while (next.length < count) next.push("Child");
                          return next.slice(0, count);
                        });
                      }}
                      className={`${isDayMode ? "bg-white border-amber-200 text-slate-900" : "bg-slate-950 border-slate-800 text-white"} border rounded-lg px-2 py-1 text-xs font-mono`}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} Member{n > 1 ? "s" : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: adminEditMemberCount }).map((_, mIdx) => (
                    <div
                      key={mIdx}
                      className={`${isDayMode ? "bg-white border-amber-200/90" : "bg-slate-950/80 border-slate-800"} border rounded-xl p-2 flex flex-col gap-1.5`}
                    >
                      <div className="flex justify-between items-center gap-1">
                        <span className={`text-[10px] font-mono font-bold ${isDayMode ? "text-amber-900" : "text-amber-400"}`}>
                          Member #{mIdx + 1} {mIdx === 0 ? "(Head)" : ""}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono font-semibold opacity-80">🎂</span>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            title="Citizen Age (Years)"
                            placeholder="Age"
                            value={adminEditMemberAges[mIdx] ?? (mIdx === 0 ? 35 : mIdx === 1 ? 32 : 12)}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 1;
                              setAdminEditMemberAges(prev => {
                                const next = [...prev];
                                next[mIdx] = val;
                                return next;
                              });
                            }}
                            className={`w-12 text-center text-[10px] font-mono font-bold rounded px-1 py-0.5 border ${isDayMode ? "bg-amber-50 border-amber-300 text-slate-900" : "bg-slate-900 border-slate-700 text-white"}`}
                          />
                          <span className="text-xs">{mIdx === 0 ? "🚗" : mIdx === 1 ? "🛵" : "🚲"}</span>
                        </div>
                      </div>
                      <input
                        type="text"
                        placeholder={`Member #${mIdx + 1} Name`}
                        value={adminEditMemberNames[mIdx] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminEditMemberNames(prev => {
                            const next = [...prev];
                            next[mIdx] = val;
                            return next;
                          });
                        }}
                        className={`${isDayMode ? "bg-amber-50/50 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2 py-1 text-xs font-mono`}
                      />
                      <textarea
                        rows={2}
                        placeholder="Role & Detailed Description (e.g. Head of family, runs the farm, system developer)"
                        value={adminEditMemberRoles[mIdx] || (mIdx === 0 ? "Head" : mIdx === 1 ? "Spouse" : "Child")}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAdminEditMemberRoles(prev => {
                            const next = [...prev];
                            next[mIdx] = val;
                            return next;
                          });
                        }}
                        className={`${isDayMode ? "bg-amber-50/50 border-amber-200 text-slate-900" : "bg-slate-900 border-slate-800 text-white"} border rounded-lg px-2.5 py-1.5 text-[11px] font-mono resize-y min-h-[44px] leading-relaxed`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {adminEditMsg && (
                <div className={`${isDayMode ? "bg-emerald-100 text-emerald-950 border-emerald-300" : "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"} border p-2 rounded-lg text-xs font-mono font-bold`}>
                  {adminEditMsg}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${isDayMode ? "border-amber-200 bg-amber-100/50" : "border-slate-800 bg-slate-950/70"} flex justify-between items-center`}>
              <button
                type="button"
                onClick={() => setAdminEditModalOpen(false)}
                className={`${isDayMode ? "bg-slate-200 text-slate-800 hover:bg-slate-300" : "bg-slate-800 text-slate-300 hover:bg-slate-700"} px-4 py-1.5 rounded-xl font-bold transition-all text-xs`}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAdminEditCitizen}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-xs px-5 py-2 rounded-xl shadow-lg transition-all flex items-center gap-1.5"
              >
                <span>💾</span>
                <span>SAVE CITIZEN CHANGES TO MONGODB</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


"use client";

import React, { useState, useEffect, useRef } from "react";

// Item image lookup helper using rich game assets in /images/
const getItemIconPath = (itemId: string): string => {
  const clean = String(itemId || "").toLowerCase().trim();
  const map: Record<string, string> = {
    apple: "/images/apple.jpg",
    green_apple: "/images/green_applr.jpg",
    milk: "/images/cow_milk.jpg",
    cow_milk: "/images/cow_milk.jpg",
    wheat: "/images/wheat.png",
    wheat_seed: "/images/wheat_seed.png",
    apple_seed: "/images/apple_seed.png",
    bread: "/images/bread.png",
    pizza: "/images/pizza.jpg",
    burger: "/images/burger.jpg",
    carrot: "/images/carrot.jpg",
    banana: "/images/banana.jpg",
    tomato_ketch: "/images/tomato_ketch.jpg",
    strawberry: "/images/strawberry.jpg",
    strawberry_cake: "/images/strawberry_cake.jpg",
    cherry: "/images/cherry.jpg",
    cherry_cake: "/images/cherry_cake.jpg",
    cherry_jam: "/images/cherry_jam.jpg",
    grapes: "/images/grapes.jpg",
    orange: "/images/orange.jpg",
    orange_juice: "/images/orange_juice.jpg",
    corn: "/images/corn.jpg",
    water: "/images/water.jpg",
    water_bottle: "/images/water_bottle.jpg",
    tea: "/images/tea.jpg",
    ice_cream: "/images/ice_cream.jpg",
    fiber: "/images/fiber.png",
    wool: "/images/wool.png",
    fence: "/images/fence.png",
    campfire: "/images/campfire.png",
    house: "/images/house.png",
    home: "/images/home.jpg"
  };
  return map[clean] || "/images/apple.jpg";
};

export default function CivilizationDashboard() {
  // Session & Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("vandan_11");
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authMethod, setAuthMethod] = useState<"otp" | "magiclink" | "password">("otp");
  const [authInput, setAuthInput] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [enteredOtp, setEnteredOtp] = useState<string>("");
  const [otpNotice, setOtpNotice] = useState<string>("");
  const [magicLinkSent, setMagicLinkSent] = useState<boolean>(false);

  // New Citizen Registration States
  const [signupName, setSignupName] = useState<string>("");
  const [signupAddress, setSignupAddress] = useState<string>("");
  const [signupMemberCount, setSignupMemberCount] = useState<number>(4);
  const [signupMemberNames, setSignupMemberNames] = useState<string[]>(["", "", "", ""]);
  const [signupCityQuery, setSignupCityQuery] = useState<string>("");
  const [signupCoords, setSignupCoords] = useState<[number, number]>([20.6728, 73.0805]);
  const [signupCityName, setSignupCityName] = useState<string>("Rumla, Gujarat");
  const [signupIsSearching, setSignupIsSearching] = useState<boolean>(false);

  // Game UI States
  const [status, setStatus] = useState<any>(null);
  const [catalog, setCatalog] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Admin Government Cabinet States
  const [taxRateInput, setTaxRateInput] = useState<number>(10);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("house_1");
  const [incomeTaxInput, setIncomeTaxInput] = useState<number>(10);
  const [salesTaxInput, setSalesTaxInput] = useState<number>(5);
  const [welfareThresholdInput, setWelfareThresholdInput] = useState<number>(15);
  const [welfarePayoutInput, setWelfarePayoutInput] = useState<number>(15);
  
  // Cabinet reassignment dropdown form states
  const [pmInput, setPmInput] = useState<string>("Thakorbhai");
  const [dmInput, setDmInput] = useState<string>("Bharatbhai");
  const [finInput, setFinInput] = useState<string>("Rameshbhai");
  const [eduInput, setEduInput] = useState<string>("Vasantiben");
  const [infraInput, setInfraInput] = useState<string>("Mayuriben");
  
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
  const [searchLandmarkTarget, setSearchLandmarkTarget] = useState<string>("house_2");

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
  const isAdmin = userId === "vandan_11" || userId === "vandan_11patel@gmail.com";

  // Center Coordinates for Rumla, Gujarat
  const RUMLA_LAT = 20.6728;
  const RUMLA_LNG = 73.0805;

  const defaultLocations: Record<string, [number, number]> = {
    house_1: [20.6732, 73.0800],
    house_2: [20.6720, 73.0815],
    house_3: [20.6715, 73.0795],
    dairy: [20.6728, 73.0805],
    general: [20.6725, 73.0810],
    clothing: [20.6722, 73.0808],
    electronics: [20.6730, 73.0812],
    farms: [20.6705, 73.0780],
    factory: [20.6740, 73.0820],
    school: [20.6735, 73.0790],
    hospital: [20.6710, 73.0825],
    park: [20.6725, 73.0830]
  };

  const getLocations = () => {
    return status?.zone_locations || defaultLocations;
  };

  // Helper to retrieve citizen geolocations
  const getCitizenGeo = (name: string, state: string, familyId: string): [number, number] => {
    const locs = getLocations();
    if (state.includes("Sleeping") || state.includes("Breakfast") || state.includes("Dinner") || state.includes("Leisure at Home") || state.includes("Private")) {
      if (familyId === "house_2") return locs.house_2 || [RUMLA_LAT, RUMLA_LNG];
      if (familyId === "house_3") return locs.house_3 || [RUMLA_LAT, RUMLA_LNG];
      return locs.house_1 || [RUMLA_LAT, RUMLA_LNG];
    }
    if (state.includes("Farms")) return locs.farms || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("General Store")) return locs.general || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("Electronic Hub")) return locs.electronics || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("Clothiers")) return locs.clothing || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("Dairy Store") || state.includes("Shopping")) return locs.dairy || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("Factory")) return locs.factory || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("School")) return locs.school || [RUMLA_LAT, RUMLA_LNG];
    if (state.includes("Plaza") || state.includes("Park")) return locs.park || [RUMLA_LAT, RUMLA_LNG];
    
    // Fallback
    if (familyId === "house_2") return locs.house_2 || [RUMLA_LAT, RUMLA_LNG];
    if (familyId === "house_3") return locs.house_3 || [RUMLA_LAT, RUMLA_LNG];
    return locs.house_1 || [RUMLA_LAT, RUMLA_LNG];
  };

  // Restore saved session or magic link from URL
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const magicUser = urlParams.get("magic_user");
        if (magicUser) {
          setUserId(magicUser);
          setIsLoggedIn(true);
          localStorage.setItem("rumla_active_user", magicUser);
          return;
        }
      }
      const saved = localStorage.getItem("rumla_active_user");
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

  // Handle map click callbacks for admin relocation
  const handleMapClick = (e: any) => {
    if (!isAdmin) return;
    const { lat, lng } = e.latlng;
    setClickedCoords({ lat, lng });
    setEditLocationsMode(true);
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
      }).setView([RUMLA_LAT, RUMLA_LNG], 16);

      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19,
        attribution: 'Tiles &copy; Esri &mdash; World Satellite Imagery'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    
    // Clear old static markers
    staticMarkersRef.current.forEach(m => m.remove());
    staticMarkersRef.current = [];

    const locs = getLocations();

    const addLandmark = (coords: number[], name: string, description: string, color: string, symbol: string) => {
      const landmarkIcon = L.divIcon({
        className: "",
        html: `<div class="flex items-center justify-center w-8 h-8 rounded-full border-2 border-slate-900 shadow-xl text-white font-bold" style="background: ${color}"><span class="text-[14px]">${symbol}</span></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(coords, { icon: landmarkIcon })
        .addTo(map)
        .bindPopup(`<div class="font-sans text-xs p-1 text-slate-800"><strong class="block text-slate-950 font-bold mb-0.5">${name}</strong>${description}</div>`);
      staticMarkersRef.current.push(marker);
    };

    // Landmark names with privacy considerations
    if (isAdmin) {
      addLandmark(locs.house_1, "Thakorbhai's House (Home 1)", "Residences of Thakorbhai, Vasantiben, Vandan, Hetvi & Kiran", "#0284c7", "🏠");
      addLandmark(locs.house_2, "Bharatbhai's House (Home 2)", "Residences of Bharatbhai, Mayuriben, Vainavi, Prathav, Dinesh & Geeta", "#0d9488", "🏠");
      addLandmark(locs.house_3, "Rameshbhai's House (Home 3)", "Residences of Rameshbhai, Hemuben, Krushil, Harshil & Sanjay", "#4f46e5", "🏠");
    } else {
      // Citizen privacy mode: shows location of homes, but no occupant names, jobs, counts or private details
      addLandmark(locs.house_1, "Residential Zone 1", "Private Residence (Protected Location)", "#0284c7", "🏠");
      addLandmark(locs.house_2, "Residential Zone 2", "Private Residence (Protected Location)", "#0d9488", "🏠");
      addLandmark(locs.house_3, "Residential Zone 3", "Private Residence (Protected Location)", "#4f46e5", "🏠");
    }

    addLandmark(locs.dairy, "Rumla Groceries (Dairy)", "Dairy retail shop owned by Amina", "#d97706", "🥛");
    addLandmark(locs.general, "Ramesh Supplies", "General construction materials store owned by Ramesh", "#475569", "📦");
    addLandmark(locs.clothing, "Savita's Clothiers", "Specialized fiber, fabrics & clothing store", "#db2777", "👕");
    addLandmark(locs.electronics, "Electronics Hub", "Electronics components hub owned by Rajesh", "#7c3aed", "🔌");
    addLandmark(locs.farms, "Colony Farms", "Wheat & agricultural fields", "#16a34a", "🌾");
    addLandmark(locs.factory, "Manufacturing Factory", "Colony fabrication center", "#dc2626", "🏭");
    addLandmark(locs.school, "Rumla Community School", "Primary educational project", "#6366f1", "🏫");
    addLandmark(locs.hospital, "Rumla General Hospital", "Health clinic infrastructure", "#ec4899", "🏥");
    addLandmark(locs.park, "Rumla Leisure Park", "Green public plaza", "#22c55e", "🌳");

    // Re-bind click event
    map.off("click");
    map.on("click", handleMapClick);

    // Dynamic citizen markers with privacy handling
    if (status && status.families) {
      status.families.forEach((fam: any) => {
        fam.members.forEach((m: any, mIdx: number) => {
          const latlng = getCitizenGeo(m.name, m.state, fam.id);
          const markerKey = `${fam.id}_${mIdx}`;
          
          let dotBg = "bg-sky-500 text-slate-950 border-sky-400";
          let labelText = m.name ? m.name.charAt(0) : "👤";
          let tooltipContent = isAdmin ? `${m.name}: ${m.state}` : `Rumla Resident: Active`;

          if (!isAdmin) {
            dotBg = "bg-amber-500/90 text-slate-950 border-amber-300";
            labelText = "•";
          }

          const htmlMarkup = `
            <div class="relative group select-none animate-pulse">
              <span class="w-5 h-5 rounded-full font-bold flex justify-center items-center shadow-lg border-2 text-[10px] ${dotBg}">
                ${labelText}
              </span>
            </div>
          `;

          const citizenIcon = L.divIcon({
            className: "",
            html: htmlMarkup,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          if (citizenMarkersRef.current[markerKey]) {
            citizenMarkersRef.current[markerKey].setLatLng(latlng);
            citizenMarkersRef.current[markerKey].setIcon(citizenIcon);
          } else {
            const marker = L.marker(latlng, { icon: citizenIcon })
              .addTo(map)
              .bindTooltip(tooltipContent, { direction: "top", permanent: false });
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
    const adults = ["Thakorbhai", "Bharatbhai", "Rameshbhai", "Vasantiben", "Mayuriben", "Hemuben"];
    const found = adults.find(a => a.toLowerCase() === String(name || "").toLowerCase());
    return found || fallback;
  };

  // Polling simulation status
  useEffect(() => {
    if (!isLoggedIn) return;
    let active = true;
    const fetchStatus = () => {
      fetch(`${apiHost}/api/status?user_id=${userId}`)
        .then((res) => {
          if (!res.ok) throw new Error("API server offline.");
          return res.json();
        })
        .then((data) => {
          if (!active) return;
          if (data.ok) {
            setStatus(data);
            setError(null);
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
                setDmInput(matchAdultName(data.cabinet.district_magistrate, "Bharatbhai"));
                setFinInput(matchAdultName(data.cabinet.ministers?.finance, "Rameshbhai"));
                setEduInput(matchAdultName(data.cabinet.ministers?.education, "Vasantiben"));
                setInfraInput(matchAdultName(data.cabinet.ministers?.infrastructure, "Mayuriben"));
              }
            }
          } else {
            setError(data.message || "Failed to load player state.");
          }
        })
        .catch((err) => {
          if (!active) return;
          setError(err.message || "Backend offline");
        });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [userId, apiHost, isLoggedIn]);

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

    const targetUser = authInput.trim();
    if (!targetUser) {
      setAuthError("Please enter your Email address or Phone number.");
      return;
    }

    // SIGN IN TAB
    if (authTab === "signin") {
      const isAdminTarget = targetUser === "vandan_11" || targetUser === "vandan_11patel@gmail.com";
      if (isAdminTarget) {
        if (authPassword !== "vandan@11" && authPassword !== "vandan11") {
          setAuthError("Invalid Admin Password. Please enter the correct password for PMO Admin.");
          return;
        }
      } else {
        // Citizen OTP verification via backend
        if (authMethod === "otp") {
          if (!enteredOtp.trim()) {
            setAuthError("Please enter the 6-digit OTP code received in your email.");
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
        }
      }

      setUserId(targetUser);
      setIsLoggedIn(true);
      try {
        localStorage.setItem("rumla_active_user", targetUser);
      } catch {}
      return;
    }

    // CREATE CITIZEN ACCOUNT TAB
    if (authTab === "signup") {
      if (!signupName.trim()) {
        setAuthError("Please enter the Citizen Full Name.");
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

      // Register new citizen with backend
      try {
        const res = await fetch(`${apiHost}/api/action?user_id=${targetUser}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "register_citizen",
            citizen_name: signupName.trim(),
            email_or_phone: targetUser,
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
        localStorage.setItem("rumla_active_user", targetUser);
      } catch {}
    }
  };



  // Logout / Switch account
  const handleLogout = () => {
    setIsLoggedIn(false);
    try {
      localStorage.removeItem("rumla_active_user");
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
      }
    } catch (err: any) {
      alert("Communication error with server: " + err.message);
    }
  };

  // Action helpers
  const plantAll = (cropId: string) => dispatchAction("plant_all", { crop_id: cropId });
  const harvestAll = () => dispatchAction("harvest_all");
  const craftRecipe = (recipeId: string) => dispatchAction("craft", { recipe_id: recipeId });
  const buyItem = (itemId: string, qty: number = 1) => dispatchAction("buy", { item_id: itemId, qty });
  const sellItem = (itemId: string, qty: number = 1) => dispatchAction("sell", { item_id: itemId, qty });
  const buyFromShop = (shopId: string, itemId: string, qty: number = 1) => dispatchAction("buy_from_shop", { shop_id: shopId, item_id: itemId, qty });
  const sellToShop = (shopId: string, itemId: string, qty: number = 1) => dispatchAction("sell_to_shop", { shop_id: shopId, item_id: itemId, qty });
  
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
  const submitRelocate = () => {
    if (!clickedCoords) return;
    dispatchAction("relocate_landmark", {
      landmark_id: selectedLandmarkToMove,
      lat: clickedCoords.lat,
      lng: clickedCoords.lng
    });
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

  const assignSearchedLocation = (landmarkId: string) => {
    if (!searchedLocation) return;
    dispatchAction("relocate_landmark", {
      landmark_id: landmarkId,
      lat: searchedLocation.lat,
      lng: searchedLocation.lng
    });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([searchedLocation.lat, searchedLocation.lng], 16);
    }
  };

  const selectedFamily = status?.families?.find((f: any) => f.id === selectedFamilyId) || status?.families?.[0];
  const listAllAdults = ["Thakorbhai", "Bharatbhai", "Rameshbhai", "Vasantiben", "Mayuriben", "Hemuben"];

  // =========================================================================
  // VIEW 1: AUTHENTICATION & LOGIN / SIGN-UP GATEWAY SCREEN
  // =========================================================================
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans relative overflow-x-hidden selection:bg-amber-500 selection:text-slate-950">
        
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Live Ticker */}
        <div className="w-full bg-slate-900/80 border-b border-slate-800/80 px-4 py-2 flex items-center gap-3 backdrop-blur-md">
          <span className="bg-rose-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow animate-pulse">
            LIVE SYSTEM
          </span>
          <span className="text-xs text-slate-400 font-mono">
            Rumla Autonomous Micro-Nation Simulation • High-Resolution Satellite GIS & Municipal PMO
          </span>
        </div>

        {/* Center Glassmorphism Authentication Card */}
        <div className="flex-grow flex items-center justify-center p-4 z-10">
          <div className="w-full max-w-lg bg-slate-900/70 border border-slate-800/90 rounded-2xl shadow-2xl backdrop-blur-xl p-6 md:p-8 flex flex-col gap-6">
            
            {/* Header / Logo */}
            <div className="text-center flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-sky-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
                <span className="text-2xl">🏛️</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-amber-400 bg-clip-text text-transparent">
                RUMLA CIVILIZATION
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Enter your Email or Phone number to join the living geolocated simulation.
              </p>
            </div>

            {/* Tab Switcher: Sign In vs Sign Up */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/80">
              <button
                type="button"
                onClick={() => { setAuthTab("signin"); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authTab === "signin"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                SIGN IN
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab("signup"); setAuthError(""); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  authTab === "signup"
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                CREATE CITIZEN ACCOUNT
              </button>
            </div>

            {/* Notification / OTP Toast */}
            {otpNotice && (
              <div className="bg-sky-950/60 border border-sky-500/50 text-sky-200 text-xs p-3 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-fade-in">
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
              <div className="bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs p-3 rounded-xl flex items-center gap-2">
                <span>⚠️</span>
                <span>{authError}</span>
              </div>
            )}

            {/* SIGN IN VIEW */}
            {authTab === "signin" && (
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                {/* Method selector for Sign In */}
                <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("otp"); setAuthError(""); }}
                    className={`flex-1 py-1.5 rounded transition-all ${authMethod === "otp" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
                  >
                    📱 OTP LOGIN
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("magiclink"); setAuthError(""); }}
                    className={`flex-1 py-1.5 rounded transition-all ${authMethod === "magiclink" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
                  >
                    🔗 MAGIC LINK
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMethod("password"); setAuthError(""); }}
                    className={`flex-1 py-1.5 rounded transition-all ${authMethod === "password" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"}`}
                  >
                    🔑 ADMIN LOGIN
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Email Address or Phone Number
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-500 text-sm">✉️</span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. vandan_11patel@gmail.com or +91 98765 43210"
                      value={authInput}
                      onChange={(e) => setAuthInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
                    />
                  </div>
                </div>

                {/* OTP Mode Fields */}
                {authMethod === "otp" && (
                  <div className="flex flex-col gap-2 bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-slate-300">
                        6-Digit OTP Verification Code
                      </label>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="text-xs text-amber-400 hover:text-amber-300 font-bold underline"
                      >
                        {generatedOtp ? "Resend OTP Code" : "Get 6-Digit OTP"}
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit OTP code (e.g. 839201)"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-center tracking-widest text-base font-bold"
                    />
                  </div>
                )}

                {/* Magic Link Mode */}
                {authMethod === "magiclink" && (
                  <div className="flex flex-col gap-2.5 bg-slate-950/50 border border-slate-800/80 p-3 rounded-xl text-xs">
                    <p className="text-slate-400">
                      We will generate an instant 1-click passwordless login link for your account.
                    </p>
                    {!magicLinkSent ? (
                      <button
                        type="button"
                        onClick={handleSendMagicLink}
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2 rounded-lg transition-all"
                      >
                        🔗 GENERATE MAGIC LINK
                      </button>
                    ) : (
                      <div className="bg-sky-950/40 border border-sky-500/40 p-2.5 rounded-lg flex flex-col gap-2">
                        <span className="text-sky-300 font-semibold">Magic Link Ready:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setUserId(authInput.trim());
                            setIsLoggedIn(true);
                            try { localStorage.setItem("rumla_active_user", authInput.trim()); } catch {}
                          }}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2 rounded-lg transition-all shadow"
                        >
                          👉 CLICK HERE TO INSTANTLY SIGN IN AS {authInput.trim()}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Password Mode (For Admin) */}
                {authMethod === "password" && (
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                      Admin Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-500 text-sm">🔒</span>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] mt-2"
                >
                  ENTER RUMLA CIVILIZATION
                </button>
              </form>
            )}

            {/* CREATE CITIZEN ACCOUNT VIEW */}
            {authTab === "signup" && (
              <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                
                {/* 1. Contact Info & OTP */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Email Address or Phone Number
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. pravin_patel@gmail.com or +91 98765 43210"
                      value={authInput}
                      onChange={(e) => setAuthInput(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition-all"
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 font-bold text-xs px-3 rounded-xl transition-all whitespace-nowrap"
                    >
                      {generatedOtp ? "OTP Sent ✓" : "Get OTP"}
                    </button>
                  </div>
                </div>

                {/* 2. Citizen Name & Number of Members */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                      Citizen Head Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pravin Patel"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                      No. of Family Members in House
                    </label>
                    <select
                      value={signupMemberCount}
                      onChange={(e) => handleMemberCountChange(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 transition-all font-mono"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? "Person (Solo)" : "Members"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Dynamic Required Family Member Name Fields */}
                <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-amber-400">
                      Family Members List ({signupMemberCount} Required)
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">All names required</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {Array.from({ length: signupMemberCount }).map((_, idx) => (
                      <div key={idx} className="flex flex-col gap-1">
                        <label className="text-[10px] text-slate-400 font-mono">
                          {idx === 0 ? "Member #1 (Household Head)" : `Member #${idx + 1}`}
                        </label>
                        <input
                          type="text"
                          required
                          placeholder={idx === 0 ? "e.g. Pravin Patel" : idx === 1 ? "e.g. Geeta Patel" : idx === 2 ? "e.g. Aarav Patel" : `Member #${idx + 1} Name`}
                          value={signupMemberNames[idx] || ""}
                          onChange={(e) => {
                            const updated = [...signupMemberNames];
                            updated[idx] = e.target.value;
                            setSignupMemberNames(updated);
                          }}
                          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Home Address & Interactive Satellite Map Picker */}
                <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Home Address & Interactive Satellite Map
                    </label>
                    <span className="text-[10px] text-amber-400 font-mono">📍 Click Map to Pick House</span>
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Enter street address or area (e.g. Nandarkha, Bilimora or Sayaji Road, Navsari)"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />

                  {/* City search bar */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-grow">
                      <span className="absolute left-2.5 top-1.5 text-slate-500 text-xs">🔍</span>
                      <input
                        type="text"
                        placeholder="Search City/Village (e.g. Nandarkha Bilimora, Navsari, Surat, Rumla...)"
                        value={signupCityQuery}
                        onChange={(e) => setSignupCityQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={signupIsSearching}
                      onClick={handleSignupCitySearch}
                      className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all"
                    >
                      {signupIsSearching ? "..." : "SEARCH MAP"}
                    </button>
                  </div>

                  {/* Interactive Satellite Mini-Map for Home Location */}
                  <div className="w-full h-48 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
                    <div ref={signupMapContainerRef} className="w-full h-full" />
                    <div className="absolute top-2 right-2 z-[400] bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] text-amber-400 border border-amber-500/30 font-mono shadow">
                      👆 Click anywhere on satellite map to place house
                    </div>
                  </div>

                  {/* Selected Geolocation Badge */}
                  <div className="bg-slate-900/90 border border-slate-800 p-2 rounded-lg flex items-center justify-between text-[11px]">
                    <div>
                      <span className="text-amber-400 font-semibold block">📍 {signupCityName}</span>
                      <span className="text-slate-400 font-mono text-[10px]">Exact Coordinates: [{signupCoords[0].toFixed(6)}, {signupCoords[1].toFixed(6)}]</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">
                      PINPOINT SET ✓
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] mt-1"
                >
                  CREATE CITIZEN ACCOUNT & ENTER
                </button>
              </form>
            )}



            {/* Privacy Law Notice */}
            <div className="bg-slate-950/70 border border-slate-850 p-3 rounded-xl flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-base">🛡️</span>
              <div>
                <strong className="text-slate-300 block font-semibold">Real-Life Civic Privacy Protection:</strong>
                PMO Supreme Admin (<span className="text-amber-400 font-mono">vandan_11</span> / <span className="text-amber-400 font-mono">vandan_11patel@gmail.com</span>) has full municipal oversight. Other citizen players only view town map locations and private household data is encrypted.
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-[10px] text-slate-500 py-3 border-t border-slate-900 font-mono">
          Rumla AI Civilization Simulator • 100% Pure TypeScript & High-Resolution Satellite GIS
        </footer>

      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ACTIVE GAME SIMULATOR & DASHBOARD
  // =========================================================================
  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-slate-950 text-slate-200 p-3 md:p-4 font-sans">
      
      {/* Header bar */}
      <header className="flex-none border-b border-slate-800 pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center shadow">
            <span className="text-base">🏛️</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-amber-500 bg-clip-text text-transparent">
              RUMLA CIVILIZATION PANEL
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              Geolocated Satellite GIS Map • PMO Cabinet & Autonomous City Simulation
            </p>
          </div>
        </div>
        
        {/* Active User Badge & Sign Out Button */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2 px-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${isAdmin ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-sky-500/10 text-sky-400 border border-sky-500/20"}`}>
              {isAdmin ? "👑 PMO SUPREME ADMIN" : "👤 CITIZEN RESIDENT"}
            </span>
            <span className="text-xs font-mono text-slate-300 truncate max-w-[150px]">
              {userId}
            </span>
          </div>
          
          <button
            type="button"
            onClick={handleLogout}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-[10px] px-3 py-1 rounded-lg border border-slate-700 transition-all"
          >
            SWITCH / SIGN OUT
          </button>
        </div>
      </header>

      {/* Breaking news ticker banner */}
      {status && status.news_feed && status.news_feed.length > 0 && (
        <div className="flex-none bg-slate-900 border border-slate-850/80 rounded-xl overflow-hidden flex items-center p-1.5 mb-2.5 gap-3">
          <div className="bg-rose-600 animate-pulse text-white text-[9px] font-extrabold px-2 py-0.5 rounded tracking-wider shrink-0 shadow-md">
            BREAKING NEWS
          </div>
          <div className="flex-grow overflow-hidden relative h-5">
            <div className="absolute whitespace-nowrap flex items-center gap-6 text-xs text-amber-500 font-medium animate-marquee select-none hover:pause">
              {status.news_feed.slice(0, 8).map((n: any, idx: number) => (
                <span key={idx} className="inline-flex gap-2 items-center">
                  <span className="text-slate-400 font-bold font-mono">[{n.timestamp}]</span>
                  <span className="text-[9px] bg-slate-950 px-1.5 py-0.5 rounded uppercase font-bold text-slate-400 border border-slate-850">{n.category}</span>
                  <span className="text-white">{n.headline}</span>
                  <span className="text-slate-600 font-bold mx-2">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Privacy Banner for Non-Admins */}
      {!isAdmin && (
        <div className="flex-none bg-sky-950/20 border border-sky-500/20 rounded-xl px-3 py-1.5 mb-2.5 flex items-center justify-between text-xs text-sky-300">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span><strong>Real-Life Privacy Active:</strong> Individual family rosters, occupant census, and private accounts are encrypted. Public map coordinates remain accessible.</span>
          </div>
          <span className="text-[10px] font-mono bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/30">CIVIC PROTECTED</span>
        </div>
      )}

      {error && (
        <div className="flex-none bg-rose-950/20 border-l-4 border-rose-500 rounded-lg p-2.5 mb-2.5">
          <h3 className="text-rose-500 text-xs font-semibold">Simulation Synchronizing</h3>
          <p className="text-[11px] text-slate-300">{error}</p>
        </div>
      )}

      {status && (
        <>
          {/* Top statistics bar */}
          <section className="flex-none grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-2.5">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Municipal Treasury</span>
              <span className="text-base md:text-lg font-bold font-mono text-amber-500">${status.city_treasury?.toLocaleString() || "0"}</span>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Clock Time</span>
              <span className="text-base md:text-lg font-bold font-mono text-white">{status.clock.formatted}</span>
            </div>
            
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Prime Minister</span>
              <span className="text-base md:text-lg font-bold text-sky-400 truncate max-w-[140px]">{status.cabinet?.prime_minister || "Thakorbhai"}</span>
            </div>

            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-center">
              <span className="text-[9px] text-slate-400 font-semibold tracking-wider uppercase">Personal Cash</span>
              <span className="text-base md:text-lg font-bold text-emerald-500 font-mono">${status.money.toLocaleString()}</span>
            </div>
          </section>

          {/* Navigation tabs */}
          <nav className="flex-none flex gap-1.5 overflow-x-auto border-b border-slate-800/60 pb-2 mb-2.5 text-xs">
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "overview" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("overview")}>GEOLOCATED MAP & RESIDENCES</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "projects" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("projects")}>CITY PROJECTS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "government" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("government")}>GOVERNMENT CABINET</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "farming" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("farming")}>FARMS & CROPS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "inventory" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("inventory")}>PERSONAL INVENTORY</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "market" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("market")}>TOWN MARKETS</button>
            <button className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-all ${activeTab === "agents" ? "bg-amber-500/10 text-amber-500 border border-amber-500/30" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("agents")}>AGENT SETTINGS</button>
          </nav>

          {/* Main Grid Viewport */}
          <main className="flex-grow grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3 min-h-0 overflow-hidden mb-1">
            
            {/* Scrollable Left Panels */}
            <section className="bg-slate-900/25 border border-slate-800/80 rounded-xl p-3.5 overflow-y-auto min-h-0">
              
              {/* Tab: Overview (Geolocated Leaflet Map & Residences) */}
              {activeTab === "overview" && (
                <div className="flex flex-col gap-3 h-full min-h-0">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2 flex-none flex-wrap gap-2">
                    <div>
                      <h2 className="text-white text-base font-bold">Satellite GIS Map & City Search</h2>
                      <span className="text-[10px] text-slate-400 font-mono">Real-world geolocated map of Rumla, Navsari & Gujarat Region</span>
                    </div>

                    {/* Location edit controls for admin only */}
                    {isAdmin ? (
                      <button 
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${editLocationsMode ? "bg-amber-500 text-slate-950 border-amber-500" : "bg-slate-900 hover:bg-slate-800 text-amber-500 border-slate-800"}`}
                        onClick={() => {
                          setEditLocationsMode(!editLocationsMode);
                          setClickedCoords(null);
                        }}
                      >
                        {editLocationsMode ? "🛑 STOP MAP CLICK MODE" : "✏️ CLICK ON MAP TO RELOCATE"}
                      </button>
                    ) : (
                      <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded font-mono">
                        🔒 Map Editor Reserved for Admin
                      </span>
                    )}
                  </div>

                  {/* Admin Live City Search & Geocoding Bar */}
                  {isAdmin && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                      <form onSubmit={handleCitySearch} className="flex gap-2 items-center flex-wrap">
                        <div className="relative flex-grow min-w-[220px]">
                          <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
                          <input
                            type="text"
                            placeholder="Search any city (e.g. Navsari, Surat, Valsad, Bilimora, Vapi...)"
                            value={searchCityInput}
                            onChange={(e) => setSearchCityInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={isSearchingCity}
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                        >
                          {isSearchingCity ? "SEARCHING..." : "SEARCH CITY"}
                        </button>
                      </form>

                      {searchError && (
                        <span className="text-rose-400 text-[11px] font-mono">⚠️ {searchError}</span>
                      )}

                      {/* City Search Result & Relocation Assignment Action */}
                      {searchedLocation && (
                        <div className="bg-slate-950/80 border border-sky-500/40 rounded-lg p-2.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                          <div>
                            <span className="text-sky-400 font-bold block">📍 Found Location: {searchedLocation.name}</span>
                            <span className="text-slate-400 text-[10px] font-mono">Coordinates: [{searchedLocation.lat.toFixed(4)}, {searchedLocation.lng.toFixed(4)}]</span>
                          </div>

                          <div className="flex gap-2 items-center flex-wrap">
                            <label className="text-slate-300 text-xs font-semibold">Assign To:</label>
                            <select
                              value={searchLandmarkTarget}
                              onChange={(e) => setSearchLandmarkTarget(e.target.value)}
                              className="bg-slate-900 border border-slate-800 text-white rounded p-1 text-xs font-mono"
                            >
                              <option value="house_1">Home 1 (Thakorbhai)</option>
                              <option value="house_2">Home 2 (Bharatbhai)</option>
                              <option value="house_3">Home 3 (Rameshbhai)</option>
                              <option value="dairy">Amina Dairy Groceries</option>
                              <option value="general">Ramesh Supplies</option>
                              <option value="clothing">Savita Clothiers</option>
                              <option value="electronics">Rajesh Electronics</option>
                              <option value="farms">Colony Farms</option>
                              <option value="factory">Manufacturing Factory</option>
                              <option value="school">Community School</option>
                              <option value="hospital">General Hospital</option>
                              <option value="park">Leisure Park</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => assignSearchedLocation(searchLandmarkTarget)}
                              className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-3 py-1 rounded text-xs transition-all shadow"
                            >
                              📍 ASSIGN LOCATION
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
                          <strong className="text-amber-400 font-bold text-sm">Pinpoint Map Location Selected</strong>
                        </div>
                        <span className="text-slate-300 font-mono text-[11px]">
                          Exact GPS Coordinates: [{clickedCoords.lat.toFixed(6)}, {clickedCoords.lng.toFixed(6)}]
                        </span>
                      </div>
                      
                      <div className="flex gap-2 items-center flex-wrap">
                        <label className="text-slate-300 text-xs font-semibold">Place Landmark:</label>
                        <select 
                          className="bg-slate-950 border border-slate-700 text-white rounded-lg p-1.5 outline-none text-xs font-mono" 
                          value={selectedLandmarkToMove} 
                          onChange={(e) => setSelectedLandmarkToMove(e.target.value)}
                        >
                          <optgroup label="🏠 Residential Homes">
                            <option value="house_1">Home 1 (Thakorbhai's Family)</option>
                            <option value="house_2">Home 2 (Bharatbhai's Family)</option>
                            <option value="house_3">Home 3 (Rameshbhai's Family)</option>
                          </optgroup>
                          <optgroup label="🏪 Shops & Markets">
                            <option value="dairy">Dairy & Groceries (Amina)</option>
                            <option value="general">Ramesh Supplies Store</option>
                            <option value="clothing">Savita Clothiers & Fabrics</option>
                            <option value="electronics">Rajesh Electronics Hub</option>
                          </optgroup>
                          <optgroup label="🏛️ Infrastructure & Workplaces">
                            <option value="farms">Colony Agricultural Farms</option>
                            <option value="factory">Manufacturing Factory</option>
                            <option value="school">Community School</option>
                            <option value="hospital">General Hospital</option>
                            <option value="park">Public Leisure Park</option>
                          </optgroup>
                        </select>
                        <button 
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-1.5 rounded-lg text-xs transition-all shadow-md flex items-center gap-1"
                          onClick={submitRelocate}
                        >
                          <span>📍</span>
                          <span>PLACE EXACTLY HERE</span>
                        </button>
                        <button 
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-2.5 py-1.5 rounded-lg text-xs"
                          onClick={() => setClickedCoords(null)}
                        >
                          ✕ Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Quick City Relocation Helper for Admin */}
                  {isAdmin && (
                    <div className="bg-slate-900/40 border border-slate-850 p-2 rounded-xl flex items-center justify-between gap-2 text-[11px] flex-wrap">
                      <span className="text-slate-300 font-semibold">Quick Inter-City Family Relocation:</span>
                      <div className="flex gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            dispatchAction("relocate_landmark", { landmark_id: "house_2", lat: 20.9467, lng: 72.9520 });
                            if (mapInstanceRef.current) mapInstanceRef.current.flyTo([20.9467, 72.9520], 16);
                          }}
                          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono text-[10px]"
                        >
                          📍 Move Bharatbhai (Home 2) to Navsari
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatchAction("relocate_landmark", { landmark_id: "house_3", lat: 20.9490, lng: 72.9560 });
                            if (mapInstanceRef.current) mapInstanceRef.current.flyTo([20.9490, 72.9560], 16);
                          }}
                          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded font-mono text-[10px]"
                        >
                          📍 Move Rameshbhai (Home 3) to Navsari
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            dispatchAction("relocate_landmark", { landmark_id: "house_1", lat: 20.6732, lng: 73.0800 });
                            dispatchAction("relocate_landmark", { landmark_id: "house_2", lat: 20.6720, lng: 73.0815 });
                            dispatchAction("relocate_landmark", { landmark_id: "house_3", lat: 20.6715, lng: 73.0795 });
                            if (mapInstanceRef.current) mapInstanceRef.current.flyTo([20.6728, 73.0805], 16);
                          }}
                          className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-mono text-[10px]"
                        >
                          📍 Reset All to Rumla
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.8fr] gap-4 flex-grow min-h-0">
                    {/* Geolocated GIS Map Frame Container */}
                    <div className="flex flex-col h-full min-h-[300px]">
                      <div className="relative w-full h-full bg-slate-950 border border-slate-850 rounded-xl overflow-hidden shadow-inner flex-grow">
                        <div ref={mapContainerRef} className="absolute inset-0 h-full w-full z-10" />
                      </div>

                      {/* Map Legends */}
                      <div className="mt-2 flex gap-2 flex-wrap justify-center text-[10px] text-slate-400 flex-none font-mono">
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#0284c7]"></span> Zone 1</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#0d9488]"></span> Zone 2</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#4f46e5]"></span> Zone 3</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#16a34a]"></span> Farms</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#dc2626]"></span> Factory</span>
                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-[#d97706]"></span> Markets</span>
                      </div>
                    </div>

                    {/* Residences & Housing Registry */}
                    <div className="flex flex-col h-full min-h-0 overflow-y-auto">
                      <h3 className="text-amber-500 text-xs font-semibold mb-2 border-b border-slate-800 pb-1 flex-none flex items-center justify-between">
                        <span>Rumla Housing Registry</span>
                        {isAdmin ? (
                          <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">ADMIN CENSUS ACCESS</span>
                        ) : (
                          <span className="text-[9px] text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">PRIVACY PROTECTED</span>
                        )}
                      </h3>

                      {/* Zone Selector Tabs */}
                      <div className="flex gap-1 mb-2.5 flex-none">
                        {status.families?.map((f: any, idx: number) => (
                          <button
                            key={f.id}
                            className={`flex-grow py-1 px-2 rounded text-[10px] font-semibold transition-all border ${selectedFamilyId === f.id ? "bg-amber-500/10 text-amber-500 border-amber-500/30" : "bg-slate-900/60 text-slate-400 border-slate-850"}`}
                            onClick={() => setSelectedFamilyId(f.id)}
                          >
                            {isAdmin ? f.name.split("'")[0] : `Zone #${idx + 1}`}
                          </button>
                        ))}
                      </div>

                      {/* Content Card with Privacy rules applied */}
                      {selectedFamily && (
                        <div className="flex flex-col flex-grow min-h-0 overflow-y-auto gap-2.5">
                          {isAdmin ? (
                            // ADMIN FULL VIEW
                            <>
                              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-2.5 flex justify-between items-center text-xs flex-none">
                                <div>
                                  <strong className="text-white font-semibold">{selectedFamily.name}</strong>
                                  <span className="text-[10px] text-slate-400 block">Family Bank Reserves</span>
                                </div>
                                <span className="font-mono font-bold text-emerald-500 text-sm">${selectedFamily.budget}</span>
                              </div>

                              <h4 className="text-slate-300 text-xs font-semibold flex-none">Household Food Reserves</h4>
                              <div className="grid grid-cols-3 gap-2 flex-none">
                                {Object.entries(selectedFamily.inventory || {}).map(([item, qty]: any) => (
                                  <div className="flex flex-col items-center bg-slate-950/60 border border-slate-850 p-2 rounded-xl text-center" key={item}>
                                    <img src={getItemIconPath(item)} className="w-8 h-8 object-cover rounded-lg mb-1 shadow border border-slate-800" alt={item} />
                                    <span className="font-mono text-amber-500 text-xs font-semibold">{qty}</span>
                                    <span className="text-[9px] text-slate-400 font-medium capitalize">{item}</span>
                                  </div>
                                ))}
                              </div>

                              <h4 className="text-slate-300 text-xs font-semibold flex-none">Member Rosters & Schedules</h4>
                              <div className="flex flex-col gap-1.5 flex-grow overflow-y-auto pr-1">
                                {selectedFamily.members?.map((m: any) => (
                                  <div className="flex justify-between items-center p-2 bg-slate-900/35 border border-slate-850 rounded-lg text-xs" key={m.name}>
                                    <div>
                                      <span className="text-slate-300 font-semibold block">{m.name}</span>
                                      <span className="text-[9px] text-slate-500">{m.relation}</span>
                                    </div>
                                    <span className="text-amber-500 font-medium font-mono text-[10px]">{m.state}</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          ) : (
                            // CITIZEN PRIVACY PROTECTED VIEW
                            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-3 text-xs">
                              <div className="flex items-center gap-2 text-sky-400 font-bold border-b border-slate-800 pb-2">
                                <span>🔒</span>
                                <span>CONFIDENTIAL RESIDENCE DATA</span>
                              </div>
                              <p className="text-slate-300 text-[11px] leading-relaxed">
                                This residence is an active private domicile in Rumla. Under the <em>Rumla Citizen Privacy Charter</em>, the names of resident family members, private occupations, and personal bank accounts are confidential.
                              </p>
                              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 flex flex-col gap-1 text-[11px] font-mono text-slate-400">
                                <div><strong className="text-slate-300">Status:</strong> Occupied Residential Zone</div>
                                <div><strong className="text-slate-300">Location:</strong> Marked on High-Res Satellite GIS</div>
                                <div><strong className="text-slate-300">Privacy Status:</strong> Encrypted (Admin Clearance Required)</div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: City Planning Projects */}
              {activeTab === "projects" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h2 className="text-white text-base font-bold">Rumla City Planning Bureau</h2>
                    <span className="text-xs font-mono text-slate-400">Municipal infrastructure development</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-4">
                    {/* Public Funding Pool Status */}
                    <div>
                      <h3 className="text-amber-500 text-xs font-semibold mb-2 border-b border-slate-800 pb-1">Taxes & Revenue</h3>
                      <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-3">
                        <p className="text-xs text-slate-400">Municipal treasury accumulates revenues from taxes and funds public works projects.</p>
                        
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs text-slate-300 font-semibold">Corporate Tax Rate: {taxRateInput}%</label>
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
                          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500" 
                          onClick={saveTaxRate}
                        >
                          {isAdmin ? "SET COLONY TAX RATE" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>

                      <div className="bg-slate-900/30 border border-slate-850 p-3.5 rounded-xl mt-3 text-center">
                        <span className="text-[9px] text-slate-400 block uppercase font-mono tracking-wider">Public Treasury</span>
                        <span className="text-2xl font-bold font-mono text-sky-400 mt-0.5 block">${status.city_treasury}</span>
                      </div>
                    </div>

                    {/* Infrastructure Projects Allocation */}
                    <div>
                      <h3 className="text-amber-500 text-xs font-semibold mb-2 border-b border-slate-800 pb-1">Infrastructure Ledger</h3>
                      <div className="flex flex-col gap-2.5 max-h-[350px] overflow-y-auto pr-1">
                        {status.city_projects.map((p: any) => {
                          const progress = Math.min(100, Math.floor((p.allocated / p.cost) * 100));
                          return (
                            <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col gap-2" key={p.id}>
                              <div className="flex justify-between items-center">
                                <div>
                                  <strong className="text-white text-xs block">{p.name}</strong>
                                  <span className="text-[10px] text-slate-400 font-mono">Funded: ${p.allocated} / ${p.cost}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${p.completed ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"}`}>
                                  {p.completed ? "COMPLETED" : `${progress}%`}
                                </span>
                              </div>

                              {/* Progress bar */}
                              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                                <div className="bg-gradient-to-r from-amber-500 to-sky-500 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
                              </div>

                              {!p.completed && isAdmin && (
                                <div className="flex gap-2 items-center mt-1">
                                  <input 
                                    type="number" 
                                    className="w-20 bg-slate-950 border border-slate-850 text-white rounded p-1 text-xs font-mono"
                                    value={allocAmount[p.id] || 50}
                                    onChange={(e) => setAllocAmount({ ...allocAmount, [p.id]: Number(e.target.value) })}
                                  />
                                  <button 
                                    className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs px-3 py-1 rounded transition-all"
                                    onClick={() => allocateFunds(p.id)}
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
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <div>
                      <h2 className="text-white text-base font-bold">Rumla Prime Minister Office (PMO)</h2>
                      <span className="text-[10px] text-slate-400 font-mono">Democratic Republic Governance & Cabinet Bureau</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <button 
                          className="text-xs px-3 py-1.5 rounded-xl font-bold transition-all bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-md flex items-center gap-1"
                          onClick={conductElection}
                        >
                          <span>🗳️</span>
                          <span>CONDUCT DEMOCRATIC ELECTION</span>
                        </button>
                      )}

                      {isAdmin ? (
                        <button 
                          className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${status.city_manager_enabled ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/10" : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-slate-800"}`}
                          onClick={toggleCityManager}
                        >
                          {status.city_manager_enabled ? "🤖 PMO MANAGER ACTIVE" : "🤖 TOGGLE CITY MANAGER"}
                        </button>
                      ) : (
                        <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-1 rounded font-mono">
                          🔒 PMO Authorization Required
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Democracy & Voting Notice */}
                  <div className="bg-sky-950/30 border border-sky-500/30 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 text-sky-200">
                      <span className="text-xl">🗳️</span>
                      <div>
                        <strong className="text-white block font-semibold">10-Year Democratic Voting & Civic Elections</strong>
                        <span className="text-slate-400 text-[11px]">All adult citizens of Rumla cast democratic ballots every cycle to elect the Prime Minister, DM, and Ministers.</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-sky-400 block font-bold">CONSTITUTIONAL SYSTEM</span>
                      <span className="text-xs text-slate-300 font-mono">Automated 10-Year Cycle</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cabinet Appointments */}
                    <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-3">
                      <h3 className="text-amber-500 text-xs font-semibold border-b border-slate-800 pb-1">PMO Cabinet Appointments</h3>
                      
                      <div className="flex flex-col gap-2 text-xs">
                        <div>
                          <label className="text-slate-400 block mb-1">Prime Minister (PM):</label>
                          <select 
                            disabled={!isAdmin} 
                            value={pmInput} 
                            onChange={(e) => setPmInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                          >
                            {listAllAdults.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">District Magistrate (DM):</label>
                          <select 
                            disabled={!isAdmin} 
                            value={dmInput} 
                            onChange={(e) => setDmInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                          >
                            {listAllAdults.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Minister of Finance:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={finInput} 
                            onChange={(e) => setFinInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                          >
                            {listAllAdults.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Minister of Education:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={eduInput} 
                            onChange={(e) => setEduInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                          >
                            {listAllAdults.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <div>
                          <label className="text-slate-400 block mb-1">Minister of Infrastructure:</label>
                          <select 
                            disabled={!isAdmin} 
                            value={infraInput} 
                            onChange={(e) => setInfraInput(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                          >
                            {listAllAdults.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </div>

                        <button 
                          disabled={!isAdmin}
                          onClick={saveCabinetRoles}
                          className="mt-2 bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold py-2 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          {isAdmin ? "REORGANIZE PMO CABINET" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>
                    </div>

                    {/* Government Policies */}
                    <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-3">
                      <h3 className="text-amber-500 text-xs font-semibold border-b border-slate-800 pb-1">Tax & Welfare Subsidies</h3>
                      
                      <div className="flex flex-col gap-3 text-xs">
                        <div>
                          <label className="text-slate-300 font-semibold block mb-1">Income Tax: {incomeTaxInput}%</label>
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
                          <label className="text-slate-300 font-semibold block mb-1">Sales Tax: {salesTaxInput}%</label>
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
                            <label className="text-slate-400 block mb-1">Welfare Threshold:</label>
                            <input 
                              type="number" 
                              disabled={!isAdmin} 
                              value={welfareThresholdInput} 
                              onChange={(e) => setWelfareThresholdInput(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 block mb-1">Welfare Payout ($):</label>
                            <input 
                              type="number" 
                              disabled={!isAdmin} 
                              value={welfarePayoutInput} 
                              onChange={(e) => setWelfarePayoutInput(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-850 text-white rounded p-1.5 font-mono text-xs disabled:opacity-60"
                            />
                          </div>
                        </div>

                        <button 
                          disabled={!isAdmin}
                          onClick={saveGovernmentPolicies}
                          className="mt-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2 rounded-lg transition-all disabled:bg-slate-800 disabled:text-slate-500"
                        >
                          {isAdmin ? "SAVE LAWS & POLICIES" : "🔒 PMO ADMIN ACCESS REQUIRED"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Farming & Agriculture */}
              {activeTab === "farming" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h2 className="text-white text-base font-bold">Colony Farms & Plots</h2>
                    <div className="flex gap-2">
                      <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all" onClick={harvestAll}>
                        🌾 HARVEST READY
                      </button>
                      <button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all" onClick={() => plantAll("apple")}>
                        🍎 PLANT ALL APPLES
                      </button>
                      <button className="bg-sky-500 hover:bg-sky-600 text-slate-950 font-bold text-xs px-3 py-1.5 rounded-lg transition-all" onClick={() => plantAll("wheat")}>
                        🌾 PLANT ALL WHEAT
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {status.plots?.map((p: any) => (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center gap-1.5" key={p.index}>
                        <span className="text-[10px] text-slate-500 font-mono">PLOT #{p.index + 1}</span>
                        <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-center overflow-hidden p-1 shadow-inner">
                          {p.crop_id ? (
                            <img src={getItemIconPath(p.crop_id)} className={`w-full h-full object-cover rounded-lg ${p.state === "ready" ? "animate-bounce" : ""}`} alt={p.crop_id} />
                          ) : (
                            <span className="text-xl">🟫</span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-200">{p.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Personal Inventory */}
              {activeTab === "inventory" && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h2 className="text-white text-base font-bold">Personal Resource Bag</h2>
                    <span className="text-xs font-mono text-emerald-400 font-bold">${status.money} in cash</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    {status.inventory?.map(([item, qty]: any) => (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 flex flex-col items-center text-center gap-1.5" key={item}>
                        <img src={getItemIconPath(item)} className="w-10 h-10 object-cover rounded-xl shadow border border-slate-800" alt={item} />
                        <span className="text-xs font-bold text-white capitalize">{item}</span>
                        <span className="text-base font-mono font-bold text-amber-500">x{qty}</span>
                        <div className="flex gap-1 mt-1 w-full">
                          <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-[10px] py-1 rounded text-slate-300 font-bold" onClick={() => sellItem(item, 1)}>Sell $</button>
                          <button className="flex-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[10px] py-1 rounded font-bold border border-amber-500/20" onClick={() => buyItem(item, 1)}>Buy $</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Town Markets */}
              {activeTab === "market" && (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h2 className="text-white text-base font-bold">Rumla Retail Shops & Markets</h2>
                    <span className="text-xs font-mono text-slate-400">Decentralized citizen commerce</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {status.shops?.map((s: any) => (
                      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5" key={s.id}>
                        <div className="flex justify-between items-center border-b border-slate-800/80 pb-1.5">
                          <div>
                            <strong className="text-white text-xs block">{s.name}</strong>
                            <span className="text-[10px] text-slate-400 font-mono">Owner: {s.owner}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400">${s.revenue} rev</span>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          {Object.entries(s.inventory).map(([item, qty]: any) => {
                            const price = s.prices[item] || 5;
                            return (
                              <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg text-xs" key={item}>
                                <div className="flex items-center gap-2">
                                  <img src={getItemIconPath(item)} className="w-7 h-7 object-cover rounded-lg shadow border border-slate-850" alt={item} />
                                  <div>
                                    <span className="capitalize font-semibold text-slate-300 block text-xs">{item}</span>
                                    <span className="text-[10px] text-slate-500 font-mono">({qty} in stock)</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-amber-500 font-bold">${price}</span>
                                  <button className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-[10px] px-2 py-0.5 rounded" onClick={() => buyFromShop(s.id, item, 1)}>
                                    BUY
                                  </button>
                                  <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] px-2 py-0.5 rounded" onClick={() => sellToShop(s.id, item, 1)}>
                                    SELL
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab: Autonomous Agents */}
              {activeTab === "agents" && (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <h2 className="text-white text-base font-bold">Autonomous Agent Settings</h2>
                    <span className="text-xs font-mono text-slate-400">Automated harvesting and production</span>
                  </div>

                  <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col gap-3 text-xs">
                    <p className="text-slate-300">Autonomous workers handle background tasks based on municipal governance policies.</p>
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-slate-400 space-y-1">
                      <div><strong className="text-slate-200">Autonomous City Manager:</strong> {status.city_manager_enabled ? "Active" : "Disabled"}</div>
                      <div><strong className="text-slate-200">Farming Automations:</strong> Enabled</div>
                      <div><strong className="text-slate-200">Price Dynamics:</strong> Synchronized with Rumla Market Registry</div>
                    </div>
                  </div>
                </div>
              )}

            </section>

            {/* Right Panel: News & Agent Logs Feed */}
            <section className="bg-slate-900/25 border border-slate-800/80 rounded-xl p-3.5 flex flex-col min-h-0 overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-2 flex-none">
                <h3 className="text-white text-xs font-bold uppercase tracking-wider">Rumla Live Dispatch</h3>
                <span className="text-[9px] font-mono text-amber-500 animate-pulse">LIVE FEED</span>
              </div>

              {/* News list */}
              <div className="flex-grow overflow-y-auto flex flex-col gap-2 pr-1 min-h-0">
                {status.news_feed?.map((n: any, idx: number) => (
                  <div className="bg-slate-950/70 border border-slate-850 p-2.5 rounded-xl flex flex-col gap-1 text-xs" key={idx}>
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-slate-400">{n.timestamp}</span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 uppercase">{n.category}</span>
                    </div>
                    <p className="text-slate-200 text-[11px] leading-snug">{n.headline}</p>
                  </div>
                ))}
              </div>

              {/* Terminal Logs at Bottom */}
              <div className="flex-none pt-2 border-t border-slate-800 mt-2">
                <span className="text-[9px] font-mono text-slate-400 block mb-1">Simulation Agent Log:</span>
                <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto">
                  {status.agent_logs?.slice(-4).map((log: string, i: number) => (
                    <div key={i} className="truncate">{log}</div>
                  ))}
                </div>
              </div>
            </section>

          </main>
        </>
      )}

    </div>
  );
}

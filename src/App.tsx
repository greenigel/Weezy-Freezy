import { useState, useEffect } from "react";
import { 
  SensorData, 
  ActuatorState, 
  GrowProfile, 
  ApiLogEntry, 
  ControllerState 
} from "./types";

import MetricCard from "./components/MetricCard";
import ActuatorControl from "./components/ActuatorControl";
import GrowCharts from "./components/GrowCharts";
import ProfileManager from "./components/ProfileManager";
import ApiDeveloperPanel from "./components/ApiDeveloperPanel";
import CultivationAssistant from "./components/CultivationAssistant";

import { 
  Thermometer, 
  Droplet, 
  Sliders, 
  Activity, 
  Calendar, 
  Heart, 
  Wifi, 
  Sparkles, 
  Info, 
  Waves,
  RefreshCw,
  Clock,
  ExternalLink
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "charts" | "profiles" | "api">("dashboard");
  
  // Real-time states
  const [sensors, setSensors] = useState<SensorData>({
    temperature: null,
    humidity: null,
    co2: null,
    soilMoisture: null,
    ph: null,
    ec: null,
    waterTemp: null,
    recordedAt: new Date().toISOString()
  });
  
  const [actuators, setActuators] = useState<ActuatorState>({
    light: false,
    lightCoolingFan: false,
    cooling: false,
    co2Valve: false,
    fan: false,
    humidifier: false,
    pump: false,
    phUpPump: false,
    phDownPump: false,
    ecNutrientPump: false
  });
  
  const [overrideActuators, setOverrideActuators] = useState<Partial<Record<keyof ActuatorState, boolean>>>({});
  const [activeProfile, setActiveProfile] = useState<GrowProfile | null>(null);
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [cultivationMode, setCultivationMode] = useState<'bio' | 'mineralisch'>('bio');
  const [lastTelemetryTime, setLastTelemetryTime] = useState("");
  
  // Lists
  const [profiles, setProfiles] = useState<GrowProfile[]>([]);
  const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);
  
  // Loading & Action locks
  const [isLoading, setIsLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [isOffline, setIsOffline] = useState(false);

  // Auto-resolve current URL route base
  useEffect(() => {
    if (typeof window !== "undefined") {
      setServerUrl(window.location.origin);
    }
  }, []);

  // 1. Polling interval to fetch current controller state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch("/api/state");
        if (!res.ok) throw new Error("Server error");
        const data: ControllerState = await res.json();
        
        setSensors(data.currentSensors);
        setActuators(data.actuators);
        setOverrideActuators(data.overrideActuators || {});
        setActiveProfile(data.activeProfile);
        setIsAutoMode(data.isAutoMode);
        setCultivationMode(data.cultivationMode);
        setLastTelemetryTime(data.lastTelemetryTime);
        setIsOffline(false);
      } catch (err) {
        console.warn("Backend state fetch failed, running simulated mode:", err);
        setIsOffline(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 2500); // Poll every 2.5 seconds
    return () => clearInterval(interval);
  }, []);

  // 2. Poll API logs in background
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        // Fetch API Logs
        const logsRes = await fetch("/api/logs");
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setApiLogs(logsData);
        }
      } catch (e) {
        console.warn("Logs query failed", e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 4000); // Poll logs every 4 seconds
    return () => clearInterval(interval);
  }, []);

  // 3. Query grow profiles list once on startup
  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/profiles");
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
      }
    } catch (e) {
      console.warn("Profiles retrieve failed");
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  // Telemetry charts history fetcher
  const [historyData, setHistoryData] = useState<SensorData[]>([]);
  const fetchHistory = async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistoryData(data);
      }
    } catch (e) {
      console.warn("History retrieve failed", e);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 8000); // Refresh history charts every 8 seconds
    return () => clearInterval(interval);
  }, []);

  // === MUTATION TRIGGERS ON SERVER ===

  // Manual Trigger: Toggle physical relay states
  const handleToggleActuator = async (key: keyof ActuatorState, value: boolean) => {
    // Pessimistic state prediction for lagless toggling
    setActuators(prev => ({ ...prev, [key]: value }));
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      });
      if (res.ok) {
        const data = await res.json();
        setSensors(data.controllerState.currentSensors);
        setActuators(data.controllerState.actuators);
        setOverrideActuators(data.controllerState.overrideActuators || {});
      }
    } catch (e) {
      console.error("Relay toggle failed", e);
    }
  };

  // Switch Automodus vs Manual guiding
  const handleToggleAutoMode = async (autoMode: boolean) => {
    setIsAutoMode(autoMode);
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoMode })
      });
      if (res.ok) {
        const data = await res.json();
        setActuators(data.controllerState.actuators);
        setOverrideActuators(data.controllerState.overrideActuators || {});
        setIsAutoMode(data.controllerState.isAutoMode);
      }
    } catch (e) {
      console.error("Auto state toggle failed", e);
    }
  };

  // Change cultivation mode
  const handleToggleCultivationMode = async (mode: 'bio' | 'mineralisch') => {
    setCultivationMode(mode);
    try {
      const res = await fetch("/api/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cultivationMode: mode })
      });
      if (res.ok) {
        const data = await res.json();
        setCultivationMode(data.controllerState.cultivationMode);
        setActuators(data.controllerState.actuators);
      }
    } catch (e) {
      console.error("Cultivation mode toggle failed", e);
    }
  };

  // Change active profile selection
  const handleSelectProfile = async (profileId: string) => {
    try {
      const res = await fetch("/api/profiles/active", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveProfile(data.controllerState.activeProfile);
        setActuators(data.controllerState.actuators);
        setOverrideActuators(data.controllerState.overrideActuators || {});
        fetchHistory(); // refresh history database with new profile simulation seed
      }
    } catch (e) {
      console.error("Profile change fail", e);
    }
  };

  // Create or update a profile on the server
  const handleUpdateProfile = async (profile: GrowProfile) => {
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile)
      });
      if (res.ok) {
        fetchProfiles();
        // Check if currently active
        if (profile.id === activeProfile?.id) {
          setActiveProfile(profile);
        }
      }
    } catch (e) {
      console.error("Profile update fail", e);
    }
  };

  // Clear and Reseed database analytic logs
  const handleResetHistory = async () => {
    setIsResetting(true);
    try {
      const res = await fetch("/api/history/reset", { method: "POST" });
      if (res.ok) {
        await fetchHistory();
      }
    } catch (e) {
      console.error("Reset fail", e);
    } finally {
      setIsResetting(false);
    }
  };

  // Evaluate sensor thresholds vs current active targets to define warning status
  const evaluateSensorStatus = (
    key: keyof SensorData,
    currentVal: number,
    targetVal: number,
    warningWidth: number,
    criticalWidth: number
  ): "success" | "warning" | "error" | "inactive" => {
    if (activeProfile?.stage === "drying" && (key === "soilMoisture" || key === "ph" || key === "ec")) {
      return "inactive"; // irrelevant in drying box
    }
    
    const diff = Math.abs(currentVal - targetVal);
    if (diff > criticalWidth) return "error";
    if (diff > warningWidth) return "warning";
    return "success";
  };

  return (
    <div className="min-h-screen bg-[#0c0f12] text-slate-100 flex flex-col antialiased select-none font-sans">
      
      {/* ⚠️ OFFLINE / INITIAL CONNECTION LOADER BANNER */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <span className="text-xl font-bold tracking-wider font-mono">CannaGrow Core</span>
          </div>
          <p className="text-xs text-slate-400 font-medium">Lade klimatologische Dashboards und API-Schnittstellen...</p>
        </div>
      )}

      {/* Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
              🌱
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-white tracking-tight">CannaGrow Controller</h1>
                <span className="rounded px-1.5 py-0.2 text-4xs font-mono font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  v2.8 - REST API
                </span>
              </div>
              <p className="text-3xs text-slate-400 mt-0.5 max-w-md">
                DIY Kühlschrank-Growkammer Steuerung &amp; pH/EC-Gleichrichter
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Connection state details */}
            <div className="flex items-center space-x-2 bg-slate-950/80 rounded-xl border border-slate-800/60 px-3.5 py-1.5 text-3xs font-mono text-slate-450 font-bold shrink-0">
              <Wifi className={`h-3.5 w-3.5 ${isOffline ? "text-rose-500" : "text-emerald-400"} shrink-0`} />
              <span>
                {isOffline ? "OFFLINE (Demo-Sim)" : "PI / ESP CONNECTED"}
              </span>
              <span className="text-slate-700">|</span>
              <Clock className="h-3 w-3 text-slate-500 shrink-0" />
              <span className="text-slate-400 font-mono">
                Last Telemetry: {lastTelemetryTime ? new Date(lastTelemetryTime).toLocaleTimeString() : "N/A"}
              </span>
            </div>

            {/* Active profile badge */}
            {activeProfile && (
              <div className="hidden lg:flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3.5 py-1.5 text-3xs shrink-0 select-none">
                <span className="text-slate-400 font-bold">Strain:</span>
                <span className="text-emerald-400 font-extrabold">{activeProfile.name}</span>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Primary Layout Container */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 lg:p-8 space-y-6">
        
        {/* TABS SELECTOR NAVIGATIONBAR */}
        <div className="flex flex-wrap items-center bg-slate-900/40 p-1 border border-slate-800/50 rounded-xl max-w-max select-none">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center space-x-2 px-4.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
              activeTab === "dashboard"
                ? "bg-slate-800 text-white"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            <Activity className="h-4.5 w-4.5 stroke-[2]" />
            <span>Kammermonitor</span>
          </button>

          <button
            onClick={() => setActiveTab("charts")}
            className={`flex items-center space-x-2 px-4.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
              activeTab === "charts"
                ? "bg-slate-800 text-white"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            <Calendar className="h-4.5 w-4.5 stroke-[2]" />
            <span>Historischer Verlauf</span>
          </button>

          <button
            onClick={() => setActiveTab("profiles")}
            className={`flex items-center space-x-2 px-4.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
              activeTab === "profiles"
                ? "bg-slate-800 text-white"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            <Heart className="h-4.5 w-4.5 stroke-[2]" />
            <span>Klimarezepte</span>
          </button>

          <button
            onClick={() => setActiveTab("api")}
            className={`flex items-center space-x-2 px-4.5 py-2 text-xs font-bold leading-none rounded-lg transition-all ${
              activeTab === "api"
                ? "bg-slate-800 text-white"
                : "text-slate-450 hover:text-slate-200"
            }`}
          >
            <Wifi className="h-4.5 w-4.5 stroke-[2]" />
            <span>Hardware einrichten</span>
          </button>
        </div>

        {/* TAB 1: OVERVIEW DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            
            {/* Active Climate Banner Summary */}
            {activeProfile && (
              <div id="grow-stage-banner-summary" className="p-4 rounded-xl border border-slate-800 bg-slate-900/10 flex flex-col md:flex-row md:items-center justify-between text-xs gap-4">
                <div className="flex items-center space-x-2.5">
                  <Info className="h-4 w-4 text-emerald-400 shrink-0" />
                  <p className="text-slate-300">
                    Sollbereich-Einhaltung für die Phase 
                    <span className="font-bold text-white uppercase tracking-wider mx-1 rounded bg-slate-800 px-1.5 py-0.5 text-3xs font-mono">{activeProfile.stage}</span>: 
                    Der Raspberry Pi drosselt/pumpt automatisch, um Zielwerte anzugleichen.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 text-3xs text-slate-500 font-mono">
                  <span>Autocontrol:</span>
                  <span className={`font-bold uppercase ${isAutoMode ? "text-emerald-400" : "text-amber-400"}`}>
                    {isAutoMode ? "Aktiviert & Regelt" : "Gesperrt / Manuelle Führung"}
                  </span>
                </div>
              </div>
            )}

            {/* Dual Column Layout with Cultivation Assistant Companion Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* PRIMARY PANEL: CHAMBER METRICS & HARDWARE CONTROLS */}
              <div className="lg:col-span-8 space-y-6">
                {activeProfile && (
                  <div id="gauges-metric-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {/* 1. Cabinet Temp */}
                    <MetricCard
                      title="Raum-Temperatur"
                      value={sensors.temperature !== null ? sensors.temperature.toFixed(1) : "---"}
                      unit="°C"
                      target={actuators.light ? activeProfile.targetTempDay : activeProfile.targetTempNight}
                      icon={<Thermometer className="h-6 w-6" />}
                      status={sensors.temperature !== null ? evaluateSensorStatus(
                        "temperature",
                        sensors.temperature,
                        actuators.light ? activeProfile.targetTempDay : activeProfile.targetTempNight,
                        1.5,
                        3.5
                      ) : "inactive"}
                      description="Abluft springt an, sobald die Kammerwärme steigt."
                    />

                    {/* 2. Humidit */}
                    <MetricCard
                      title="Luftfeuchtigkeit (rH)"
                      value={sensors.humidity !== null ? sensors.humidity.toFixed(1) : "---"}
                      unit="%"
                      target={activeProfile.targetHumidity}
                      icon={<Droplet className="h-6 w-6" />}
                      status={sensors.humidity !== null ? evaluateSensorStatus(
                        "humidity",
                        sensors.humidity,
                        activeProfile.targetHumidity,
                        5.0,
                        12.0
                      ) : "inactive"}
                      description="Humidier speist Aerosol ein. Lüfter lüftet bei Feuchtepeaks."
                    />

                    {/* 3. CO2 */}
                    <MetricCard
                      title="CO² Gehalt"
                      value={sensors.co2 !== null ? sensors.co2 : "---"}
                      unit="ppm"
                      target={activeProfile.targetCo2}
                      icon={<Sliders className="h-6 w-6" />}
                      status={sensors.co2 !== null ? evaluateSensorStatus(
                        "co2",
                        sensors.co2,
                        activeProfile.targetCo2,
                        120,
                        350
                      ) : "inactive"}
                      description="Relaisventil spritzt CO2 nur unter künstlicher Beleuchtung."
                    />

                    {/* 4. Soil moisture */}
                    <MetricCard
                      title="Bodenfeuchtigkeit"
                      value={sensors.soilMoisture !== null ? sensors.soilMoisture.toFixed(1) : "---"}
                      unit="%"
                      target={activeProfile.targetSoilMoisture}
                      icon={<Waves className="h-6 w-6" />}
                      status={sensors.soilMoisture !== null ? evaluateSensorStatus(
                        "soilMoisture",
                        sensors.soilMoisture,
                        activeProfile.targetSoilMoisture,
                        6.0,
                        15.0
                      ) : "inactive"}
                      description="Substratfeuchtigkeit des Teku-Topfes über kapazitiven SPI-Sensor."
                    />

                    {/* 5. ph-value */}
                    <MetricCard
                      title="Wasser pH-Wert"
                      value={sensors.ph !== null ? sensors.ph.toFixed(2) : "---"}
                      unit="pH"
                      target={activeProfile.targetPh}
                      icon={<Sliders className="h-6 w-6" />}
                      status={sensors.ph !== null ? evaluateSensorStatus(
                        "ph",
                        sensors.ph,
                        activeProfile.targetPh,
                        0.15,
                        0.4
                      ) : "inactive"}
                      description="Wichtig für Ionenaufnahme. Dosierpumpe spritzt Korrektur-Säuren."
                    />

                    {/* 6. EC electrical conduct */}
                    <MetricCard
                      title="Wasser Leitwert (EC)"
                      value={sensors.ec !== null ? sensors.ec.toFixed(2) : "---"}
                      unit="mS"
                      target={activeProfile.targetEc}
                      icon={<Droplet className="h-6 w-6" />}
                      status={sensors.ec !== null ? evaluateSensorStatus(
                        "ec",
                        sensors.ec,
                        activeProfile.targetEc,
                        0.15,
                        0.35
                      ) : "inactive"}
                      description="Nährstoffkonzentration des Hydroponiktanks."
                    />

                    {/* 7. Water temperature */}
                    <MetricCard
                      title="Wassertemperatur"
                      value={sensors.waterTemp !== null ? sensors.waterTemp.toFixed(1) : "---"}
                      unit="°C"
                      target="18 - 21"
                      icon={<Thermometer className="h-6 w-6" />}
                      status={sensors.waterTemp === null ? "inactive" : (sensors.waterTemp > 23 ? "warning" : sensors.waterTemp < 15 ? "warning" : "success")}
                      description="Kühle Nährlösung speichert mehr Sauerstoff und beugt Wurzelfäule vor."
                    />

                    {/* 8. Light hours status */}
                    <MetricCard
                      title="Beleuchtung AN/AUS"
                      value={actuators.light ? "AN" : "AUS"}
                      unit=""
                      target={`${activeProfile.lightOnDuration}h / Tag`}
                      icon={<Sparkles className="h-6 w-6" />}
                      status={actuators.light ? "success" : "inactive"}
                      description="Moduliert den Photoperioden-Wachstumszyklus des Strains."
                    />
                  </div>
                )}

                {/* ACTUATOR CONTROL PANEL CHIPS */}
                <ActuatorControl
                  actuators={actuators}
                  overrideActuators={overrideActuators}
                  isAutoMode={isAutoMode}
                  cultivationMode={cultivationMode}
                  onToggleActuator={handleToggleActuator}
                  onToggleAutoMode={handleToggleAutoMode}
                  onToggleCultivationMode={handleToggleCultivationMode}
                />
              </div>

              {/* SECONDARY PANEL: LIVE CAM & SCHEDULER INTERVENTIONS */}
              <div className="lg:col-span-4">
                <CultivationAssistant />
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: HISTORICAL ANALYTICS */}
        {activeTab === "charts" && (
          <GrowCharts
            historyData={historyData}
            onResetHistory={handleResetHistory}
            isResetting={isResetting}
          />
        )}

        {/* TAB 3: STRAIN PROFILE RECIPES */}
        {activeTab === "profiles" && activeProfile && (
          <ProfileManager
            profiles={profiles}
            activeProfileId={activeProfile.id}
            onSelectProfile={handleSelectProfile}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {/* TAB 4: API DEV HARDWARE PORTAL */}
        {activeTab === "api" && (
          <ApiDeveloperPanel
            logs={apiLogs}
            serverUrl={serverUrl}
          />
        )}

      </main>

      {/* Footer Navigation Information */}
      <footer className="mt-auto border-t border-slate-900 bg-slate-950 p-6 text-center text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>
            CannaGrow Full-Stack Growkammer-Steuerung Dashboard © 2026. Entwickelt für DIY Smart-Growth Setups.
          </p>
          
          <div className="flex items-center space-x-3.5">
            <a
              href="https://ai.studio/build"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 flex items-center space-x-1 transition"
            >
              <span>Build Framework</span>
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-slate-800">•</span>
            <span className="text-slate-400 font-mono uppercase tracking-widest text-3xs border border-slate-800 px-2 py-0.5 rounded">
              Local DB: SQLite In-Memory
            </span>
          </div>
        </div>
      </footer>

    </div>
  );
}

import express, { Request, Response } from "express";
import path from "path";
import { ControllerState, SensorData, ActuatorState, GrowProfile, ApiLogEntry } from "./src/types";

// Polyfill for static paths
const __dirname = path.resolve();

// Standard Grow Profiles (Strain Profile Presets)
const PRESET_PROFILES: GrowProfile[] = [
  {
    id: "og_kush_flower",
    name: "OG Kush - Blütephase",
    description: "Klassisches Profil für die Blütephase von OG Kush. Erfordert niedrigere Luftfeuchtigkeit zur Vorbeugung von Schimmel und hohe CO2-Sättigung.",
    stage: "flowering",
    lightOnDuration: 12,
    targetTempDay: 24.5,
    targetTempNight: 19.0,
    targetHumidity: 45.0,
    targetCo2: 1100,
    targetSoilMoisture: 65.0,
    targetPh: 6.0,
    targetEc: 1.8
  },
  {
    id: "white_widow_veg",
    name: "White Widow - Wachstumsphase",
    description: "Kräftiges Wachstumsprofil für White Widow in der vegetativen Phase. Hohe Luftfeuchtigkeit und 18 Stunden Licht stimulieren das Blattwerk.",
    stage: "vegetative",
    lightOnDuration: 18,
    targetTempDay: 26.0,
    targetTempNight: 21.0,
    targetHumidity: 65.0,
    targetCo2: 600,
    targetSoilMoisture: 70.0,
    targetPh: 5.8,
    targetEc: 1.4
  },
  {
    id: "northern_lights_seedling",
    name: "Northern Lights - Keimling",
    description: "Sehr behutsames Profil für frisch gekeimte Northern Lights Sämlinge. Sehr hohe Luftfeuchtigkeit für die Wurzelentwicklung.",
    stage: "seedling",
    lightOnDuration: 18,
    targetTempDay: 23.5,
    targetTempNight: 20.0,
    targetHumidity: 75.0,
    targetCo2: 450,
    targetSoilMoisture: 80.0,
    targetPh: 5.6,
    targetEc: 0.8
  },
  {
    id: "haze_drying",
    name: "Haze - Trocknungsprofil",
    description: "Ermöglicht eine schonende, langsame Trocknung im Kälte-Kühlschrank. Keine Beleuchtung, kühle Temperaturen und geregelte Luftfeuchte.",
    stage: "drying",
    lightOnDuration: 0,
    targetTempDay: 16.0,
    targetTempNight: 16.0,
    targetHumidity: 55.0,
    targetCo2: 400,
    targetSoilMoisture: 0.0,
    targetPh: 7.0, // irrelevant during drying
    targetEc: 0.0
  }
];

// Initialize global controller state with OG Kush Flower active
let currentProfile: GrowProfile = PRESET_PROFILES[0];
let activeProfilesList: GrowProfile[] = [...PRESET_PROFILES];

let controllerState: ControllerState = {
  currentSensors: {
    temperature: null,
    humidity: null,
    co2: null,
    soilMoisture: null,
    ph: null,
    ec: null,
    waterTemp: null,
    recordedAt: new Date().toISOString()
  },
  actuators: {
    light: true,
    lightCoolingFan: true,
    lightCoolingPump: true,
    cooling: false,
    co2Valve: true,
    fan: false,
    humidifier: false,
    pump: false,
    phUpPump: false,
    phDownPump: false,
    ecNutrientPump: false
  },
  overrideActuators: {},
  activeProfileId: currentProfile.id,
  activeProfile: currentProfile,
  lastTelemetryTime: new Date().toISOString(),
  wateringThresholdRun: false,
  isAutoMode: true,
  cultivationMode: 'bio'
};

// Historical Logs database in memory
let telemetryHistory: SensorData[] = [];
let apiLogs: ApiLogEntry[] = [];

// Optional: Seed initial analytical data (7 days of historical readings, 1 per hour = 168 points)
// Removed to avoid polluting the graph when real data starts coming in.
// telemetryHistory = []; 

// Add api log entry helper
function addApiLog(type: ApiLogEntry['type'], source: ApiLogEntry['source'], payload: string) {
  const log: ApiLogEntry = {
    id: "log_" + Math.random().toString(36).substring(2, 11),
    timestamp: new Date().toISOString(),
    type,
    source,
    payload
  };
  apiLogs.unshift(log);
  if (apiLogs.length > 50) apiLogs.pop(); // limit to 50 logs
}

// Controller regulation core (runs on telemetry updates, simulates PID-like relay triggers)
function runRegulationCore() {
  const sensors = controllerState.currentSensors;
  const target = controllerState.activeProfile;
  const isAuto = controllerState.isAutoMode;
  
  if (!isAuto) return; // if auto is disabled, respect manual overrides entirely
  
  const now = new Date();
  const hour = now.getHours();
  
  // 1. Light Cycle Control (Lichtzyklus)
  let lightShouldBeOn = false;
  if (target.lightOnDuration > 0) {
    const startHour = target.lightOnStartTime || 6; // Default to 6 AM
    const endHour = (startHour + target.lightOnDuration) % 24;
    
    if (startHour < endHour) {
      lightShouldBeOn = hour >= startHour && hour < endHour;
    } else {
      // Over midnight
      lightShouldBeOn = hour >= startHour || hour < endHour;
    }
  }
  
  // 2. Temperature Regulation & Dehumidification (Closed Fridge System)
  const currentTargetTemp = lightShouldBeOn ? target.targetTempDay : target.targetTempNight;
  
  let coolingShouldBeOn = false; // Fridge compressor (Kühlschrank)
  let lightCoolingFanShouldBeOn = lightShouldBeOn; // Default: Lamp radiator fan on when light is on
  let lightCoolingPumpShouldBeOn = lightShouldBeOn; // Default: Lamp cooling pump runs when light is on
  let fanShouldBeOn = false; // Abluft is not used in this closed system
  
  // Dehumidification via cooling
  let needsDehumidification = false;
  if (sensors.humidity !== null && sensors.humidity > target.targetHumidity + 2.0) {
    needsDehumidification = true;
  }

  // Temperature logic
  if (sensors.temperature !== null) {
    if (sensors.temperature > currentTargetTemp + 1.0) {
      coolingShouldBeOn = true; // Temp is too high -> turn on fridge
    }
  }

  // Humidity logic overrides for the radiator fans
  if (needsDehumidification && lightShouldBeOn) {
    // To dehumidify, we turn OFF the radiator fans.
    // This reduces heat extraction from the lamp, raising the ambient temp in the fridge.
    // This forces the fridge (cooling) to work more, which dehumidifies the air.
    lightCoolingFanShouldBeOn = false;
  }
  
  // 3. Humidifier Control
  let humidifierShouldBeOn = false;
  if (sensors.humidity !== null && sensors.humidity < target.targetHumidity - 2.0 && target.stage !== "drying") {
    humidifierShouldBeOn = true; // Air is too dry, fire humidifier
  }
  
  // 4. CO2 Solenoid Valve
  // Plants only absorb CO2 during the lights-on phase
  let co2ShouldBeOn = false;
  if (lightShouldBeOn && sensors.co2 !== null && sensors.co2 < target.targetCo2 - 50 && target.stage !== "drying") {
    co2ShouldBeOn = true; 
  }
  
  // 5. Irrigation Pump (Wasser-Pumpe)
  let pumpShouldBeOn = false;
  if (target.stage !== "drying" && target.targetSoilMoisture > 0) {
    // If soil moisture drops below threshold, trigger water pump
    if (sensors.soilMoisture !== null && sensors.soilMoisture < target.targetSoilMoisture - 5) {
      pumpShouldBeOn = true;
    }
  }

  // 6. Nutrient Dosing Pumps (pH & EC)
  let phUpShouldBeOn = false;
  let phDownShouldBeOn = false;
  let ecNutrientShouldBeOn = false;
  
  if (target.stage !== "drying") {
    // pH control
    if (sensors.ph !== null) {
      if (sensors.ph < target.targetPh - 0.1) {
        phUpShouldBeOn = true; // pH too acidic, dose pH up
      } else if (sensors.ph > target.targetPh + 0.1) {
        phDownShouldBeOn = true; // pH too basic, dose pH down
      }
    }
    
    // Dünger nur anmischen wenn im 'mineralisch' Modus
    if (controllerState.cultivationMode === 'mineralisch' && sensors.ec !== null) {
      if (sensors.ec < target.targetEc - 0.1) {
        ecNutrientShouldBeOn = true;
      }
    }
  }

  // Apply automatic state adjusted for manual user overrides
  const applyState = (key: keyof ActuatorState, autoValue: boolean): boolean => {
    if (controllerState.overrideActuators[key] !== undefined) {
      return controllerState.overrideActuators[key] as boolean; // manual override in place
    }
    return autoValue; // default to automatic calculated state
  };

  controllerState.actuators = {
    light: applyState("light", lightShouldBeOn),
    lightCoolingFan: applyState("lightCoolingFan", lightCoolingFanShouldBeOn),
    lightCoolingPump: applyState("lightCoolingPump", lightCoolingPumpShouldBeOn),
    cooling: applyState("cooling", coolingShouldBeOn),
    co2Valve: applyState("co2Valve", co2ShouldBeOn),
    fan: applyState("fan", fanShouldBeOn),
    humidifier: applyState("humidifier", humidifierShouldBeOn),
    pump: applyState("pump", pumpShouldBeOn),
    phUpPump: applyState("phUpPump", phUpShouldBeOn),
    phDownPump: applyState("phDownPump", phDownShouldBeOn),
    ecNutrientPump: applyState("ecNutrientPump", ecNutrientShouldBeOn)
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // === BACKEND CONTROL RESOURSE API ENDPOINTS ===

  // 1. Get current full system status (sensors, active profile, actuators status)
  app.get("/api/state", (req: Request, res: Response) => {
    res.json(controllerState);
  });

  // 2. Telemetry Ingest: Endpoint for physical Raspberry Pi / ESP32 grow chamber clients to POST readings
  app.post("/api/telemetry", (req: Request, res: Response) => {
    const { temperature, humidity, co2, soilMoisture, ph, ec, waterTemp } = req.body;
    
    // Update active telemetry state
    const parsedData: SensorData = {
      temperature: Number(temperature ?? controllerState.currentSensors.temperature),
      humidity: Number(humidity ?? controllerState.currentSensors.humidity),
      co2: Number(co2 ?? controllerState.currentSensors.co2),
      soilMoisture: Number(soilMoisture ?? controllerState.currentSensors.soilMoisture),
      ph: Number(ph ?? controllerState.currentSensors.ph),
      ec: Number(ec ?? controllerState.currentSensors.ec),
      waterTemp: Number(waterTemp ?? controllerState.currentSensors.waterTemp),
      recordedAt: new Date().toISOString()
    };

    controllerState.currentSensors = parsedData;
    controllerState.lastTelemetryTime = parsedData.recordedAt;
    
    // Store in historical record
    telemetryHistory.push(parsedData);
    if (telemetryHistory.length > 200) telemetryHistory.shift();

    // Log the incoming API request
    const sourceObj = req.headers['user-agent']?.includes('ESP32') ? 'esp32' : 'raspberry_pi';
    addApiLog(
      'incoming_telemetry', 
      sourceObj, 
      `Empfangene Sensordaten: Temp: ${parsedData.temperature}°C, rH: ${parsedData.humidity}%, CO2: ${parsedData.co2}ppm, Boden: ${parsedData.soilMoisture}%, pH: ${parsedData.ph}, EC: ${parsedData.ec} mS/cm`
    );

    // Run custom automated regulation logic
    runRegulationCore();

    // Send back current desired actions for relays (this is how the Pi knows what to turn on and off!)
    res.json({
      status: "success",
      timestamp: new Date().toISOString(),
      activeProfileId: controllerState.activeProfileId,
      desiredActuators: controllerState.actuators // The physical Pi can read this array to flip physical relays on or off! Perfect feedback loop.
    });
  });

  // 3. Control API: Send manual toggle triggers over internet from dashboard
  app.post("/api/control", (req: Request, res: Response) => {
    const { key, value, autoMode, cultivationMode } = req.body;

    if (autoMode !== undefined) {
      controllerState.isAutoMode = !!autoMode;
      if (controllerState.isAutoMode) {
        controllerState.overrideActuators = {}; // Clear manual overrides on auto mode restore
        addApiLog('command_received', 'web_ui', 'Automatik-Steuerung REAKTIVIERT. Manuelle Overrides freigegeben.');
      } else {
        addApiLog('command_received', 'web_ui', 'Automatik-Steuerung DEAKTIVIERT. Manuelle Steuerbefehle aktiv.');
      }
    }
    
    if (cultivationMode !== undefined) {
      controllerState.cultivationMode = cultivationMode;
      addApiLog('command_received', 'web_ui', `Anbaumodus gewechselt auf: ${cultivationMode}`);
    }

    // Is there a physical relay manual override action?
    if (key && value !== undefined) {
      const actuatorKey = key as keyof ActuatorState;
      if (controllerState.isAutoMode) {
        // Enforce override flag
        controllerState.overrideActuators[actuatorKey] = value;
      } else {
        controllerState.actuators[actuatorKey] = value;
      }
      addApiLog('user_override', 'web_ui', `Relais '${key}' manuell auf ${value ? 'AN' : 'AUS'} geschaltet.`);
    }

    runRegulationCore();
    res.json({
      status: "success",
      controllerState
    });
  });

  // 4. Profiles API: Get currently registered strain profiles
  app.get("/api/profiles", (req: Request, res: Response) => {
    res.json(activeProfilesList);
  });

  // 5. Create or adjust a custom Grow/Strain profile
  app.post("/api/profiles", (req: Request, res: Response) => {
    const newProfile: GrowProfile = req.body;
    
    if (!newProfile.id || !newProfile.name) {
      res.status(400).json({ status: "error", message: "Fehlende 'id' oder 'name' für Profil!" });
      return;
    }

    // Keep existing checks
    const index = activeProfilesList.findIndex(p => p.id === newProfile.id);
    if (index !== -1) {
      activeProfilesList[index] = newProfile;
      addApiLog('profile_change', 'web_ui', `Strain Profil '${newProfile.name}' angepasst.`);
    } else {
      activeProfilesList.push(newProfile);
      addApiLog('profile_change', 'web_ui', `Neues Strain Profil '${newProfile.name}' angelegt.`);
    }

    // If the changed profile is currently active, apply target updates immediately
    if (controllerState.activeProfileId === newProfile.id) {
      currentProfile = newProfile;
      controllerState.activeProfile = newProfile;
      runRegulationCore();
    }

    res.json({ status: "success", profiles: activeProfilesList });
  });

  // 6. Set active strain grow profile
  app.post("/api/profiles/active", (req: Request, res: Response) => {
    const { profileId } = req.body;
    const profile = activeProfilesList.find(p => p.id === profileId);

    if (!profile) {
      res.status(404).json({ status: "error", message: "Gewünschtes Strain Profil nicht gefunden." });
      return;
    }

    currentProfile = profile;
    controllerState.activeProfileId = profileId;
    controllerState.activeProfile = profile;
    controllerState.overrideActuators = {}; // Reset overrides on profile swap to guarantee safe starting conditions!
    
    addApiLog('profile_change', 'web_ui', `Aktiviertes Strain Profil gewechselt auf: '${profile.name}'`);
    
    runRegulationCore();
    res.json({ status: "success", controllerState });
  });

  // 7. Get API telemetry history for analytics
  app.get("/api/history", (req: Request, res: Response) => {
    res.json(telemetryHistory);
  });

  // 8. Get API logs list
  app.get("/api/logs", (req: Request, res: Response) => {
    res.json(apiLogs);
  });

  // 9. Reset and reseed data helper
  app.post("/api/history/reset", (req: Request, res: Response) => {
    seedHistoricalData();
    addApiLog('command_received', 'web_ui', 'Historiendatenbank zurückgesetzt und neu befüllt.');
    res.json({ status: "success", historySize: telemetryHistory.length });
  });

  // Vite integration middleware (only in explicit development mode)
  const isDev = process.env.NODE_ENV !== "production";
  const distPath = path.join(process.cwd(), 'dist');

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.log("Vite dev server not available, serving static build from dist.");
      app.use(express.static(distPath));
      app.get('*', (req: Request, res: Response) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CannaGrow Backend-Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Error starting Grow Cabinet Server:", err);
});

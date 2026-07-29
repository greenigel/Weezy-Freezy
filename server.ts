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
    temperature: 24.2,
    humidity: 46.5,
    co2: 1080,
    soilMoisture: 64.2,
    ph: 5.95,
    ec: 1.76,
    waterTemp: 19.5,
    recordedAt: new Date().toISOString()
  },
  actuators: {
    light: true,
    lightCoolingFan: true,
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

// Seed initial analytical data (7 days of historical readings, 1 per hour = 168 points)
function seedHistoricalData() {
  const points = 168; // 7 days of logs
  const now = new Date();
  const startTime = new Date(now.getTime() - points * 60 * 60 * 1000);
  
  const baseProfile = currentProfile;
  const history: SensorData[] = [];
  
  for (let i = 0; i < points; i++) {
    const time = new Date(startTime.getTime() + i * 60 * 60 * 1000);
    const hour = time.getHours();
    
    // Day vs Night modulation
    const isDay = baseProfile.lightOnDuration > 0 && (hour % 24) < baseProfile.lightOnDuration;
    const targetTemp = isDay ? baseProfile.targetTempDay : baseProfile.targetTempNight;
    
    // Add realistic fluctuations, cycles, and drifts
    const randTemp = targetTemp + (Math.sin(i / 6) * 1.5) + (Math.random() * 0.4 - 0.2);
    const randHumid = baseProfile.targetHumidity + (Math.cos(i / 10) * 4.0) + (isDay ? -3 : 3) + (Math.random() * 1.0 - 0.5);
    const randCo2 = isDay 
      ? baseProfile.targetCo2 + (Math.sin(i / 3) * 80) + (Math.random() * 20 - 10)
      : 400 + (Math.random() * 30); // drop at night because lights off/co2 closed
    
    // Soil moisture dries slowly, then jumps up at simulated watering events
    const daysElapsed = i / 24;
    const timeSinceWatering = daysElapsed % 2.5; // irrigation every 2.5 days
    let randMoisture = baseProfile.targetSoilMoisture;
    if (baseProfile.stage !== "drying") {
      randMoisture = baseProfile.targetSoilMoisture + 10 - (timeSinceWatering * 8) + (Math.random() * 1.5 - 0.75);
    } else {
      randMoisture = Math.max(0, 80 - (daysElapsed * 10)); // dry down
    }

    // Nutrient solution values drift slowly
    const phDrift = Math.sin(i / 12) * 0.15 + (Math.random() * 0.04 - 0.02);
    const randPh = baseProfile.targetPh + phDrift;
    const ecDrift = Math.cos(i / 20) * 0.08 + (Math.random() * 0.02 - 0.01);
    const randEc = baseProfile.stage !== "drying" ? (baseProfile.targetEc + ecDrift) : 0;
    
    history.push({
      temperature: Math.round(randTemp * 10) / 10,
      humidity: Math.round(randHumid * 10) / 10,
      co2: Math.round(randCo2),
      soilMoisture: Math.round(randMoisture * 10) / 10,
      ph: Math.round(randPh * 100) / 100,
      ec: Math.round(randEc * 100) / 100,
      waterTemp: Math.round((19.0 + Math.sin(i / 24) * 0.8 + Math.random() * 0.2) * 10) / 10,
      recordedAt: time.toISOString()
    });
  }
  
  telemetryHistory = history;
  
  // Seed initial API logs
  apiLogs.push({
    id: "init_log_1",
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    type: "profile_change",
    source: "web_ui",
    payload: `Profil auf '${baseProfile.name}' gewechselt. Sollwerte: Temp ${baseProfile.targetTempDay}°C / Humid ${baseProfile.targetHumidity}%`
  });
  apiLogs.push({
    id: "init_log_2",
    timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
    type: "incoming_telemetry",
    source: "raspberry_pi",
    payload: `Sensor-Upload durchgeführt: Temp: 24.1°C, Hum: 46.2%, CO2: 1090ppm`
  });
}

seedHistoricalData();

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
    // simple simulation based on current hour
    lightShouldBeOn = (hour % 24) < target.lightOnDuration;
  }
  
  // 2. Temperature Regulation
  const currentTargetTemp = lightShouldBeOn ? target.targetTempDay : target.targetTempNight;
  let fanShouldBeOn = false;     // Abluft
  let coolingShouldBeOn = false; // Aktive Kühlung
  
  if (sensors.temperature > currentTargetTemp + 0.5) {
    fanShouldBeOn = true; 
  } 
  if (sensors.temperature > currentTargetTemp + 1.5) {
    coolingShouldBeOn = true; // Extra Kühlung zuschalten
  }
  
  if (sensors.humidity > target.targetHumidity + 2.0) {
    fanShouldBeOn = true; // Humidity is high, run extraction fan to dehumidify
  }
  
  // Licht wasserkühlungsventilator runs whenever the light is on
  let lightCoolingFanShouldBeOn = lightShouldBeOn;
  
  // 3. Humidifier Control
  let humidifierShouldBeOn = false;
  if (sensors.humidity < target.targetHumidity - 2.0 && target.stage !== "drying") {
    humidifierShouldBeOn = true; // Air is too dry, fire humidifier
  }
  
  // 4. CO2 Solenoid Valve
  // Plants only absorb CO2 during the lights-on phase (and normally exhaust fan should be off to not waste it, but kept simple here)
  let co2ShouldBeOn = false;
  if (lightShouldBeOn && sensors.co2 < target.targetCo2 - 50 && target.stage !== "drying" && !fanShouldBeOn) {
    co2ShouldBeOn = true; 
  }
  
  // 5. Irrigation Pump (Wasser-Pumpe)
  let pumpShouldBeOn = false;
  if (target.stage !== "drying" && target.targetSoilMoisture > 0) {
    // If soil moisture drops below threshold, trigger water pump
    if (sensors.soilMoisture < target.targetSoilMoisture - 5) {
      pumpShouldBeOn = true;
    }
  }

  // 6. Nutrient Dosing Pumps (pH & EC)
  let phUpShouldBeOn = false;
  let phDownShouldBeOn = false;
  let ecNutrientShouldBeOn = false;
  
  if (target.stage !== "drying") {
    // pH control
    if (sensors.ph < target.targetPh - 0.1) {
      phUpShouldBeOn = true; // pH too acidic, dose pH up
    } else if (sensors.ph > target.targetPh + 0.1) {
      phDownShouldBeOn = true; // pH too basic, dose pH down
    }
    
    // Dünger nur anmischen wenn im 'mineralisch' Modus
    if (controllerState.cultivationMode === 'mineralisch') {
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

// Background simulation loop: Modulates sensors slightly every 4 seconds to animate dashboard and make it live!
setInterval(() => {
  if (currentProfile) {
    const sensors = controllerState.currentSensors;
    const actuators = controllerState.actuators;
    const profile = currentProfile;
    
    // Simulate real environment physical changes based on active actuators
    
    // Light heating up / Day-Night cycling
    const now = new Date();
    const hour = now.getHours();
    const isDay = profile.lightOnDuration > 0 && (hour % 24) < profile.lightOnDuration;
    const targetBaseTemp = isDay ? profile.targetTempDay : profile.targetTempNight;
    
    // Temperature: naturally drifts towards surroundings, heats up under light, cools down if Fan is on.
    let tempDiff = targetBaseTemp - sensors.temperature;
    if (actuators.light) tempDiff += 0.8; // light heating
    if (actuators.fan) tempDiff -= 1.2;    // cooling fan
    sensors.temperature += tempDiff * 0.15 + (Math.random() * 0.08 - 0.04);
    sensors.temperature = Math.round(sensors.temperature * 100) / 100;

    // Humidity: rises naturally (transpiration of plants), spikes if Humidifier is on, drops if Fan is on
    let humidChange = 0.5 * (isDay ? 1.2 : 0.8); // plant transpiration
    if (actuators.humidifier) humidChange += 4.5;
    if (actuators.fan) humidChange -= 3.8;
    sensors.humidity += (profile.targetHumidity - sensors.humidity) * 0.04 + humidChange * 0.1 + (Math.random() * 0.1 - 0.05);
    sensors.humidity = Math.min(100, Math.max(10, Math.round(sensors.humidity * 10) / 10));

    // CO2: falls because plants consume it during daytime (lights on), rises if CO2 valvle is open, steady at night
    let co2Change = -3.5; // plant consumption during light
    if (!actuators.light) co2Change = 1.0; // no consumption in the dark
    if (actuators.co2Valve) co2Change += 45;
    sensors.co2 += co2Change + (Math.random() * 4 - 2);
    sensors.co2 = Math.min(2500, Math.max(380, Math.round(sensors.co2)));

    // Soil Moisture: dries down slowly, rises rapidly if Irrigation water pump is on
    let moistureChange = -0.3; // drying
    if (actuators.pump) moistureChange += 6.5; // pump watering
    sensors.soilMoisture += moistureChange + (Math.random() * 0.05 - 0.025);
    sensors.soilMoisture = Math.min(100, Math.max(0, Math.round(sensors.soilMoisture * 10) / 10));

    // Water pH: drifts up/down slightly, adjusted by pH pumps
    let phChange = 0.015; // natural drift inside reservoir
    if (actuators.phUpPump) phChange += 0.08;
    if (actuators.phDownPump) phChange -= 0.08;
    sensors.ph += phChange + (Math.random() * 0.01 - 0.005);
    sensors.ph = Math.min(14, Math.max(0, Math.round(sensors.ph * 100) / 100));

    // Water EC: drifts down slowly as plants absorb nutrients, rises with EC nutrients dosing
    let ecChange = -0.01; // nutrient consumption
    if (actuators.ecNutrientPump) ecChange += 0.09;
    sensors.ec += ecChange + (Math.random() * 0.005 - 0.0025);
    sensors.ec = Math.min(10, Math.max(0, Math.round(sensors.ec * 100) / 100));

    sensors.recordedAt = new Date().toISOString();
    controllerState.currentSensors = sensors;
    controllerState.lastTelemetryTime = sensors.recordedAt;

    // Run regulation loops on newest metrics
    runRegulationCore();

    // Occassionally add simulation telemetry points to history (every 10 minutes simulated - here represented by pushing 1 of 15 ticks)
    if (Math.random() < 0.15) {
      const historicalPoint: SensorData = { ...sensors, recordedAt: new Date().toISOString() };
      telemetryHistory.push(historicalPoint);
      if (telemetryHistory.length > 200) telemetryHistory.shift(); // keep last 200 points
    }
  }
}, 4000);

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
  const isDev = process.env.NODE_ENV === "development";
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

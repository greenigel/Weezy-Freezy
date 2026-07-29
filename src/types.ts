/**
 * Types for the CannaGrow Controller State and Data
 */

export interface SensorData {
  temperature: number;      // °C
  humidity: number;         // %
  co2: number;              // ppm
  soilMoisture: number;     // %
  ph: number;               // pH (0-14)
  ec: number;               // mS/cm (Electrical Conductivity for Nutrient solution)
  waterTemp: number;        // °C (Nutrient solution water temperature)
  recordedAt: string;       // ISO Timestamp
}

export interface ActuatorState {
  light: boolean;           // ON / OFF (Licht)
  lightCoolingFan: boolean; // ON / OFF (Licht wasserkühlungsventilator)
  cooling: boolean;         // ON / OFF (Kühlung)
  co2Valve: boolean;        // ON / OFF (CO2-Ventil)
  fan: boolean;             // ON / OFF (Abluft)
  humidifier: boolean;      // ON / OFF (Luftbefeuchter)
  pump: boolean;            // ON / OFF (Bewässerungspumpe)
  phUpPump: boolean;        // ON / OFF (pH+ Dosierpumpe)
  phDownPump: boolean;      // ON / OFF (pH- Dosierpumpe)
  ecNutrientPump: boolean;  // ON / OFF (A+B Dünger-Dosierpumpe)
}

export interface GrowProfile {
  id: string;
  name: string;
  description: string;
  stage: 'germination' | 'seedling' | 'vegetative' | 'flowering' | 'drying';
  // Target values
  lightOnDuration: number;    // Hours, e.g., 18 for veg, 12 for flower
  targetTempDay: number;      // °C
  targetTempNight: number;    // °C
  targetHumidity: number;     // %
  targetCo2: number;          // ppm
  targetSoilMoisture: number; // %
  targetPh: number;           // pH
  targetEc: number;           // mS/cm
}

export interface ControllerState {
  currentSensors: SensorData;
  actuators: ActuatorState;
  overrideActuators: Partial<Record<keyof ActuatorState, boolean>>; // null or boolean for custom manual overrides
  activeProfileId: string;
  activeProfile: GrowProfile;
  lastTelemetryTime: string;
  wateringThresholdRun: boolean; // if we are in active irrigation cycle
  isAutoMode: boolean; // false if user took manual control of everything
  cultivationMode: 'bio' | 'mineralisch'; // bio = ohne Düngeranmischung, mineralisch = mit Dünger
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  type: 'incoming_telemetry' | 'outgoing_state' | 'command_received' | 'user_override' | 'profile_change';
  source: 'web_ui' | 'raspberry_pi' | 'esp32' | 'simulated_hardware';
  payload: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

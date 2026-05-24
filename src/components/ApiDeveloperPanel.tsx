import { useState } from "react";
import { ApiLogEntry } from "../types";
import { Copy, Check, Terminal, Wifi, Code, Cpu, Globe, Sliders } from "lucide-react";

interface ApiDeveloperPanelProps {
  logs: ApiLogEntry[];
  serverUrl: string;
}

export default function ApiDeveloperPanel({
  logs,
  serverUrl
}: ApiDeveloperPanelProps) {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"python" | "esp32">("python");

  const cleanServerUrl = serverUrl || "https://dein-cloudrun-url.run.app";

  const triggerCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(identifier);
    setTimeout(() => {
      setCopiedSection(null);
    }, 2000);
  };

  const pythonSnippet = `import time
import requests
import random

# CannaGrow Controller API Endpunkt
API_URL = "${cleanServerUrl}/api/telemetry"

print("--- Raspberry Pi CannaGrow Ingest Client gestartet ---")

while True:
    try:
        # HIER PHYSIKALISCHE SENSORWERTE AUSLESEN (z.B. Adafruit DHT22 / MCP3008 ADC)
        # analog_moisture = adc.read(0)
        # temp, hum = dht_sensor.read()
        
        # Simulierter Ausleseprozess für den Testlauf:
        payload = {
            "temperature": round(24.0 + random.uniform(-0.5, 0.5), 2),
            "humidity": round(48.0 + random.uniform(-1.0, 1.0), 1),
            "co2": int(1050 + random.uniform(-20, 20)),
            "soilMoisture": round(65.0 + random.uniform(-0.5, 0.5), 1),
            "ph": round(5.90 + random.uniform(-0.05, 0.05), 2),
            "ec": round(1.80 + random.uniform(-0.02, 0.02), 2),
            "waterTemp": round(19.5 + random.uniform(-0.2, 0.2), 1)
        }
        
        print(f"Sende Telemetriedaten an Server... {payload}")
        
        response = requests.post(API_URL, json=payload, timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("Upload erfolgreich!")
            
            # EMPFANGENE SOLLWERTE VOM SERVER AUSLESEN.
            # Hiermit steuerst du deine physikalischen Relaisschalter (Heizung, Lüfter, Düngerdosierung):
            actuators = data.get("desiredActuators", {})
            print(f"Geforderte Relais-Zielzustände: {actuators}")
            
            # beispiel:
            # GPIO.output(LIGHT_PIN, GPIO.HIGH if actuators.get('light') else GPIO.LOW)
            # GPIO.output(FAN_PIN, GPIO.HIGH if actuators.get('fan') else GPIO.LOW)
            # GPIO.output(DOSING_PH_PIN, GPIO.HIGH if actuators.get('phDownPump') else GPIO.LOW)
        else:
            print(f"Server-Fehler: Status {response.status_code}")
            
    except Exception as e:
        print(f"API Fehler: {e}")
        
    # Warteintervall (z.B. alle 10 Sekunden uploaden)
    time.sleep(10)
`;

  const esp32Snippet = `#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// WiFi Zugangsdaten
const char* ssid = "Dein_WiFi_Name";
const char* password = "Dein_WiFi_Passwort";

// CannaGrow Web-API URI
const char* serverName = "${cleanServerUrl}/api/telemetry";

unsigned long lastTime = 0;
unsigned long timerDelay = 10000; // Sende alle 10 Sekunden

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  Serial.println("Verbinde mit Wi-Fi...");
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nVerbunden! IP Adresse: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Sende Telemetriegültigkeit alle x Sekunden
  if ((millis() - lastTime) > timerDelay) {
    if(WiFi.status() == WL_CONNECTED){
      WiFiClient client;
      HTTPClient http;
      
      http.begin(client, serverName);
      http.addHeader("Content-Type", "application/json");
      
      // Werte von echten physikalischen Sensoren lesen (pH, EC, Bodenfeuchte)
      float temperature = 24.5; // dht.readTemperature()
      float humidity = 46.2;    // dht.readHumidity()
      int co2 = 1080;
      float soilMoisture = 64.0; // analogRead(SOIL_PIN)
      float phVal = 5.95;       // readPhSensor()
      float ecVal = 1.76;       // readEcSensor()
      
      // JSON Payload zusammenstellen (StaticJsonDocument)
      StaticJsonDocument<300> doc;
      doc["temperature"] = temperature;
      doc["humidity"] = humidity;
      doc["co2"] = co2;
      doc["soilMoisture"] = soilMoisture;
      doc["ph"] = phVal;
      doc["ec"] = ecVal;
      
      String requestBody;
      serializeJson(doc, requestBody);
      
      Serial.print("Sende JSON: ");
      Serial.println(requestBody);
      
      int httpResponseCode = http.POST(requestBody);
      
      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.print("HTTP Response Code: ");
        Serial.println(httpResponseCode);
        Serial.print("Server Antwort: ");
        Serial.println(response);
        
        // Sollwerte parsen um Relais oder Transistoren anzusprechen:
        StaticJsonDocument<400> responseDoc;
        deserializeJson(responseDoc, response);
        JsonObject actuators = responseDoc["desiredActuators"];
        
        bool light_on = actuators["light"];
        bool fan_on = actuators["fan"];
        bool pump_on = actuators["pump"];
        bool ph_down_on = actuators["phDownPump"];
        
        // Relais setzen:
        // digitalWrite(LIGHT_RELAY_PIN, light_on ? HIGH : LOW);
        // digitalWrite(FAN_RELAY_PIN, fan_on ? HIGH : LOW);
        // digitalWrite(PH_DOWN_PIN, ph_down_on ? HIGH : LOW);
      }
      else {
        Serial.print("Post Fehler. Code: ");
        Serial.println(httpResponseCode);
      }
      http.end();
    }
    else {
      Serial.println("WiFi Disconnected!");
    }
    lastTime = millis();
  }
}
`;

  return (
    <div id="api-developer-panel" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-800/60 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-emerald-400 animate-pulse" />
            <span>Hardware Hardware-Anbindung (DIY Pi/ESP32)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Nutze diese Rest-API Endpunkte, um deine physikalische Growkammer (Raspberry Pi Relaisplatten, Arduino Sensoren) online zu bringen.
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setSelectedLanguage("python")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              selectedLanguage === "python" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <Cpu className="h-3 w-3" />
            <span>Python / Pi</span>
          </button>
          <button
            onClick={() => setSelectedLanguage("esp32")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
              selectedLanguage === "esp32" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-white"
            }`}
          >
            <Code className="h-3 w-3" />
            <span>ESP32 / Arduino</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEADING SECTION: CODE SNIPPE COPY */}
        <div id="api-code-section" className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between bg-slate-950 px-4 py-2 rounded-t-xl border-t border-x border-slate-800">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              {selectedLanguage === "python" ? "canna_client.py" : "esp32_ingress.ino"}
            </span>
            <button
              onClick={() => triggerCopy(selectedLanguage === "python" ? pythonSnippet : esp32Snippet, "snippet")}
              className="text-3xs font-bold text-slate-400 hover:text-emerald-400 flex items-center space-x-1 border border-slate-800 px-2 py-1 rounded hover:bg-slate-900 transition"
            >
              {copiedSection === "snippet" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copiedSection === "snippet" ? "Kopiert!" : "Code kopieren"}</span>
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 p-4 rounded-b-xl overflow-x-auto max-h-[460px] font-mono text-xs text-slate-300">
            <pre className="leading-snug">
              <code>{selectedLanguage === "python" ? pythonSnippet : esp32Snippet}</code>
            </pre>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 text-xs text-slate-400 leading-normal">
            <p className="font-semibold text-slate-300 flex items-center mb-1.5">
              <Globe className="h-4 w-4 text-emerald-400 mr-2" />
              <span>Feedback-Schleife der physikalischen Steuerung</span>
            </p>
            Deine Growkammer lädt via <code className="text-emerald-400 font-mono">POST</code> im Abstand von 10s Sensordaten hoch. Das API-Paket antwortet mit dem JSON-Objekt <code className="text-amber-400 font-mono">"desiredActuators"</code>. Dein lokaler Pi setzt daraufhin einfach seine GPIOs auf High oder Low, um Lüfter, Lampen und Dosierpumpen entsprechend einzuregeln. Das vermeidet komplexe Logik auf der CPU deines ESP32!
          </div>
        </div>

        {/* SECINDARY SECTION: TRASACTION LOGGER API */}
        <div id="api-log-viewer" className="lg:col-span-5 flex flex-col h-full space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-1.5">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Echtzeit API-Transaktions-Monitor</span>
            </h3>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-green"></span>
          </div>

          <div className="flex-1 bg-slate-950 border border-slate-880 rounded-xl p-4 overflow-y-auto h-[480px] font-mono text-3xs space-y-3.5">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Wifi className="h-5 w-5 mb-1.5 text-slate-700 animate-pulse" />
                <span>Warte auf eingehende Web-Requests...</span>
              </div>
            ) : (
              logs.map((log) => {
                const badgeColor = {
                  incoming_telemetry: "text-emerald-400 bg-emerald-400/5 border-emerald-500/10",
                  outgoing_state: "text-blue-400 bg-blue-400/5 border-blue-500/10",
                  command_received: "text-purple-400 bg-purple-400/5 border-purple-500/10",
                  user_override: "text-amber-400 bg-amber-400/5 border-amber-500/10",
                  profile_change: "text-cyan-400 bg-cyan-400/5 border-cyan-500/10"
                }[log.type];

                const logTypeLabel = {
                  incoming_telemetry: "TELEMETRIE (POST)",
                  outgoing_state: "STATUS (GET)",
                  command_received: "AKTOR-CMD",
                  user_override: "MAN_OVERRIDE",
                  profile_change: "TRAIN_RECIPE"
                }[log.type];

                return (
                  <div key={log.id} className="border-b border-slate-900 pb-3 last:border-0 hover:bg-slate-900/40 p-1.5 rounded transition">
                    <div className="flex items-center justify-between gap-1.5 mb-1 text-slate-500">
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className="text-slate-650 font-semibold">{log.source.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center mb-1">
                      <span className={`px-1.5 py-0.2 rounded border text-3xs font-extrabold ${badgeColor}`}>
                        {logTypeLabel}
                      </span>
                    </div>
                    <p className="text-slate-350 break-words leading-snug">{log.payload}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* QUICK CURL TEST BUTTON */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/20">
            <p className="text-xs font-bold text-slate-300 flex items-center mb-2">
              <Sliders className="h-3.5 w-3.5 text-slate-400 mr-2" />
              <span>Curl Testen</span>
            </p>
            <div className="flex items-center bg-slate-950 rounded-lg p-2 border border-slate-800 justify-between">
              <input
                readOnly
                value={`curl -X POST -H 'Content-Type: application/json' -d '{"temperature":24.5,"humidity":46.0}' ${cleanServerUrl}/api/telemetry`}
                className="bg-transparent font-mono text-3xs text-slate-500 focus:outline-none flex-1 truncate select-all"
              />
              <button
                onClick={() => triggerCopy(`curl -X POST -H 'Content-Type: application/json' -d '{"temperature":24.5,"humidity":46.0}' ${cleanServerUrl}/api/telemetry`, "curl")}
                className="text-3xs font-bold text-slate-300 hover:text-emerald-400 ml-2 border border-slate-800 bg-slate-900 px-2 py-1 rounded transition whitespace-nowrap"
              >
                {copiedSection === "curl" ? "Kopiert!" : "Kopieren"}
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

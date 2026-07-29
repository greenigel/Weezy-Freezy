#!/usr/bin/env python3
"""
Weezy-Freezy Hardware Controller
--------------------------------
Steuert die Relais basierend auf den Vorgaben vom Server und liest den Bodenfeuchtesensor.

Voraussetzungen auf dem Raspberry Pi:
  pip3 install RPi.GPIO adafruit-circuitpython-ads1x15 requests

Verkabelung Relais:
  - Licht: GPIO 17 (Pin 11)
  - Licht Wasserkühlung (Ventilator): GPIO 27 (Pin 13)
  - Kühlung: GPIO 22 (Pin 15)
  - CO2 Ventil: GPIO 23 (Pin 16)

Verkabelung ADS1115 (für CWT-Soil-HC-V5 Sensor):
  - VDD -> 3.3V oder 5V (passend zum Sensor/Pi, meist 3.3V für I2C)
  - GND -> GND
  - SCL -> GPIO 3 (SCL)
  - SDA -> GPIO 2 (SDA)
  - Analog Out vom CWT-Soil Sensor -> A0 am ADS1115
"""

import time
import requests
import sys

try:
    import board
    import busio
    import adafruit_ads1x15.ads1115 as ADS
    from adafruit_ads1x15.analog_in import AnalogIn
    import adafruit_ads1x15.ads1x15 as ads1x15
except ImportError:
    print("FEHLER: 'board', 'busio' oder 'adafruit_ads1x15' nicht gefunden!")
    print("Bitte installiere folgende Pakete auf dem Raspberry Pi:")
    print("pip3 install adafruit-blinka adafruit-circuitpython-ads1x15")
    print("Falls du eine globale Umgebung nutzt (PEP 668), ergänze '--break-system-packages' oder nutze venv.")
    sys.exit(1)

try:
    import RPi.GPIO as GPIO
except ImportError:
    print("RPi.GPIO nicht gefunden (läuft das Skript auf einem Raspberry Pi?).")
    print("Verwende Dummy-GPIO für Testzwecke.")
    class DummyGPIO:
        BCM = "BCM"
        OUT = "OUT"
        HIGH = True
        LOW = False
        def setmode(self, mode): pass
        def setup(self, pin, mode): pass
        def output(self, pin, state):
            print(f"[Dummy GPIO] Pin {pin} -> {'ON' if state else 'OFF'}")
        def cleanup(self): pass
        def setwarnings(self, state): pass
    GPIO = DummyGPIO()


SERVER_URL_ACTUATORS = "http://localhost:3000/api/state"
SERVER_URL_TELEMETRY = "http://localhost:3000/api/telemetry"

# GPIO Pin Mapping
PIN_LIGHT = 17
PIN_LIGHT_COOLING = 27
PIN_COOLING = 22
PIN_CO2 = 23

# Initialisiere GPIO
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)
GPIO.setup(PIN_LIGHT, GPIO.OUT)
GPIO.setup(PIN_LIGHT_COOLING, GPIO.OUT)
GPIO.setup(PIN_COOLING, GPIO.OUT)
GPIO.setup(PIN_CO2, GPIO.OUT)

# Initialisiere I2C und ADS1115
ads = None
chan = None
try:
    i2c = busio.I2C(board.SCL, board.SDA)
    ads = ADS.ADS1115(i2c)
    ads.gain = 2/3
    # Verwende Kanal 0 für den Bodensensor
    chan = AnalogIn(ads, ads1x15.Pin.A0)
    print("ADS1115 erfolgreich initialisiert.")
except Exception as e:
    print(f"Fehler bei der Initialisierung des ADS1115: {e}")
    print("Sensordaten werden übersprungen.")

# Konfiguration der Relais-Logik
# True = Relais schaltet bei LOW (häufig bei Arduino/Pi Relaisboards)
# False = Relais schaltet bei HIGH (Active-High)
ACTIVE_LOW = True

def set_relais(pin, state):
    gpio_state = GPIO.LOW if state else GPIO.HIGH
    if not ACTIVE_LOW:
        gpio_state = not gpio_state # Invertieren falls Active-High

    GPIO.output(pin, gpio_state)
    # print(f"Pin {pin} -> {'AN' if state else 'AUS'}") # Für Debugging einkommentieren

def read_soil_moisture():
    if chan is None:
        return None
    try:
        # Lese die Spannung des analogen Pins (A0)
        voltage = chan.voltage
        
        # Für die Kalibrierung drucken wir die Roh-Spannung aus:
        # Setze das Terminal-Kommando `sudo journalctl -u weezy-hardware -f` ein, um diese Werte zu sehen.
        # Nimm den Wert, wenn der Sensor komplett trocken ist (z.B. V_MIN = 0.5V)
        # Und den Wert, wenn er im Wasserglas steht (z.B. V_MAX = 2.8V)
        print(f"[Sensor] Rohspannung Bodenfeuchte: {voltage:.2f}V")
        
        # --- KALIBRIERUNGSWERTE HIER ANPASSEN ---
        V_MIN = 0.0  # Spannung bei 0% Feuchtigkeit (komplett trocken)
        V_MAX = 3.0  # Spannung bei 100% Feuchtigkeit (Wasser)
        
        # Verhindere Division durch Null
        if V_MAX == V_MIN:
            return 0
            
        # Berechne den Prozentwert
        moisture_percent = ((voltage - V_MIN) / (V_MAX - V_MIN)) * 100.0
        
        # Begrenze auf 0-100%
        moisture_percent = max(0, min(100, moisture_percent))
        return round(moisture_percent, 1)
    except Exception as e:
        print(f"Fehler beim Lesen des Bodensensors: {e}")
        return None

def main():
    print("Hardware Controller gestartet...")
    while True:
        try:
            # 1. Hole Soll-Zustand der Relais vom Server
            res = requests.get(SERVER_URL_ACTUATORS, timeout=5)
            if res.status_code == 200:
                data = res.json()
                actuators = data.get("actuators", {})
                
                # Relais schalten
                set_relais(PIN_LIGHT, actuators.get("light", False))
                set_relais(PIN_LIGHT_COOLING, actuators.get("lightCoolingFan", False))
                set_relais(PIN_COOLING, actuators.get("cooling", False))
                set_relais(PIN_CO2, actuators.get("co2Valve", False))
                
            # 2. Lese Bodensensor und sende Telemetrie an Server
            soil_moisture = read_soil_moisture()
            if soil_moisture is not None:
                payload = {"soilMoisture": soil_moisture}
                requests.post(SERVER_URL_TELEMETRY, json=payload, timeout=5)
                
        except requests.exceptions.RequestException as e:
            print(f"Netzwerkfehler beim Kontakt mit dem Server: {e}")
        except Exception as e:
            print(f"Unerwarteter Fehler: {e}")
            
        time.sleep(2) # Alle 2 Sekunden updaten

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("Beende Hardware Controller...")
        GPIO.cleanup()

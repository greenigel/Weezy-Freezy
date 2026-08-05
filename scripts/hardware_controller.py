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
import os
import threading
import subprocess

try:
    sys.path.append(os.path.dirname(os.path.realpath(__file__)))
    from DFRobot_GP8403 import *
    DAC = DFRobot_GP8403(0x5F)
    if DAC.begin() == 0:
        print("Gravity I2C DAC (0-10V) fuer Dimmung initialisiert.")
        DAC.set_DAC_outrange(OUTPUT_RANGE_10V)
    else:
        print("Gravity I2C DAC konnte nicht initialisiert werden.")
        DAC = None
except Exception as e:
    print(f"Gravity I2C DAC Fehler/nicht gefunden: {e}")
    DAC = None

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
PIN_LIGHT_PWM = 18 # Hardware PWM Pin für 1-10V Dimmung
PIN_LIGHT_COOLING = 27
PIN_LIGHT_COOLING_PUMP = 24
PIN_COOLING = 22
PIN_CO2 = 23

# Initialisiere GPIO
GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

GPIO.setup(PIN_LIGHT, GPIO.OUT)
GPIO.setup(PIN_LIGHT_PWM, GPIO.OUT)
GPIO.setup(PIN_LIGHT_COOLING, GPIO.OUT)
GPIO.setup(PIN_LIGHT_COOLING_PUMP, GPIO.OUT)
GPIO.setup(PIN_COOLING, GPIO.OUT)
GPIO.setup(PIN_CO2, GPIO.OUT)

# PWM Instanz (1 kHz Frequenz)
try:
    light_pwm = GPIO.PWM(PIN_LIGHT_PWM, 1000)
    light_pwm.start(0)
except AttributeError:
    # Fallback for DummyGPIO
    class DummyPWM:
        def start(self, dc): pass
        def ChangeDutyCycle(self, dc): pass
    light_pwm = DummyPWM()

# Initialisiere I2C und ADS1115
ads = None
chan = None
chan1 = None
chan2 = None
chan3 = None
try:
    i2c = busio.I2C(board.SCL, board.SDA)
    ads = ADS.ADS1115(i2c)
    ads.gain = 2/3
    # Verwende Kanal 0 für den Bodensensor
    chan = AnalogIn(ads, ads1x15.Pin.A0)
    chan1 = AnalogIn(ads, ads1x15.Pin.A1)
    chan2 = AnalogIn(ads, ads1x15.Pin.A2)
    chan3 = AnalogIn(ads, ads1x15.Pin.A3)
    print("ADS1115 erfolgreich initialisiert.")
except Exception as e:
    print(f"Fehler bei der Initialisierung des ADS1115: {e}")
    print("Sensordaten werden übersprungen.")

# Konfiguration der Relais-Logik
# True = Relais schaltet bei LOW (häufig bei Arduino/Pi Relaisboards)
# False = Relais schaltet bei HIGH (Active-High)
ACTIVE_LOW = True

VOLTAGE_HISTORY = []
HISTORY_SIZE = 10

is_light_on = True

def set_relais(pin, state):
    gpio_state = GPIO.LOW if state else GPIO.HIGH
    if not ACTIVE_LOW:
        gpio_state = not gpio_state # Invertieren falls Active-High

    GPIO.output(pin, gpio_state)
    # print(f"Pin {pin} -> {'AN' if state else 'AUS'}") # Für Debugging einkommentieren

def read_soil_moisture():
    global VOLTAGE_HISTORY
    if chan is None:
        return None
    try:
        # Lese die Spannung des analogen Pins (A0)
        voltage = chan.voltage
        
        VOLTAGE_HISTORY.append(voltage)
        if len(VOLTAGE_HISTORY) > HISTORY_SIZE:
            VOLTAGE_HISTORY.pop(0)
            
        valid_values = VOLTAGE_HISTORY.copy()
        if len(valid_values) >= 5:
            valid_values.sort()
            # Entferne die 2 höchsten und 2 niedrigsten Werte (stärkere Ausreißer-Filterung)
            valid_values = valid_values[2:-2]
        elif len(valid_values) >= 3:
            valid_values.sort()
            valid_values = valid_values[1:-1]
            
        avg_voltage = sum(valid_values) / len(valid_values)
        
        # Read the other channels
        voltage1 = chan1.voltage if 'chan1' in globals() and chan1 is not None else 0
        voltage2 = chan2.voltage if 'chan2' in globals() and chan2 is not None else 0
        voltage3 = chan3.voltage if 'chan3' in globals() and chan3 is not None else 0
        
        # Für die Kalibrierung drucken wir die Roh-Spannung aus:
        print(f"[Sensor] A0(Feuchte): Roh {voltage:.2f}V / Gefiltert {avg_voltage:.2f}V | A1(EC): {voltage1:.2f}V | A2(Temp?): {voltage2:.2f}V | A3(pH?): {voltage3:.2f}V")
        
        # --- KALIBRIERUNGSWERTE HIER ANPASSEN ---
        V_MIN = 2.0  # Spannung bei 0% Feuchtigkeit (komplett trocken)
        V_MAX = 4.0  # Spannung bei 100% Feuchtigkeit (Wasser)
        
        # Verhindere Division durch Null
        if V_MAX == V_MIN:
            return 0
            
        # Berechne den Prozentwert
        moisture_percent = ((avg_voltage - V_MIN) / (V_MAX - V_MIN)) * 100.0
        
        # Begrenze auf 0-100%
        moisture_percent = max(0, min(100, moisture_percent))
        return round(moisture_percent, 1)
    except Exception as e:
        print(f"Fehler beim Lesen des Bodensensors: {e}")
        return None

def capture_webcam():
    timelapse_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "timelapse_frames")
    os.makedirs(timelapse_dir, exist_ok=True)
    last_timelapse_save = 0

    global is_light_on
    while True:
        if not is_light_on:
            time.sleep(10)
            continue
            
        try:
            # -d /dev/video0 explicit device
            # -S 10 to skip initial frames and let the camera adjust exposure
            res = os.system("fswebcam -d /dev/video0 -r 1280x720 -S 10 --no-banner /tmp/webcam_tmp.jpg >/tmp/webcam_log.txt 2>&1")
            if res == 0:
                os.system("mv /tmp/webcam_tmp.jpg /tmp/webcam.jpg")
            
            # Save timelapse frame every 10 minutes (600 seconds)
            current_time = time.time()
            if current_time - last_timelapse_save > 600:
                timestamp_str = time.strftime("%Y%m%d_%H%M%S")
                tl_filename = os.path.join(timelapse_dir, f"frame_{timestamp_str}.jpg")
                os.system(f"cp /tmp/webcam.jpg {tl_filename}")
                last_timelapse_save = current_time
        except Exception as e:
            pass
        time.sleep(10)

def main():
    print("Hardware Controller gestartet...")
    t = threading.Thread(target=capture_webcam, daemon=True)
    t.start()
    while True:
        try:
            # 1. Hole Soll-Zustand der Relais vom Server
            res = requests.get(SERVER_URL_ACTUATORS, timeout=5)
            if res.status_code == 200:
                data = res.json()
                actuators = data.get("actuators", {})
                
                # Relais schalten
                global is_light_on
                is_light_on = actuators.get("light", False)
                set_relais(PIN_LIGHT, is_light_on)
                
                intensity = actuators.get("lightIntensity", 0)
                if not actuators.get("light", False):
                    intensity = 0
                
                if 'DAC' in globals() and DAC is not None:
                    try:
                        mv = int(intensity * 100)
                        DAC.set_DAC_out_voltage(mv, CHANNEL0)
                        DAC.set_DAC_out_voltage(mv, CHANNEL1)
                    except Exception as e:
                        pass

                try:
                    light_pwm.ChangeDutyCycle(intensity)
                except:
                    pass

                set_relais(PIN_LIGHT_COOLING, actuators.get("lightCoolingFan", False))
                set_relais(PIN_LIGHT_COOLING_PUMP, actuators.get("lightCoolingPump", False))
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

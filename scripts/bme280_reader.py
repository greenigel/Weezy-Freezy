#!/usr/bin/env python3
"""
Weezy-Freezy BME280 / BMP280 Sensor Integration Script
------------------------------------------------------
Liest Temperatur und Luftfeuchtigkeit vom BME280 / BMP280 Sensor über I2C
und sendet die Daten an den lokalen Weezy-Freezy Server (http://localhost:3000/api/telemetry).

Voraussetzungen auf dem Raspberry Pi:
  1. I2C in raspi-config aktivieren: sudo raspi-config -> Interfacing Options -> I2C
  2. Python Pakete installieren:
     pip3 install smbus2 bme280 requests

Verkabelung (I2C):
  - VCC  -> 3.3V (Pin 1)
  - GND  -> GND  (Pin 6)
  - SDA  -> GPIO 2 / SDA (Pin 3)
  - SCL  -> GPIO 3 / SCL (Pin 5)
"""

import time
import sys
import requests

SERVER_URL = "http://localhost:3000/api/telemetry"
I2C_PORT = 1
I2C_ADDRESS = 0x76  # Standard-Adresse (manchmal auch 0x77)

try:
    import smbus2
    import bme280
except ImportError:
    print("FEHLER: 'smbus2' oder 'bme280' Bibliothek nicht gefunden!")
    print("Bitte führe aus: pip3 install smbus2 bme280 requests")
    sys.exit(1)

def read_sensor():
    bus = None
    try:
        bus = smbus2.SMBus(I2C_PORT)
        
        # Method 1: rpi-bme280 (has load_calibration_data)
        if hasattr(bme280, 'load_calibration_data'):
            calibration_params = bme280.load_calibration_data(bus, I2C_ADDRESS)
            data = bme280.sample(bus, I2C_ADDRESS, calibration_params)
            temp = round(data.temperature, 2)
            humidity = round(data.humidity, 2) if hasattr(data, 'humidity') and data.humidity is not None else None
            bus.close()
            return temp, humidity

        # Method 2: Pimoroni / python3-bme280 apt package (has BME280 class)
        elif hasattr(bme280, 'BME280'):
            sensor = bme280.BME280(i2c_dev=bus)
            temp = round(sensor.get_temperature(), 2)
            try:
                humidity = round(sensor.get_humidity(), 2)
            except Exception:
                humidity = None
            bus.close()
            return temp, humidity

        # Method 3: Generic fallback
        else:
            print("Unbekannte bme280 Bibliothek Struktur. Versuche Standard-Aufruf...")
            bus.close()
            return None, None

    except Exception as e:
        if bus:
            try:
                bus.close()
            except Exception:
                pass
        print(f"Fehler beim Lesen des I2C-Sensors: {e}")
        return None, None

def main():
    print("Starting Weezy-Freezy BME280 Sensor Reader Loop...")
    print(f"Sending telemetry data to {SERVER_URL} every 5 seconds...")

    while True:
        temp, humidity = read_sensor()
        
        if temp is not None:
            payload = {
                "temperature": temp
            }
            if humidity is not None and humidity > 0:
                payload["humidity"] = humidity

            try:
                response = requests.post(SERVER_URL, json=payload, timeout=3)
                if response.status_code == 200:
                    data = response.json()
                    print(f"[{time.strftime('%H:%M:%S')}] Gesendet: Temp={temp}°C, Hum={humidity}% | Relais Status: {data.get('desiredActuators')}")
                else:
                    print(f"Server Antwort-Fehler: {response.status_code}")
            except Exception as req_err:
                print(f"Server nicht erreichbar: {req_err}")
        else:
            print("Keine Sensordaten gelesen. Versuche es in 5 Sek erneut...")
            
        time.sleep(5)

if __name__ == "__main__":
    main()

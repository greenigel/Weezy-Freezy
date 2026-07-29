#!/usr/bin/env python3
"""
Weezy-Freezy BME280 / BMP280 Sensor Integration Script
------------------------------------------------------
Liest Temperatur und Luftfeuchtigkeit vom BME280 / BMP280 Sensor über I2C
und sendet die Daten an den lokalen Weezy-Freezy Server (http://localhost:3000/api/telemetry).

I2C Adresse: 0x76 (Standard) oder 0x77
"""

import time
import sys
import requests

SERVER_URL = "http://localhost:3000/api/telemetry"
I2C_PORT = 1
I2C_ADDRESS = 0x76

# Try importing smbus2 or smbus
try:
    import smbus2 as smbus
except ImportError:
    try:
        import smbus
    except ImportError:
        print("FEHLER: 'smbus2' oder 'smbus' nicht gefunden!")
        print("Bitte installiere: sudo apt install python3-smbus2 python3-requests")
        sys.exit(1)

# Try optional high-level bme280 library
try:
    import bme280
except ImportError:
    bme280 = None


def read_raw_bme280(bus, addr):
    """
    Direct I2C register reader for BMP280/BME280.
    Works natively with smbus/smbus2 without external bme280 package.
    """
    # Soft reset
    try:
        bus.write_byte_data(addr, 0xE0, 0xB6)
        time.sleep(0.05)
    except Exception:
        pass

    # Forced mode, 1x temp oversampling, 1x humidity oversampling
    try:
        bus.write_byte_data(addr, 0xF2, 0x01) # ctrl_hum
        bus.write_byte_data(addr, 0xF4, 0x25) # ctrl_meas (forced mode, x1 temp, x1 press)
        time.sleep(0.05)
    except Exception as e:
        raise Exception(f"I2C Schreibfehler an 0x{addr:02X}: {e}")

    # Read compensation parameters (0x88 to 0xA1)
    calib = bus.read_i2c_block_data(addr, 0x88, 24)
    dig_T1 = calib[1] << 8 | calib[0]
    dig_T2 = calib[3] << 8 | calib[2]
    if dig_T2 > 32767: dig_T2 -= 65536
    dig_T3 = calib[5] << 8 | calib[4]
    if dig_T3 > 32767: dig_T3 -= 65536

    # Read humidity compensation dig_H1 (0xA1)
    dig_H1 = bus.read_byte_data(addr, 0xA1)

    # Read humidity compensation dig_H2..H6 (0xE1..0xE7)
    calib_h = bus.read_i2c_block_data(addr, 0xE1, 7)
    dig_H2 = calib_h[1] << 8 | calib_h[0]
    if dig_H2 > 32767: dig_H2 -= 65536
    dig_H3 = calib_h[2]
    dig_H4 = (calib_h[3] << 4) | (calib_h[4] & 0x0F)
    if dig_H4 > 2047: dig_H4 -= 4096
    dig_H5 = (calib_h[5] << 4) | (calib_h[4] >> 4)
    if dig_H5 > 2047: dig_H5 -= 4096
    dig_H6 = calib_h[6]
    if dig_H6 > 127: dig_H6 -= 256

    # Read sensor data (0xF7 to 0xFE)
    data = bus.read_i2c_block_data(addr, 0xF7, 8)
    adc_T = (data[3] << 12) | (data[4] << 4) | (data[5] >> 4)
    adc_H = (data[6] << 8) | data[7]

    # Calculate Temperature
    var1 = (((adc_T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11
    var2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
    t_fine = var1 + var2
    temp = round(((t_fine * 5 + 128) >> 8) / 100.0, 2)

    # Calculate Humidity
    humidity = None
    if adc_H != 0 and dig_H2 != 0:
        var_H = t_fine - 76800
        var_H = ((((adc_H << 14) - (dig_H4 << 20) - (dig_H5 * var_H)) + 16384) >> 15) * \
                (((((((var_H * dig_H6) >> 10) * (((var_H * dig_H3) >> 11) + 32768)) >> 10) + 2097152) * dig_H2 + 8192) >> 14)
        var_H = var_H - (((((var_H >> 15) * (var_H >> 15)) >> 7) * dig_H1) >> 4)
        var_H = 0 if var_H < 0 else var_H
        var_H = 419430400 if var_H > 419430400 else var_H
        humidity = round((var_H >> 12) / 1024.0, 2)

    return temp, humidity


def read_sensor():
    bus = None
    # Check address 0x76 first, fallback to 0x77 if needed
    addresses = [I2C_ADDRESS, 0x77]
    
    for addr in addresses:
        try:
            bus = smbus.SMBus(I2C_PORT)

            # Method 1: Try high-level bme280 package if available
            if bme280 and hasattr(bme280, 'load_calibration_data'):
                try:
                    cal = bme280.load_calibration_data(bus, addr)
                    data = bme280.sample(bus, addr, cal)
                    bus.close()
                    temp = round(data.temperature, 2)
                    humidity = round(data.humidity, 2) if hasattr(data, 'humidity') and data.humidity is not None else None
                    return temp, humidity
                except Exception:
                    pass

            if bme280 and hasattr(bme280, 'BME280'):
                try:
                    sensor = bme280.BME280(i2c_dev=bus)
                    temp = round(sensor.get_temperature(), 2)
                    try:
                        humidity = round(sensor.get_humidity(), 2)
                    except Exception:
                        humidity = None
                    bus.close()
                    return temp, humidity
                except Exception:
                    pass

            # Method 2: Direct raw SMBus register reader (Failsafe for BME280 / BMP280)
            temp, humidity = read_raw_bme280(bus, addr)
            bus.close()
            return temp, humidity

        except Exception as e:
            if bus:
                try:
                    bus.close()
                except Exception:
                    pass
            # Try next address silently
            continue

    print("Fehler beim Lesen des I2C-Sensors auf Adresse 0x76 und 0x77.")
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


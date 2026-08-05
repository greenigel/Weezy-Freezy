import re

with open('scripts/hardware_controller.py', 'r') as f:
    content = f.read()

# Add the I2C DAC initialization
import_block = """import threading
import subprocess"""

dac_init_block = """import threading
import subprocess

try:
    sys.path.append(os.path.dirname(os.path.realpath(__file__)))
    from DFRobot_GP8403 import *
    DAC = DFRobot_GP8403(0x58)
    if DAC.begin() == 0:
        print("Gravity I2C DAC (0-10V) fuer Dimmung initialisiert.")
        DAC.set_DAC_outrange(OUTPUT_RANGE_10V)
    else:
        print("Gravity I2C DAC konnte nicht initialisiert werden.")
        DAC = None
except Exception as e:
    print(f"Gravity I2C DAC Fehler/nicht gefunden: {e}")
    DAC = None"""

content = content.replace(import_block, dac_init_block)

# Update the main loop for DAC
old_pwm = """                intensity = actuators.get("lightIntensity", 0)
                if not actuators.get("light", False):
                    intensity = 0
                try:
                    light_pwm.ChangeDutyCycle(intensity)
                except:
                    pass"""

new_pwm = """                intensity = actuators.get("lightIntensity", 0)
                if not actuators.get("light", False):
                    intensity = 0
                
                if 'DAC' in globals() and DAC is not None:
                    try:
                        mv = int(intensity * 100)
                        DAC.set_DAC_out_voltage(mv, CHANNEL0)
                    except Exception as e:
                        pass

                try:
                    light_pwm.ChangeDutyCycle(intensity)
                except:
                    pass"""

content = content.replace(old_pwm, new_pwm)

with open('scripts/hardware_controller.py', 'w') as f:
    f.write(content)

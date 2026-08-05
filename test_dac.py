import sys
import os
sys.path.append(os.path.join(os.path.dirname(os.path.realpath(__file__)), "scripts"))
from DFRobot_GP8403 import *
import time

try:
    DAC = DFRobot_GP8403(0x5F)
    if DAC.begin() == 0:
        print("Gravity I2C DAC gefunden und initialisiert auf Adresse 0x5F!")
        DAC.set_DAC_outrange(OUTPUT_RANGE_10V)
        
        print("Setze Spannung auf 5V (5000mV)")
        DAC.set_DAC_out_voltage(5000, CHANNEL0)
        DAC.set_DAC_out_voltage(5000, CHANNEL1)
        time.sleep(5)
        
        print("Setze Spannung auf 10V (10000mV)")
        DAC.set_DAC_out_voltage(10000, CHANNEL0)
        DAC.set_DAC_out_voltage(10000, CHANNEL1)
        time.sleep(5)
        
        print("Setze Spannung auf 0V (0mV)")
        DAC.set_DAC_out_voltage(0, CHANNEL0)
        DAC.set_DAC_out_voltage(0, CHANNEL1)
    else:
        print("Gravity I2C DAC konnte NICHT initialisiert werden.")
except Exception as e:
    print(f"Fehler: {e}")

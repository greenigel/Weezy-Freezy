import re

with open('scripts/hardware_controller.py', 'r') as f:
    content = f.read()

old_dac_out = """                if 'DAC' in globals() and DAC is not None:
                    try:
                        mv = int(intensity * 100)
                        DAC.set_DAC_out_voltage(mv, CHANNEL0)
                    except Exception as e:
                        pass"""

new_dac_out = """                if 'DAC' in globals() and DAC is not None:
                    try:
                        mv = int(intensity * 100)
                        DAC.set_DAC_out_voltage(mv, CHANNEL0)
                        DAC.set_DAC_out_voltage(mv, CHANNEL1)
                    except Exception as e:
                        pass"""

content = content.replace(old_dac_out, new_dac_out)

with open('scripts/hardware_controller.py', 'w') as f:
    f.write(content)

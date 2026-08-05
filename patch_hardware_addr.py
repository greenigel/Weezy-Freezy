import re

with open('scripts/hardware_controller.py', 'r') as f:
    content = f.read()

content = content.replace("DAC = DFRobot_GP8403(0x58)", "DAC = DFRobot_GP8403(0x5F)")

with open('scripts/hardware_controller.py', 'w') as f:
    f.write(content)

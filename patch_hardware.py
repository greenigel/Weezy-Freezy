import re

with open('scripts/hardware_controller.py', 'r') as f:
    content = f.read()

# Add global var
if "is_light_on = True" not in content:
    content = content.replace("def set_relais(pin, state):", "is_light_on = True\n\ndef set_relais(pin, state):")

# Update main
old_main = """                # Relais schalten
                set_relais(PIN_LIGHT, actuators.get("light", False))"""

new_main = """                # Relais schalten
                global is_light_on
                is_light_on = actuators.get("light", False)
                set_relais(PIN_LIGHT, is_light_on)"""

content = content.replace(old_main, new_main)

# Update webcam
old_webcam = """    while True:
        try:
            # -d /dev/video0 explicit device"""

new_webcam = """    global is_light_on
    while True:
        if not is_light_on:
            time.sleep(10)
            continue
            
        try:
            # -d /dev/video0 explicit device"""

content = content.replace(old_webcam, new_webcam)

with open('scripts/hardware_controller.py', 'w') as f:
    f.write(content)

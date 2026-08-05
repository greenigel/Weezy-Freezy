import re

with open('scripts/install_services.sh', 'r') as f:
    content = f.read()

content = content.replace(
    "sudo apt-get install -y fswebcam ffmpeg",
    "sudo apt-get install -y fswebcam ffmpeg python3-smbus i2c-tools"
)

with open('scripts/install_services.sh', 'w') as f:
    f.write(content)

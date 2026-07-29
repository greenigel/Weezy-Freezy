#!/bin/bash

# Hole den aktuellen User und das Verzeichnis
APP_USER=$(whoami)
APP_DIR=$(pwd)

# Überprüfe, ob wir im richtigen Verzeichnis sind
if [ ! -f "server.ts" ]; then
    echo "Fehler: Bitte führe dieses Skript aus dem Hauptverzeichnis von Weezy-Freezy aus!"
    echo "Beispiel: cd ~/Weezy-Freezy && bash scripts/install_services.sh"
    exit 1
fi

echo "Richte Weezy-Freezy Autostart-Services für User '$APP_USER' im Verzeichnis '$APP_DIR' ein..."

# 1. Hardware Controller Service
cat <<EOF | sudo tee /etc/systemd/system/weezy-hardware.service
[Unit]
Description=Weezy-Freezy Hardware Controller (Relais & ADS1115)
After=network.target weezy-server.service

[Service]
ExecStart=/usr/bin/python3 $APP_DIR/scripts/hardware_controller.py
WorkingDirectory=$APP_DIR
Restart=always
RestartSec=5
User=$APP_USER
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# 2. BME280 Reader Service
cat <<EOF | sudo tee /etc/systemd/system/weezy-bme280.service
[Unit]
Description=Weezy-Freezy BME280 Sensor Reader
After=network.target weezy-server.service

[Service]
ExecStart=/usr/bin/python3 $APP_DIR/scripts/bme280_reader.py
WorkingDirectory=$APP_DIR
Restart=always
RestartSec=5
User=$APP_USER
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# 3. Web-Server Service
cat <<EOF | sudo tee /etc/systemd/system/weezy-server.service
[Unit]
Description=Weezy-Freezy Node.js Web Server
After=network.target

[Service]
ExecStart=/usr/bin/env npm run start
WorkingDirectory=$APP_DIR
Restart=always
RestartSec=5
User=$APP_USER
Environment=NODE_ENV=production
Environment=PATH=/usr/bin:/usr/local/bin:/home/$APP_USER/.nvm/versions/node/v20.0.0/bin:$PATH

[Install]
WantedBy=multi-user.target
EOF

echo "Lade Systemd Daemon neu..."
sudo systemctl daemon-reload

echo "Aktiviere Services für den automatischen Start beim Systemstart..."
sudo systemctl enable weezy-server.service
sudo systemctl enable weezy-hardware.service
sudo systemctl enable weezy-bme280.service

echo "Starte Services jetzt..."
sudo systemctl restart weezy-server.service
sleep 3
sudo systemctl restart weezy-hardware.service
sudo systemctl restart weezy-bme280.service

echo "================================================================"
echo "Fertig! Die Skripte laufen jetzt automatisch im Hintergrund."
echo ""
echo "Logausgaben prüfen (z.B. zur Fehlerbehebung):"
echo "  sudo journalctl -u weezy-hardware -f"
echo "  sudo journalctl -u weezy-bme280 -f"
echo "  sudo journalctl -u weezy-server -f"
echo ""
echo "Dienste manuell stoppen/starten:"
echo "  sudo systemctl stop weezy-hardware"
echo "  sudo systemctl start weezy-hardware"
echo "================================================================"

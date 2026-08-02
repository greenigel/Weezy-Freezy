import re

with open('server.ts', 'r') as f:
    content = f.read()

# Add HISTORY_FILE
content = content.replace(
    "const DATA_FILE = path.join(__dirname, 'weezy_data.json');", 
    "const DATA_FILE = path.join(__dirname, 'weezy_data.json');\nconst HISTORY_FILE = path.join(__dirname, 'weezy_history.json');"
)

# Update saveData
old_save_data = """function saveData() {
  try {
    const data = {
      controllerState,
      telemetryHistory,
      apiLogs,
      activeProfilesList
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error("Failed to save data:", e);
  }
}"""

new_save_data = """function saveData() {
  try {
    const data = {
      controllerState,
      apiLogs,
      activeProfilesList
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
  } catch (e) {
    console.error("Failed to save data:", e);
  }
}"""

content = content.replace(old_save_data, new_save_data)

# Update loadData
old_load_data = """function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.controllerState) controllerState = data.controllerState;
      if (data.telemetryHistory) telemetryHistory = data.telemetryHistory;
      if (data.apiLogs) apiLogs = data.apiLogs;
      if (data.activeProfilesList) activeProfilesList = data.activeProfilesList;
      
      // Update references
      const profile = activeProfilesList.find(p => p.id === controllerState.activeProfileId) || activeProfilesList[0];
      currentProfile = profile;
      controllerState.activeProfile = profile;
    }
  } catch (e) {
    console.error("Failed to load data, starting fresh:", e);
  }
}"""

new_load_data = """function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      if (data.controllerState) controllerState = data.controllerState;
      if (data.apiLogs) apiLogs = data.apiLogs;
      if (data.activeProfilesList) activeProfilesList = data.activeProfilesList;
      
      // Load history from data file if it exists there (migration)
      if (data.telemetryHistory) telemetryHistory = data.telemetryHistory;
      
      // Update references
      const profile = activeProfilesList.find(p => p.id === controllerState.activeProfileId) || activeProfilesList[0];
      currentProfile = profile;
      controllerState.activeProfile = profile;
    }
    
    // Load history from separate file
    if (fs.existsSync(HISTORY_FILE)) {
       telemetryHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
    }
  } catch (e) {
    console.error("Failed to load data, starting fresh:", e);
  }
}"""

content = content.replace(old_load_data, new_load_data)

# Update telemetry push
old_push = """    // Store in historical record
    telemetryHistory.push(parsedData);
    if (telemetryHistory.length > 100000) telemetryHistory.shift();"""

new_push = """    // Store in historical record (only once per minute to avoid huge files & lag)
    const lastPoint = telemetryHistory[telemetryHistory.length - 1];
    const nowMs = new Date().getTime();
    const lastMs = lastPoint ? new Date(lastPoint.recordedAt).getTime() : 0;
    
    if (nowMs - lastMs >= 60000) {
      telemetryHistory.push(parsedData);
      if (telemetryHistory.length > 20000) telemetryHistory.shift(); // ~13.8 days at 1 point/min
      
      // Save history separately
      try {
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(telemetryHistory), 'utf8');
      } catch(e) {
        console.error("Failed to save history", e);
      }
    }"""

content = content.replace(old_push, new_push)

with open('server.ts', 'w') as f:
    f.write(content)

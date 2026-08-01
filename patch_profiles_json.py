import re

with open('server.ts', 'r') as f:
    content = f.read()

new_endpoint = """  // 5b. Update ALL profiles via JSON
  app.post("/api/profiles/json", (req: Request, res: Response) => {
    const newProfiles = req.body;
    if (!Array.isArray(newProfiles)) {
      return res.status(400).json({ status: "error", message: "Payload muss ein Array von Profilen sein." });
    }
    
    activeProfilesList = newProfiles;
    addApiLog('profile_change', 'web_ui', 'Alle Grow-Profile via JSON überschrieben.');
    
    // Check if active profile still exists, if not fallback to first
    const stillExists = activeProfilesList.find(p => p.id === controllerState.activeProfileId);
    if (stillExists) {
      currentProfile = stillExists;
      controllerState.activeProfile = stillExists;
    } else if (activeProfilesList.length > 0) {
      currentProfile = activeProfilesList[0];
      controllerState.activeProfileId = activeProfilesList[0].id;
      controllerState.activeProfile = activeProfilesList[0];
    }
    
    runRegulationCore();
    saveData();
    res.json({ status: "success", profiles: activeProfilesList });
  });

  // 6. Set active strain grow profile"""

content = content.replace("  // 6. Set active strain grow profile", new_endpoint)

with open('server.ts', 'w') as f:
    f.write(content)

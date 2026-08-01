import re

with open('server.ts', 'r') as f:
    content = f.read()

# 1. Update ControllerState interface to include activeRecipeName
# Wait, types are in src/types.ts

# Let's just do it directly in server.ts for controllerState initialization
content = content.replace("let controllerState: ControllerState = {", "let controllerState: ControllerState = {\n  activeRecipeName: 'standard.json',")

# Update /api/profiles/json
new_post_json = """  // 5b. Update ALL profiles via JSON
  app.post("/api/profiles/json", (req: Request, res: Response) => {
    let newProfiles = req.body;
    let recipeName = "Custom";
    
    if (req.body && !Array.isArray(req.body) && Array.isArray(req.body.profiles)) {
      newProfiles = req.body.profiles;
      recipeName = req.body.recipeName || "Custom";
    }

    if (!Array.isArray(newProfiles)) {
      return res.status(400).json({ status: "error", message: "Payload muss ein Array von Profilen sein." });
    }
    
    activeProfilesList = newProfiles;
    (controllerState as any).activeRecipeName = recipeName;
    addApiLog('profile_change', 'web_ui', `Alle Grow-Profile via JSON überschrieben (${recipeName}).`);
"""
content = re.sub(r'  // 5b\. Update ALL profiles via JSON\n  app\.post\("/api/profiles/json", \(req: Request, res: Response\) => \{\n    const newProfiles = req\.body;\n    if \(!Array\.isArray\(newProfiles\)\) \{\n      return res\.status\(400\)\.json\(\{ status: "error", message: "Payload muss ein Array von Profilen sein\." \}\);\n    \}\n    \n    activeProfilesList = newProfiles;\n    addApiLog\(\'profile_change\', \'web_ui\', \'Alle Grow-Profile via JSON überschrieben\.\'\);', new_post_json, content, flags=re.DOTALL)

with open('server.ts', 'w') as f:
    f.write(content)


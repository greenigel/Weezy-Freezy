import re

with open('server.ts', 'r') as f:
    content = f.read()

new_code = """
// --- Recipe Storage ---
const RECIPES_DIR = path.join(__dirname, 'recipes');
if (!fs.existsSync(RECIPES_DIR)) {
  fs.mkdirSync(RECIPES_DIR);
}

app.get("/api/recipes", (req: Request, res: Response) => {
  try {
    const files = fs.readdirSync(RECIPES_DIR).filter(f => f.endsWith('.json'));
    res.json({ status: "success", recipes: files });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.get("/api/recipes/:name", (req: Request, res: Response) => {
  try {
    const fileName = req.params.name;
    const filePath = path.join(RECIPES_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ status: "error", message: "Rezept nicht gefunden" });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json({ status: "success", profileList: data });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.post("/api/recipes/:name", express.json(), (req: Request, res: Response) => {
  try {
    const fileName = req.params.name.endsWith('.json') ? req.params.name : `${req.params.name}.json`;
    const filePath = path.join(RECIPES_DIR, fileName);
    const newProfiles = req.body;
    
    if (!Array.isArray(newProfiles)) {
      return res.status(400).json({ status: "error", message: "Payload muss ein Array von Profilen sein." });
    }

    fs.writeFileSync(filePath, JSON.stringify(newProfiles, null, 2), 'utf8');
    addApiLog('recipe_saved', 'web_ui', `Neues Rezept gespeichert: ${fileName}`);
    res.json({ status: "success", message: "Rezept gespeichert" });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

app.delete("/api/recipes/:name", (req: Request, res: Response) => {
  try {
    const fileName = req.params.name;
    const filePath = path.join(RECIPES_DIR, fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      addApiLog('recipe_deleted', 'web_ui', `Rezept gelöscht: ${fileName}`);
    }
    res.json({ status: "success", message: "Rezept gelöscht" });
  } catch (e: any) {
    res.status(500).json({ status: "error", message: e.message });
  }
});

  // 5. Create or adjust a custom Grow/Strain profile"""

content = content.replace("  // 5. Create or adjust a custom Grow/Strain profile", new_code)

with open('server.ts', 'w') as f:
    f.write(content)

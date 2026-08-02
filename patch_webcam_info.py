import re

with open('server.ts', 'r') as f:
    content = f.read()

new_api = """  app.get("/api/webcam/info", (req: Request, res: Response) => {
    const camPath = "/tmp/webcam.jpg";
    if (fs.existsSync(camPath)) {
      const stats = fs.statSync(camPath);
      res.json({ lastModified: stats.mtime.toISOString() });
    } else {
      res.status(404).json({ error: "No webcam image found" });
    }
  });

  app.get("/api/webcam","""

content = content.replace('  app.get("/api/webcam",', new_api)

with open('server.ts', 'w') as f:
    f.write(content)

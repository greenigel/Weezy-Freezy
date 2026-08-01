import re

with open('src/components/ProfileManager.tsx', 'r') as f:
    content = f.read()

old_upload = """        const filename = file.name;
        const res = await fetch(`/api/recipes/${filename}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        if (res.ok) {
          fetchRecipes();
        }"""

new_upload = """        const filename = file.name;
        const res = await fetch(`/api/recipes/${filename}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        if (res.ok) {
          fetchRecipes();
          // Automatically load the newly uploaded recipe
          const updateRes = await fetch("/api/profiles/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profiles: parsed, recipeName: filename })
          });
          if (updateRes.ok) {
            setIsLibraryOpen(false);
            window.location.reload();
          }
        }"""

content = content.replace(old_upload, new_upload)

with open('src/components/ProfileManager.tsx', 'w') as f:
    f.write(content)

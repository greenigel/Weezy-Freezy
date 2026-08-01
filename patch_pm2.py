import re

with open('src/components/ProfileManager.tsx', 'r') as f:
    content = f.read()

old_load = """          const updateRes = await fetch("/api/profiles/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.profileList)
          });"""

new_load = """          const updateRes = await fetch("/api/profiles/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ profiles: data.profileList, recipeName: filename })
          });"""

content = content.replace(old_load, new_load)

with open('src/components/ProfileManager.tsx', 'w') as f:
    f.write(content)

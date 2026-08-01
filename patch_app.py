import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

# Replace Strain info with activeRecipeName and week (activeProfile.name)
old_strain = """              <div className="hidden lg:flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3.5 py-1.5 text-3xs shrink-0 select-none">
                <span className="text-slate-400 font-bold">Strain:</span>
                <span className="text-emerald-400 font-extrabold">{activeProfile.name}</span>
              </div>"""

new_strain = """              <div className="hidden lg:flex items-center space-x-2 bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-3.5 py-1.5 text-3xs shrink-0 select-none">
                <span className="text-slate-400 font-bold">Rezept:</span>
                <span className="text-emerald-400 font-extrabold">{systemStatus.activeRecipeName || "Standard"}</span>
                <span className="text-slate-500 font-mono pl-2 border-l border-emerald-500/20">{activeProfile.name}</span>
              </div>"""

content = content.replace(old_strain, new_strain)

with open('src/App.tsx', 'w') as f:
    f.write(content)

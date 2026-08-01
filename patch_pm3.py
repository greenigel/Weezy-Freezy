import re

with open('src/components/ProfileManager.tsx', 'r') as f:
    content = f.read()

# Replace active phase box
old_box = """          <div className="flex flex-col items-center text-center px-4">
            <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase mb-1">Aktuelle Phase</span>
            <h3 className="text-2xl font-black text-white">{activeProfile.name}</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md">{activeProfile.description}</p>
          </div>"""

new_box = """          <div className="flex flex-col items-center text-center px-4 flex-1">
            <span className="text-emerald-400 text-xs font-mono font-bold tracking-widest uppercase mb-1">Aktuelle Phase</span>
            <h3 className="text-2xl font-black text-white">{activeProfile.name}</h3>
            <p className="text-sm text-slate-400 mt-2 max-w-md mb-4">{activeProfile.description}</p>
            
            <div className="flex flex-wrap items-center justify-center gap-3">
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <Thermometer className="w-4 h-4 text-amber-500" />
                <span className="text-xs text-white font-mono">{activeProfile.targetTempDay}°C / {activeProfile.targetTempNight}°C</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <Droplet className="w-4 h-4 text-sky-400" />
                <span className="text-xs text-white font-mono">{activeProfile.targetHumidity}%</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <Wind className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-white font-mono">{activeProfile.targetCo2}ppm</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-xs text-white font-mono">{activeProfile.lightOnDuration}h</span>
              </div>
            </div>
          </div>"""

content = content.replace(old_box, new_box)

# Remove the absolute tooltip from timeline
timeline_regex = r'\{isActive && \(\n\s*<div className="absolute top-12 w-48.*?\n\s*\)\}'
content = re.sub(timeline_regex, '', content, flags=re.DOTALL)

# Also fix the pb-48 to pb-8 and min-w-[800px]
content = content.replace('pb-48', 'pb-8')
content = content.replace('min-w-[800px]', 'min-w-[700px]')

with open('src/components/ProfileManager.tsx', 'w') as f:
    f.write(content)

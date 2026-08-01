import re

with open('src/components/OverviewTab.tsx', 'r') as f:
    content = f.read()

# Add useState if not already there
if "useState(" not in content:
    content = content.replace('import React, { useMemo } from "react";', 'import React, { useMemo, useState } from "react";')
else:
    # already has useState, let's see where to put imageError state
    pass

# find the OverviewTab function definition
def_pattern = r'(export default function OverviewTab\(\{\s*sensors,\s*actuators,\s*activeProfile,\s*apiLogs\s*\}\s*:\s*OverviewTabProps\s*\{\s*)(const now)'
replacement = r'\1const [imageError, setImageError] = React.useState(false);\n  \2'
content = re.sub(def_pattern, replacement, content)

img_code_old = """          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800/80 bg-black">
            <img 
              src={`/api/webcam?t=${now.getTime()}`} 
              alt="Letzte Aufnahme"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement!.innerHTML = '<div class="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">Kein Bild verfügbar</div>';
              }}
            />
          </div>"""

img_code_new = """          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800/80 bg-black">
            {!imageError ? (
              <img 
                src={`/api/webcam?t=${now.getTime()}`} 
                alt="Letzte Aufnahme"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">Kein Bild verfügbar</div>
            )}
          </div>"""

content = content.replace(img_code_old, img_code_new)

with open('src/components/OverviewTab.tsx', 'w') as f:
    f.write(content)

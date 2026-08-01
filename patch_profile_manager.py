import re

with open('src/components/ProfileManager.tsx', 'r') as f:
    content = f.read()

# Add state for edit mode and JSON string
new_imports = """import React, { useMemo, useState } from "react";
import { GrowProfile } from "../types";
import { ArrowLeft, ArrowRight, Check, Droplet, Thermometer, Wind, Zap, Code, Save, X } from "lucide-react";"""

content = re.sub(r'import React, \{ useMemo \} from "react";\nimport \{ GrowProfile \} from "\.\./types";\nimport \{ ArrowLeft, ArrowRight, Check, Droplet, Thermometer, Wind, Zap \} from "lucide-react";', new_imports, content)

new_state = """}: ProfileManagerProps) {
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");

  const handleOpenJson = () => {
    setJsonValue(JSON.stringify(profiles, null, 2));
    setJsonError("");
    setIsJsonMode(true);
  };

  const handleSaveJson = async () => {
    try {
      const parsed = JSON.parse(jsonValue);
      if (!Array.isArray(parsed)) throw new Error("Erwarte ein Array von Profilen.");
      
      const res = await fetch("/api/profiles/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed)
      });
      
      if (!res.ok) throw new Error("Fehler beim Speichern der Profile auf dem Server.");
      
      setIsJsonMode(false);
      window.location.reload(); // Quickest way to refresh app state
    } catch (e: any) {
      setJsonError(e.message);
    }
  };

  const currentIndex = useMemo(() => {"""

content = content.replace("}: ProfileManagerProps) {\n  \n  const currentIndex = useMemo(() => {", new_state)

new_jsx = """
        <div className="flex justify-between items-start mb-8">
          <p className="text-xs text-slate-400 max-w-2xl">
            Das Klimarezept läuft im Hintergrund. Du kannst hier jederzeit in die nächste Phase springen, 
            wenn deine Pflanze sich schneller entwickelt, oder eine Phase zurückgehen.
          </p>
          <button 
            onClick={handleOpenJson}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition text-xs font-semibold"
          >
            <Code className="w-4 h-4" />
            <span>Rezept Editor (JSON)</span>
          </button>
        </div>

        {isJsonMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center space-x-2">
                  <Code className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white">Strains & Klimarezepte bearbeiten</h3>
                </div>
                <button onClick={() => setIsJsonMode(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 flex-1 flex flex-col min-h-0">
                <p className="text-xs text-slate-400 mb-3">
                  Hier kannst du alle Phasen, Zielwerte und Beschreibungen anpassen. Die Struktur muss als gültiges JSON-Array vorliegen.
                </p>
                {jsonError && (
                  <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
                    {jsonError}
                  </div>
                )}
                <textarea 
                  value={jsonValue}
                  onChange={(e) => setJsonValue(e.target.value)}
                  className="flex-1 w-full bg-[#0d1117] text-slate-300 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-emerald-500/50 resize-none"
                  spellCheck={false}
                />
              </div>
              
              <div className="p-4 border-t border-slate-800 bg-slate-950/50 flex justify-end space-x-3">
                <button 
                  onClick={() => setIsJsonMode(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                >
                  Abbrechen
                </button>
                <button 
                  onClick={handleSaveJson}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center space-x-2 transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Rezept Speichern</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Phase Controller */}"""

content = content.replace("""        <p className="text-xs text-slate-400 mb-8">
          Das Klimarezept läuft im Hintergrund. Du kannst hier jederzeit in die nächste Phase springen, 
          wenn deine Pflanze sich schneller entwickelt, oder eine Phase zurückgehen.
        </p>

        {/* Phase Controller */}""", new_jsx)

with open('src/components/ProfileManager.tsx', 'w') as f:
    f.write(content)


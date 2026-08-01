import re

with open('src/components/ProfileManager.tsx', 'r') as f:
    content = f.read()

new_imports = """import React, { useMemo, useState, useEffect, useRef } from "react";
import { GrowProfile } from "../types";
import { ArrowLeft, ArrowRight, Check, Droplet, Thermometer, Wind, Zap, Code, Save, X, FolderOpen, Upload, Trash2, Download } from "lucide-react";"""

content = re.sub(r'import React, \{ useMemo, useState \} from "react";\nimport \{ GrowProfile \} from "\.\./types";\nimport \{ ArrowLeft, ArrowRight, Check, Droplet, Thermometer, Wind, Zap, Code, Save, X \} from "lucide-react";', new_imports, content)

new_state = """}: ProfileManagerProps) {
  const [isJsonMode, setIsJsonMode] = useState(false);
  const [jsonValue, setJsonValue] = useState("");
  const [jsonError, setJsonError] = useState("");

  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState<string[]>([]);
  const [newRecipeName, setNewRecipeName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLibraryOpen) {
      fetchRecipes();
    }
  }, [isLibraryOpen]);

  const fetchRecipes = async () => {
    try {
      const res = await fetch("/api/recipes");
      if (res.ok) {
        const data = await res.json();
        setSavedRecipes(data.recipes);
      }
    } catch (e) {
      console.error("Failed to fetch recipes", e);
    }
  };

  const handleSaveCurrentAsRecipe = async () => {
    if (!newRecipeName.trim()) return;
    try {
      const res = await fetch(`/api/recipes/${newRecipeName}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profiles)
      });
      if (res.ok) {
        setNewRecipeName("");
        fetchRecipes();
      }
    } catch (e) {
      console.error("Failed to save recipe", e);
    }
  };

  const handleLoadRecipe = async (filename: string) => {
    try {
      const res = await fetch(`/api/recipes/${filename}`);
      if (res.ok) {
        const data = await res.json();
        if (data.profileList) {
          // Overwrite active profiles with loaded recipe
          const updateRes = await fetch("/api/profiles/json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.profileList)
          });
          if (updateRes.ok) {
            setIsLibraryOpen(false);
            window.location.reload();
          }
        }
      }
    } catch (e) {
      console.error("Failed to load recipe", e);
    }
  };

  const handleDeleteRecipe = async (filename: string) => {
    if (!window.confirm(`Rezept ${filename} wirklich löschen?`)) return;
    try {
      const res = await fetch(`/api/recipes/${filename}`, { method: "DELETE" });
      if (res.ok) {
        fetchRecipes();
      }
    } catch (e) {
      console.error("Failed to delete recipe", e);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) throw new Error("JSON muss ein Array sein.");
        
        // Save it to server
        const filename = file.name;
        const res = await fetch(`/api/recipes/${filename}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed)
        });
        if (res.ok) {
          fetchRecipes();
        }
      } catch (err) {
        alert("Fehler beim Verarbeiten der Datei.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleOpenJson = () => {"""

content = content.replace("}: ProfileManagerProps) {\n  const [isJsonMode, setIsJsonMode] = useState(false);\n  const [jsonValue, setJsonValue] = useState(\"\");\n  const [jsonError, setJsonError] = useState(\"\");\n\n  const handleOpenJson = () => {", new_state)

new_buttons = """        <div className="flex justify-between items-start mb-8 flex-col sm:flex-row gap-4">
          <p className="text-xs text-slate-400 max-w-xl">
            Das Klimarezept läuft im Hintergrund. Du kannst hier jederzeit in die nächste Phase springen, 
            wenn deine Pflanze sich schneller entwickelt, oder eine Phase zurückgehen.
          </p>
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsLibraryOpen(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition text-xs font-semibold"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Rezept-Bibliothek</span>
            </button>
            <button 
              onClick={handleOpenJson}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-400 hover:text-white transition text-xs font-semibold"
            >
              <Code className="w-4 h-4" />
              <span>Editor</span>
            </button>
          </div>
        </div>

        {/* Recipe Library Modal */}
        {isLibraryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-white">Rezept-Bibliothek</h3>
                </div>
                <button onClick={() => setIsLibraryOpen(false)} className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto space-y-6">
                
                {/* Save Current */}
                <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <h4 className="text-sm font-bold text-white mb-2">Aktuelles Rezept speichern</h4>
                  <div className="flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Name (z.B. white_widow_v2)" 
                      value={newRecipeName}
                      onChange={(e) => setNewRecipeName(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                    <button 
                      onClick={handleSaveCurrentAsRecipe}
                      disabled={!newRecipeName.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg transition disabled:opacity-50"
                    >
                      Speichern
                    </button>
                  </div>
                </div>

                {/* List Saved */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-bold text-white">Gespeicherte Rezepte</h4>
                    <div>
                      <input 
                        type="file" 
                        accept=".json" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs flex items-center space-x-1 text-slate-400 hover:text-emerald-400 transition"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>.json hochladen</span>
                      </button>
                    </div>
                  </div>
                  
                  {savedRecipes.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6 border border-dashed border-slate-700 rounded-xl">Keine Rezepte gespeichert.</p>
                  ) : (
                    <div className="space-y-2">
                      {savedRecipes.map(recipe => (
                        <div key={recipe} className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition group">
                          <span className="text-sm font-mono text-slate-300">{recipe}</span>
                          <div className="flex space-x-2 opacity-50 group-hover:opacity-100 transition">
                            <a 
                              href={`/api/recipes/${recipe}`}
                              download={recipe}
                              className="p-1.5 text-slate-400 hover:text-blue-400 bg-slate-900 rounded-md transition"
                              title="Herunterladen"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                            <button 
                              onClick={() => handleLoadRecipe(recipe)}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 bg-slate-900 rounded-md transition"
                              title="Laden"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteRecipe(recipe)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 bg-slate-900 rounded-md transition"
                              title="Löschen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}"""

content = content.replace("""        <div className="flex justify-between items-start mb-8">
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
        </div>""", new_buttons)

with open('src/components/ProfileManager.tsx', 'w') as f:
    f.write(content)

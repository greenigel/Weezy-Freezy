import React, { useMemo, useState, useEffect, useRef } from "react";
import { GrowProfile } from "../types";
import { ArrowLeft, ArrowRight, Check, Droplet, Thermometer, Wind, Zap, Code, Save, X, FolderOpen, Upload, Trash2, Download } from "lucide-react";

interface ProfileManagerProps {
  profiles: GrowProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: GrowProfile) => void;
}

export default function ProfileManager({
  profiles,
  activeProfileId,
  onSelectProfile
}: ProfileManagerProps) {
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
            body: JSON.stringify({ profiles: data.profileList, recipeName: filename })
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
        }
      } catch (err) {
        alert("Fehler beim Verarbeiten der Datei.");
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

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

  const currentIndex = useMemo(() => {
    return profiles.findIndex(p => p.id === activeProfileId);
  }, [profiles, activeProfileId]);

  const activeProfile = profiles[currentIndex];
  
  const handlePrev = () => {
    if (currentIndex > 0) {
      onSelectProfile(profiles[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (currentIndex < profiles.length - 1) {
      onSelectProfile(profiles[currentIndex + 1].id);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="space-y-6">
      
      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
        <h2 className="text-lg font-bold text-white mb-2">Pflanzenentwicklung & Rezeptur</h2>

        <div className="flex justify-between items-start mb-8 flex-col sm:flex-row gap-4">
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
        )}

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

        {/* Phase Controller */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12 bg-slate-950/50 p-6 rounded-xl border border-slate-800/80">
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-full md:w-auto flex items-center justify-center space-x-2 px-5 py-3 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-bold text-sm">Vorherige Phase</span>
          </button>

          <div className="flex flex-col items-center text-center px-4 flex-1">
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
          </div>

          <button 
            onClick={handleNext}
            disabled={currentIndex === profiles.length - 1}
            className="w-full md:w-auto flex items-center justify-center space-x-2 px-5 py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="font-bold text-sm">Nächste Phase</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Timeline Visualization */}
        <div className="relative pt-8 pb-8 overflow-x-auto scrollbar-hide">
          <div className="absolute top-[45px] left-0 right-0 h-1 bg-slate-800 rounded-full z-0 min-w-[700px]"></div>
          <div className="flex items-start justify-between relative z-10 min-w-[700px]">
            {profiles.map((profile, idx) => {
              const isActive = idx === currentIndex;
              const isPast = idx < currentIndex;
              
              return (
                <div key={profile.id} className="flex flex-col items-center w-32 relative">
                  <div 
                    className={`w-6 h-6 rounded-full border-4 mb-3 flex items-center justify-center transition-all ${
                      isActive ? 'bg-emerald-500 border-slate-900 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-125' : 
                      isPast ? 'bg-emerald-600 border-slate-800' : 
                      'bg-slate-700 border-slate-900'
                    }`}
                  >
                    {isPast && <Check className="w-3 h-3 text-slate-900 font-bold" />}
                  </div>
                  <div className={`text-xs font-bold text-center ${isActive ? 'text-emerald-400' : isPast ? 'text-slate-300' : 'text-slate-500'}`}>
                    {profile.name}
                  </div>
                  
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}

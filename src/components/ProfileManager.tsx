import React, { useState } from "react";
import { GrowProfile } from "../types";
import { Sliders, Check, Save, Plus, Heart } from "lucide-react";

interface ProfileManagerProps {
  profiles: GrowProfile[];
  activeProfileId: string;
  onSelectProfile: (id: string) => void;
  onUpdateProfile: (profile: GrowProfile) => void;
}

export default function ProfileManager({
  profiles,
  activeProfileId,
  onSelectProfile,
  onUpdateProfile
}: ProfileManagerProps) {
  const [editingProfile, setEditingProfile] = useState<GrowProfile | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProfile, setNewProfile] = useState<Omit<GrowProfile, "id">>({
    name: "",
    description: "",
    stage: "vegetative",
    lightOnStartTime: 6,
    lightOnDuration: 18,
    targetTempDay: 25.0,
    targetTempNight: 20.0,
    targetHumidity: 60.0,
    targetCo2: 800,
    targetSoilMoisture: 70.0,
    targetPh: 5.8,
    targetEc: 1.4
  });

  const getStageLabel = (stage: GrowProfile['stage']) => {
    switch (stage) {
      case "germination": return "Keimung";
      case "seedling": return "Sämling";
      case "vegetative": return "Wachstum (Veg)";
      case "flowering": return "Blütewoche (Flower)";
      case "drying": return "Trocknungs-Box";
      default: return stage;
    }
  };

  const handleEditClick = (profile: GrowProfile) => {
    setEditingProfile({ ...profile });
  };

  const handleSaveEdit = () => {
    if (editingProfile) {
      onUpdateProfile(editingProfile);
      setEditingProfile(null);
    }
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfile.name) return;

    const bornId = newProfile.name.toLowerCase().replace(/\s+/g, '_') + "_" + Math.floor(Math.random() * 1000);
    const completedProfile: GrowProfile = {
      ...newProfile,
      id: bornId
    };

    onUpdateProfile(completedProfile);
    setShowCreateForm(false);
    setNewProfile({
      name: "",
      description: "",
      stage: "vegetative",
      lightOnStartTime: 6,
      lightOnDuration: 18,
      targetTempDay: 25.0,
      targetTempNight: 20.0,
      targetHumidity: 60.0,
      targetCo2: 800,
      targetSoilMoisture: 70.0,
      targetPh: 5.8,
      targetEc: 1.4
    });
  };

  return (
    <div id="profile-manager-container" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-800/60 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Heart className="text-emerald-400 h-5 w-5 fill-emerald-400/10" />
            <span>Klimarezepte & Strain Profile</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Wähle voreingestellte oder erstelle benutzerdefinierte Profile. Der Regler steuert Heizung, Filter, Dünger und Licht nach diesen Spezifikationen.
          </p>
        </div>

        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingProfile(null);
          }}
          className="flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 transition self-start sm:self-auto shadow-[0_4px_12px_-2px_rgba(16,185,129,0.3)]"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Profil hinzufügen</span>
        </button>
      </div>

      {/* CREATE NEW PROFILE DIALOG */}
      {showCreateForm && (
        <form id="create-profile-form" onSubmit={handleCreateProfile} className="mb-8 p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-emerald-400">Neues Cannabis Strain-Wachstumsprofil anlegen</h3>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Abbrechen
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Bezeichnung / Strain Name</label>
              <input
                required
                type="text"
                placeholder="z.B. Amnesia Haze - Späte Vegi"
                value={newProfile.name}
                onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Wachstumsphase</label>
              <select
                value={newProfile.stage}
                onChange={(e: any) => setNewProfile({ ...newProfile, stage: e.target.value })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="germination">Keimung</option>
                <option value="seedling">Sämling</option>
                <option value="vegetative">Wachstum (Veg)</option>
                <option value="flowering">Blütenwoche</option>
                <option value="drying">Trocknung</option>
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Beschreibung</label>
              <input
                type="text"
                placeholder="Spezifische Sortendetails wie z.B. 70% Sativa / Hydroponisch..."
                value={newProfile.description}
                onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Lichtperiode Start (Stunde)</label>
              <input
                type="number"
                min="0"
                max="23"
                value={newProfile.lightOnStartTime ?? 6}
                onChange={(e) => setNewProfile({ ...newProfile, lightOnStartTime: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Lichtperiode (Stunden AN)</label>
              <input
                type="number"
                min="0"
                max="24"
                value={newProfile.lightOnDuration}
                onChange={(e) => setNewProfile({ ...newProfile, lightOnDuration: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Ziel-Temp Tag (°C)</label>
              <input
                type="number"
                step="0.5"
                value={newProfile.targetTempDay}
                onChange={(e) => setNewProfile({ ...newProfile, targetTempDay: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Ziel-Temp Nacht (°C)</label>
              <input
                type="number"
                step="0.5"
                value={newProfile.targetTempNight}
                onChange={(e) => setNewProfile({ ...newProfile, targetTempNight: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Ziel-Luftfeuchte (%)</label>
              <input
                type="number"
                value={newProfile.targetHumidity}
                onChange={(e) => setNewProfile({ ...newProfile, targetHumidity: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">CO²-Sollwert (ppm)</label>
              <input
                type="number"
                value={newProfile.targetCo2}
                onChange={(e) => setNewProfile({ ...newProfile, targetCo2: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Ziel-Bodenfeuchte (%)</label>
              <input
                type="number"
                value={newProfile.targetSoilMoisture}
                onChange={(e) => setNewProfile({ ...newProfile, targetSoilMoisture: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Wasser pH-Sollwert</label>
              <input
                type="number"
                step="0.1"
                value={newProfile.targetPh}
                onChange={(e) => setNewProfile({ ...newProfile, targetPh: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-2xs font-semibold text-slate-400 uppercase">Nährsalz EC-Sollwert (mS)</label>
              <input
                type="number"
                step="0.1"
                value={newProfile.targetEc}
                onChange={(e) => setNewProfile({ ...newProfile, targetEc: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 text-white rounded-lg border border-slate-800 p-2 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-lg font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-500 transition"
          >
            Sichern & Strain Speichern
          </button>
        </form>
      )}

      {/* EDITING PROFILE DRAWER DIALOG */}
      {editingProfile && (
        <div id="edit-profile-form" className="mb-8 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-800">
            <h3 className="text-sm font-bold text-amber-400">Rezeptwerte anpassen: {editingProfile.name}</h3>
            <button onClick={() => setEditingProfile(null)} className="text-xs text-slate-400 hover:text-white">
              Abbrechen
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Licht Start (Stunde)</label>
              <input
                type="range"
                min="0"
                max="23"
                value={editingProfile.lightOnStartTime ?? 6}
                onChange={(e) => setEditingProfile({ ...editingProfile, lightOnStartTime: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1.5"
              />
              <span className="text-xs text-slate-300 font-mono">{editingProfile.lightOnStartTime ?? 6}:00 Uhr</span>
            </div>
            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Beleuchtung (Stunden)</label>
              <input
                type="range"
                min="0"
                max="24"
                value={editingProfile.lightOnDuration}
                onChange={(e) => setEditingProfile({ ...editingProfile, lightOnDuration: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1.5"
              />
              <span className="text-xs text-slate-300 font-mono">{editingProfile.lightOnDuration} Std (Licht)</span>
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Soll-Temp Tag (°C)</label>
              <input
                type="number"
                step="0.5"
                value={editingProfile.targetTempDay}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetTempDay: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Soll-Temp Nacht (°C)</label>
              <input
                type="number"
                step="0.5"
                value={editingProfile.targetTempNight ?? 20}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetTempNight: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Luftfeuchtigkeit (%)</label>
              <input
                type="range"
                min="30"
                max="90"
                value={editingProfile.targetHumidity}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetHumidity: Number(e.target.value) })}
                className="w-full accent-amber-500 mt-1.5"
              />
              <span className="text-xs text-slate-300 font-mono">{editingProfile.targetHumidity}% rH</span>
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Ziel-CO² (ppm)</label>
              <input
                type="number"
                step="50"
                value={editingProfile.targetCo2}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetCo2: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Bodenfeuchte (%)</label>
              <input
                type="number"
                value={editingProfile.targetSoilMoisture}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetSoilMoisture: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">Nährlösung pH</label>
              <input
                type="number"
                step="0.05"
                value={editingProfile.targetPh}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetPh: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-3xs font-semibold text-slate-400 uppercase">EC-Wert (mS/cm)</label>
              <input
                type="number"
                step="0.05"
                value={editingProfile.targetEc}
                onChange={(e) => setEditingProfile({ ...editingProfile, targetEc: Number(e.target.value) })}
                className="mt-1 w-full bg-slate-950 border border-slate-800 rounded p-1 text-xs text-white"
              />
            </div>
          </div>
          <button
            onClick={handleSaveEdit}
            className="flex items-center justify-center space-x-1 w-full py-2 bg-amber-500 text-slate-950 rounded-lg text-xs font-semibold mt-2"
          >
            <Save className="h-4 w-4" />
            <span>Rezeptänderung temporär speichern</span>
          </button>
        </div>
      )}

      {/* PROFILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          return (
            <div
              id={`profile-card-${profile.id}`}
              key={profile.id}
              className={`rounded-xl border p-4.5 flex flex-col justify-between transition ${
                isActive
                  ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]"
                  : "border-slate-800 bg-slate-900/10"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="items-center inline-flex rounded-md px-2 py-0.5 text-3xs font-mono font-semibold uppercase tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700/30">
                      {getStageLabel(profile.stage)}
                    </span>
                    <h3 className="text-base font-bold text-white mt-1.5 flex items-center space-x-2">
                      <span>{profile.name}</span>
                      {isActive && <Check className="h-4 w-4 text-emerald-400 shrink-0 stroke-[2.5]" />}
                    </h3>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => onSelectProfile(profile.id)}
                      className="px-3 py-1.5 rounded-lg text-3xs font-bold bg-slate-800/60 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition"
                    >
                      Aktivieren
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-400 mt-2 leading-relaxed h-12 overflow-hidden text-ellipsis">
                  {profile.description}
                </p>

                {/* TARGET INDICATORS PANEL */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-center text-3xs font-mono font-semibold text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                  <div className="border-r border-slate-800/60">
                    <p className="text-slate-500 uppercase font-sans">Belichtung (h)</p>
                    <p className="text-white text-xs font-bold mt-0.5">{profile.lightOnDuration}h</p>
                  </div>
                  <div className="border-r border-slate-800/60">
                    <p className="text-slate-500 uppercase font-sans">Klima (°C)</p>
                    <p className="text-white text-xs font-bold mt-0.5">{profile.targetTempDay} | {profile.targetTempNight}</p>
                  </div>
                  <div className="border-r border-slate-800/60">
                    <p className="text-slate-500 uppercase font-sans">Luft %</p>
                    <p className="text-white text-xs font-bold mt-0.5">{profile.targetHumidity}%</p>
                  </div>
                  <div>
                    <p className="text-slate-500 uppercase font-sans">Dünger EC</p>
                    <p className="text-white text-xs font-bold mt-0.5">{profile.targetEc > 0 ? `${profile.targetEc}` : 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex justify-between items-center">
                <span className="text-3xs text-slate-500">
                  Sollwerte: pH {profile.targetPh} | CO² {profile.targetCo2}ppm
                </span>
                <button
                  onClick={() => handleEditClick(profile)}
                  className="text-3xs text-slate-400 hover:text-emerald-400 flex items-center space-x-1 transition font-bold"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Sollbereiche editieren</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

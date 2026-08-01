import React, { useState, useEffect } from "react";
import { Camera, Thermometer, Droplet, Wind, Waves, Video, PlayCircle, RotateCcw } from "lucide-react";
import { SensorData, GrowProfile } from "../types";

interface OverviewTabProps {
  sensors: SensorData;
  activeProfile: GrowProfile | null;
}

export default function OverviewTab({ sensors, activeProfile }: OverviewTabProps) {
  const [imageError, setImageError] = useState(false);
  const [cycleStartDate, setCycleStartDate] = useState<Date | null>(() => {
    const saved = localStorage.getItem("cannagrow_cycle_start");
    return saved ? new Date(saved) : new Date();
  });

  const [now, setNow] = useState(new Date());
  const [timelapseStatus, setTimelapseStatus] = useState({ isGenerating: false, frameCount: 0, hasVideo: false });
  
  useEffect(() => {
    if (!localStorage.getItem("cannagrow_cycle_start")) {
      localStorage.setItem("cannagrow_cycle_start", cycleStartDate!.toISOString());
    }
  }, [cycleStartDate]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTimelapseStatus = async () => {
      try {
        const res = await fetch("/api/timelapse/status");
        if (res.ok) {
          const data = await res.json();
          setTimelapseStatus(data);
        }
      } catch (e) {
        console.error("Failed to fetch timelapse status");
      }
    };
    fetchTimelapseStatus();
    const interval = setInterval(fetchTimelapseStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerateTimelapse = async () => {
    try {
      const res = await fetch("/api/timelapse/generate", { method: "POST" });
      if (res.ok) {
        setTimelapseStatus(prev => ({ ...prev, isGenerating: true }));
      }
    } catch (e) {
      console.error("Failed to generate timelapse", e);
    }
  };

  const handleResetCycle = () => {
    if (window.confirm("Bist du sicher, dass du den Zyklus-Timer zurücksetzen möchtest?")) {
      const newDate = new Date();
      setCycleStartDate(newDate);
      localStorage.setItem("cannagrow_cycle_start", newDate.toISOString());
    }
  };

  // Calculate days since start
  const msSinceStart = cycleStartDate ? now.getTime() - cycleStartDate.getTime() : 0;
  const daysSinceStart = Math.floor(msSinceStart / (1000 * 60 * 60 * 24));
  
  // Estimation for flowering (e.g., veg is usually 30 days)
  const daysUntilFlower = Math.max(0, 30 - daysSinceStart);

  // Determine stage name
  let stageName = activeProfile?.stage || "vegetative";
  if (stageName === "vegetative") stageName = "Veg";
  if (stageName === "flowering") stageName = "Blüte";
  if (stageName === "seedling") stageName = "Keimling";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Livefeed Tile */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md relative overflow-hidden group flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <span>Letzte Aufnahme</span>
              </h3>
              <p className="text-xs text-slate-400">{now.toLocaleDateString("de-DE")} {now.toLocaleTimeString("de-DE")}</p>
            </div>
            <div className="text-right flex flex-col items-end">
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{stageName} Tag {daysSinceStart + 1}</div>
              {stageName === "Veg" && (
                <div className="text-3xs text-slate-500 font-mono">Zeit bis Blüte: ~{daysUntilFlower} Tage</div>
              )}
              <button onClick={handleResetCycle} className="mt-1 flex items-center space-x-1 text-3xs text-slate-600 hover:text-slate-400 transition">
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
          
          <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800/80 bg-black">
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
          </div>

          {/* Timelapse Section */}
          <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-slate-800 rounded-lg text-slate-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Timelapse Historie</h4>
                <p className="text-xs text-slate-400">
                  {timelapseStatus.frameCount > 0 ? `${timelapseStatus.frameCount} Bilder gespeichert` : 'Keine Bilder vorhanden'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {timelapseStatus.isGenerating ? (
                <span className="text-xs font-mono text-emerald-400 flex items-center bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping mr-2"></span>
                  Video wird erstellt...
                </span>
              ) : (
                <button 
                  onClick={handleGenerateTimelapse}
                  disabled={timelapseStatus.frameCount === 0}
                  className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Video erstellen
                </button>
              )}
              
              {timelapseStatus.hasVideo && (
                <a 
                  href="/api/timelapse/video" 
                  target="_blank" 
                  rel="noreferrer"
                  className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                >
                  <PlayCircle className="w-4 h-4" />
                  <span>Ansehen</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Short Overview Tile */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5 backdrop-blur-md flex flex-col justify-center">
          <h3 className="text-sm font-bold text-white mb-4">Aktuelles Klima</h3>
          <div className="grid grid-cols-2 gap-4">
            
            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/50 flex flex-col items-center text-center">
              <Thermometer className="w-6 h-6 text-amber-500 mb-2" />
              <div className="text-2xl font-black text-white">{sensors.temperature !== null ? sensors.temperature.toFixed(1) : "--"} <span className="text-sm text-slate-500">°C</span></div>
              <div className="text-3xs text-slate-500 uppercase tracking-widest mt-1">Temperatur</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/50 flex flex-col items-center text-center">
              <Droplet className="w-6 h-6 text-sky-400 mb-2" />
              <div className="text-2xl font-black text-white">{sensors.humidity !== null ? sensors.humidity.toFixed(1) : "--"} <span className="text-sm text-slate-500">%</span></div>
              <div className="text-3xs text-slate-500 uppercase tracking-widest mt-1">Luftfeuchte</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/50 flex flex-col items-center text-center">
              <Wind className="w-6 h-6 text-slate-400 mb-2" />
              <div className="text-2xl font-black text-white">{sensors.co2 !== null ? sensors.co2.toFixed(0) : "--"} <span className="text-sm text-slate-500">ppm</span></div>
              <div className="text-3xs text-slate-500 uppercase tracking-widest mt-1">CO₂ Level</div>
            </div>

            <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-950/50 flex flex-col items-center text-center">
              <Waves className="w-6 h-6 text-emerald-500 mb-2" />
              <div className="text-2xl font-black text-white">{sensors.soilMoisture !== null ? sensors.soilMoisture.toFixed(0) : "--"} <span className="text-sm text-slate-500">%</span></div>
              <div className="text-3xs text-slate-500 uppercase tracking-widest mt-1">Bodenfeuchte</div>
            </div>
            
          </div>
        </div>

      </div>
    </div>
  );
}

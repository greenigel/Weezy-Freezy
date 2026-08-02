import { useState, useMemo } from "react";
import { SensorData } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Calendar, RefreshCw, Thermometer, Activity, Clock } from "lucide-react";

interface GrowChartsProps {
  historyData: SensorData[];
  onResetHistory: () => void;
  isResetting: boolean;
}

type TimeRange = "1h" | "4h" | "12h" | "24h" | "1w" | "all";

export default function GrowCharts({
  historyData,
  onResetHistory,
  isResetting
}: GrowChartsProps) {
  const [activeChartGroup, setActiveChartGroup] = useState<"climate" | "nutrients">("climate");
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");

  const filteredData = useMemo(() => {
    if (historyData.length === 0) return [];
    if (timeRange === "all") return historyData;

    const now = new Date().getTime();
    let cutoff = now;
    
    switch (timeRange) {
      case "1h": cutoff = now - (1 * 60 * 60 * 1000); break;
      case "4h": cutoff = now - (4 * 60 * 60 * 1000); break;
      case "12h": cutoff = now - (12 * 60 * 60 * 1000); break;
      case "24h": cutoff = now - (24 * 60 * 60 * 1000); break;
      case "1w": cutoff = now - (7 * 24 * 60 * 60 * 1000); break;
    }

    return historyData.filter(d => new Date(d.recordedAt).getTime() >= cutoff);
  }, [historyData, timeRange]);

  // Format the visual axis label based on selected range
  const formatXAxis = (isoString: string) => {
    try {
      const date = new Date(isoString);
      if (timeRange === "1h" || timeRange === "4h") {
        return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch (e) {
      return "";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs">
          <p className="text-slate-400 font-mono mb-2 border-b border-slate-800 pb-2">
            {new Date(label).toLocaleString("de-DE")}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between space-x-6 py-0.5">
              <span style={{ color: entry.color }} className="font-semibold">{entry.name}:</span>
              <span className="font-mono text-white font-bold">{entry.value !== null ? entry.value : 'n/a'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      
      {/* Settings / Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur-md gap-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => setActiveChartGroup("climate")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeChartGroup === "climate" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <Thermometer className="w-4 h-4" />
            <span>Klimadaten (Temp/RLF/CO2)</span>
          </button>
          <button 
            onClick={() => setActiveChartGroup("nutrients")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
              activeChartGroup === "nutrients" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Boden & Nährstoffe (pH/EC/Feuchte)</span>
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-lg px-3 py-1.5 outline-none focus:border-emerald-500"
          >
            <option value="1h">Letzte Stunde</option>
            <option value="4h">Letzte 4 Stunden</option>
            <option value="12h">Letzte 12 Stunden</option>
            <option value="24h">Letzte 24 Stunden</option>
            <option value="1w">Letzte Woche</option>
            <option value="all">Gesamter Verlauf</option>
          </select>

          <button 
            onClick={onResetHistory}
            disabled={isResetting}
            className="ml-2 flex items-center justify-center p-1.5 rounded-md hover:bg-rose-500/10 text-slate-500 hover:text-rose-400 transition border border-transparent hover:border-rose-500/20"
            title="Telemetrie-Historie unwiderruflich löschen"
          >
            <RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-slate-800/50 rounded-2xl bg-slate-900/20 border-dashed">
          <Calendar className="w-8 h-8 mb-3 opacity-50" />
          <p className="text-sm font-semibold">Keine Telemetriedaten in diesem Zeitraum vorhanden</p>
          <p className="text-xs mt-1">Bitte warte auf den nächsten Speicherzyklus (Polling).</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {activeChartGroup === "climate" ? (
            <>
              {/* Temperature & Humidity Chart */}
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span>
                  Temperatur (°C) & Luftfeuchtigkeit (%)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="recordedAt" tickFormatter={formatXAxis} stroke="#475569" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" />
                      <Area type="monotone" dataKey="humidity" name="RLF (%)" stroke="#0ea5e9" strokeWidth={2} fillOpacity={1} fill="url(#colorHum)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CO2 Chart */}
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-slate-400 mr-2"></span>
                  CO₂ Sättigung (ppm)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="recordedAt" tickFormatter={formatXAxis} stroke="#475569" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#475569" fontSize={10} domain={['dataMin - 100', 'dataMax + 100']} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="co2" name="CO2 (ppm)" stroke="#94a3b8" strokeWidth={2} fillOpacity={1} fill="url(#colorCo2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* pH & EC Chart */}
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2"></span>
                  Nährstofflösung (pH & EC)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorEc" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="recordedAt" tickFormatter={formatXAxis} stroke="#475569" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#475569" fontSize={10} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="ph" name="pH-Wert" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorPh)" />
                      <Area type="monotone" dataKey="ec" name="EC (mS/cm)" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorEc)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Soil Moisture Chart */}
              <div className="p-4 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center">
                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                  Bodenfeuchte (%)
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={filteredData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="recordedAt" tickFormatter={formatXAxis} stroke="#475569" fontSize={10} tickMargin={10} />
                      <YAxis stroke="#475569" fontSize={10} domain={[0, 100]} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="soilMoisture" name="Feuchtigkeit (%)" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSoil)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}

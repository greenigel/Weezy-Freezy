import { useState } from "react";
import { SensorData } from "../types";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Calendar, RefreshCw, Sliders, Thermometer, Activity } from "lucide-react";

interface GrowChartsProps {
  historyData: SensorData[];
  onResetHistory: () => void;
  isResetting: boolean;
}

export default function GrowCharts({
  historyData,
  onResetHistory,
  isResetting
}: GrowChartsProps) {
  const [activeChartGroup, setActiveChartGroup] = useState<"climate" | "nutrients">("climate");

  // Format the visual axis label
  const formatXAxis = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')} ${date.getHours()}:00`;
    } catch (e) {
      return "";
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dateStr = formatXAxis(label);
      return (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 shadow-2xl font-mono text-xs">
          <p className="font-semibold text-slate-400 mb-2">{dateStr}</p>
          {payload.map((item: any) => (
            <div key={item.name} className="flex items-center justify-between space-x-6 py-0.5">
              <span className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color || item.fill }}></span>
                <span className="text-slate-400 font-sans">{item.name}:</span>
              </span>
              <span className="font-bold text-white">{item.value.toFixed(item.name.includes("pH") ? 2 : 1)} {item.unit}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const climatePoints = historyData.map((d) => ({
    time: d.recordedAt,
    "Temperatur (°C)": d.temperature,
    "Luftfeuchte (%)": d.humidity,
    "Bodenfeuchte (%)": d.soilMoisture,
    co2: d.co2,
  }));

  const nutrientPoints = historyData.map((d) => ({
    time: d.recordedAt,
    "pH-Wert": d.ph,
    "EC-Wert (mS)": d.ec,
    "Wassertemp (°C)": d.waterTemp,
  }));

  return (
    <div id="grow-charts-container" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/60 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-emerald-400" />
            <span>Historische Datenanalyse & Zeitverlauf</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visualisierte Sensorwert-Historie der letzten 7 Tage. Überwache Trends und automatische Zyklen.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          {/* Toggle Groups */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveChartGroup("climate")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeChartGroup === "climate"
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Klimawerte
            </button>
            <button
              onClick={() => setActiveChartGroup("nutrients")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                activeChartGroup === "nutrients"
                  ? "bg-slate-800 text-emerald-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Nährlösung
            </button>
          </div>

          {/* Reset Action */}
          <button
            onClick={onResetHistory}
            disabled={isResetting}
            title="Datenbank neu simulieren"
            className="flex items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {historyData.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/20">
          <Activity className="h-8 w-8 text-slate-600 animate-pulse mb-2" />
          <p className="text-sm text-slate-400 font-medium">Lade historische Sensordokumente...</p>
        </div>
      ) : activeChartGroup === "climate" ? (
        <div className="space-y-6">
          {/* Chart 1: Temp & Humidity */}
          <div id="chart-climate-temp-humid" className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-4">
            <p className="text-sm font-semibold text-slate-350 mb-4 flex items-center space-x-1.5">
              <Thermometer className="h-4 w-4 text-emerald-400" />
              <span>Temperatur & Luftfeuchtigkeit</span>
            </p>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={climatePoints} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name="Temperatur" unit="°C" dataKey="Temperatur (°C)" stroke="#10b981" fillOpacity={1} fill="url(#colorTemp)" strokeWidth={2} />
                  <Area type="monotone" name="Luftfeuchtigkeit" unit="%" dataKey="Luftfeuchte (%)" stroke="#3b82f6" fillOpacity={1} fill="url(#colorHum)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Chart 2: CO2 Level */}
            <div id="chart-climate-co2" className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-4">
              <p className="text-sm font-semibold text-slate-350 mb-4 flex items-center space-x-1.5">
                <Sliders className="h-4 w-4 text-purple-400" />
                <span>CO² Konzentration (ppm)</span>
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={climatePoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCo2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#64748b" fontSize={9} />
                    <YAxis domain={[350, 1500]} stroke="#64748b" fontSize={9} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" name="CO2 Sättigung" unit="ppm" dataKey="co2" stroke="#a855f7" fillOpacity={1} fill="url(#colorCo2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Soil Moisture */}
            <div id="chart-climate-soil" className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-4">
              <p className="text-sm font-semibold text-slate-350 mb-4 flex items-center space-x-1.5">
                <Sliders className="h-4 w-4 text-indigo-400" />
                <span>Bodenfeuchtigkeit - Substrat (%)</span>
              </p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={climatePoints} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorSoil" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" fontSize={9} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" name="Bodenfeuchte" unit="%" dataKey="Bodenfeuchte (%)" stroke="#6366f1" fillOpacity={1} fill="url(#colorSoil)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart 1: Hydroponic water components */}
          <div id="chart-nutrients-values" className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-4">
            <p className="text-sm font-semibold text-slate-350 mb-4 flex items-center space-x-1.5">
              <Sliders className="h-4 w-4 text-emerald-400" />
              <span>Nährlösungs-Parameter: pH-Wert & Leitwert (EC)</span>
            </p>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nutrientPoints} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#64748b" fontSize={9} />
                  <YAxis stroke="#64748b" fontSize={9} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name="pH-Wert" unit="" dataKey="pH-Wert" stroke="#f43f5e" fillOpacity={1} fill="url(#colorPh)" strokeWidth={2} />
                  <Area type="monotone" name="EC-Wert" unit="mS/cm" dataKey="EC-Wert (mS)" stroke="#f59e0b" fillOpacity={1} fill="url(#colorEc)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Hydro Reservoir temp */}
          <div id="chart-nutrients-watertemp" className="rounded-xl border border-slate-800/50 bg-slate-950/20 p-4">
            <p className="text-sm font-semibold text-slate-350 mb-4 flex items-center space-x-1.5">
              <Thermometer className="h-4 w-4 text-cyan-400" />
              <span>Wassertemperatur der Nährstoffwanne</span>
            </p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nutrientPoints} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWaterTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis dataKey="time" tickFormatter={formatXAxis} stroke="#64748b" fontSize={9} />
                  <YAxis domain={[15, 25]} stroke="#64748b" fontSize={9} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" name="Wassertemperatur" unit="°C" dataKey="Wassertemp (°C)" stroke="#06b6d4" fillOpacity={1} fill="url(#colorWaterTemp)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

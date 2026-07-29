import { ActuatorState } from "../types";
import { Lightbulb, Wind, CloudRain, Shield, Activity, Droplets, ArrowUp, ArrowDown, Zap, ThermometerSnowflake, Fan } from "lucide-react";

interface ActuatorControlProps {
  actuators: ActuatorState;
  overrideActuators: Partial<Record<keyof ActuatorState, boolean>>;
  isAutoMode: boolean;
  cultivationMode: 'bio' | 'mineralisch';
  onToggleActuator: (key: keyof ActuatorState, value: boolean) => void;
  onToggleAutoMode: (autoMode: boolean) => void;
  onToggleCultivationMode: (mode: 'bio' | 'mineralisch') => void;
}

export default function ActuatorControl({
  actuators,
  overrideActuators,
  isAutoMode,
  cultivationMode,
  onToggleActuator,
  onToggleAutoMode,
  onToggleCultivationMode
}: ActuatorControlProps) {

  const actuatorSpecs: Array<{
    key: keyof ActuatorState;
    label: string;
    subLabel: string;
    description: string;
    icon: any;
    color: string;
    triggerDesc: string;
  }> = [
    {
      key: "light",
      label: "Beleuchtung (Licht)",
      subLabel: "Eingebautes LED-Relais",
      description: "Steuert den Tag/Nacht-Wachstumszyklus der Kammer.",
      icon: Lightbulb,
      color: "peer-checked:bg-yellow-500",
      triggerDesc: "Schaltet nach Stunden-Vorgabe"
    },
    {
      key: "lightCoolingFan",
      label: "Wasserkühlung Beleuchtung",
      subLabel: "LED Ventilator",
      description: "Aktiviert die aktive Kühlung der Leuchtmittel.",
      icon: Fan,
      color: "peer-checked:bg-sky-500",
      triggerDesc: "Aktiv wenn Beleuchtung an (schaltet ab bei zu hoher RLF)"
    },
    {
      key: "lightCoolingPump",
      label: "Wasserpumpe Beleuchtung",
      subLabel: "LED Kühlkreislauf",
      description: "Pumpt das Wasser für die LED-Kühlung.",
      icon: Droplets,
      color: "peer-checked:bg-blue-600",
      triggerDesc: "Aktiv wenn Beleuchtung an"
    },
    {
      key: "cooling",
      label: "Aktive Kühlung",
      subLabel: "Kühlaggregat/Peltier",
      description: "Senkt die Temperatur in der Box aktiv.",
      icon: ThermometerSnowflake,
      color: "peer-checked:bg-blue-400",
      triggerDesc: "Ein bei starker Übertemperatur"
    },
    {
      key: "co2Valve",
      label: "CO² Magnetventil",
      subLabel: "Solenoid Regulator",
      description: "Erhöht die CO²-Konzentration am Tag zur Photosynthese-Maximierung.",
      icon: Shield,
      color: "peer-checked:bg-purple-500",
      triggerDesc: "Aktiv nur bei Licht-An Phase"
    },
    {
      key: "fan",
      label: "Abluft-Ventilation",
      subLabel: "Kammer-Lüfter",
      description: "Saugt heiße oder feuchte Luft ab zur Klimastabilisierung.",
      icon: Wind,
      color: "peer-checked:bg-slate-500",
      triggerDesc: "Ein bei leichter Übertemperatur/Überfeuchte"
    },
    {
      key: "humidifier",
      label: "Luftbefeuchter",
      subLabel: "Humidifier Relais",
      description: "Speist feines Aerosol ein, wenn die Raumluft zu trocken wird.",
      icon: CloudRain,
      color: "peer-checked:bg-cyan-500",
      triggerDesc: "Ein bei Luftfeuchte-Verlust"
    },
    {
      key: "pump",
      label: "Bewässerungspumpe",
      subLabel: "Wasserzufuhr",
      description: "Aktiviert die Tröpfchenbewässerung bei niedriger Bodenfeuchte.",
      icon: Droplets,
      color: "peer-checked:bg-indigo-500",
      triggerDesc: "Ein bei Bodenfeuchtigkeit < Soll"
    },
    {
      key: "ecNutrientPump",
      label: "Dünger-Dosierer (EC)",
      subLabel: "Düngerpumpe (A+B)",
      description: "Fügt Primärnährstoffe der Lösung zu bei geringem Leitwert.",
      icon: Zap,
      color: "peer-checked:bg-amber-500",
      triggerDesc: "Nur in 'mineralisch' Modus aktiv"
    },
    {
      key: "phDownPump",
      label: "pH-Senker Pumpe (pH-)",
      subLabel: "Säuredosierpumpe",
      description: "Fügt feindosiert Phosphorsäure zu, falls die Nährlösung basisch driftet.",
      icon: ArrowDown,
      color: "peer-checked:bg-rose-500",
      triggerDesc: "Automatisches Säuresprühen"
    },
    {
      key: "phUpPump",
      label: "pH-Heber Pumpe (pH+)",
      subLabel: "Laugendosierpumpe",
      description: "Erhöht den pH-Wert der Nährlösung zur optimalen Ionenaufnahme.",
      icon: ArrowUp,
      color: "peer-checked:bg-emerald-500",
      triggerDesc: "Automatisches Alkalischsprühen"
    }
  ];

  return (
    <div id="actuator-control-container" className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-md">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between pb-6 border-b border-slate-800/60 mb-6 gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Aktoren & Relaisschnittstellen</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fernsteuerung der Growbox-Schnittstellen. Im Automatikmodus regelt der Server die Relais vollautomatisch.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Anbaumodus Toggler */}
          <div className="flex items-center bg-slate-955/60 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => onToggleCultivationMode('bio')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                cultivationMode === 'bio'
                  ? "bg-green-500/15 text-green-400 border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.05)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Bio (Erde)
            </button>
            <button
              onClick={() => onToggleCultivationMode('mineralisch')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                cultivationMode === 'mineralisch'
                  ? "bg-sky-500/15 text-sky-400 border border-sky-500/20 shadow-[0_0_10px_rgba(14,165,233,0.05)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Mineralisch
            </button>
          </div>

          {/* Global Auto Toggler */}
          <div className="flex items-center bg-slate-955/60 p-1 rounded-xl border border-slate-800 self-start">
            <button
              onClick={() => onToggleAutoMode(true)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                isAutoMode
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.05)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Automatikmodus
            </button>
            <button
              onClick={() => onToggleAutoMode(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                !isAutoMode
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              Manuell
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {actuatorSpecs.map((spec) => {
          const IconComponent = spec.icon;
          const isActuatorOn = actuators[spec.key];
          const hasManualOverride = overrideActuators[spec.key] !== undefined;
          const isOverriddenTo = overrideActuators[spec.key];

          return (
            <div
              id={`actuator-card-${spec.key}`}
              key={spec.key}
              className={`flex items-start justify-between rounded-xl border p-4.5 transition-all duration-200 ${
                isActuatorOn
                  ? "border-slate-700/60 bg-slate-850/30 shadow-inner"
                  : "border-slate-850 bg-slate-900/10"
              }`}
            >
              <div className="flex space-x-3.5 mr-2">
                <div
                  className={`p-2.5 rounded-lg border shrink-0 transition-all ${
                    isActuatorOn
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                      : "bg-slate-800/40 border-slate-700/10 text-slate-500"
                  }`}
                >
                  <IconComponent className={`h-5 w-5 ${isActuatorOn && spec.key === 'light' ? 'animate-pulse' : ''}`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-white">{spec.label}</span>
                    {hasManualOverride && (
                      <span className="rounded px-1.5 py-0.2 text-3xs font-medium uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        Manuell
                      </span>
                    )}
                  </div>
                  <p className="text-3xs text-slate-500 font-medium tracking-wide font-mono mt-0.5">{spec.subLabel}</p>
                  <p className="text-xs text-slate-400 mt-1 leading-normal max-w-sm">{spec.description}</p>
                  
                  {isAutoMode && (
                    <div className="mt-2.5 flex items-center space-x-1 font-mono text-3xs text-slate-500 font-semibold uppercase">
                      <span className="rounded-full h-1.5 w-1.5 bg-slate-600"></span>
                      <span>{spec.triggerDesc}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Toggle Switch */}
              <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActuatorOn}
                    onChange={(e) => onToggleActuator(spec.key, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className={`w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:bg-slate-900 peer-checked:after:border-neutral-900 ${spec.color}`}></div>
                </label>
                
                {isActuatorOn ? (
                  <span className="text-2xs font-semibold text-emerald-400 flex items-center space-x-1 mt-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 pulse-green"></span>
                    <span>AN</span>
                  </span>
                ) : (
                  <span className="text-2xs font-semibold text-slate-500 flex items-center space-x-1 mt-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span>
                    <span>AUS</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

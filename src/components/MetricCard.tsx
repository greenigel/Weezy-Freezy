import { ReactNode } from "react";
import { AlertCircle, CheckCircle, HelpCircle } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  target: number | string;
  icon: ReactNode;
  status: "success" | "warning" | "error" | "inactive";
  description?: string;
}

export default function MetricCard({
  title,
  value,
  unit,
  target,
  icon,
  status,
  description
}: MetricCardProps) {
  
  const statusColors = {
    success: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      text: "text-emerald-400",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.1)]",
      statusText: "Optimal"
    },
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      text: "text-amber-400",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.1)]",
      statusText: "Regelung läuft..."
    },
    error: {
      bg: "bg-rose-500/10",
      border: "border-rose-500/20",
      text: "text-rose-400",
      glow: "shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      statusText: "Warnung"
    },
    inactive: {
      bg: "bg-slate-500/10",
      border: "border-slate-500/20",
      text: "text-slate-400",
      glow: "",
      statusText: "Inaktiv"
    }
  };

  const currentStyles = statusColors[status];

  return (
    <div id={`metric-card-${title.toLowerCase().replace(/\s+/g, '-')}`} className={`relative overflow-hidden rounded-2xl border ${currentStyles.border} ${currentStyles.bg} ${currentStyles.glow} p-6 transition-all duration-300 hover:scale-[1.02]`}>
      {/* Background visual detail */}
      <div className="absolute -right-6 -bottom-6 opacity-5 max-w-[80px]">
        {icon}
      </div>

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <div className="mt-2 flex items-baseline">
            <span className="text-3xl font-bold tracking-tight text-white">{value}</span>
            <span className="ml-1 text-lg font-medium text-slate-400">{unit}</span>
          </div>
        </div>
        <div className={`p-2.5 rounded-xl ${currentStyles.bg} ${currentStyles.text}`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <div className="flex items-center space-x-1.5 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Sollwert:</span>
          <span className="text-slate-200">{target} {unit}</span>
        </div>
        
        <span className={`inline-flex items-center space-x-1 rounded-full px-2 py-0.5 text-2xs font-medium border ${currentStyles.border} ${currentStyles.text}`}>
          {status === "success" && <CheckCircle className="h-3 w-3" />}
          {(status === "warning" || status === "error") && <AlertCircle className="h-3 w-3 pulse-green" />}
          {status === "inactive" && <HelpCircle className="h-3 w-3" />}
          <span>{currentStyles.statusText}</span>
        </span>
      </div>

      {description && (
        <p className="mt-2 text-3xs text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

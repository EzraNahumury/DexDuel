import type { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  subLabel?: string;
  color?: "violet" | "green" | "yellow" | "blue" | "red";
  size?: "sm" | "md";
}

const COLOR_MAP = {
  violet: {
    icon: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/20",
    value: "text-white",
  },
  green: {
    icon: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    value: "text-green-400",
  },
  yellow: {
    icon: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/20",
    value: "text-yellow-400",
  },
  blue: {
    icon: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
    value: "text-blue-400",
  },
  red: {
    icon: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    value: "text-red-400",
  },
};

export default function StatsCard({
  label,
  value,
  icon: Icon,
  subLabel,
  color = "violet",
  size = "md",
}: StatsCardProps) {
  const colors = COLOR_MAP[color];
  const isSm = size === "sm";

  return (
    <div className="glass rounded-2xl border border-white/[0.06] p-4 hover:border-white/[0.12] transition-all">
      <div className="flex items-start justify-between mb-3">
        <p className={`text-gray-500 ${isSm ? "text-xs" : "text-xs"} font-medium uppercase tracking-wider`}>
          {label}
        </p>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${colors.bg}`}>
          <Icon size={14} className={colors.icon} />
        </div>
      </div>
      <p className={`font-bold stat-number ${isSm ? "text-xl" : "text-2xl"} ${colors.value}`}>
        {value}
      </p>
      {subLabel && (
        <p className="text-xs text-gray-600 mt-1">{subLabel}</p>
      )}
    </div>
  );
}

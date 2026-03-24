"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface CountdownTimerProps {
  endTime: number; // ms timestamp
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
}

function formatCountdown(ms: number) {
  if (ms <= 0) return { m: "00", s: "00", urgent: false };
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return {
    m: String(m).padStart(2, "0"),
    s: String(s).padStart(2, "0"),
    urgent: totalSec <= 30,
  };
}

export default function CountdownTimer({
  endTime,
  size = "md",
  showIcon = true,
}: CountdownTimerProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const textSize =
    size === "sm" ? "text-sm" : size === "lg" ? "text-2xl font-bold" : "text-base font-semibold";
  const iconSize = size === "sm" ? 12 : size === "lg" ? 18 : 14;

  if (now === null) {
    return (
      <span className={`${textSize} text-gray-400 flex items-center gap-1.5 stat-number`}>
        {showIcon && <Clock size={iconSize} />}
        --:--
      </span>
    );
  }

  const { m, s, urgent } = formatCountdown(endTime - now);
  const ended = endTime - now <= 0;

  if (ended) {
    return (
      <span className={`${textSize} text-gray-500 flex items-center gap-1`}>
        {showIcon && <Clock size={iconSize} />}
        Ended
      </span>
    );
  }

  return (
    <span
      className={`${textSize} flex items-center gap-1.5 stat-number ${
        urgent ? "text-red-400 animate-blink" : "text-violet-300"
      }`}
    >
      {showIcon && <Clock size={iconSize} />}
      {m}:{s}
    </span>
  );
}

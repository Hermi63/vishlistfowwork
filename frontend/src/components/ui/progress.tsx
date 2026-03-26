"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const isComplete = pct >= 100;

  return (
    <div
      className={cn(
        "relative h-3 w-full rounded-full bg-white/[0.06] overflow-hidden",
        className
      )}
    >
      {/* Основная полоска прогресса с анимацией появления */}
      <motion.div
        className={cn(
          "relative h-full rounded-full overflow-hidden",
          isComplete
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
            : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
        )}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Shimmer-эффект поверх полоски */}
        {!isComplete && pct > 0 && (
          <div className="progress-shimmer absolute inset-0" />
        )}
      </motion.div>

      {/* Свечение на конце полоски */}
      {pct > 5 && pct < 100 && (
        <motion.div
          className="absolute top-0 h-full w-3 rounded-full bg-white/30 blur-sm"
          initial={{ left: 0 }}
          animate={{ left: `${pct - 1}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}

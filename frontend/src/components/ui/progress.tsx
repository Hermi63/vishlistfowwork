import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-3 w-full rounded-full bg-[var(--border)] overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700 ease-out",
          pct >= 100
            ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
            : "bg-gradient-to-r from-accent to-purple-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

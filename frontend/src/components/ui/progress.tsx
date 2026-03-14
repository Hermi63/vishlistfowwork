import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-3 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          pct >= 100 ? "bg-green-500" : "bg-blue-500"
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

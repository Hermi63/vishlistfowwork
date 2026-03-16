import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-[var(--border)] bg-surface shadow-soft card-hover",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

export { Card };

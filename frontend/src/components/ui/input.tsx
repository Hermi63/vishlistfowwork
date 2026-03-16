import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-11 w-full rounded-xl border-2 border-[var(--border)] bg-surface px-4 py-2 text-sm transition-all duration-200 placeholder:text-muted focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };

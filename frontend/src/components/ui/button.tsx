import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "gradient";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-foreground text-background hover:opacity-90 shadow-soft hover:shadow-medium":
              variant === "default",
            "border-2 border-[var(--border)] bg-surface hover:bg-surface-hover hover:border-accent/30":
              variant === "outline",
            "hover:bg-surface-hover": variant === "ghost",
            "bg-red-500 text-white hover:bg-red-600 shadow-soft": variant === "destructive",
            "btn-gradient text-white shadow-soft": variant === "gradient",
          },
          {
            "h-9 px-4 text-sm gap-1.5": size === "sm",
            "h-11 px-5 text-sm gap-2": size === "md",
            "h-13 px-8 text-base gap-2": size === "lg",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };

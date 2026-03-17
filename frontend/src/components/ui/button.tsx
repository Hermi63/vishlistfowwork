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
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          {
            "bg-zinc-100 text-zinc-900 hover:bg-white shadow-soft":
              variant === "default",
            "border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 text-zinc-200":
              variant === "outline",
            "hover:bg-white/5 text-zinc-400 hover:text-zinc-100": variant === "ghost",
            "bg-red-500/90 text-white hover:bg-red-500 shadow-soft": variant === "destructive",
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

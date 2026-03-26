"use client";

import { InputHTMLAttributes, forwardRef, useState } from "react";
import { cn } from "@/lib/utils";

const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, onFocus, onBlur, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
      <div className="relative w-full">
        {/* Мягкий glow-эффект под инпутом при фокусе */}
        <div
          className={cn(
            "absolute -inset-0.5 rounded-xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 blur-sm transition-opacity duration-300",
            isFocused ? "opacity-100" : "opacity-0"
          )}
        />
        <input
          ref={ref}
          className={cn(
            "relative flex h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-100 transition-all duration-300 placeholder:text-zinc-500 focus:outline-none focus:border-accent/50 focus:bg-white/[0.06] disabled:opacity-50",
            isFocused && "input-focus-glow",
            className
          )}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input };

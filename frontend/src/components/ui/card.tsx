"use client";

import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { motion, HTMLMotionProps } from "framer-motion";

const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <motion.div
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn(
        "premium-card overflow-hidden backdrop-blur-sm shadow-soft",
        className
      )}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      {...(props as HTMLMotionProps<"div">)}
    />
  )
);
Card.displayName = "Card";

export { Card };

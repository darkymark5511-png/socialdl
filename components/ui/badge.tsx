import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive";
}

const variants: Record<NonNullable<BadgeProps["variant"]>, string> = {
  default: "border-transparent bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900",
  secondary:
    "border-transparent bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50",
  outline: "text-zinc-950 dark:text-zinc-50",
  destructive: "border-transparent bg-red-600 text-white",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

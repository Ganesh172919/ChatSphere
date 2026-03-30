import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "focus-ring w-full rounded-2xl border border-border bg-surface-3/90 px-4 py-3 text-sm text-text-base placeholder:text-text-soft",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";

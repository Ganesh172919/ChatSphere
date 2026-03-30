import { forwardRef } from "react";
import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/shared/utils/cn";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "focus-ring min-h-28 w-full resize-y rounded-2xl border border-border bg-surface-3/90 px-4 py-3 text-sm text-text-base placeholder:text-text-soft",
        className
      )}
      {...props}
    />
  );
});

Textarea.displayName = "Textarea";

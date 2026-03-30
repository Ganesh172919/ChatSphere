import type { PropsWithChildren } from "react";
import { cn } from "@/shared/utils/cn";

export const Badge = ({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) => {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/80 bg-surface-3/70 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted",
        className
      )}
    >
      {children}
    </span>
  );
};

import type { PropsWithChildren } from "react";
import { cn } from "@/shared/utils/cn";

export const Panel = ({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) => {
  return <section className={cn("panel-shell noise-surface", className)}>{children}</section>;
};

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { cn } from "@/shared/utils/cn";

interface WorkspaceScaffoldProps {
  eyebrow: string;
  title: string;
  description?: string;
  center: ReactNode;
  main: ReactNode;
  right: ReactNode;
  rightLabel?: string;
  initialMobilePanel?: MobilePanel;
}

type MobilePanel = "list" | "thread" | "context";

export const WorkspaceScaffold = ({
  eyebrow,
  title,
  description,
  center,
  main,
  right,
  rightLabel = "Context",
  initialMobilePanel = "thread",
}: WorkspaceScaffoldProps) => {
  const desktop = useMediaQuery("(min-width: 1024px)");
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(initialMobilePanel);

  useEffect(() => {
    setMobilePanel(initialMobilePanel);
  }, [initialMobilePanel]);

  return (
    <div className="flex min-h-[calc(100vh-1.5rem)] flex-col gap-3">
      <div className="panel-shell flex flex-wrap items-start justify-between gap-4 px-5 py-4 sm:px-6">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <div>
            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">{title}</h1>
            {description ? <p className="mt-2 max-w-2xl text-sm text-text-muted">{description}</p> : null}
          </div>
        </div>
        {!desktop ? (
          <div className="inline-flex rounded-2xl border border-border bg-surface-3 p-1 text-sm">
            {[
              ["list", "List"],
              ["thread", "Thread"],
              ["context", rightLabel],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMobilePanel(value as MobilePanel)}
                className={cn(
                  "focus-ring rounded-xl px-3 py-2 transition",
                  mobilePanel === value ? "bg-surface-4 text-text-base" : "text-text-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {desktop ? (
        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)_320px]">
          <motion.div layout transition={{ type: "spring", stiffness: 220, damping: 24 }}>
            {center}
          </motion.div>
          <motion.div layout transition={{ type: "spring", stiffness: 220, damping: 24 }}>
            {main}
          </motion.div>
          <motion.div layout transition={{ type: "spring", stiffness: 220, damping: 24 }}>
            {right}
          </motion.div>
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          {mobilePanel === "list" ? center : mobilePanel === "thread" ? main : right}
        </div>
      )}
    </div>
  );
};

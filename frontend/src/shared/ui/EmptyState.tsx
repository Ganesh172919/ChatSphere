import type { PropsWithChildren } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/Button";

interface EmptyStateProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export const EmptyState = ({
  eyebrow,
  title,
  description,
  ctaLabel,
  onCta,
  children,
}: EmptyStateProps) => {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-dashed border-border/80 bg-surface-2/70 p-6 sm:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.14),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(255,116,96,0.12),transparent_30%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-accent">{eyebrow}</p>
          <h3 className="font-heading text-2xl text-text-base">{title}</h3>
          <p className="max-w-xl text-sm leading-6 text-text-muted">{description}</p>
        </div>
        {children}
        {ctaLabel && onCta ? (
          <div>
            <Button onClick={onCta}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

import type { PropsWithChildren, ReactNode } from "react";
import { BrainCircuit } from "lucide-react";
import { Link } from "react-router-dom";
import { Panel } from "@/shared/ui/Panel";

interface AuthFrameProps extends PropsWithChildren {
  title: string;
  description: string;
  footer?: ReactNode;
}

export const AuthFrame = ({ title, description, footer, children }: AuthFrameProps) => {
  return (
    <div className="grid min-h-screen gap-4 px-4 py-4 lg:grid-cols-[1.2fr_0.8fr] lg:px-5 lg:py-5">
      <section className="panel-shell noise-surface relative hidden overflow-hidden p-8 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-10">
          <div className="inline-flex items-center gap-3 rounded-full border border-border/80 bg-surface-3/70 px-4 py-2">
            <span className="rounded-2xl bg-gradient-to-br from-accent to-coral-500 p-2 text-ink-950 shadow-glow">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <span className="font-heading text-lg">ChatSphere</span>
          </div>
          <div className="max-w-xl space-y-5">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-accent">
              Cinematic command center
            </p>
            <h1 className="font-heading text-5xl leading-tight">
              Premium AI chat and realtime collaboration, built for signal over noise.
            </h1>
            <p className="max-w-lg text-base leading-8 text-text-muted">
              Move between AI threads, team rooms, memory, and project context in one
              connected workspace with resilient auth and realtime behavior.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-sm text-text-muted">
          <div className="rounded-3xl border border-border/80 bg-surface-3/70 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">AI</p>
            <p className="mt-3 leading-6">Context-aware solo conversations with telemetry.</p>
          </div>
          <div className="rounded-3xl border border-border/80 bg-surface-3/70 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-coral-400">Rooms</p>
            <p className="mt-3 leading-6">Presence, typing, reactions, pinned knowledge.</p>
          </div>
          <div className="rounded-3xl border border-border/80 bg-surface-3/70 p-4">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-amber-400">State</p>
            <p className="mt-3 leading-6">Refresh-aware auth and steady recovery on reconnects.</p>
          </div>
        </div>
      </section>
      <div className="flex items-center justify-center">
        <Panel className="w-full max-w-xl p-6 sm:p-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <Link to="/" className="inline-flex items-center gap-2 font-heading text-xl">
                <span className="rounded-2xl bg-gradient-to-br from-accent to-coral-500 p-2 text-ink-950 shadow-glow">
                  <BrainCircuit className="h-4 w-4" />
                </span>
                ChatSphere
              </Link>
              <div>
                <h2 className="font-heading text-3xl">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">{description}</p>
              </div>
            </div>
            {children}
            {footer ? <div className="border-t border-border/70 pt-5 text-sm text-text-muted">{footer}</div> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
};

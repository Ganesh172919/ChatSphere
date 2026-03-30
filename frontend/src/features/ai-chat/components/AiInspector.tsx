import { ArrowRight, BrainCircuit, FolderSearch, Sparkles } from "lucide-react";
import type { ConversationAction } from "@/features/ai-chat/api";
import { useAuthStore } from "@/features/auth/auth.store";
import type { Insight, ProjectSummary } from "@/shared/types/contracts";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Panel } from "@/shared/ui/Panel";
import { formatRelativeTime } from "@/shared/utils/format";

const actionLabels: Record<ConversationAction, string> = {
  summarize: "Summarize",
  "extract-tasks": "Tasks",
  "extract-decisions": "Decisions",
};

interface AiInspectorProps {
  conversationId?: string;
  insight?: Insight | null;
  latestRun?: {
    model: {
      id: string;
      label: string;
      provider: string;
    };
    usage: {
      totalTokens: number;
    };
    telemetry: {
      processingMs: number;
      selectedModel: string;
    };
  };
  actionResult?: {
    action: ConversationAction;
    payload: Record<string, unknown>;
  };
  projects: ProjectSummary[];
  onAction: (action: ConversationAction) => void;
  onProjectPick: (projectId: string) => void;
}

export const AiInspector = ({
  conversationId,
  insight,
  latestRun,
  actionResult,
  projects,
  onAction,
  onProjectPick,
}: AiInspectorProps) => {
  const user = useAuthStore((state) => state.user);

  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Context</p>
        <h2 className="mt-2 font-heading text-2xl">Insight and control</h2>
        <p className="mt-2 text-sm text-text-muted">
          Conversation summaries, model usage, and quick actions stay visible here.
        </p>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {conversationId ? (
          <>
            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-lg">Insight</h3>
              </div>
              {insight?.summary ? (
                <>
                  <p className="text-sm leading-6 text-text-base">{insight.summary}</p>
                  <p className="text-xs text-text-soft">
                    Last refreshed {formatRelativeTime(insight.lastGeneratedAt)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-text-muted">No generated insight yet.</p>
              )}
            </section>

            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-coral-400" />
                <h3 className="font-heading text-lg">Latest run</h3>
              </div>
              {latestRun ? (
                <div className="space-y-3 text-sm text-text-muted">
                  <p>
                    {latestRun.model.label} · {latestRun.model.provider}
                  </p>
                  <p>
                    {latestRun.usage.totalTokens} total tokens · {latestRun.telemetry.processingMs} ms
                  </p>
                  <p className="font-mono text-xs text-text-soft">
                    {latestRun.telemetry.selectedModel}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-muted">
                  Send a prompt to see usage and telemetry summary.
                </p>
              )}
            </section>

            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <FolderSearch className="h-4 w-4 text-amber-400" />
                <h3 className="font-heading text-lg">Quick actions</h3>
              </div>
              <div className="grid gap-2">
                {(Object.keys(actionLabels) as ConversationAction[]).map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="secondary"
                    className="justify-between"
                    onClick={() => onAction(action)}
                  >
                    {actionLabels[action]}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
              {actionResult ? (
                <div className="rounded-2xl border border-border/70 bg-surface-1/70 p-3 text-sm text-text-muted">
                  <p className="mb-2 font-medium text-text-base">
                    {actionLabels[actionResult.action]}
                  </p>
                  <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs">
                    {JSON.stringify(actionResult.payload, null, 2)}
                  </pre>
                </div>
              ) : null}
            </section>
          </>
        ) : (
          <EmptyState
            eyebrow="Ready"
            title="Tune the next conversation"
            description="Pick a project anchor before you send the first prompt and keep your context tight."
          >
            <div className="grid gap-3 rounded-[24px] border border-border/70 bg-surface-3/70 p-4 text-sm text-text-muted">
              <p>Account: {user?.displayName ?? user?.username}</p>
              <p>Projects ready for context: {projects.length}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {projects.slice(0, 4).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => onProjectPick(project.id)}
                  className="focus-ring rounded-full border border-border px-3 py-2 text-sm text-text-muted transition hover:border-border-strong hover:text-text-base"
                >
                  {project.name}
                </button>
              ))}
            </div>
          </EmptyState>
        )}
      </div>
    </Panel>
  );
};

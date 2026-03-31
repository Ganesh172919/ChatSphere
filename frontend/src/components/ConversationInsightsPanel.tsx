import { Brain, CheckSquare, ClipboardList, ListTodo, RefreshCw, Tags } from 'lucide-react';
import type { ConversationInsight } from '../types/chat';

interface Props {
  heading: string;
  insight: ConversationInsight | null | undefined;
  loading?: boolean;
  onAction?: (action: 'summarize' | 'extract-tasks' | 'extract-decisions') => void;
}

function ActionButton({
  label,
  action,
  onAction,
}: {
  label: string;
  action: 'summarize' | 'extract-tasks' | 'extract-decisions';
  onAction?: Props['onAction'];
}) {
  return (
    <button
      onClick={() => onAction?.(action)}
      className="rounded-lg border border-navy-700/40 bg-navy-900/40 px-2.5 py-1.5 text-[10px] text-gray-300 transition-colors hover:border-neon-purple/30 hover:text-white"
      type="button"
    >
      {label}
    </button>
  );
}

export default function ConversationInsightsPanel({ heading, insight, loading = false, onAction }: Props) {
  return (
    <aside className="rounded-xl border border-navy-700/50 bg-navy-800/70 p-3 backdrop-blur-lg">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue">
          <Brain size={14} className="text-white" />
        </div>
        <div>
          <h3 className="font-display text-xs font-semibold text-white">{heading}</h3>
          <p className="text-[10px] text-gray-500">Live conversation intelligence</p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        <ActionButton label="Summarize" action="summarize" onAction={onAction} />
        <ActionButton label="Extract tasks" action="extract-tasks" onAction={onAction} />
        <ActionButton label="Extract decisions" action="extract-decisions" onAction={onAction} />
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-navy-700/40 bg-navy-900/40 px-2.5 py-3 text-xs text-gray-400">
          <RefreshCw size={12} className="animate-spin" />
          Refreshing insight...
        </div>
      ) : !insight ? (
        <div className="rounded-lg border border-navy-700/40 bg-navy-900/30 px-2.5 py-3 text-xs text-gray-500">
          Insight will appear after the conversation has enough context.
        </div>
      ) : (
        <div className="space-y-2.5 text-xs">
          <section className="rounded-lg border border-navy-700/30 bg-navy-900/30 p-2.5">
            <p className="mb-1 text-[9px] uppercase tracking-wider text-gray-600">Summary</p>
            <p className="text-gray-200 leading-5">{insight.summary || insight.title}</p>
          </section>

          <section className="rounded-lg border border-navy-700/30 bg-navy-900/30 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-gray-300">
              <Tags size={11} />
              Topics
            </div>
            <div className="flex flex-wrap gap-1.5">
              {insight.topics.length > 0 ? (
                insight.topics.map((topic) => (
                  <span
                    key={topic}
                    className="rounded-full border border-neon-purple/20 bg-neon-purple/10 px-2 py-0.5 text-[10px] text-neon-purple"
                  >
                    {topic}
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-gray-500">No topics yet</span>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-navy-700/30 bg-navy-900/30 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-gray-300">
              <ClipboardList size={11} />
              Decisions
            </div>
            {insight.decisions.length > 0 ? (
              <div className="space-y-1.5">
                {insight.decisions.map((decision) => (
                  <p key={decision} className="text-gray-200 leading-5">
                    {decision}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">No decisions extracted yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-navy-700/30 bg-navy-900/30 p-2.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-medium text-gray-300">
              <ListTodo size={11} />
              Action Items
            </div>
            {insight.actionItems.length > 0 ? (
              <div className="space-y-1.5">
                {insight.actionItems.map((item) => (
                  <div key={`${item.text}-${item.owner || 'none'}`} className="flex items-start gap-1.5 text-gray-200">
                    <CheckSquare size={12} className="mt-0.5 text-neon-blue flex-shrink-0" />
                    <div>
                      <p className="leading-5">{item.text}</p>
                      {item.owner ? <p className="text-[10px] text-gray-500">Owner: {item.owner}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-gray-500">No tasks extracted yet.</p>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}

import { motion } from "framer-motion";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import type { ConversationSummary } from "@/shared/types/contracts";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/format";

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId?: string;
  search: string;
  onSearchChange: (value: string) => void;
  filterMode: "all" | "project";
  onFilterModeChange: (value: "all" | "project") => void;
}

export const AiConversationSidebar = ({
  conversations,
  activeConversationId,
  search,
  onSearchChange,
  filterMode,
  onFilterModeChange,
}: SidebarProps) => {
  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-soft" />
          <Input
            aria-label="Search conversations"
            placeholder="Search conversations"
            className="pl-11"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Button
            type="button"
            variant={filterMode === "all" ? "secondary" : "ghost"}
            className="px-3 py-2 text-xs"
            onClick={() => onFilterModeChange("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={filterMode === "project" ? "secondary" : "ghost"}
            className="px-3 py-2 text-xs"
            onClick={() => onFilterModeChange("project")}
          >
            With project
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {conversations.length ? (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: { staggerChildren: 0.04 },
              },
            }}
            className="space-y-3"
          >
            {conversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0 },
                }}
              >
                <Link
                  to={`/app/ai/${conversation.id}`}
                  className={cn(
                    "focus-ring block rounded-[24px] border border-border/70 px-4 py-4 transition hover:border-border-strong hover:bg-surface-3/80",
                    conversation.id === activeConversationId &&
                      "border-accent/50 bg-surface-3/90 shadow-glow"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-lg text-text-base">
                        {conversation.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-text-muted">
                        {conversation.lastMessage ?? "No assistant response yet."}
                      </p>
                    </div>
                    <Badge>{conversation.messageCount}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-text-soft">
                    <span>{conversation.project?.name ?? "No project"}</span>
                    <span>{formatRelativeTime(conversation.updatedAt)}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <EmptyState
            eyebrow="Conversations"
            title="No conversations yet"
            description="Start a fresh AI thread with model routing, optional project context, and upload-aware prompts."
          />
        )}
      </div>
    </Panel>
  );
};

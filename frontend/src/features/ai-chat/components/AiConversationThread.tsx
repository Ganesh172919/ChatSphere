import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ConversationDetail, ConversationMessage } from "@/shared/types/contracts";
import { AttachmentCard } from "@/shared/ui/AttachmentCard";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Panel } from "@/shared/ui/Panel";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/format";

const AiMessageBubble = ({
  message,
  latest,
}: {
  message: ConversationMessage;
  latest: boolean;
}) => {
  const assistant = message.role === "assistant";

  return (
    <motion.article
      initial={{ opacity: 0, x: assistant ? 12 : -12, y: 12 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className={cn("flex", assistant ? "justify-start" : "justify-end")}
    >
      <div
        className={cn(
          "max-w-[92%] rounded-[28px] border px-4 py-4 shadow-panel sm:max-w-[80%]",
          assistant
            ? "border-teal-500/20 bg-gradient-to-br from-surface-3/95 to-surface-2/95"
            : "border-coral-500/20 bg-gradient-to-br from-coral-500/20 to-surface-3/95"
        )}
      >
        <div className="mb-3 flex items-center gap-2">
          <Badge className={assistant ? "text-accent" : "text-coral-400"}>
            {assistant ? "Assistant" : "You"}
          </Badge>
          <span className="text-xs text-text-soft">{formatRelativeTime(message.timestamp)}</span>
          {latest ? <span className="text-xs text-text-soft">Latest</span> : null}
        </div>
        {assistant ? (
          <div className="prose prose-invert max-w-none text-sm leading-7 prose-headings:font-heading prose-code:font-mono prose-code:text-coral-400 prose-pre:rounded-2xl prose-pre:border prose-pre:border-border prose-pre:bg-surface-1">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-7 text-text-base">{message.content}</p>
        )}
        {message.file ? <AttachmentCard attachment={message.file} /> : null}
        {message.modelTelemetry ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-surface-1/70 px-3 py-2 font-mono text-[11px] text-text-soft">
            model: {String(message.modelTelemetry.selectedModel ?? "n/a")} · provider:{" "}
            {String(message.modelTelemetry.provider ?? "n/a")}
          </div>
        ) : null}
      </div>
    </motion.article>
  );
};

interface ThreadProps {
  conversation?: ConversationDetail;
  onDeleteConversation: () => void;
}

export const AiConversationThread = ({
  conversation,
  onDeleteConversation,
}: ThreadProps) => {
  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      {conversation ? (
        <>
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">
                  Active conversation
                </p>
                <h2 className="font-heading text-2xl">{conversation.title}</h2>
                <p className="mt-1 text-sm text-text-muted">
                  Updated {formatRelativeTime(conversation.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {conversation.project?.name ? <Badge>{conversation.project.name}</Badge> : null}
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onDeleteConversation}
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {conversation.messages.map((message, index) => (
              <AiMessageBubble
                key={`${message.timestamp}-${index}`}
                message={message}
                latest={index === conversation.messages.length - 1}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center p-6 sm:p-8">
          <EmptyState
            eyebrow="Fresh prompt"
            title="Spin up a new AI conversation"
            description="Choose a model, optionally anchor it to a project, attach relevant material, and send your first prompt."
          />
        </div>
      )}
    </Panel>
  );
};

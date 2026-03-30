import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { Bot, CornerUpLeft, Edit3, Pin, SmilePlus, Trash2 } from "lucide-react";
import { useMemo, useRef } from "react";
import type { StoredRoomMessage } from "@/features/messages/reducer";
import type { RoomDetail, TypingPayload } from "@/shared/types/contracts";
import { AttachmentCard } from "@/shared/ui/AttachmentCard";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Panel } from "@/shared/ui/Panel";
import { cn } from "@/shared/utils/cn";
import { formatRelativeTime } from "@/shared/utils/format";

interface RoomThreadProps {
  room?: RoomDetail;
  messages: StoredRoomMessage[];
  currentUserId?: string;
  typingUsers: TypingPayload[];
  aiThinking: boolean;
  onReply: (message: StoredRoomMessage) => void;
  onEdit: (message: StoredRoomMessage) => void;
  onDelete: (message: StoredRoomMessage) => void;
  onTogglePin: (message: StoredRoomMessage) => void;
  onReaction: (message: StoredRoomMessage, emoji: string) => void;
}

const emojiOptions = ["\u{1F44D}", "\u{1F525}", "\u{1F916}"];

export const RoomThread = ({
  room,
  messages,
  currentUserId,
  typingUsers,
  aiThinking,
  onReply,
  onEdit,
  onDelete,
  onTogglePin,
  onReaction,
}: RoomThreadProps) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const items = useMemo(
    () => [
      ...messages,
      ...(aiThinking
        ? [
            {
              id: "ai-thinking",
              roomId: room?.id ?? "",
              userId: "assistant",
              username: "AI",
              content: "Thinking...",
              isAI: true,
              status: "SENT" as const,
              isPinned: false,
              isEdited: false,
              isDeleted: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ]
        : []),
    ],
    [aiThinking, messages, room?.id]
  );

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 132,
    overscan: 8,
  });

  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      {room ? (
        <>
          <div className="border-b border-border/70 px-5 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Room</p>
                <h2 className="font-heading text-2xl">{room.name}</h2>
                <p className="mt-1 text-sm text-text-muted">{room.description ?? "No description"}</p>
              </div>
              <Badge>{room.members.length} members</Badge>
            </div>
          </div>
          <div ref={parentRef} className="flex-1 overflow-y-auto px-5 py-5">
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const message = items[virtualRow.index];
                const mine = message.userId === currentUserId;
                const deleted = message.isDeleted;
                const reactions = Object.entries(message.reactions ?? {});

                return (
                  <motion.article
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 top-0 w-full pb-4"
                    style={{
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <div className={cn("flex gap-3", mine ? "justify-end" : "justify-start")}>
                      {!mine ? (
                        <Avatar
                          src={null}
                          fallback={message.username}
                          size="sm"
                          online={room.members.find((member) => member.userId === message.userId)?.user.onlineStatus}
                        />
                      ) : null}
                      <div
                        className={cn(
                          "group max-w-[92%] rounded-[28px] border px-4 py-4 sm:max-w-[78%]",
                          message.isAI
                            ? "border-accent/30 bg-gradient-to-br from-accent/10 to-surface-3/90"
                            : mine
                              ? "border-coral-500/25 bg-gradient-to-br from-coral-500/15 to-surface-3/90"
                              : "border-border/80 bg-surface-3/90"
                        )}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          {message.isAI ? <Bot className="h-4 w-4 text-accent" /> : null}
                          <p className="font-medium text-text-base">{message.username}</p>
                          <span className="text-xs text-text-soft">{formatRelativeTime(message.createdAt)}</span>
                          {message.isPinned ? <Pin className="h-3.5 w-3.5 text-amber-400" /> : null}
                          {message.pending ? <Badge>Sending</Badge> : null}
                        </div>
                        {message.replyTo?.snippet ? (
                          <div className="mb-3 rounded-2xl border border-border/70 bg-surface-1/70 px-3 py-2 text-xs text-text-soft">
                            Replying to: {message.replyTo.snippet}
                          </div>
                        ) : null}
                        <p className={cn("whitespace-pre-wrap text-sm leading-7", deleted && "italic text-text-soft")}>
                          {deleted ? "[deleted]" : message.content}
                        </p>
                        {message.fileUrl || message.fileName ? (
                          <AttachmentCard
                            attachment={{
                              fileUrl: message.fileUrl ?? undefined,
                              fileName: message.fileName ?? undefined,
                              fileType: message.fileType ?? undefined,
                              fileSize: message.fileSize ?? undefined,
                            }}
                          />
                        ) : null}
                        {reactions.length ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {reactions.map(([emoji, users]) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => onReaction(message, emoji)}
                                className={cn(
                                  "focus-ring rounded-full border px-3 py-1 text-xs transition",
                                  users.includes(currentUserId ?? "")
                                    ? "border-accent/50 bg-accent/10 text-text-base"
                                    : "border-border text-text-muted"
                                )}
                              >
                                {emoji} {users.length}
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 flex flex-wrap items-center gap-2 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label="Reply to message"
                            onClick={() => onReply(message)}
                          >
                            <CornerUpLeft className="h-4 w-4" />
                          </Button>
                          {mine && !message.isAI ? (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label="Edit message"
                              onClick={() => onEdit(message)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {!message.isAI ? (
                            <Button
                              type="button"
                              variant="ghost"
                              aria-label="Delete message"
                              onClick={() => onDelete(message)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            aria-label={message.isPinned ? "Unpin message" : "Pin message"}
                            onClick={() => onTogglePin(message)}
                          >
                            <Pin className="h-4 w-4" />
                          </Button>
                          {emojiOptions.map((emoji) => (
                            <Button
                              key={emoji}
                              type="button"
                              variant="ghost"
                              aria-label={`React with ${emoji}`}
                              onClick={() => onReaction(message, emoji)}
                            >
                              <SmilePlus className="h-4 w-4" />
                              {emoji}
                            </Button>
                          ))}
                        </div>
                        <p className="mt-3 text-xs text-text-soft">
                          Read by {(message.readBy ?? []).length} {message.isEdited ? "- edited" : ""}
                        </p>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
          {typingUsers.length ? (
            <div className="border-t border-border/70 px-5 py-3 text-sm text-text-muted">
              {typingUsers.map((user) => user.username).join(", ")} typing...
            </div>
          ) : null}
        </>
      ) : (
        <div className="flex flex-1 items-center p-6 sm:p-8">
          <EmptyState
            eyebrow="Rooms"
            title="Open or create a room"
            description="Once a room is active you'll see realtime messages, typing state, reactions, reads, and AI replies here."
          />
        </div>
      )}
    </Panel>
  );
};

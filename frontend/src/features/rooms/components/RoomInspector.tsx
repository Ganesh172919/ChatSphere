import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Crown, Gauge, Pin, Shield, Vote } from "lucide-react";
import type { RoomDetail, RoomMember, RoomMessage, Poll, PresenceUpdate } from "@/shared/types/contracts";
import { Avatar } from "@/shared/ui/Avatar";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { formatRelativeTime } from "@/shared/utils/format";

const pollSchema = z.object({
  question: z.string().min(5, "At least 5 characters").max(300, "Max 300 characters"),
  options: z.string().min(3, "Add at least 2 comma-separated options"),
});

type PollSchema = z.infer<typeof pollSchema>;

interface RoomInspectorProps {
  room?: RoomDetail;
  members: RoomMember[];
  pinnedMessages: RoomMessage[];
  polls: Poll[];
  presence: Record<string, PresenceUpdate>;
  onLeaveRoom: () => void;
  onVotePoll: (pollId: string, optionId: string) => void;
  onClosePoll: (pollId: string) => void;
  onCreatePoll: (payload: { question: string; options: string[] }) => void;
  onUpdateMemberRole: (userId: string, role: RoomMember["role"]) => void;
  onRemoveMember: (userId: string) => void;
}

export const RoomInspector = ({
  room,
  members,
  pinnedMessages,
  polls,
  presence,
  onLeaveRoom,
  onVotePoll,
  onClosePoll,
  onCreatePoll,
  onUpdateMemberRole,
  onRemoveMember,
}: RoomInspectorProps) => {
  const pollForm = useForm<PollSchema>({
    resolver: zodResolver(pollSchema),
    defaultValues: {
      question: "",
      options: "",
    },
  });

  return (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="border-b border-border/70 px-5 py-5">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-accent">Room context</p>
        <h2 className="mt-2 font-heading text-2xl">Members, polls, pinned</h2>
        <p className="mt-2 text-sm text-text-muted">
          Keep the live room state and moderation tools close at hand.
        </p>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
        {room ? (
          <>
            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-lg">Insight</h3>
              </div>
              <p className="text-sm leading-6 text-text-muted">
                {room.insight?.summary ?? "No room insight generated yet."}
              </p>
              <Button type="button" variant="secondary" onClick={onLeaveRoom}>
                Leave room
              </Button>
            </section>

            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-coral-400" />
                <h3 className="font-heading text-lg">Members</h3>
              </div>
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.userId}
                    className="rounded-2xl border border-border/70 bg-surface-1/60 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={member.user.avatar}
                        fallback={member.user.displayName ?? member.user.username}
                        size="sm"
                        online={presence[member.userId]?.onlineStatus ?? member.user.onlineStatus}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-base">
                          {member.user.displayName ?? member.user.username}
                        </p>
                        <p className="text-xs text-text-soft">{member.role}</p>
                      </div>
                      {member.role === "ADMIN" ? <Crown className="h-4 w-4 text-amber-400" /> : null}
                    </div>
                    <p className="mt-2 text-xs text-text-soft">
                      Joined {formatRelativeTime(member.joinedAt)}
                    </p>
                    {member.canManage ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          className="focus-ring rounded-2xl border border-border bg-surface-3 px-3 py-2 text-sm text-text-base"
                          value={member.role}
                          onChange={(event) =>
                            onUpdateMemberRole(
                              member.userId,
                              event.target.value as RoomMember["role"]
                            )
                          }
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="MODERATOR">MODERATOR</option>
                          <option value="MEMBER">MEMBER</option>
                        </select>
                        <Button type="button" variant="ghost" onClick={() => onRemoveMember(member.userId)}>
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <Pin className="h-4 w-4 text-amber-400" />
                <h3 className="font-heading text-lg">Pinned messages</h3>
              </div>
              {pinnedMessages.length ? (
                pinnedMessages.map((message) => (
                  <div key={message.id} className="rounded-2xl border border-border/70 bg-surface-1/60 p-3">
                    <p className="text-sm font-medium text-text-base">{message.username}</p>
                    <p className="mt-1 text-sm text-text-muted">{message.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-muted">Nothing pinned yet.</p>
              )}
            </section>

            <section className="space-y-3 rounded-[24px] border border-border/80 bg-surface-3/70 p-4">
              <div className="flex items-center gap-2">
                <Vote className="h-4 w-4 text-accent" />
                <h3 className="font-heading text-lg">Polls</h3>
              </div>
              <form
                className="grid gap-3 rounded-2xl border border-border/70 bg-surface-1/60 p-3"
                onSubmit={pollForm.handleSubmit((values) => {
                  onCreatePoll({
                    question: values.question,
                    options: values.options
                      .split(",")
                      .map((option) => option.trim())
                      .filter(Boolean),
                  });
                  pollForm.reset();
                })}
              >
                <Input placeholder="Question" {...pollForm.register("question")} />
                <Input placeholder="Option A, Option B" {...pollForm.register("options")} />
                {pollForm.formState.errors.question ? (
                  <p className="text-xs text-danger-500">{pollForm.formState.errors.question.message}</p>
                ) : null}
                <Button type="submit" variant="secondary">
                  Create poll
                </Button>
              </form>
              {polls.length ? (
                <div className="space-y-3">
                  {polls.map((poll) => (
                    <div key={poll.id} className="rounded-2xl border border-border/70 bg-surface-1/60 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-text-base">{poll.question}</p>
                        {poll.closed ? <Badge>Closed</Badge> : null}
                      </div>
                      <div className="mt-3 space-y-2">
                        {poll.options.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => onVotePoll(poll.id, option.id)}
                            className="focus-ring flex w-full items-center justify-between rounded-2xl border border-border bg-surface-3 px-3 py-2 text-left text-sm text-text-base"
                          >
                            <span>{option.label}</span>
                            <span className="text-text-soft">{option.voteCount}</span>
                          </button>
                        ))}
                      </div>
                      {!poll.closed ? (
                        <Button type="button" variant="ghost" className="mt-3" onClick={() => onClosePoll(poll.id)}>
                          Close poll
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No polls yet.</p>
              )}
            </section>
          </>
        ) : (
          <EmptyState
            eyebrow="Context"
            title="Select a room"
            description="Room members, polls, pinned messages, and moderation controls appear here when a room is active."
          />
        )}
      </div>
    </Panel>
  );
};

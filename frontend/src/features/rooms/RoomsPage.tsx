import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Command, LoaderCircle, Paperclip } from "lucide-react";
import { nanoid } from "nanoid";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { queryClient } from "@/app/query-client";
import { listAiModels } from "@/features/ai-chat/api";
import { useAuthStore } from "@/features/auth/auth.store";
import { useMessageStore } from "@/features/messages/message.store";
import type { StoredRoomMessage } from "@/features/messages/reducer";
import {
  closePoll,
  createPoll,
  createRoom,
  getGroupMembers,
  getPinnedMessages,
  getRoom,
  joinRoom,
  leaveRoom,
  listRoomPolls,
  listRooms,
  removeGroupMember,
  updateGroupMemberRole,
  votePoll,
} from "@/features/rooms/api";
import { RoomInspector } from "@/features/rooms/components/RoomInspector";
import { RoomsSidebar } from "@/features/rooms/components/RoomsSidebar";
import { RoomThread } from "@/features/rooms/components/RoomThread";
import { UPLOAD_ACCEPT, uploadFile } from "@/features/uploads/api";
import { getErrorMessage } from "@/shared/api/errors";
import { emitSocketEvent } from "@/shared/socket/socket-client";
import { useSocketStore } from "@/shared/socket/socket.store";
import type { AttachmentMeta, RoomMessage } from "@/shared/types/contracts";
import { Button } from "@/shared/ui/Button";
import { Panel } from "@/shared/ui/Panel";
import { Textarea } from "@/shared/ui/Textarea";
import { WorkspaceScaffold } from "@/shared/ui/WorkspaceScaffold";
import { formatBytes } from "@/shared/utils/format";

const composerSchema = z.object({
  message: z.string().min(1, "Type a message").max(6000, "Max 6000 characters"),
});

type ComposerSchema = z.infer<typeof composerSchema>;

const roomKeys = {
  rooms: ["rooms"] as const,
  room: (roomId: string) => ["room", roomId] as const,
  members: (roomId: string) => ["room-members", roomId] as const,
  pinned: (roomId: string) => ["room-pinned", roomId] as const,
  polls: (roomId: string) => ["room-polls", roomId] as const,
};

const RoomsPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const searchState = useState("");
  const [search, setSearch] = searchState;
  const [replyTo, setReplyTo] = useState<{ messageId: string; snippet?: string } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingAttachmentMeta, setPendingAttachmentMeta] = useState<AttachmentMeta | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const typingSentRef = useRef(false);
  const typingTimerRef = useRef<number | null>(null);
  const roomCollection = useMessageStore((state) => (roomId ? state.rooms[roomId] : undefined));
  const hydrateRoom = useMessageStore((state) => state.hydrateRoom);
  const addOptimistic = useMessageStore((state) => state.addOptimisticRoomMessage);
  const reconcileOptimistic = useMessageStore((state) => state.reconcileOptimisticRoomMessage);
  const presence = useSocketStore((state) => state.presence);
  const typingEntries = useSocketStore((state) => (roomId ? state.typingByRoom[roomId] : undefined));
  const aiThinking = useSocketStore((state) => (roomId ? state.aiThinkingByRoom[roomId] ?? false : false));
  const clearRoomTransientState = useSocketStore((state) => state.clearRoomTransientState);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<ComposerSchema>({
    resolver: zodResolver(composerSchema),
    defaultValues: { message: "" },
  });
  const composerValue = watch("message");
  const roomState = useMemo(
    () =>
      roomCollection
        ? (roomCollection.order
            .map((id) => roomCollection.entities[id])
            .filter(Boolean) as StoredRoomMessage[])
        : [],
    [roomCollection]
  );
  const typingUsers = useMemo(
    () => (typingEntries ?? []).filter((entry) => entry.userId !== user?.id),
    [typingEntries, user?.id]
  );
  const handleAsyncError = (error: unknown) => {
    toast.error(getErrorMessage(error));
  };

  const roomsQuery = useQuery({ queryKey: roomKeys.rooms, queryFn: listRooms });
  const roomQuery = useQuery({
    queryKey: roomId ? roomKeys.room(roomId) : ["room", "empty"],
    queryFn: () => getRoom(roomId!),
    enabled: Boolean(roomId),
  });
  const membersQuery = useQuery({
    queryKey: roomId ? roomKeys.members(roomId) : ["room-members", "empty"],
    queryFn: () => getGroupMembers(roomId!),
    enabled: Boolean(roomId),
  });
  const pinnedQuery = useQuery({
    queryKey: roomId ? roomKeys.pinned(roomId) : ["room-pinned", "empty"],
    queryFn: () => getPinnedMessages(roomId!),
    enabled: Boolean(roomId),
  });
  const pollsQuery = useQuery({
    queryKey: roomId ? roomKeys.polls(roomId) : ["room-polls", "empty"],
    queryFn: () => listRoomPolls(roomId!),
    enabled: Boolean(roomId),
  });
  const modelsQuery = useQuery({ queryKey: ["ai-models"], queryFn: listAiModels });

  useEffect(() => {
    if (roomQuery.data && roomId) {
      hydrateRoom(roomId, roomQuery.data.messages);
    }
  }, [hydrateRoom, roomId, roomQuery.data]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    emitSocketEvent("join_room", { roomId }).catch(() => undefined);

    return () => {
      emitSocketEvent("leave_room", { roomId }).catch(() => undefined);
      clearRoomTransientState(roomId);
    };
  }, [clearRoomTransientState, roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    if (composerValue.trim().length > 0 && !typingSentRef.current) {
      emitSocketEvent("typing_start", { roomId }).catch(() => undefined);
      typingSentRef.current = true;
    }

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    const timeout = window.setTimeout(() => {
      if (typingSentRef.current) {
        emitSocketEvent("typing_stop", { roomId }).catch(() => undefined);
        typingSentRef.current = false;
      }
    }, 900);

    typingTimerRef.current = timeout;
    setSlashOpen(composerValue.startsWith("/"));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [composerValue, roomId]);

  useEffect(() => {
    if (!roomId || !roomState.length || !user?.id) {
      return;
    }

    const unread = roomState
      .filter((message) => message.userId !== user.id && !(message.readBy ?? []).includes(user.id))
      .map((message) => message.id);

    if (unread.length) {
      emitSocketEvent("mark_read", {
        roomId,
        messageIds: unread,
      }).catch(() => undefined);
    }
  }, [roomId, roomState, user?.id]);

  const createRoomMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: roomKeys.rooms });
      navigate(`/app/rooms/${room.id}`);
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: joinRoom,
    onSuccess: (_response, joinedRoomId) => {
      queryClient.invalidateQueries({ queryKey: roomKeys.rooms });
      navigate(`/app/rooms/${joinedRoomId}`);
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: leaveRoom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roomKeys.rooms });
      navigate("/app/rooms", { replace: true });
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!roomId || !user) {
      return;
    }

    try {
      const isAiPrompt = values.message.startsWith("/ai ");
      const content = isAiPrompt ? values.message.replace(/^\/ai\s+/, "").trim() : values.message.trim();

      if (!content) {
        setError("message", { message: "Type a message" });
        return;
      }

      if (isAiPrompt) {
        await emitSocketEvent("trigger_ai", {
          roomId,
          prompt: content,
          modelId: modelsQuery.data?.auto.id,
        });
        reset();
        return;
      }

      const tempId = `temp-${nanoid()}`;
      const uploaded = pendingAttachment ? await uploadFile(pendingAttachment, "room") : pendingAttachmentMeta;
      const optimisticMessage: StoredRoomMessage = {
        id: tempId,
        clientTempId: tempId,
        roomId,
        userId: user.id,
        username: user.displayName ?? user.username,
        content,
        isAI: false,
        status: "SENT",
        readBy: [user.id],
        reactions: {},
        isPinned: false,
        isEdited: false,
        isDeleted: false,
        replyTo: replyTo ?? undefined,
        fileUrl: uploaded?.fileUrl ?? null,
        fileName: uploaded?.fileName ?? uploaded?.originalName ?? null,
        fileType: uploaded?.fileType ?? null,
        fileSize: uploaded?.fileSize ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      addOptimistic(roomId, optimisticMessage);

      const payload = {
        roomId,
        content,
        ...(replyTo ? { replyTo } : {}),
        ...(uploaded
          ? {
              file: {
                fileUrl: uploaded.fileUrl,
                fileName: uploaded.fileName ?? uploaded.originalName,
                fileType: uploaded.fileType,
                fileSize: uploaded.fileSize,
              },
            }
          : {}),
      };

      const eventName = replyTo ? "reply_message" : "send_message";
      const serverMessage = await emitSocketEvent<RoomMessage>(eventName, payload);
      reconcileOptimistic(roomId, tempId, serverMessage);
      reset();
      setReplyTo(null);
      setPendingAttachment(null);
      setPendingAttachmentMeta(null);
    } catch (error) {
      handleAsyncError(error);
    }
  });

  const handleAttachment = (file: File | null) => {
    if (!file) {
      setPendingAttachment(null);
      setPendingAttachmentMeta(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("message", { message: "Attachment must be 5MB or smaller" });
      return;
    }
    setPendingAttachment(file);
    setPendingAttachmentMeta({
      originalName: file.name,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  };

  const handleEdit = async (message: StoredRoomMessage) => {
    const next = window.prompt("Edit message", message.content);
    if (!next || next.trim() === message.content) {
      return;
    }
    try {
      await emitSocketEvent("edit_message", { messageId: message.id, content: next.trim() });
    } catch (error) {
      handleAsyncError(error);
    }
  };

  const handleDelete = async (message: StoredRoomMessage) => {
    try {
      await emitSocketEvent("delete_message", { messageId: message.id });
    } catch (error) {
      handleAsyncError(error);
    }
  };

  const handleTogglePin = async (message: StoredRoomMessage) => {
    if (!roomId) return;
    try {
      await emitSocketEvent(message.isPinned ? "unpin_message" : "pin_message", {
        roomId,
        messageId: message.id,
      });
      queryClient.invalidateQueries({ queryKey: roomKeys.pinned(roomId) });
    } catch (error) {
      handleAsyncError(error);
    }
  };

  const handleReaction = async (message: StoredRoomMessage, emoji: string) => {
    try {
      await emitSocketEvent("reaction", { messageId: message.id, emoji });
    } catch (error) {
      handleAsyncError(error);
    }
  };

  return (
    <WorkspaceScaffold
      eyebrow="Realtime Rooms"
      title="Group chat with presence, typing, and AI in the loop"
      description="Create or join rooms, collaborate in realtime, trigger AI directly from the thread, and manage polls, pins, and roles without leaving the workspace."
      initialMobilePanel={roomId ? "thread" : "list"}
      center={
        <RoomsSidebar
          rooms={roomsQuery.data ?? []}
          activeRoomId={roomId}
          search={search}
          onSearchChange={setSearch}
          onCreateRoom={(values) => createRoomMutation.mutate(values)}
          onJoinRoom={(value) => joinRoomMutation.mutate(value)}
        />
      }
      main={
        <div className="flex min-h-[70vh] flex-col">
          <RoomThread
            room={roomQuery.data}
            messages={roomState}
            currentUserId={user?.id}
            typingUsers={typingUsers}
            aiThinking={aiThinking}
            onReply={(message) => setReplyTo({ messageId: message.id, snippet: message.content.slice(0, 160) })}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
            onReaction={handleReaction}
          />
          <Panel className="mt-3 border border-border/70">
            <form className="space-y-4 p-5" onSubmit={onSubmit}>
              <AnimatePresence>
                {slashOpen ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="grid gap-2 rounded-3xl border border-accent/30 bg-accent/10 p-4 text-sm text-text-muted"
                  >
                    <div className="flex items-center gap-2 text-text-base">
                      <Command className="h-4 w-4 text-accent" />
                      Slash hints
                    </div>
                    <p>`/ai` asks the room assistant, regular text posts to the room.</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
              {replyTo ? (
                <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface-3/70 px-4 py-3 text-sm text-text-muted">
                  <span>Replying to: {replyTo.snippet}</span>
                  <Button type="button" variant="ghost" onClick={() => setReplyTo(null)}>
                    Clear
                  </Button>
                </div>
              ) : null}
              <Textarea
                aria-label="Room message composer"
                placeholder="Message the room, or type /ai followed by your prompt..."
                className="min-h-28"
                {...register("message")}
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="focus-ring inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-border bg-surface-3 px-3 py-2 text-sm text-text-base transition hover:border-border-strong">
                    <Paperclip className="h-4 w-4" />
                    Attach
                    <input
                      className="hidden"
                      type="file"
                      accept={UPLOAD_ACCEPT}
                      onChange={(e) => handleAttachment(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {pendingAttachmentMeta ? (
                    <span className="rounded-full border border-border px-3 py-2 text-sm text-text-muted">
                      {pendingAttachmentMeta.originalName ?? pendingAttachmentMeta.fileName} - {formatBytes(pendingAttachmentMeta.fileSize)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 text-sm text-text-muted">
                  <span>{composerValue.length}/6000</span>
                  <Button type="submit">
                    {createRoomMutation.isPending || joinRoomMutation.isPending ? (
                      <LoaderCircle className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    Send
                  </Button>
                </div>
              </div>
              {errors.message ? <p className="text-xs text-danger-500">{errors.message.message}</p> : null}
            </form>
          </Panel>
        </div>
      }
      right={
        <RoomInspector
          room={roomQuery.data}
          members={membersQuery.data ?? []}
          pinnedMessages={(pinnedQuery.data ?? []) as RoomMessage[]}
          polls={pollsQuery.data ?? []}
          presence={presence}
          onLeaveRoom={() => roomId && leaveRoomMutation.mutate(roomId)}
          onVotePoll={(pollId, optionId) =>
            votePoll(pollId, optionId).then(() => {
              if (roomId) {
                return queryClient.invalidateQueries({ queryKey: roomKeys.polls(roomId) });
              }
              return undefined;
            }).catch(handleAsyncError)
          }
          onClosePoll={(pollId) =>
            closePoll(pollId).then(() => {
              if (roomId) {
                return queryClient.invalidateQueries({ queryKey: roomKeys.polls(roomId) });
              }
              return undefined;
            }).catch(handleAsyncError)
          }
          onCreatePoll={(payload) => {
            if (!roomId) {
              return;
            }
            createPoll({ roomId, ...payload }).then(() => {
              queryClient.invalidateQueries({ queryKey: roomKeys.polls(roomId) });
            }).catch(handleAsyncError);
          }}
          onUpdateMemberRole={(userId, role) => {
            if (!roomId) {
              return;
            }
            updateGroupMemberRole(roomId, userId, role).then(() => {
              queryClient.invalidateQueries({ queryKey: roomKeys.members(roomId) });
            }).catch(handleAsyncError);
          }}
          onRemoveMember={(userId) => {
            if (!roomId) {
              return;
            }
            removeGroupMember(roomId, userId).then(() => {
              queryClient.invalidateQueries({ queryKey: roomKeys.members(roomId) });
            }).catch(handleAsyncError);
          }}
        />
      }
      rightLabel="Context"
    />
  );
};

export default RoomsPage;

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Command,
  LoaderCircle,
  Paperclip,
} from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  type ConversationAction,
  deleteConversation,
  getConversation,
  getConversationInsight,
  listAiModels,
  listConversations,
  listProjects,
  runConversationAction,
  sendChat,
} from "@/features/ai-chat/api";
import { AiConversationSidebar } from "@/features/ai-chat/components/AiConversationSidebar";
import { AiConversationThread } from "@/features/ai-chat/components/AiConversationThread";
import { AiInspector } from "@/features/ai-chat/components/AiInspector";
import { useAiChatUiStore } from "@/features/ai-chat/ui.store";
import { UPLOAD_ACCEPT, uploadFile } from "@/features/uploads/api";
import { queryClient } from "@/app/query-client";
import type { AttachmentMeta, ConversationDetail } from "@/shared/types/contracts";
import { useDebouncedValue } from "@/shared/hooks/useDebouncedValue";
import { Button } from "@/shared/ui/Button";
import { Panel } from "@/shared/ui/Panel";
import { Textarea } from "@/shared/ui/Textarea";
import { WorkspaceScaffold } from "@/shared/ui/WorkspaceScaffold";
import { formatBytes } from "@/shared/utils/format";

const composerSchema = z.object({
  message: z.string().min(1, "Type a message").max(6000, "Max 6000 characters"),
});

type ComposerSchema = z.infer<typeof composerSchema>;

const keys = {
  conversations: ["conversations"] as const,
  conversation: (id: string) => ["conversation", id] as const,
  insight: (id: string) => ["conversation-insight", id] as const,
};

const AiChatPage = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [, startTransition] = useTransition();
  const {
    search,
    filterMode,
    selectedModelId,
    selectedProjectId,
    latestRuns,
    actionResults,
    setSearch,
    setFilterMode,
    setSelectedModelId,
    setSelectedProjectId,
    setLatestRun,
    setActionResult,
  } = useAiChatUiStore();
  const [pendingAttachment, setPendingAttachment] = useState<File | null>(null);
  const [pendingAttachmentMeta, setPendingAttachmentMeta] = useState<AttachmentMeta | null>(null);
  const [slashOpen, setSlashOpen] = useState(false);
  const deferredSearch = useDeferredValue(useDebouncedValue(search, 180));
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

  const conversationsQuery = useQuery({
    queryKey: keys.conversations,
    queryFn: listConversations,
  });
  const modelsQuery = useQuery({ queryKey: ["ai-models"], queryFn: listAiModels });
  const projectsQuery = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const conversationQuery = useQuery({
    queryKey: conversationId ? keys.conversation(conversationId) : ["conversation", "empty"],
    queryFn: () => getConversation(conversationId!),
    enabled: Boolean(conversationId),
  });
  const insightQuery = useQuery({
    queryKey: conversationId ? keys.insight(conversationId) : ["conversation-insight", "empty"],
    queryFn: () => getConversationInsight(conversationId!),
    enabled: Boolean(conversationId),
  });

  useEffect(() => {
    if (conversationQuery.data?.project?.id) {
      setSelectedProjectId(conversationQuery.data.project.id);
    }
  }, [conversationQuery.data?.project?.id, setSelectedProjectId]);

  useEffect(() => {
    setSlashOpen(composerValue.startsWith("/"));
  }, [composerValue]);

  const filteredConversations = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    return list.filter((conversation) => {
      const haystack =
        `${conversation.title} ${conversation.lastMessage ?? ""} ${conversation.project?.name ?? ""}`.toLowerCase();
      const matchesSearch = haystack.includes(deferredSearch.toLowerCase());
      const matchesFilter = filterMode === "project" ? Boolean(conversation.project) : true;
      return matchesSearch && matchesFilter;
    });
  }, [conversationsQuery.data, deferredSearch, filterMode]);

  const sendMutation = useMutation({
    mutationFn: async (values: ComposerSchema) => {
      const uploaded = pendingAttachment ? await uploadFile(pendingAttachment, "ai") : pendingAttachmentMeta;
      return sendChat({
        message: values.message,
        conversationId,
        modelId: selectedModelId !== "auto" ? selectedModelId : undefined,
        projectId: selectedProjectId ?? undefined,
        attachment: uploaded
          ? {
              fileUrl: uploaded.fileUrl,
              fileName: uploaded.fileName ?? uploaded.originalName,
              fileType: uploaded.fileType,
              fileSize: uploaded.fileSize,
              textContent: uploaded.textContent,
              base64: uploaded.base64,
            }
          : undefined,
      });
    },
    onMutate: async (values) => {
      if (!conversationId) {
        return {};
      }
      const previous = queryClient.getQueryData<ConversationDetail>(keys.conversation(conversationId));
      if (previous) {
        const now = new Date().toISOString();
        queryClient.setQueryData<ConversationDetail>(keys.conversation(conversationId), {
          ...previous,
          messages: [
            ...previous.messages,
            {
              role: "user",
              content: values.message,
              timestamp: now,
              file: pendingAttachmentMeta ?? undefined,
            },
            {
              role: "assistant",
              content: "Thinking through that now...",
              timestamp: now,
              modelTelemetry: { provider: "pending", selectedModel: selectedModelId },
            },
          ],
        });
      }
      return { previous };
    },
    onSuccess: (result) => {
      setLatestRun(result.conversationId, {
        model: result.model,
        usage: result.usage,
        telemetry: result.telemetry,
        updatedAt: new Date().toISOString(),
      });
      if (result.insight) {
        queryClient.setQueryData(keys.insight(result.conversationId), result.insight);
      }
      queryClient.invalidateQueries({ queryKey: keys.conversations });
      queryClient.invalidateQueries({ queryKey: keys.conversation(result.conversationId) });
      if (result.conversationId !== conversationId) {
        startTransition(() => navigate(`/app/ai/${result.conversationId}`));
      }
      reset();
      setPendingAttachment(null);
      setPendingAttachmentMeta(null);
    },
    onError: (_error, _values, context) => {
      if (conversationId && context?.previous) {
        queryClient.setQueryData(keys.conversation(conversationId), context.previous);
      }
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (action: ConversationAction) => {
      if (!conversationId) {
        throw new Error("Open a conversation first");
      }
      return {
        action,
        payload: await runConversationAction(conversationId, action),
      };
    },
    onSuccess: ({ action, payload }) => {
      if (conversationId) {
        setActionResult(conversationId, {
          action,
          payload,
          updatedAt: new Date().toISOString(),
        });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!conversationId) {
        throw new Error("No conversation selected");
      }
      await deleteConversation(conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.conversations });
      navigate("/app/ai", { replace: true });
    },
  });

  const onSubmit = handleSubmit((values) => sendMutation.mutate(values));

  const handleAttachment = async (file: File | null) => {
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

  const composerPanel = (
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
              <p>`/model` to change routing, `/project` to focus context, `/attach` to add context.</p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <Textarea
          aria-label="AI message composer"
          placeholder="Ask ChatSphere AI to draft, summarize, analyze, or plan..."
          className="min-h-32"
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
            <select
              className="focus-ring rounded-2xl border border-border bg-surface-3 px-3 py-2 text-sm text-text-base"
              aria-label="Model selector"
              value={selectedModelId}
              onChange={(event) => setSelectedModelId(event.target.value)}
            >
              <option value="auto">{modelsQuery.data?.auto.label ?? "Automatic routing"}</option>
              {(modelsQuery.data?.models ?? []).map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} - {model.provider}
                </option>
              ))}
            </select>
            <select
              className="focus-ring rounded-2xl border border-border bg-surface-3 px-3 py-2 text-sm text-text-base"
              aria-label="Project context selector"
              value={selectedProjectId ?? ""}
              onChange={(event) => setSelectedProjectId(event.target.value || null)}
            >
              <option value="">No project context</option>
              {(projectsQuery.data ?? []).map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 text-sm text-text-muted">
            <span>{composerValue.length}/6000</span>
            <Button loading={sendMutation.isPending} type="submit">
              {sendMutation.isPending ? <LoaderCircle className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              Send
            </Button>
          </div>
        </div>
        {pendingAttachmentMeta ? (
          <div className="rounded-2xl border border-border/70 bg-surface-3/70 px-4 py-3 text-sm text-text-muted">
            Attached {pendingAttachmentMeta.originalName ?? pendingAttachmentMeta.fileName} -{" "}
            {formatBytes(pendingAttachmentMeta.fileSize)}
          </div>
        ) : null}
        {errors.message ? <p className="text-xs text-danger-500">{errors.message.message}</p> : null}
      </form>
    </Panel>
  );

  return (
    <WorkspaceScaffold
      eyebrow="AI Command Center"
      title="Solo AI chat with context-rich memory"
      description="Search prior threads, continue an existing conversation, bring in project context, and inspect run telemetry without leaving the workspace."
      center={
        <AiConversationSidebar
          conversations={filteredConversations}
          activeConversationId={conversationId}
          search={search}
          onSearchChange={setSearch}
          filterMode={filterMode}
          onFilterModeChange={setFilterMode}
        />
      }
      main={
        <div className="flex min-h-[70vh] flex-col">
          <AiConversationThread
            conversation={conversationQuery.data}
            onDeleteConversation={() => deleteMutation.mutate()}
          />
          {composerPanel}
        </div>
      }
      right={
        <AiInspector
          conversationId={conversationId}
          insight={insightQuery.data}
          latestRun={conversationId ? latestRuns[conversationId] : undefined}
          actionResult={conversationId ? actionResults[conversationId] : undefined}
          projects={projectsQuery.data ?? []}
          onAction={(action) => actionMutation.mutate(action)}
          onProjectPick={setSelectedProjectId}
        />
      }
      rightLabel="Insight"
    />
  );
};

export default AiChatPage;

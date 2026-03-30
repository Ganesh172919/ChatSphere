import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BrainCircuit, Pin, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { queryClient } from "@/app/query-client";
import { deleteMemoryApi, listMemoryApi, updateMemoryApi } from "@/shared/api/memory";
import type { MemoryEntry } from "@/shared/types/contracts";
import { Button } from "@/shared/ui/Button";
import { EmptyState } from "@/shared/ui/EmptyState";
import { Input } from "@/shared/ui/Input";
import { Panel } from "@/shared/ui/Panel";
import { Textarea } from "@/shared/ui/Textarea";
import { WorkspaceScaffold } from "@/shared/ui/WorkspaceScaffold";
import { formatRelativeTime } from "@/shared/utils/format";

const memorySchema = z.object({
  summary: z.string().min(1, "Summary required").max(500, "Max 500 characters"),
  details: z.string().max(5000, "Max 5000 characters").optional(),
  tags: z.string().optional(),
});

type MemorySchema = z.infer<typeof memorySchema>;

const MemoryPageImpl = () => {
  const [search, setSearch] = useState("");
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const form = useForm<MemorySchema>({
    resolver: zodResolver(memorySchema),
    defaultValues: {
      summary: "",
      details: "",
      tags: "",
    },
  });

  const memoryQuery = useQuery({
    queryKey: ["memory", search, pinnedOnly],
    queryFn: () => listMemoryApi({ search, pinned: pinnedOnly || undefined }),
  });

  const filteredMemories = useMemo(() => memoryQuery.data ?? [], [memoryQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: MemorySchema) => {
      if (!selectedMemory) {
        throw new Error("Select a memory entry first");
      }
      return updateMemoryApi(selectedMemory.id, {
        summary: values.summary,
        details: values.details,
        tags: values.tags?.split(",").map((tag) => tag.trim()).filter(Boolean),
      });
    },
    onSuccess: (entry) => {
      setSelectedMemory(entry);
      queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (entry: MemoryEntry) =>
      updateMemoryApi(entry.id, {
        pinned: !entry.pinned,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["memory"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (memoryId: string) => deleteMemoryApi(memoryId),
    onSuccess: () => {
      setSelectedMemory(null);
      queryClient.invalidateQueries({ queryKey: ["memory"] });
    },
  });

  const selectMemory = (entry: MemoryEntry) => {
    setSelectedMemory(entry);
    form.reset({
      summary: entry.summary,
      details: entry.details ?? "",
      tags: entry.tags.join(", "),
    });
  };

  const center = (
    <Panel className="flex h-full min-h-[70vh] flex-col overflow-hidden">
      <div className="space-y-3 border-b border-border/70 px-5 py-5">
        <Input placeholder="Search memory" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button type="button" variant={pinnedOnly ? "secondary" : "ghost"} onClick={() => setPinnedOnly((current) => !current)}>
          {pinnedOnly ? "Showing pinned" : "Filter pinned"}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {filteredMemories.length ? (
          <div className="space-y-3">
            {filteredMemories.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectMemory(entry)}
                className={`focus-ring block w-full rounded-[24px] border px-4 py-4 text-left transition ${
                  selectedMemory?.id === entry.id ? "border-accent/50 bg-surface-3/90 shadow-glow" : "border-border/70 bg-surface-3/70"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-heading text-lg text-text-base">{entry.summary}</p>
                  {entry.pinned ? <Pin className="h-4 w-4 text-amber-400" /> : null}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-text-muted">{entry.details ?? "No details"}</p>
                <p className="mt-4 text-xs text-text-soft">Updated {formatRelativeTime(entry.updatedAt)}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            eyebrow="Memory"
            title="No memory entries yet"
            description="Your long-term memory summaries will show up here as you continue working with AI."
          />
        )}
      </div>
    </Panel>
  );

  const main = (
    <Panel className="p-5">
      {selectedMemory ? (
        <form className="grid gap-4" onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-accent" />
            <h3 className="font-heading text-xl">Memory detail</h3>
          </div>
          <Input placeholder="Summary" {...form.register("summary")} />
          <Textarea placeholder="Details" className="min-h-40" {...form.register("details")} />
          <Input placeholder="Tags separated by commas" {...form.register("tags")} />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" loading={saveMutation.isPending}>
              <Save className="h-4 w-4" />
              Save
            </Button>
            <Button type="button" variant="secondary" onClick={() => togglePinMutation.mutate(selectedMemory)}>
              <Pin className="h-4 w-4" />
              {selectedMemory.pinned ? "Unpin" : "Pin"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => deleteMutation.mutate(selectedMemory.id)}>
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </form>
      ) : (
        <EmptyState
          eyebrow="Memory detail"
          title="Select a memory entry"
          description="Pick an entry from the left to review, edit, pin, or delete it."
        />
      )}
    </Panel>
  );

  const right = (
    <Panel className="flex h-full min-h-[70vh] flex-col gap-4 p-5">
      <div className="rounded-[24px] border border-border/70 bg-surface-3/70 p-4">
        <h3 className="font-heading text-lg">Memory scoring</h3>
        <p className="mt-2 text-sm text-text-muted">
          Entries are ranked by importance, confidence, recency, and usage count on the backend.
        </p>
      </div>
      {selectedMemory ? (
        <div className="rounded-[24px] border border-border/70 bg-surface-3/70 p-4 text-sm text-text-muted">
          <p>Confidence: {selectedMemory.confidence}</p>
          <p>Importance: {selectedMemory.importance}</p>
          <p>Recency: {selectedMemory.recency}</p>
          <p>Used: {selectedMemory.usageCount} times</p>
        </div>
      ) : null}
    </Panel>
  );

  return (
    <WorkspaceScaffold
      eyebrow="Memory"
      title="Long-term memory controls"
      description="Review extracted memory, tune summaries, pin important facts, and prune what should not shape future AI responses."
      center={center}
      main={main}
      right={right}
      rightLabel="Scoring"
    />
  );
};

export default MemoryPageImpl;

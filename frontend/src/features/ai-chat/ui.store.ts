import { create } from "zustand";
import type { ChatRunTelemetry, ChatUsage } from "@/shared/types/contracts";
import type { ConversationAction } from "@/features/ai-chat/api";

interface ActionRecord {
  action: ConversationAction;
  payload: Record<string, unknown>;
  updatedAt: string;
}

interface RunRecord {
  model: {
    id: string;
    label: string;
    provider: string;
  };
  usage: ChatUsage;
  telemetry: ChatRunTelemetry;
  updatedAt: string;
}

interface AiChatUiState {
  search: string;
  filterMode: "all" | "project";
  selectedModelId: string;
  selectedProjectId: string | null;
  latestRuns: Record<string, RunRecord>;
  actionResults: Record<string, ActionRecord>;
  setSearch: (value: string) => void;
  setFilterMode: (value: "all" | "project") => void;
  setSelectedModelId: (value: string) => void;
  setSelectedProjectId: (value: string | null) => void;
  setLatestRun: (conversationId: string, run: RunRecord) => void;
  setActionResult: (conversationId: string, result: ActionRecord) => void;
}

export const useAiChatUiStore = create<AiChatUiState>((set) => ({
  search: "",
  filterMode: "all",
  selectedModelId: "auto",
  selectedProjectId: null,
  latestRuns: {},
  actionResults: {},
  setSearch: (value) => set({ search: value }),
  setFilterMode: (value) => set({ filterMode: value }),
  setSelectedModelId: (value) => set({ selectedModelId: value }),
  setSelectedProjectId: (value) => set({ selectedProjectId: value }),
  setLatestRun: (conversationId, run) =>
    set((state) => ({
      latestRuns: {
        ...state.latestRuns,
        [conversationId]: run,
      },
    })),
  setActionResult: (conversationId, result) =>
    set((state) => ({
      actionResults: {
        ...state.actionResults,
        [conversationId]: result,
      },
    })),
}));

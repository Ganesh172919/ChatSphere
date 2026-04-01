export interface MemoryReference {
  id: string;
  summary: string;
  score?: number | null;
}

export interface InsightActionItem {
  text: string;
  owner?: string | null;
  done?: boolean;
}

export interface ConversationInsight {
  title: string;
  summary: string;
  intent: string;
  topics: string[];
  decisions: string[];
  actionItems: InsightActionItem[];
  lastGeneratedAt?: string;
  messageCount?: number;
}

# INNOVATION_ROADMAP

## Shipped In This Upgrade

1. AI Memory Graph
   - Persistent memory storage with confidence, importance, recency, source references, and pinning.
   - Transparent memory usage on AI responses.
   - Memory management UI for search, edit, pin, and delete.

2. Cross-Model Import / Export
   - Preview-and-import flow for ChatGPT-style JSON, Claude-style exports, and markdown/text.
   - Normalized, markdown, and adapter export formats.
   - Unified export center for conversations, memory, and room data.

3. Conversation Intelligence Layer
   - Persistent insight summaries for solo conversations and rooms.
   - Topic tags, decisions, and action items.
   - Quick actions for summarize, extract tasks, and extract decisions.

## Next Priorities

1. Split `backend/index.js` into socket handler modules.
2. Add backend integration tests and socket tests.
3. Add prompt management UI for `PromptTemplate` editing.
4. Expand import adapters beyond ChatGPT and Claude.
5. Add admin analytics views for memory usage, import outcomes, and AI latency.

## Product Direction

- Keep ChatSphere student-readable: explicit control flow, small services, minimal magic.
- Prefer practical AI-native features over infrastructure-heavy experiments.
- Treat data portability and memory transparency as core product trust features.

# ChatSphere Features

## AI Platform Features

- Multi-provider AI routing with OpenRouter, Gemini direct, xAI Grok direct, Groq direct, Together AI, and Hugging Face support when configured
- Client-facing `auto` model selection with backend-side concrete model resolution
- Solo AI chat with persisted provider, model, token, and fallback metadata
- Explicit room AI invocation through `@ai` plus the `trigger_ai` socket event
- AI-aware file attachments for solo chat and room AI
- Project-aware solo prompts with project instructions, context, and files
- AI memory graph with persistent storage, retrieval, scoring, pinning, and manual editing
- Structured conversation and room insights with summary, intent, topics, decisions, and action items
- Smart replies, sentiment analysis, and grammar suggestions guarded by user settings
- Admin-managed prompt templates for runtime prompt overrides
- Import preview and import commit for external AI histories
- Normalized, markdown, and adapter exports for conversations, insights, and memories

## Collaboration Features

- Real-time rooms with Socket.IO
- Typing indicators and room presence
- Read receipts with `sent`, `delivered`, and `read` states
- Replies, reactions, pinned messages, edits, soft deletes, and polls
- Search across room messages and solo conversations

## Admin And Operational Features

- Platform stats and analytics
- Moderation reports and user search
- Admin prompt management
- Route limits plus in-memory AI quota enforcement
- Startup model catalog refresh and runtime provider visibility

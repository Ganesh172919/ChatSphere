# Operations and Scenarios

## Purpose

This appendix provides operational runbooks, scenario simulations, debugging procedures, and backend production-readiness notes for the AI system.

## 1. Operational mental model

When debugging backend AI, think in four stages:

1. admission
2. context assembly
3. provider execution
4. persistence and fanout

### Admission

Questions to ask:

- did auth pass?
- did validation pass?
- did rate limits pass?
- did quota pass?

### Context assembly

Questions to ask:

- did conversation lookup work?
- did project lookup work?
- did room membership validation work?
- were memories returned?
- did insight retrieval succeed?

### Provider execution

Questions to ask:

- which model was selected?
- did fallback happen?
- was output empty?
- was output malformed?
- did the provider hang?

### Persistence and fanout

Questions to ask:

- was conversation state saved?
- was room message saved?
- was `aiHistory` updated?
- did `message_created` broadcast?

## 2. Core log messages to watch

- `Incoming request`
- `Request completed`
- `Request failed`
- `AI model catalog refreshed`
- `AI provider call failed`
- `Conversation insight refresh failed`
- `trigger_ai failed`
- `Socket authentication failed`

## 3. Runbook: solo chat failure

### Symptom

User says the AI page is not responding or always failing.

### Step-by-step investigation

1. check HTTP response code from `/api/chat`
2. inspect returned error code
3. confirm bearer token validity
4. confirm request body shape
5. confirm AI quota has not been exhausted
6. inspect logs for provider failure warnings
7. inspect whether the selected project exists and belongs to the user
8. inspect whether the conversation ID belongs to the user
9. inspect whether memory retrieval threw an exception
10. inspect whether conversation persistence succeeded

### Likely codes

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `AI_RATE_LIMITED`
- `AI_QUOTA_EXCEEDED`
- `PROJECT_MISMATCH`
- `NOT_FOUND`

## 4. Runbook: room AI failure

### Symptom

User types `/ai ...` in a room and sees no answer.

### Step-by-step investigation

1. confirm socket handshake succeeded
2. confirm the client joined the room
3. confirm the emitted event was `trigger_ai`
4. check `socket_error` payload
5. confirm quota state for the user
6. confirm room membership in the database
7. confirm recent room messages query returned data
8. inspect provider logs
9. confirm `sendRoomMessage()` wrote a row
10. confirm the room received `message_created`

## 5. Scenario simulation: provider 429 on first model

### Input

- solo chat request
- `auto` model selection
- OpenRouter returns 429

### Expected backend sequence

1. route admission succeeds
2. `resolveTaskModel()` chooses provider order
3. OpenRouter call fails
4. error is normalized as rate limit
5. warning is logged
6. Gemini is tried next
7. Gemini succeeds
8. response is returned with `fallbackUsed: true`

### Operational takeaway

Fallback is already product-grade enough to preserve user experience in many first-provider failure cases.

## 6. Scenario simulation: all providers unavailable

### Expected backend sequence

1. every provider attempt fails
2. each failure logs a warning
3. deterministic fallback is returned
4. persistence still happens if later writes succeed

### User-facing effect

The user gets a degraded answer instead of a raw internal error.

## 7. Scenario simulation: malformed JSON from provider

### Affected features

- smart replies
- sentiment
- memory extraction
- insight generation

### Current backend behavior

- try JSON parse
- if parse fails, use task-specific fallback behavior

### Risk

The backend preserves contract shape more reliably than semantic quality.

## 8. Scenario simulation: provider hang

### Current reality

The backend intends to use timeouts.

The implementation does not fully cancel requests.

### Operational effect

- long latency spikes
- resource retention under upstream hangs
- room AI appears frozen longer than expected

## 9. Scenario simulation: persistence failure after generation

### Example

- provider returns a valid answer
- conversation update fails because the database is unavailable

### Current backend effect

- AI work is already spent
- no replay log exists
- the result may be lost from durable product state

### Recommended fix

Introduce an `AiRun` ledger and split generation state from product persistence state.

## 10. Retry guidance

### Generally safe retries

- `GET /api/ai/models`
- `GET insight routes`
- `POST /api/ai/sentiment`
- `POST /api/ai/grammar`

### Retry with caution

- `POST /api/chat`
- socket `trigger_ai`

Because cost may already be incurred even if persistence failed later.

## 11. Monitoring metrics worth adding

### Request metrics

- AI requests by task
- AI requests by route
- success rate by task
- failure rate by code
- fallback rate by task

### Latency metrics

- p50, p95, p99 total latency
- provider latency by provider and model
- persistence latency after generation

### Quality metrics

- malformed JSON parse rate
- empty response rate
- deterministic fallback rate
- memory retrieval hit rate

### Cost-control metrics

- requests per user per day
- estimated tokens per user per day
- provider distribution by task

## 12. Alert suggestions

- provider failure rate above threshold
- timeout rate above threshold
- fallback rate spike
- room AI message creation failures
- quota rejection spike across many users
- memory extraction parse failures above threshold

## 13. Circuit breaker proposal

### Why it is needed

When one provider is unhealthy, the backend should stop wasting time on repeated failures.

### Minimum breaker fields

- provider
- model
- rolling failure count
- rolling timeout count
- state: closed, open, half-open
- open-until timestamp

### Where to store it

- Redis for shared state

## 14. Logging upgrades

### Good current state

- structured JSON logs
- redaction of sensitive fields

### Needed next improvements

- explicit AI run ID in logs
- prompt-template key and version in logs
- selected model and requested model in every AI log line
- parse-failure counters for structured-output tasks

## 15. Production-readiness checklist

### Admission controls

- auth enforced
- validation enforced
- AI rate limit enforced
- AI quota enforced

### Reliability controls

- deterministic fallback exists
- provider fallback chain exists
- async insight refresh isolates some non-critical work

### Missing controls

- real timeout cancellation
- distributed quota and rate limits
- provider circuit breaker
- AI run ledger
- streaming
- structured-output enforcement

## 16. Backend deployment readiness scorecard

| Area | Current state | Readiness |
|---|---|---|
| Auth and policy | strong | good |
| Prompt context assembly | good | good |
| Provider routing | practical | moderate |
| Structured output reliability | weak | low |
| Timeout handling | incomplete | low |
| Personalization | good | moderate to good |
| Multi-instance scaling | weak | low |
| Observability | moderate | moderate |
| Recovery and replay | weak | low |

## 17. Suggested SLOs for backend AI

### Availability SLO

- percentage of AI requests that return a syntactically valid response envelope

### Latency SLO

- p95 solo AI chat response under agreed threshold
- p95 room AI response under agreed threshold

### Quality SLO proxy

- malformed structured-output rate below threshold
- deterministic fallback rate below threshold

## 18. Release checklist for provider changes

1. verify env keys in staging
2. verify model ID names
3. test smart replies parse behavior
4. test sentiment parse behavior
5. test grammar fallback behavior
6. test solo chat with project context
7. test room slash AI
8. inspect logs for selected model and fallback behavior

## 19. Release checklist for prompt-template changes

1. confirm template key matches consuming code
2. test insight generation parse rate
3. verify no prompt variable placeholder remains unfilled
4. compare fallback rate before and after change
5. capture example outputs for regression review

## 20. Failure-mode table

| Failure mode | Detection | Current handling | Better future handling |
|---|---|---|---|
| invalid bearer token | HTTP 401 | reject request | keep |
| invalid socket token | socket auth error | reject socket | keep |
| malformed request body | Zod validation | reject request | keep |
| AI rate burst exceeded | limiter response | 429 with retry hint | keep with Redis |
| quota exceeded | quota middleware/service | 429 or socket error | keep with distributed store |
| provider 429 | warning log + fallback chain | try next model | add breaker |
| provider timeout | long latency or failure | best effort, incomplete timeout | real cancellation + breaker |
| empty provider content | error path | try next model | keep |
| malformed JSON response | parse fail | task-specific fallback | add structured output mode |
| DB failure after generation | request failure | no replay | add run ledger |

## 21. Sample operator workflow: high fallback spike

### Symptoms

- many successful responses but poor answer quality
- telemetry shows `fallbackUsed: true` frequently

### Investigation path

1. group logs by provider
2. inspect provider-specific warnings
3. confirm recent env changes
4. test `/api/ai/models` catalog contents
5. run manual requests against each provider path in staging
6. determine whether outage is provider-side or config-side

### Short-term mitigation

- change default model to the healthiest provider
- disable broken provider if necessary

## 22. Sample operator workflow: room AI lag complaints

### Symptoms

- users report `/ai` in rooms takes too long

### Investigation path

1. inspect socket event rate and flood-state logs
2. inspect provider latency metrics
3. inspect DB latency for message creation
4. inspect whether fallbacks are causing chain retries
5. inspect message volume in active rooms

### Likely fixes

- fix timeout behavior
- add breaker
- add streaming or intermediate progress reporting

## 23. Sample operator workflow: memory feels stale

### Symptoms

- users say AI keeps repeating old preferences or irrelevant facts

### Investigation path

1. inspect ranked memories for recent prompts
2. inspect pinned entries
3. inspect usage counts and recency values
4. inspect whether old memories dominate due to pinned or usage boost

### Likely fixes

- decay recency over time
- expose retrieval reasons
- add memory categories
- add better ranking logic

## 24. Backend operational conclusion

The backend AI system is operationally usable today.

It is not yet operationally mature enough for high-scale, high-availability AI workloads.

The biggest improvements should focus on:

- real timeout control
- distributed state
- structured-output guarantees
- observability and replayability

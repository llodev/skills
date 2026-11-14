# arc-ai-system — design study

Status: sketch, 2026-11-13. Not a skill. Decides structure and seams only.

## 1. Responsibility

Designs the AI layer in depth, once `arc-decisions` has said AI is in scope. Decides the autonomy level per task, the agent boundary, the tool catalog with permissions and approval gates, the RAG pipeline, the LLM gateway's duties, the guardrails, and the evaluation plan that gates every change.

Non-goals (refuses):

- Picking a model or provider by price, benchmark, or context size from memory. It states the criteria and marks figures "verify".
- SDK code, model ids, and API parameters (`claude-api`).
- Training or fine-tuning pipelines (README, open question 6).
- The whole-system threat model (`arc-threat-model`). It owns AI-specific controls only.
- Prompt wording for a single feature with no architectural question.

## 2. Triggers

1. "Design the agent that handles refund requests: which tools, and what can it do alone?"
2. "Our RAG answers are wrong half the time. Redesign the pipeline."
3. "How do we evaluate this LLM feature before shipping?"
4. "Do we need an LLM gateway, and what goes in it?"
5. "We want to expose our system to agents over MCP. Which tools, which permissions?"

## 3. Core concepts

- **Autonomy ladder:** single call → fixed workflow (chain, router) → agent with tools → several agents. Climb a rung only when an eval shows the lower one fails.
- **Agent boundary:** the line where model output becomes an action. Past it, deterministic code validates, authorizes, and audits.
- **Tool contract:** name, task, input schema, side-effect class (read, reversible write, irreversible write, external message), scope, approval policy.
- **Lethal combination:** untrusted input, access to private data, and an outbound channel in one session. Break at least one leg.
- **Retrieval before generation:** most RAG failures are retrieval failures. Measure recall at k before touching the prompt.
- **Eval as the spec:** a graded golden set is the acceptance test. No eval, no ship, no model swap.
- **Gateway:** one choke point for keys, routing, fallbacks, budgets, redaction, caching, and logging.
- **Grounding:** every factual claim cites a retrieved source id; uncited claims are flagged or dropped.

## 4. Workflow

| #   | Input                             | Action                                                                                                    | Output               |
| --- | --------------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------- |
| 1   | Brief, AI line of `arc-decisions` | List AI tasks; for each, ask whether deterministic code can do it                                         | AI task table        |
| 2   | AI task table                     | Pick the autonomy rung per task, with the eval result that would justify climbing                         | Autonomy decision    |
| 3   | Tasks on the agent rung           | Define each tool contract; set approval for irreversible writes; avoid one tool per endpoint              | Tool catalog         |
| 4   | Knowledge sources                 | Design ingestion, freshness, chunking, metadata, ACL filter at retrieval, hybrid search, rerank, citation | RAG pipeline spec    |
| 5   | Tasks and volumes                 | Assign gateway duties: routing, fallback, timeouts, token budgets per tenant, cache, redaction, logs      | Gateway duty table   |
| 6   | Tool catalog, RAG spec            | Place controls at input, output, and action layers                                                        | Guardrail matrix     |
| 7   | Tasks, guardrails                 | Build the golden set, rubric, graders, thresholds, CI regression gate, online signals                     | Evaluation plan      |
| 8   | All decisions                     | Record; hand the guardrail matrix to `arc-threat-model` and the signals to `arc-observability`            | ADRs, hand-off notes |

## 5. Actions and artifacts

- **AI task table:** task, why a model, rung, fallback when the model fails.
- **Tool catalog:** tool, task, side-effect class, scope, approval, rate limit, audit field.
- **RAG pipeline spec:** sources, refresh cadence, chunking rule, index fields, retrieval steps, citation format.
- **Gateway duty table:** duty, rule, owner, failure behavior.
- **Guardrail matrix:** layer × threat × control × test.
- **Evaluation plan:** dataset source, size, rubric, grader type, pass threshold, regression gate, online metrics.

## 6. Expert judgments to inject

- **Workflow before agent.** Exception: open-ended tasks with an unbounded path, where an eval shows the workflow fails.
- **Least-privilege tools, read-only by default.** Irreversible writes need human approval or a deterministic policy check. Exception: low-value reversible actions with a rate limit and an audit trail.
- **Hybrid retrieval (lexical plus vector) with rerank; ACL filter at retrieval time, never after generation.** Exception: a corpus small enough to fit in context with room to spare skips RAG (verify against the chosen model's limits).
- **Start the eval set from real traffic, adversarial cases included.** Heuristic: 50 to 200 cases. Grader order: code check, then model-graded, then human sample.
- **Every call goes through the gateway, with redaction and a retention policy on logs.** No exception in production.
- **Structured output with schema validation for anything code consumes.** Heuristic: 1 to 2 bounded retries on parse failure, then a deterministic fallback.

## 7. Anti-patterns to watch

- A god tool (`run_sql`, `http_request`) handed to an agent.
- Tools that mirror REST endpoints one to one instead of tasks.
- The system prompt treated as a security control.
- Shipping or swapping models on vibe checks.
- Several agents for what is a linear workflow.

## 8. Reference candidates

- `autonomy-and-agent-boundary.md` — the ladder, climb criteria, boundary placement.
- `tool-catalog.md` — tool contract fields, side-effect classes, approval patterns, MCP exposure.
- `rag-pipeline.md` — ingestion, chunking trade-offs, retrieval, rerank, citation, freshness, ACL.
- `llm-gateway.md` — duties, budgets, fallbacks, caching, logging.
- `guardrails.md` — injection defenses, output validation, action controls.
- `evaluation.md` — datasets, rubrics, graders, gates, online signals.
- `anti-patterns/ai.md`.

Each reference carries a "last verified" date: this is the fastest-moving member.

## 9. Boundary

- **arc-decisions:** `ai-native-systems.md` overlaps nearly section by section (§ RAG, § Untrusted content, § LLM gateway, § Evaluation and observability). It should keep only § Separate the core from the AI layer and § Defaults, plus a pointer here (README, open question 1).
- **claude-api:** provider SDK specifics; this skill stays vendor-neutral.
- **arc-threat-model:** runs STRIDE across the LLM boundary and cites this skill's guardrail matrix. Who owns prompt-injection threats is contested (README, open question 4).
- **arc-observability:** turns the AI signals listed here (tokens, cost, latency, eval scores, refusal rate) into SLOs and alerts.
- **arc-api-contract:** naming and schema rules when tools are exposed as an API or MCP server.
- **security-review:** code-level checks after build.

## 10. Structure guess

SKILL.md plus 6 references and 1 anti-patterns file. It has the widest surface and the most facts that age, so references isolate the parts that need dated re-verification.

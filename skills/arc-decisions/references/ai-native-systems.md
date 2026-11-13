# AI-native systems

Read this only when AI is in scope: LLM features, agents, retrieval-augmented generation (RAG), or AI-driven automation. Otherwise skip it.

## Separate the core from the AI layer

- The transactional core owns the state, the rules, and the permissions. It stays deterministic and testable.
- The AI layer reads data through curated tools or APIs. It proposes or performs actions through the same use cases that humans use. An agent never receives direct database access or a superuser credential.
- A write triggered by an agent goes through the same validation, authorization, and audit as a write triggered by a user.

## Tools and protocols

- Expose capabilities as small, named tools with a clear input schema and a clear result. The Model Context Protocol (MCP) is a reasonable transport for tools shared across agent clients. An internal API with a tool wrapper also works.
- Scope permissions per tool. Read tools are cheap to grant. Write tools need a confirmation or a human approval step for anything irreversible, such as payments, deletions, or external messages.
- The agent acts on behalf of the user who invoked it, with that user's permissions. Propagate the identity. Do not run everything through a shared service account.
- Limit each run: the maximum number of tool calls, the maximum tokens, and a hard timeout.

## RAG: what to get right

1. **Ingestion.** Parse, clean, and chunk the documents, keeping source metadata (document, section, page, version, access scope). Embed and index them. Re-index when the sources change.
2. **Retrieval.** On real corpora with names, codes, and identifiers, hybrid retrieval (keyword plus vector) usually beats vector search alone. Add a reranker when precision matters more than latency.
3. **Access control at retrieval time.** Filter by tenant and user before the model sees anything. Authorization written into the prompt is not authorization.
4. **Grounding.** Return citations with the answer. Make the model abstain when retrieval finds nothing relevant.
5. **Evaluate before tuning.** Build a set of questions with the sources that should be retrieved, and measure recall at k before changing prompts or models. Most RAG quality problems are retrieval problems.

For the vector store, start with PostgreSQL and `pgvector` when the team already runs PostgreSQL and the corpus is moderate. Move to a dedicated vector store when scale, latency, or filtering needs demand it.

## Untrusted content

Retrieved documents, web pages, emails, and tool outputs can contain instructions aimed at the model. This is prompt injection. Treat all of it as data:

- Keep the system instructions separate from retrieved content, and do not let retrieved text change tool permissions.
- Validate the model's output against a schema before it reaches code or a user-facing action.
- Require confirmation for any action that was triggered from untrusted content.

## State and memory

- Store conversation state per session, with an expiry. Do not keep full transcripts only in the memory of one process.
- Long-term memory is explicit. The user can see it, edit it, and delete it. Under LGPD or GDPR this is a legal requirement, not only good design. Record the retention policy in an ADR.
- Redact personal data before it reaches logs and traces.

## LLM gateway

Route all model calls through one internal layer. It provides:

- A provider-neutral interface, so that changing the model is a configuration change.
- Timeouts, retries with backoff for transient errors, and fallbacks to another model where that is acceptable.
- Rate limits and spend caps per tenant and per feature.
- Logs of the model, the prompt version, token counts, latency, and cost, with redaction.
- Prompts that are versioned and reviewed like code.

Do not name a specific model in the design. Name the capability the feature requires, such as structured output, tool calling, a context window of a given size, or a latency budget. Then verify the current options in the provider's documentation.

## Evaluation and observability

- Build a golden dataset per AI feature: inputs with expected outputs or acceptance criteria.
- Run it in CI whenever a prompt, a model, or a retrieval setting changes. Track quality, cost, and latency together. A cheaper model that fails the dataset is not cheaper.
- Trace each agent run: the prompt version, the model, every tool call with its arguments and results (redacted), the token counts, and the final outcome.

## Defaults

- One model behind the gateway. No fine-tuning at the start.
- Retrieval before fine-tuning. Fine-tuning changes behavior and style. It is a poor way to add facts that change over time.
- Deterministic code for anything deterministic: parsing, calculations, validation, scheduling.
- A human approval step for irreversible actions, until the evaluation data shows that the agent's action is reliable.

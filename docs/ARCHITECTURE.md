# Architecture

## Purpose

Desktop application for evaluating AI agents using methods adapted from user experience research. Tests agents — not raw LLMs and not humans — across a matrix of providers, models, temperatures, and tool configurations. Records structured results for comparison and analysis.

## Scenario Types

Surveys and Tasks are collectively called **Scenarios** in the UI navigation.

- **Survey** — Sends structured questions to agents (one question per LLM call). Supports Latin square and randomized ordering, Likert/multiple-choice/ranking/free-text formats. Deterministic answer extraction with confidence levels (exact/inferred/partial/failed).
- **Task** — Agent execution with tool calls and an optional `goalConditions[]` list. Supported goal checks include string match, regex, tool-called with input subset matching, output JSON schema match, and output subset matching. Tasks may omit goals entirely. Records full conversation trace (messages, tool calls, reasoning) as raw data. Goal evaluation and scoring are computed on demand at view time.

## Stack

| Layer           | Technology                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| App framework   | Electrobun (Bun + native webview + Zig bindings). NOT Electron.                                              |
| Main process    | Bun runtime (TypeScript)                                                                                     |
| LLM abstraction | AI SDK v6 (`ai`) with `@ai-sdk/*` provider packages                                                          |
| LLM providers   | OpenAI, Anthropic, Google, Azure OpenAI, xAI, Groq, Mistral (all via dedicated `@ai-sdk/*` packages)         |
| Frontend        | React 18, Chakra UI v3, TanStack Query                                                                       |
| Data            | File-based JSON/JSONL — no database                                                                          |
| Schemas         | Zod v4 for validation; `z.fromJSONSchema()` for tool input validation; TypeScript interfaces for data shapes |
| Secrets         | `Bun.secrets` (macOS Keychain, Linux libsecret, Windows Credential Manager)                                  |
| Build/lint      | Vite, Biome                                                                                                  |

## Process Model

Electrobun creates one main `BrowserWindow` and optional popout `BrowserWindow`s for detail views. The main process (Bun) and each webview process (React) communicate exclusively via Electrobun's typed RPC (`BrowserView.defineRPC<AppRPC>()`).

```
Electrobun App (app.agenteval)
├── Main Process (Bun)
│   ├── Window Registry — main + popouts, shared RPC fan-out
│   ├── Eval Engine — AI SDK generateText(), tool lifecycle, telemetry
│   ├── Data Layer — JSON/JSONL file persistence under userData
│   ├── Provider APIs — key validation + dynamic model listing (REST)
│   └── Credential Store — Bun.secrets → OS keychain
│
└── Webview Processes (React)
    ├── Main app shell
    ├── Optional popout shells for builders and run detail
    ├── Vite HMR in dev (port 5173), bundled views:// in production
    └── No direct network, file, or credential access
```

Webviews never touch API keys, the filesystem, or the network. All LLM calls, data I/O, window orchestration, and credential access happen in the main process.

**Navigation pages:** Dashboard, Tools, Context, Scenarios, Evaluations, Results, Settings.

## Key Design Decisions

- **Typed RPC boundary** — The RPC contract in `src/shared/rpc-types.ts` defines all requests with typed response types (e.g., `StoredSurvey`, `StoredRunRecord`, `TrialSummaryResult`) and one-way messages (e.g., `evalProgress`, `evalComplete`). No `unknown` in RPC responses.
- **File-based persistence** — One JSON file per entity (survey, task, evaluation). One directory per run containing `evaluation.json` (run manifest with embedded scenario snapshot), `trials.jsonl` (trial summaries), and `trials/{trialId}.json` (full trial data). All writes use atomic temp-file-then-rename for consistency.
- **Compute-on-demand analysis** — Trial data stores raw conversation traces. Goal evaluation, scoring, and survey attribution are computed at view time, not during execution. This keeps the execution pipeline simple and lets analysis evolve independently.
- **Live task goal precedence** — Task-goal analysis prefers the current saved task definition when it still exists, and falls back to the run snapshot only when the source task is missing. This allows goal edits to be applied retroactively to historical runs. An empty `goalConditions[]` list disables task goal scoring and visualization.
- **Scenario snapshot** — Each run embeds a full copy of the source scenario definition in `evaluation.json`. Results survive deletion of both the source evaluation and source scenario.
- **Single provider source** — Provider list defined once in `ProviderSchema` (Zod enum in `agent-config.schema.ts`). All other code imports `Provider` type from there.
- **Decoupled validation** — Tool input validation uses `z.fromJSONSchema()` (Zod v4) to parse tool inputs against their JSON Schema. Schemas sent to models (via AI SDK `jsonSchema()`) are separate from validation logic. Tool validation results stored generically keyed by `toolCallId`. Custom error messages supported via `x-error-messages` schema extension.
- **Agent matrix** — Each trial row specifies provider, model, temperature, reasoning effort, repetitions, tool search mode, and subagent settings. Evaluations define the trial matrix; running one creates a Run.
- **OS-native secrets** — API keys stored via `Bun.secrets`. Keys validated against provider model-listing endpoints (zero-cost auth check) with status tracked in settings.
- **Azure deployment names** — Azure deployments can't be listed via data-plane API key auth (requires Azure AD). Users define deployment names manually in Settings; these populate the model dropdown.
- **In-memory presets** — Preset tools, tool sets, content, and skills live in `src/bun/presets/` as pure data. Copied to user data on selection, no persistence of their own.
- **Boundary-scoped tests** — Low-level Bun tests live under boundary `__tests__` folders, while cross-boundary regressions live in `src/testing/functional/` with shared helpers in `src/testing/fixtures/`. Functional tests use the same preset catalog as the app and install test-only data-root and model-resolution overrides so they can exercise `runEvaluation()` without touching real Electrobun state or provider keys.
- **No CSV/JSON export** — Persisted JSON data model (runs contain full trial data as JSON files) makes export redundant. Results are consumed directly from the file structure.
- **Variant crossing disjoint keys** — Crossing groups must have disjoint variant keys; validated at evaluation save time to prevent ambiguous cartesian products.
- **Simulation utility LLM** — Multi-prompt tasks can use a utility LLM to simulate user responses between turns, enabling multi-turn agent evaluation without a human in the loop.

## Window Model

Agent Eval supports multi-window editing. The main window owns navigation and list views; builders and run detail can also open in independent OS windows.

- **Popout registry** — `window-registry.ts` tracks popouts by `BrowserWindow.id` plus entity identity. Opening the same entity twice focuses the existing popout instead of creating duplicates. Window titles resolve from current entity labels, and new windows are position-offset so they do not stack exactly.
- **Shared boot path** — Popouts load the same frontend bundle with `?popout=1&entityType=...&entityId=...`. `main.tsx` routes those URLs into `PopoutShell`, which renders exactly one builder or `RunDetail` inside a minimal provider/query shell.
- **Broadcast sync** — Main-process RPC handlers wrap mutations and broadcast `dataChanged` after writes. `evalProgress`, `evalComplete`, `notification`, and `dataChanged` fan out to the main window and every popout. Each webview maps `entityType` to React Query keys and clears inactive caches before invalidating active ones.
- **Dirty-close contract** — Popouts disable the native close affordance and close through webview-managed dirty guards. The main process asks each popout for `checkDirtyState`, then `resolveCloseGuard` when needed during app quit. Both RPCs are timeout-bounded so an unresponsive popout cannot block shutdown indefinitely.

## Data Layout

All data under `Utils.paths.userData` (`~/Library/Application Support/app.agenteval/{channel}/` on macOS):

```
{userData}/
├── settings.json                       # App preferences, key validation status
├── tools/{id}.json                     # Tool definitions (schema, mock config)
├── tool-sets/{id}.json                 # Tool set definitions (tool refs, schema additions)
├── context/
│   ├── contents/{id}.json              # Content entries (key + body)
│   ├── content-sets/{id}.json          # Content set definitions (content refs)
│   ├── skills/{id}.json                # Skill definitions (name, description, content)
│   └── skill-sets/{id}.json            # Skill set definitions (skill refs)
├── scenarios/
│   ├── surveys/{id}.json               # Survey definitions
│   └── tasks/{id}.json                 # Task definitions
├── evaluations/{id}.json               # Evaluation definitions (name, scenario ref, agent matrix, concurrency)
└── results/{runId}/                    # One directory per evaluation run
    ├── evaluation.json                 # Run metadata (RunRecord) + embedded scenario snapshot
    ├── trials.jsonl                    # One JSON line per trial (TrialSummary — lightweight metrics)
    └── trials/{trialId}.json           # Full trial data (TrialData — messages, steps, tool validations)
```

## Engine Pipeline

1. **Runner** (`runner.ts`) — Orchestrates evaluation execution. Loads scenario, snapshots it into the run record, dispatches trials via `ConcurrencyLimiter`. Wraps run lifecycle in try/finally for `activeRuns` cleanup. Resolves content refs (→ merged persistence) and skill refs (→ `load_skill` tool + system prompt) before calling harness.
2. **Harness** (`harness.ts`) — Thin facade over the engine modules. Exports `generateSimpleText`, `generateMultiTurnText`, `runAgentWithTools`, `runAgentWithResolvedTools`. Composes provider, tool, mock, search, subagent, and skill modules. When `resolvedSkills` are provided, injects `load_skill` tool and appends skill discovery section to system prompt.
3. **Provider Registry** (`provider-registry.ts`) — Wraps AI SDK provider factories. Resolves `HarnessConfig` to provider model instances. Handles Azure resource-name lookup. Exports `getProviderModel`, `getUtilityModel`.
4. **Tool Runtime** (`tool-runtime.ts`) — Tool type definitions (`ToolDef`, `ResolvedToolDef`), JSON Schema normalization, and legacy parameter-to-schema conversion.
5. **Tool Resolver** (`tool-resolver.ts`) — Flattens mixed tool/toolSet refs into `ResolvedToolDef[]`. Handles schema additions merge and duplicate name resolution (last-write-wins by position).
6. **Mock Runtime** (`mock-runtime.ts`) — Mock response evaluation: rule-based expressions, LLM-generated defaults via utility LLM, persistence store for stateful mocks, response caching.
7. **Tool Search** (`tool-search.ts`) — Keyword-based tool discovery with weighted scoring (name 2×, keyword 2×, description 1×). Builds the `tools` meta-tool that agents use to find and activate tools at runtime. Semantic mode not yet implemented.
8. **Subagent Runtime** (`subagent-runtime.ts`) — Builds the `delegate` meta-tool. Creates child execution contexts with inherited mock cache and persistence, depth-limited recursion.
9. **Content Resolver** (`content-resolver.ts`) — Flattens `TaskContentRef[]` (content + contentSet refs) into `{key, content}[]` entries with last-write-wins dedup by key.
10. **Skill Resolver** (`skill-resolver.ts`) — Flattens `TaskSkillRef[]` + inline skills into `ResolvedSkill[]` with case-insensitive skillName dedup. Shared refs first, inline skills appended after.
11. **Trial Extractor** (`trial-extractor.ts`) — Normalizes `HarnessResult` into scenario-agnostic `TrialData`. Deduplicates messages, maps step boundaries to message indices, collects tool validations.
12. **Survey Runner** (`survey-runner.ts`) — Orchestrates survey-specific logic: question ordering (Latin square, random, sequential), one-call-per-question execution. Returns `SurveyRunResult` with per-question metrics and realized question order.
13. **Survey Extractor** (`survey-extractor.ts`) — Deterministic per-question-type answer parsing (Likert digit/keyword, multiple choice label match, ranking numbered list, free text pipe split). Returns confidence levels (exact/inferred/partial/failed).
14. **Telemetry** (`telemetry.ts`) — Collects tool call timing, validation outcomes, and `toolCallId` during execution.
15. **Validation** (`validation.ts`) — Tool input validation using `z.fromJSONSchema()`. Supports custom error messages via `x-error-messages` schema extension.
16. **Task Analysis** (`task-analysis.ts`) — Resolves the live task or run snapshot, evaluates `goalConditions[]` against stored task trials, and aggregates per-agent success/failure counts for task results views.

## Data Layer

All persistence is file-based via shared helpers in `data/fs/`:

- **`json-store.ts`** — Atomic JSON read/write (temp file + rename), directory listing with corrupt-file tolerance, typed `StoreError` with `kind` discriminator.
- **`jsonl-store.ts`** — Append-only JSONL operations. `readJsonLines` is tolerant of malformed lines (warns and skips).

Repository modules (`evaluations.ts`, `surveys.ts`, `tasks.ts`, `tools.ts`, `runs.ts`, `settings.ts`) use these shared helpers. Path computation is pure (`paths.ts`), with `initDataDirs()` called once at startup.

## Run Manifest Contract

Each run directory contains:

- `evaluation.json` — `RunRecord` with embedded scenario snapshot (full copy of source scenario at execution time), agent config matrix, and run metadata. This is the run manifest.
- `trials.jsonl` — One `TrialSummary` JSON line per trial (lightweight metrics for list views).
- `trials/{trialId}.json` — Full `TrialData` per trial (messages, steps, tool validations, persistence snapshots).

The manifest is self-contained: results survive deletion of both the source evaluation and the source scenario.

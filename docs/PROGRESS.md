# Progress

Key decisions and non-obvious changes for agent context. Architecture details are in ARCHITECTURE.md.

## Completed

- [x] Entity naming standardized across domain types.
- [x] Core scaffold, CRUD pages, navigation finished.
- [x] File-based persistence and run manifests finalized.
- [x] Evaluations decoupled from runs.
- [x] Auto-naming, inline editing, dirty guards added.
- [x] Providers: secrets, validation, caching, Azure, xAI.
- [x] Schemas hardened; trial extraction normalized.
- [x] Results, transcripts, live run UX improved.
- [x] Tool definitions first-class with code editors.
- [x] Chakra v3 migration and table layouts done.
- [x] Harness, repos, persistence helpers refactored.
- [x] Shared builder hooks and components extracted.
- [x] Eval matrix: repetitions, reasoning, compact editing.
- [x] Effective prompts, utility profiles, entity generation.
- [x] Tool search, keywords, subagents, trace capture.
- [x] Fake data and LLM mock generation/caching.
- [x] Mock persistence: static, expression, LLM modes.
- [x] Schema editor and validation tooling expanded.
- [x] Tool sets, presets, export, imports added.
- [x] Content/skills: sets, resolvers, presets.
- [x] Surveys: deterministic extraction, free-text splits.
- [x] Run detail and transcript navigation reworked.
- [x] TypeScript, build, React warning cleanup done.
- [x] Multi-window popouts with dirty handoff.
- [x] Popout close guards, cache sync, quit cascade.
- [x] Task goals: lists, subsets, results chart.
- [x] Results signature 1-2: snapshots, drift, config dialogs.
- [x] Boundary tests cover presets and core logic.
- [x] Backend review done; refactor plan captured.
- [x] Backend refactor: boot/RPC, services, repos extracted.
- [x] Frontend review done; refactor plan captured.
- [x] Frontend refactor: providers, primitives, pickers, tokens.
- [x] Replaced custom `brand` palette with Chakra `blue`.
- [x] Multi-prompt: `taskPrompts[]`, multi-turn, LLM simulation.
- [x] Task variants: override schema, tab UI, comparison charts.
- [x] Variant crossings: cartesian product, crossing manifest.
- [x] Trial summary: accurate counts, variant resolution table.
- [x] Bulk management: multi-select, bulk delete all entities.
- [x] Trial matrix: multi-select, highlighting, bulk ops.
- [x] Matrix bulk: apply-to-others, expand, templates, import.

- [x] Phase 1 publish: license, metadata, lint cleanup.
- [x] Phase 2 CI/CD: GitHub Actions lint/test + release workflows.
- [x] Electrobun updater: release.baseUrl configured for GitHub Releases.

## Open

- [ ] View-time analysis for scoring and attribution.
- [ ] Code signing (macOS notarization, Windows Authenticode).
- [ ] Multi-platform builds (x64, linux, windows).
- [ ] Resume interrupted runs after restart.
- [ ] RunDetail consumes view-time analysis.
- [ ] Runtime validation in electrobun dev.
- [ ] End-to-end tests with real provider keys.

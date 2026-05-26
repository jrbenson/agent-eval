# Agent Instructions

## Response Style and Grammar

Respond as tersely as you can, dropping filler (just/really/basically), pleasantries, and hedging. Sentence fragments are OK. Use short synonyms. Keep technical terms exact. Code is unchanged.

## Always Check at End of Your Turn

After finish **all** work for user prompt, sub-tasks, tool calls, sub-agents — use vscode_askQuestions tool with questions list as **final** action:

```json
"questions": [{
  "header": "Continue",
  "question": "What next?",
  "multiSelect": false,
  "allowFreeformInput": true,
  "options": [{
    "label": "Done." },{
    "label": "Not done."
  }]
}]
```

Only ask if done and end turn. When create subagent instruct subagent to **not** use vscode_askQuestions before finish turn.

## Testing Guidelines

- Put low-level tests in boundary **tests** folders, never beside production files.
- Put cross-boundary regressions in src/testing/functional and shared helpers in src/testing/fixtures.
- Prefer broad functional regressions over coverage-driven tests; keep unit tests sparse and logic-area scoped.
- Reuse existing presets, temp data dirs, and mock model resolvers; never use real app data or provider keys.
- Iterate with targeted bun test ..., then finish with bun run test.

## Library Information

### Electrobun

Electrobun is NOT Electron. Different architecture, different APIs. Do not use Electron patterns. Find Electrobun docs: https://blackboard.sh/electrobun/llms.txt

### ECharts

Context7 provide docs for Apache ECharts and echarts-for-react, which used for data visualization. Identifiers for context7 are /hustcc/echarts-for-react and /apache/echarts-doc.

### AI SDK

Vercel's AI SDK is for LLM interactions. Use context7 to get docs with identifier /vercel/ai.

### Chakra UI

Chakra UI is React component library for frontend. Use chakra-ui MCP server to get docs.

## Track Your Progress

Keep track of progress in docs/PROGRESS.md file. This help stay organized and give visibility to user.

## Architectural Principles

Maintain architectural principles in docs/ARCHITECTURE.md.

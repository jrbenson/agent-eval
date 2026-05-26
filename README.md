# Agent Eval

Desktop application for evaluating AI agents using UX research methods (surveys and task scenarios). Built with Electrobun, React, Chakra UI, and Vite.

## Getting Started

```bash
# Install dependencies
bun install

# Development (Vite HMR + Electrobun with watch)
bun run dev

# Production build (stable)
bun run build

# Canary build
bun run build:canary
```

## How Development Works

`bun run dev` runs two processes concurrently:

1. **Vite dev server** on `http://localhost:5173` — provides HMR for React/webview code
2. **Electrobun dev** with `--watch` — auto-rebuilds when bun-side code changes

Electrobun detects the running Vite server and loads the webview from it instead of bundled assets, so both sides update on changes.

## Project Structure

```
├── src/
│   ├── bun/                 # Main process (runs in Bun)
│   │   ├── index.ts         # App entry, window setup
│   │   ├── data/            # JSON file storage layer
│   │   │   ├── fs/          # File system helpers (json-store, jsonl-store)
│   │   │   └── paths.ts     # Data directory resolution
│   │   ├── engine/          # Eval engine (AI SDK, runner, extractors)
│   │   ├── rpc/             # RPC handler definitions
│   │   ├── presets/         # Built-in tool/template presets
│   │   └── windows/         # Window management, popouts
│   ├── mainview/            # Webview (React + Chakra UI)
│   │   ├── App.tsx          # Root layout + navigation
│   │   ├── pages/           # Dashboard, Evaluations, Results, Scenarios, Tools, etc.
│   │   ├── components/      # Shared UI components + charts
│   │   └── hooks/           # TanStack Query hooks (RPC calls)
│   └── shared/              # Shared types, schemas, RPC definitions
├── electrobun.config.ts     # App config (identifier, build settings)
├── vite.config.ts           # Vite configuration
└── package.json
```

## Data Storage

All data is stored as JSON files on disk under the platform-specific user data directory. For example:

- **macOS dev**: `~/Library/Application Support/app.agenteval/dev/`
- **macOS stable**: `~/Library/Application Support/app.agenteval/stable/`

Directory structure:
```
├── evaluations/          # Evaluation configs
├── results/              # Run results (JSONL per run)
├── scenarios/
│   ├── surveys/          # Survey definitions
│   └── tasks/            # Task definitions
├── tools/
│   ├── definitions/      # Tool definitions
│   └── sets/             # Tool sets
├── context/
│   ├── contents/         # Content items
│   ├── content-sets/     # Content sets
│   ├── skills/           # Skill definitions
│   └── skill-sets/       # Skill sets
├── providers.json        # Provider API keys
└── settings.json         # App settings
```

No database is used — entities are individual JSON files, runs are stored as JSONL (one entry per trial).

## Tech Stack

- **Runtime**: [Electrobun](https://blackboard.sh/electrobun/) (NOT Electron)
- **Backend**: Bun (TypeScript)
- **Frontend**: React + Chakra UI v3 + Vite
- **AI**: Vercel AI SDK
- **Charts**: Apache ECharts (via echarts-for-react)
- **Tests**: Bun test runner


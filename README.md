# Agent Eval

Desktop application for evaluating AI agents using UX research methods (surveys and task scenarios).

## Install

### macOS (Apple Silicon)

[Download DMG](https://github.com/jrbenson/agent-eval/releases/latest/download/stable-macos-arm64-AgentEval.dmg)

The app is currently unsigned. After mounting the DMG and dragging to Applications (or elsewhere), remove the quarantine attribute before first launch:

```bash
xattr -c /Applications/Agent\ Eval.app
```

### Windows (x64)

[Download Installer](https://github.com/jrbenson/agent-eval/releases/latest/download/stable-win-x64-AgentEval-Setup.zip)

The app is currently unsigned. Windows SmartScreen will block the installer. Click **More info** then **Run anyway** to proceed.

> **Note:** Windows has known unresolved issues (Edit menu not hidden, popup windows may not work).

## Updates

The app checks for updates on launch via Electrobun's built-in updater. When a new version is available, it downloads a patch and applies it on next restart.

## Development

### Quick Start

Requires Bun. [Install](https://bun.com/docs/installation#installation) if needed.

```bash
npm install -g bun
```

Clone the repo, install dependencies, and start the dev server:

```bash
git clone https://github.com/jrbenson/agent-eval.git && cd agent-eval
```

```bash
bun install
```

```bash
bun dev
```

### How Dev Build Works

`bun run dev` runs two processes concurrently:

1. **Vite Dev Server** `http://localhost:5173` <br/> Directs to Vite server instead of bundled assets to get HMR.
2. **Electrobun Watch** <br /> Restarts entire app on bun-side changes.

### Project Structure

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

### Data Storage

All data is stored as JSON files on disk under the platform-specific user data directory. For example:

- **macOS dev**: `~/Library/Application Support/app.agenteval/dev/`
- **macOS stable**: `~/Library/Application Support/app.agenteval/stable/`

Data directory structure:

```
├── evaluations/          # Evaluation configs
├── results/              # Run results
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
└── settings.json         # App settings
```

### API Keys

Provider API keys are stored using the OS native secrets manager via `Bun.secrets` (macOS Keychain, Windows Credential Manager). Keys are never written to disk or config files. The app stores them under the service name `app.agenteval` and retrieves them at runtime when making LLM calls.

### Tech Stack

- **Runtime**: [Electrobun](https://blackboard.sh/electrobun/)
- **Backend**: [Bun](https://bun.sh/) ([TypeScript](https://www.typescriptlang.org/))
- **Frontend**: [React](https://react.dev/) + [Chakra UI v3](https://www.chakra-ui.com/) + [Vite](https://vite.dev/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/)
- **Charts**: [Apache ECharts](https://echarts.apache.org/) (via [echarts-for-react](https://github.com/hustcc/echarts-for-react))
- **Tests**: [Bun test runner](https://bun.sh/docs/cli/test)

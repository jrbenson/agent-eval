import type { PresetContent } from './types'

export const PRESET_CONTENTS: PresetContent[] = [
	{
		presetId: 'preset-content-readme',
		label: 'Project README',
		name: 'file:README.md',
		content: `# My Project

A sample project for demonstration purposes.

## Getting Started

1. Install dependencies: \`npm install\`
2. Run the dev server: \`npm run dev\`
3. Open http://localhost:3000

## Features

- User authentication
- REST API endpoints
- Database migrations
`,
	},
	{
		presetId: 'preset-content-notes',
		label: 'Meeting Notes',
		name: 'file:notes.txt',
		content: `Team standup 2024-01-15
- Backend: API rate limiting shipped
- Frontend: Dashboard redesign in progress
- Infra: Staging env migration this week
- Action items: Review PR #142, update deploy docs
`,
	},
	{
		presetId: 'preset-content-records',
		label: 'User Records',
		name: 'file:users.jsonl',
		content: `{"id": 1, "name": "Alice", "email": "alice@example.com", "role": "admin"}
{"id": 2, "name": "Bob", "email": "bob@example.com", "role": "editor"}
{"id": 3, "name": "Carol", "email": "carol@example.com", "role": "viewer"}
`,
	},
]

import type { PresetSkill } from './types'

export const PRESET_SKILLS: PresetSkill[] = [
	{
		presetId: 'preset-skill-code-review',
		label: 'Code Review',
		name: 'code-review',
		description: 'Review code for bugs, style issues, and best practices',
		content: `# Code Review Skill

## Approach

1. Read the file(s) to review
2. Check for:
   - Logic errors and edge cases
   - Security vulnerabilities (injection, auth bypass, data exposure)
   - Performance issues (N+1 queries, unnecessary allocations)
   - Code style and naming conventions
   - Missing error handling
3. Provide feedback organized by severity: critical, warning, suggestion

## Output Format

For each finding:
- **File** and **line range**
- **Severity**: critical / warning / suggestion
- **Description**: what the issue is and why it matters
- **Fix**: concrete code change or approach

Keep feedback actionable. Skip trivial style nits unless asked.
`,
	},
	{
		presetId: 'preset-skill-summarize',
		label: 'Summarization',
		name: 'summarize',
		description: 'Summarize documents or data into concise overviews',
		content: `# Summarization Skill

## Approach

1. Read the full content
2. Identify the key topics, decisions, and action items
3. Produce a summary with these sections:

## Output Format

### Overview
One paragraph capturing the main point.

### Key Points
- Bullet list of 3-7 important items

### Action Items
- List any tasks, deadlines, or follow-ups mentioned

Keep summaries under 200 words unless the source material is very long.
Use the same terminology as the source — don't paraphrase technical terms.
`,
	},
]

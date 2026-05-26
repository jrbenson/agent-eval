import { jsonSchema, tool } from 'ai'
import type { ExecutionContext } from '../execution/execution-context'
import {
	type ToolSearchHints,
	type ToolSearchMode,
	discoverToolNames,
} from '../execution/tool-catalog'
import type { TelemetryCollector } from '../telemetry'
import type { ResolvedToolDef } from '../tool-runtime'

export interface ToolSearchConfig {
	enabled: boolean
	mode: ToolSearchMode
	hints: ToolSearchHints
}

export function keywordSearch(query: string, tools: ResolvedToolDef[]): ResolvedToolDef[] {
	const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)

	const scored = tools
		.map((toolDef) => {
			const nameLower = toolDef.name.toLowerCase()
			const descriptionLower = toolDef.description.toLowerCase()
			const keywordLower = (toolDef.keywords ?? []).map((keyword) => keyword.toLowerCase())

			let score = 0
			for (const token of tokens) {
				if (nameLower.includes(token)) score += 2
				if (keywordLower.some((keyword) => keyword.includes(token))) score += 2
				if (descriptionLower.includes(token)) score += 1
			}

			return { tool: toolDef, score }
		})
		.filter((entry) => entry.score > 0)

	scored.sort((left, right) => right.score - left.score)
	return scored.map((entry) => entry.tool)
}

function searchTools(query: string, tools: ResolvedToolDef[], mode: ToolSearchMode) {
	const matched = keywordSearch(query, tools)
	if (mode === 'semantic') {
		return matched
	}

	return matched
}

export function buildToolSearchTool(context: ExecutionContext, telemetry: TelemetryCollector) {
	return tool({
		description: 'Search for available tools by query',
		inputSchema: jsonSchema({
			type: 'object' as const,
			properties: {
				query: {
					type: 'string' as const,
					description: 'Search query to find relevant tools',
				},
			},
			required: ['query'],
			additionalProperties: false,
		}),
		execute: async (rawInput, { toolCallId }) => {
			const callStart = Date.now()
			const { query } = rawInput as { query: string }

			const matched = searchTools(
				query,
				context.toolCatalog.searchableTools,
				context.toolCatalog.searchMode,
			)
			discoverToolNames(
				context.toolCatalog,
				matched.map((toolDef) => toolDef.name),
			)

			const output = {
				tools: matched.map((toolDef) => ({
					name: toolDef.name,
					description: toolDef.description,
				})),
			}

			telemetry.recordToolCall({
				toolCallId,
				toolName: 'tools',
				input: rawInput,
				validatedInput: rawInput,
				output,
				durationMs: Date.now() - callStart,
				validationPassed: true,
				validationErrors: null,
				error: null,
			})

			return output
		},
	})
}

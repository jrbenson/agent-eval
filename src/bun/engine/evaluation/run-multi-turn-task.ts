import { jsonSchema, tool } from 'ai'
import type { GoalCondition } from '../../../shared/schemas/task.schema'
import type { HarnessResult } from '../execution/execute-text'
import type { ExecutionContext } from '../execution/execution-context'
import { executeMultiTurn } from '../execution/multi-turn-executor'
import { createToolCatalog, discoverToolNames } from '../execution/tool-catalog'
import { type UtilityLlmCall, evaluateMockResponse } from '../mock-runtime'
import type { HarnessConfig } from '../provider-registry'
import type { SubagentConfig } from '../subagent-runtime'
import { buildSubagentTool } from '../subagent-runtime'
import { TelemetryCollector, type ToolCallTelemetry } from '../telemetry'
import type { ResolvedToolDef } from '../tool-runtime'
import { normalizeToolSchema } from '../tool-runtime'
import type { ToolSearchConfig } from '../tool-search'
import { buildToolSearchTool } from '../tool-search'
import { validateToolInputFromSchema } from '../validation'

export interface RunMultiTurnTaskArgs {
	config: HarnessConfig
	prompts: string[]
	simulateWithLlm: boolean
	simulationInstructions?: string
	goalConditions?: GoalCondition[]
	resolvedTools: ResolvedToolDef[]
	maxSteps: number
	maxSimulatedTurns?: number
	systemPrompt?: string
	toolSearchConfig?: ToolSearchConfig
	subagentConfig?: SubagentConfig
	initialPersistence?: Array<{ name: string; content: string }>
	resolvedSkills?: Array<{
		name: string
		description: string
		content: string
	}>
}

export async function runMultiTurnTask(args: RunMultiTurnTaskArgs): Promise<HarnessResult> {
	const telemetry = new TelemetryCollector()
	telemetry.start()

	const toolMockCache = new Map<string, unknown>()
	const utilityLlmCalls: UtilityLlmCall[] = []
	const mockPersistence = new Map<string, string>()
	if (args.initialPersistence) {
		for (const { name, content } of args.initialPersistence) {
			mockPersistence.set(name, content)
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	const allToolRecords: Record<string, any> = {}
	for (const toolDef of args.resolvedTools) {
		const normalizedSchema = normalizeToolSchema(toolDef.parameters)
		allToolRecords[toolDef.name] = tool({
			description: toolDef.description,
			inputSchema: jsonSchema(normalizedSchema),
			execute: async (rawInput, { toolCallId }) => {
				const callStart = Date.now()
				const validation = validateToolInputFromSchema(rawInput, toolDef.parameters)

				const callRecord: ToolCallTelemetry = {
					toolCallId,
					toolName: toolDef.name,
					input: rawInput,
					validatedInput: validation.data,
					output: null,
					durationMs: 0,
					validationPassed: validation.passed,
					validationErrors: validation.errors,
					error: null,
				}

				if (!validation.passed) {
					callRecord.output = {
						error: 'Validation failed',
						details: validation.errors,
					}
					callRecord.durationMs = Date.now() - callStart
					telemetry.recordToolCall(callRecord)
					return callRecord.output
				}

				const output = await evaluateMockResponse(
					toolDef,
					validation.data,
					toolMockCache,
					utilityLlmCalls,
					mockPersistence,
					toolCallId,
				)

				callRecord.output = output
				callRecord.durationMs = Date.now() - callStart
				telemetry.recordToolCall(callRecord)
				return output
			},
		})
	}

	const toolCatalog = createToolCatalog({
		resolvedTools: args.resolvedTools,
		searchEnabled: args.toolSearchConfig?.enabled ?? false,
		searchMode: args.toolSearchConfig?.mode,
		searchHints: args.toolSearchConfig?.hints,
	})

	const context: ExecutionContext = {
		config: args.config,
		systemPrompt: args.systemPrompt,
		telemetry,
		currentDepth: 0,
		maxDepth: args.subagentConfig?.maxDepth ?? 1,
		maxSteps: args.maxSteps,
		toolCatalog,
		toolMockCache,
		utilityLlmCalls,
		mockPersistence,
	}

	if (args.toolSearchConfig?.enabled) {
		allToolRecords.tools = buildToolSearchTool(context, telemetry)
		discoverToolNames(toolCatalog, ['tools'])
	}

	if (args.subagentConfig?.enabled && context.currentDepth < context.maxDepth) {
		allToolRecords.delegate = buildSubagentTool(
			context,
			allToolRecords,
			args.resolvedTools,
			telemetry,
		)
		discoverToolNames(toolCatalog, ['delegate'])
	}

	let effectiveSystemPrompt = args.systemPrompt
	if (args.toolSearchConfig?.enabled && toolCatalog.searchHints !== 'none') {
		const hint =
			toolCatalog.searchHints === 'names_only'
				? `\n\nAvailable tools: ${args.resolvedTools.map((t) => t.name).join(', ')}. Use the "tools" tool to search for and activate tools before calling them.`
				: `\n\nAvailable tools:\n${args.resolvedTools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}\nUse the "tools" tool to search for and activate tools before calling them.`
		effectiveSystemPrompt = (effectiveSystemPrompt ?? '') + hint
		context.systemPrompt = effectiveSystemPrompt
	}

	if (args.resolvedSkills && args.resolvedSkills.length > 0) {
		const skillMap = new Map(args.resolvedSkills.map((skill) => [skill.name.toLowerCase(), skill]))
		allToolRecords.load_skill = tool({
			description: 'Load a skill by name to get detailed instructions for a specific capability.',
			inputSchema: jsonSchema<{ name: string }>({
				type: 'object' as const,
				properties: {
					name: {
						type: 'string' as const,
						description: 'The name of the skill to load.',
					},
				},
				required: ['name'],
			}),
			execute: async (input) => {
				const skill = skillMap.get(input.name.toLowerCase())
				if (!skill) {
					return {
						error: `Skill not found: "${input.name}". Available skills: ${args.resolvedSkills!.map((s) => s.name).join(', ')}`,
					}
				}
				return { name: skill.name, content: skill.content }
			},
		})
		discoverToolNames(toolCatalog, ['load_skill'])

		const skillSection = `\n\n## Available Skills\nUse the \`load_skill\` tool to load detailed instructions for a skill before attempting the task.\n\n${args.resolvedSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join('\n')}`
		effectiveSystemPrompt = (effectiveSystemPrompt ?? '') + skillSection
		context.systemPrompt = effectiveSystemPrompt
	}

	return executeMultiTurn({
		prompts: args.prompts,
		simulateWithLlm: args.simulateWithLlm,
		simulationInstructions: args.simulationInstructions,
		goalConditions: args.goalConditions,
		maxSteps: args.maxSteps,
		maxSimulatedTurns: args.maxSimulatedTurns,
		context,
		tools: allToolRecords,
	})
}

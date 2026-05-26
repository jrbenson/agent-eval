import { generateText, jsonSchema, stepCountIs, tool } from 'ai'
import { type UtilityLlmCall, evaluateMockResponse } from '../mock-runtime'
import { type HarnessConfig, getProviderModel } from '../provider-registry'
import { type SubagentConfig, buildSubagentTool } from '../subagent-runtime'
import { TelemetryCollector, type ToolCallTelemetry } from '../telemetry'
import {
	type ResolvedToolDef,
	type ToolDef,
	legacyParamsToSchema,
	normalizeToolSchema,
} from '../tool-runtime'
import { type ToolSearchConfig, buildToolSearchTool } from '../tool-search'
import { validateToolInputFromSchema } from '../validation'
import { type HarnessResult, optionalConfigSpread } from './execute-text'
import type { ExecutionContext } from './execution-context'
import { createToolCatalog, discoverToolNames, getActiveToolNames } from './tool-catalog'

async function executeWithTools(
	config: HarnessConfig,
	taskPrompt: string,
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	tools: Record<string, any>,
	telemetry: TelemetryCollector,
	maxSteps: number,
	systemPrompt?: string,
): Promise<HarnessResult> {
	const model = await getProviderModel(config)
	const result = await generateText({
		model,
		prompt: taskPrompt,
		...(systemPrompt ? { system: systemPrompt } : {}),
		tools,
		stopWhen: stepCountIs(maxSteps),
		temperature: config.temperature,
		...optionalConfigSpread(config),
	})

	return {
		responseText: result.text,
		toolCalls: telemetry.getToolCalls(),
		stepCount: result.steps.length,
		totalTokens: result.totalUsage.totalTokens ?? 0,
		promptTokens: result.totalUsage.inputTokens ?? 0,
		completionTokens: result.totalUsage.outputTokens ?? 0,
		latencyMs: telemetry.getElapsedMs(),
		finishReason: result.finishReason,
		steps: result.steps,
		responseMessages: result.response.messages,
		reasoning: result.reasoningText ?? null,
		effectiveSystemPrompt: systemPrompt ?? null,
	}
}

export async function runAgentWithTools(
	config: HarnessConfig,
	taskPrompt: string,
	toolDefs: ToolDef[],
	maxSteps: number,
	systemPrompt?: string,
): Promise<HarnessResult> {
	const telemetry = new TelemetryCollector()
	telemetry.start()

	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	const tools: Record<string, any> = {}

	for (const toolDef of toolDefs) {
		const schema = legacyParamsToSchema(toolDef.parameters)
		tools[toolDef.name] = tool({
			description: toolDef.description,
			inputSchema: jsonSchema(schema),
			execute: async (rawInput, { toolCallId }) => {
				const callStart = Date.now()
				const validation = validateToolInputFromSchema(rawInput, schema)

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

				const output = {
					success: true,
					toolName: toolDef.name,
					receivedInput: validation.data,
				}
				callRecord.output = output
				callRecord.durationMs = Date.now() - callStart
				telemetry.recordToolCall(callRecord)
				return output
			},
		})
	}

	return executeWithTools(config, taskPrompt, tools, telemetry, maxSteps, systemPrompt)
}

export async function executeAgentWithContext(
	context: ExecutionContext,
	taskPrompt: string,
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	allTools: Record<string, any>,
	maxSteps: number,
): Promise<HarnessResult> {
	const model = await getProviderModel(context.config)
	const toolSearchActive =
		context.toolCatalog.discoveredToolNames.size > 0 &&
		context.toolCatalog.searchableTools.length > 0

	const result = await generateText({
		model,
		prompt: taskPrompt,
		...(context.systemPrompt ? { system: context.systemPrompt } : {}),
		tools: allTools,
		stopWhen: stepCountIs(maxSteps),
		temperature: context.config.temperature,
		...optionalConfigSpread(context.config),
		...(toolSearchActive
			? {
					prepareStep: () => ({
						activeTools: getActiveToolNames(context.toolCatalog),
					}),
				}
			: {}),
	})

	return {
		responseText: result.text,
		toolCalls: context.telemetry.getToolCalls(),
		stepCount: result.steps.length,
		totalTokens: result.totalUsage.totalTokens ?? 0,
		promptTokens: result.totalUsage.inputTokens ?? 0,
		completionTokens: result.totalUsage.outputTokens ?? 0,
		latencyMs: context.telemetry.getElapsedMs(),
		finishReason: result.finishReason,
		steps: result.steps,
		responseMessages: result.response.messages,
		reasoning: result.reasoningText ?? null,
		effectiveSystemPrompt: context.systemPrompt ?? null,
		utilityLlmCalls: context.utilityLlmCalls.length > 0 ? context.utilityLlmCalls : undefined,
		mockPersistence: context.mockPersistence.size > 0 ? context.mockPersistence : undefined,
	}
}

export async function runAgentWithResolvedTools(
	config: HarnessConfig,
	taskPrompt: string,
	resolvedTools: ResolvedToolDef[],
	maxSteps: number,
	systemPrompt?: string,
	toolSearchConfig?: ToolSearchConfig,
	subagentConfig?: SubagentConfig,
	initialPersistence?: Array<{ name: string; content: string }>,
	resolvedSkills?: Array<{
		name: string
		description: string
		content: string
	}>,
): Promise<HarnessResult> {
	const telemetry = new TelemetryCollector()
	telemetry.start()

	const toolMockCache = new Map<string, unknown>()
	const utilityLlmCalls: UtilityLlmCall[] = []
	const mockPersistence = new Map<string, string>()
	if (initialPersistence) {
		for (const { name, content } of initialPersistence) {
			mockPersistence.set(name, content)
		}
	}

	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	const allToolRecords: Record<string, any> = {}
	for (const toolDef of resolvedTools) {
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
		resolvedTools,
		searchEnabled: toolSearchConfig?.enabled ?? false,
		searchMode: toolSearchConfig?.mode,
		searchHints: toolSearchConfig?.hints,
	})

	const context: ExecutionContext = {
		config,
		systemPrompt,
		telemetry,
		currentDepth: 0,
		maxDepth: subagentConfig?.maxDepth ?? 1,
		maxSteps,
		toolCatalog,
		toolMockCache,
		utilityLlmCalls,
		mockPersistence,
	}

	if (toolSearchConfig?.enabled) {
		allToolRecords.tools = buildToolSearchTool(context, telemetry)
		discoverToolNames(toolCatalog, ['tools'])
	}

	if (subagentConfig?.enabled && context.currentDepth < context.maxDepth) {
		allToolRecords.delegate = buildSubagentTool(context, allToolRecords, resolvedTools, telemetry)
		discoverToolNames(toolCatalog, ['delegate'])
	}

	let effectiveSystemPrompt = systemPrompt
	if (toolSearchConfig?.enabled && toolCatalog.searchHints !== 'none') {
		const hint =
			toolCatalog.searchHints === 'names_only'
				? `\n\nAvailable tools: ${resolvedTools.map((toolDef) => toolDef.name).join(', ')}. Use the "tools" tool to search for and activate tools before calling them.`
				: `\n\nAvailable tools:\n${resolvedTools.map((toolDef) => `- ${toolDef.name}: ${toolDef.description}`).join('\n')}\nUse the "tools" tool to search for and activate tools before calling them.`
		effectiveSystemPrompt = (effectiveSystemPrompt ?? '') + hint
		context.systemPrompt = effectiveSystemPrompt
	}

	if (resolvedSkills && resolvedSkills.length > 0) {
		const skillMap = new Map(resolvedSkills.map((skill) => [skill.name.toLowerCase(), skill]))
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
						error: `Skill not found: "${input.name}". Available skills: ${resolvedSkills.map((resolvedSkill) => resolvedSkill.name).join(', ')}`,
					}
				}
				return { name: skill.name, content: skill.content }
			},
		})
		discoverToolNames(toolCatalog, ['load_skill'])

		const skillSection = `\n\n## Available Skills\nUse the \`load_skill\` tool to load detailed instructions for a skill before attempting the task.\n\n${resolvedSkills.map((skill) => `- ${skill.name}: ${skill.description}`).join('\n')}`
		effectiveSystemPrompt = (effectiveSystemPrompt ?? '') + skillSection
		context.systemPrompt = effectiveSystemPrompt
	}

	return executeAgentWithContext(context, taskPrompt, allToolRecords, maxSteps)
}

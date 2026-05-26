import { jsonSchema, tool } from 'ai'
import type { SubagentTrace } from '../../../shared/schemas/trial.schema'
import type { ExecutionContext } from '../execution/execution-context'
import {
	createChildToolCatalog,
	discoverToolNames,
	hasDiscoveredTool,
} from '../execution/tool-catalog'
import { TelemetryCollector } from '../telemetry'
import type { ResolvedToolDef } from '../tool-runtime'
import { extractMessages, extractSteps, extractToolValidations } from '../trial-extractor'
import { buildToolSearchTool } from './tool-search-tool'

export interface SubagentConfig {
	enabled: boolean
	maxDepth: number
}

export function buildSubagentTool(
	context: ExecutionContext,
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	allToolRecords: Record<string, any>,
	allResolvedTools: ResolvedToolDef[],
	telemetry: TelemetryCollector,
) {
	const executeAgentWithContextPromise = import('../execution/execute-agent').then(
		(module) => module.executeAgentWithContext,
	)

	return tool({
		description: 'Delegate a task to a subagent that can use tools independently',
		inputSchema: jsonSchema({
			type: 'object' as const,
			properties: {
				task: {
					type: 'string' as const,
					description: 'The task to delegate to a subagent',
				},
			},
			required: ['task'],
			additionalProperties: false,
		}),
		execute: async (rawInput, { toolCallId }) => {
			const callStart = Date.now()
			const { task } = rawInput as { task: string }

			if (context.currentDepth >= context.maxDepth) {
				const output = { error: 'Maximum subagent depth exceeded' }
				telemetry.recordToolCall({
					toolCallId,
					toolName: 'delegate',
					input: rawInput,
					validatedInput: rawInput,
					output,
					durationMs: Date.now() - callStart,
					validationPassed: true,
					validationErrors: null,
					error: 'Maximum subagent depth exceeded',
				})
				return output
			}

			const executeAgentWithContext = await executeAgentWithContextPromise
			const childTelemetry = new TelemetryCollector()
			childTelemetry.start()

			const childContext: ExecutionContext = {
				config: context.config,
				systemPrompt: context.systemPrompt,
				telemetry: childTelemetry,
				currentDepth: context.currentDepth + 1,
				maxDepth: context.maxDepth,
				maxSteps: context.maxSteps,
				toolCatalog: createChildToolCatalog(context.toolCatalog, allResolvedTools),
				toolMockCache: context.toolMockCache,
				utilityLlmCalls: context.utilityLlmCalls,
				mockPersistence: context.mockPersistence,
			}

			// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
			const childTools: Record<string, any> = { ...allToolRecords }

			if (hasDiscoveredTool(context.toolCatalog, 'tools')) {
				discoverToolNames(childContext.toolCatalog, ['tools'])
				childTools.tools = buildToolSearchTool(childContext, childTelemetry)
			}

			if (childContext.currentDepth < childContext.maxDepth) {
				discoverToolNames(childContext.toolCatalog, ['delegate'])
				childTools.delegate = buildSubagentTool(
					childContext,
					childTools,
					allResolvedTools,
					childTelemetry,
				)
			}

			try {
				const result = await executeAgentWithContext(
					childContext,
					task,
					childTools,
					childContext.maxSteps,
				)

				const processedMessages = extractMessages(result.responseMessages)
				const processedSteps = extractSteps(result.steps, processedMessages, 0)
				const processedValidations = extractToolValidations(result.toolCalls)

				const subagentTrace: SubagentTrace = {
					task,
					depth: childContext.currentDepth,
					systemPrompt: childContext.systemPrompt ?? null,
					steps: processedSteps,
					messages: processedMessages,
					toolValidations: processedValidations,
					tokens: {
						total: result.totalTokens,
						prompt: result.promptTokens,
						completion: result.completionTokens,
					},
					latencyMs: result.latencyMs,
					finishReason: result.finishReason,
					responseText: result.responseText,
				}

				telemetry.recordToolCall({
					toolCallId,
					toolName: 'delegate',
					input: rawInput,
					validatedInput: rawInput,
					output: { result: result.responseText, subagentTrace },
					durationMs: Date.now() - callStart,
					validationPassed: true,
					validationErrors: null,
					error: null,
				})

				return { result: result.responseText }
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				const output = { error: errorMessage }
				telemetry.recordToolCall({
					toolCallId,
					toolName: 'delegate',
					input: rawInput,
					validatedInput: rawInput,
					output,
					durationMs: Date.now() - callStart,
					validationPassed: true,
					validationErrors: null,
					error: errorMessage,
				})
				return output
			}
		},
	})
}

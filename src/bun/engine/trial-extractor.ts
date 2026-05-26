import type {
	SubagentTrace,
	ToolValidation,
	TrialData,
	TrialMessage,
	TrialStep,
	TrialSummary,
} from '../../shared/schemas/trial.schema'
import type { HarnessConfig, HarnessResult } from './harness'
import type { ToolCallTelemetry } from './telemetry'

import type { AgentConfigParams } from '../../shared/rpc-types'

interface ExtractionContext {
	trialId: string
	runId: string
	agentConfig: HarnessConfig
	sourceParams?: AgentConfigParams
	scenarioType: 'survey' | 'task'
	scenarioId: string
	userPrompt?: string
	systemPrompt?: string
}

/**
 * Extract structured trial data from a harness result.
 * Deduplicates conversation messages, builds step metadata,
 * and collects tool validation records.
 */
export function extractTrialData(result: HarnessResult, context: ExtractionContext): TrialData {
	// Build prompt messages to prepend
	const promptMessages: TrialMessage[] = []
	if (context.systemPrompt) {
		promptMessages.push({ role: 'system', content: context.systemPrompt })
	}
	if (context.userPrompt) {
		promptMessages.push({ role: 'user', content: context.userPrompt })
	}

	const responseMessages = extractMessages(result.responseMessages)
	const messages = [...promptMessages, ...responseMessages]
	const steps = extractSteps(result.steps, responseMessages, promptMessages.length)
	const toolValidations = extractToolValidations(result.toolCalls)

	return {
		trialId: context.trialId,
		runId: context.runId,
		agent: {
			provider: context.agentConfig.provider,
			model: context.agentConfig.model,
			temperature: context.agentConfig.temperature,
			maxTokens: context.agentConfig.maxTokens,
			topP: context.agentConfig.topP,
			reasoning: context.sourceParams?.reasoning,
			toolSearch: context.sourceParams?.toolSearch,
			toolSearchMode: context.sourceParams?.toolSearchMode,
			toolSearchHints: context.sourceParams?.toolSearchHints,
			subagentsEnabled: context.sourceParams?.subagentsEnabled,
			subagentMaxDepth: context.sourceParams?.subagentMaxDepth,
		},
		scenarioType: context.scenarioType,
		scenarioId: context.scenarioId,
		messages,
		steps,
		...(toolValidations.length > 0 ? { toolValidations } : {}),
		metrics: {
			totalTokens: result.totalTokens,
			promptTokens: result.promptTokens,
			completionTokens: result.completionTokens,
			totalLatencyMs: result.latencyMs,
			stepCount: result.stepCount,
			finishReason: result.finishReason,
		},
		status: 'completed',
		createdAt: new Date().toISOString(),
		...(result.utilityLlmCalls && result.utilityLlmCalls.length > 0
			? { utilityLlmCalls: result.utilityLlmCalls }
			: {}),
		...(result.mockPersistence && result.mockPersistence.size > 0
			? {
					persistenceSnapshot: Array.from(result.mockPersistence.entries()).map(
						([name, content]) => ({ name, content }),
					),
				}
			: {}),
	}
}

/**
 * Create a minimal trial summary for the JSONL index.
 */
export function createTrialSummary(
	trialId: string,
	agentConfigId: string,
	result: HarnessResult,
	status: 'completed' | 'failed',
	error: string | null = null,
	variantId?: string,
): TrialSummary {
	return {
		trialId,
		agentConfigId,
		variantId,
		status,
		stepCount: result.stepCount,
		totalTokens: result.totalTokens,
		promptTokens: result.promptTokens,
		completionTokens: result.completionTokens,
		latencyMs: result.latencyMs,
		finishReason: result.finishReason,
		error,
		createdAt: new Date().toISOString(),
	}
}

/**
 * Create a failed trial summary (when execution itself failed).
 */
export function createFailedTrialSummary(
	trialId: string,
	agentConfigId: string,
	error: string,
	variantId?: string,
): TrialSummary {
	return {
		trialId,
		agentConfigId,
		variantId,
		status: 'failed',
		stepCount: 0,
		totalTokens: 0,
		promptTokens: 0,
		completionTokens: 0,
		latencyMs: 0,
		finishReason: 'error',
		error,
		createdAt: new Date().toISOString(),
	}
}

// ---- Internal extraction helpers ----

/**
 * Extract deduplicated messages from the AI SDK response messages.
 * The response messages are the final accumulated message list.
 */
export function extractMessages(responseMessages: unknown[]): TrialMessage[] {
	const messages: TrialMessage[] = []

	for (const msg of responseMessages) {
		const m = msg as Record<string, unknown>
		const role = m.role as string

		if (role === 'assistant') {
			const content = extractTextContent(m.content)
			const toolCalls = extractToolCalls(m.content)

			messages.push({
				role: 'assistant',
				content,
				...(toolCalls.length > 0 ? { toolCalls } : {}),
			})
		} else if (role === 'tool') {
			const toolResults = Array.isArray(m.content)
				? (m.content as Record<string, unknown>[])
				: [m.content as Record<string, unknown>]

			for (const tr of toolResults) {
				// ai@6 renamed 'result' to 'output' for tool results
				const toolOutput = (tr.output ?? tr.result) as unknown
				messages.push({
					role: 'tool',
					content: typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput ?? null),
					toolResultFor: tr.toolCallId as string | undefined,
					toolName: tr.toolName as string | undefined,
				})
			}
		} else {
			// system, user
			messages.push({
				role: role as 'system' | 'user',
				content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content ?? null),
			})
		}
	}

	return messages
}

/**
 * Extract text content from an AI SDK message content field.
 * Content can be a string or an array of content parts.
 */
function extractTextContent(content: unknown): string | null {
	if (typeof content === 'string') return content
	if (Array.isArray(content)) {
		const textParts = content
			.filter((part: unknown) => {
				const p = part as Record<string, unknown>
				return p.type === 'text'
			})
			.map((part: unknown) => (part as Record<string, unknown>).text as string)
		return textParts.length > 0 ? textParts.join('') : null
	}
	return null
}

/**
 * Extract tool calls from an AI SDK assistant message content.
 */
function extractToolCalls(
	content: unknown,
): { id: string; name: string; input: Record<string, unknown> }[] {
	if (!Array.isArray(content)) return []
	return content
		.filter((part: unknown) => {
			const p = part as Record<string, unknown>
			return p.type === 'tool-call'
		})
		.map((part: unknown) => {
			const p = part as Record<string, unknown>
			return {
				id: p.toolCallId as string,
				name: p.toolName as string,
				input: (p.input ?? p.args ?? {}) as Record<string, unknown>,
			}
		})
}

/**
 * Extract step metadata from AI SDK steps.
 * Each step records which messages were produced and per-step metrics.
 *
 * Step-message mapping: AI SDK accumulates all response messages across steps
 * into a single flat array. Each step's `response.messages` reflects the total
 * message count at that point. We diff consecutive counts to figure out which
 * messages belong to each step, then offset by `indexOffset` to account for
 * prompt messages (system/user) prepended before the response messages.
 */
export function extractSteps(
	rawSteps: unknown[],
	responseMessages: TrialMessage[],
	indexOffset = 0,
): TrialStep[] {
	const steps: TrialStep[] = []
	let previousMessageCount = 0

	for (let i = 0; i < rawSteps.length; i++) {
		const step = rawSteps[i] as Record<string, unknown>
		const stepResponse = step.response as Record<string, unknown> | undefined
		const stepMessages = stepResponse?.messages as unknown[] | undefined
		const currentMessageCount = stepMessages?.length ?? responseMessages.length
		const boundedMessageCount = Math.max(
			previousMessageCount,
			Math.min(currentMessageCount, responseMessages.length),
		)

		// Messages added in this step
		const messageIndices: number[] = []
		for (let j = previousMessageCount; j < boundedMessageCount; j++) {
			messageIndices.push(j + indexOffset)
		}

		const usage = step.usage as Record<string, number> | undefined
		const rawReasoning = step.reasoning as string | { type: string; text: string }[] | undefined
		const reasoning =
			typeof rawReasoning === 'string'
				? rawReasoning
				: Array.isArray(rawReasoning)
					? rawReasoning
							.map((r) => (typeof r === 'string' ? r : r.text))
							.filter(Boolean)
							.join('\n')
					: undefined

		steps.push({
			stepIndex: i,
			messageIndices,
			usage: {
				promptTokens: usage?.inputTokens ?? usage?.promptTokens ?? 0,
				completionTokens: usage?.outputTokens ?? usage?.completionTokens ?? 0,
				totalTokens: usage?.totalTokens ?? 0,
			},
			finishReason: (step.finishReason as string) ?? 'unknown',
			latencyMs: 0, // Per-step latency not tracked by AI SDK
			...(reasoning ? { reasoning } : {}),
		})

		previousMessageCount = boundedMessageCount
	}

	if (steps.length > 0 && previousMessageCount < responseMessages.length) {
		const lastStep = steps[steps.length - 1]
		for (let j = previousMessageCount; j < responseMessages.length; j++) {
			lastStep.messageIndices.push(j + indexOffset)
		}
	}

	return steps
}

/**
 * Convert tool call telemetry records into ToolValidation records
 * keyed by tool call ID for joining with messages.
 * Extracts subagentTrace from delegate tool call outputs.
 */
export function extractToolValidations(toolCalls: ToolCallTelemetry[]): ToolValidation[] {
	return toolCalls.map((tc) => {
		const output = tc.output as Record<string, unknown> | null | undefined
		const trace = output?.subagentTrace as SubagentTrace | undefined
		return {
			toolCallId: tc.toolCallId,
			toolName: tc.toolName,
			validatedInput: (tc.validatedInput as Record<string, unknown>) ?? null,
			validationPassed: tc.validationPassed,
			validationErrors: tc.validationErrors ?? [],
			durationMs: tc.durationMs,
			...(trace ? { subagentTrace: trace } : {}),
		}
	})
}

import { type ModelMessage, generateText, isLoopFinished, stepCountIs } from 'ai'
import type { GoalCondition } from '../../../shared/schemas/task.schema'
import { getProviderModel } from '../provider-registry'
import { evaluateGoalCondition } from '../task-analysis-core'
import type { TelemetryCollector } from '../telemetry'
import type { HarnessResult } from './execute-text'
import { optionalConfigSpread } from './execute-text'
import type { ExecutionContext } from './execution-context'
import { MAX_SIMULATED_TURNS, generateSimulatedPrompt } from './prompt-simulator'
import { getActiveToolNames } from './tool-catalog'

export interface MultiTurnConfig {
	prompts: string[]
	simulateWithLlm: boolean
	simulationInstructions?: string
	goalConditions?: GoalCondition[]
	maxSteps: number
	maxSimulatedTurns?: number
	context: ExecutionContext
	// biome-ignore lint/suspicious/noExplicitAny: AI SDK tool types are complex
	tools: Record<string, any>
}

/**
 * Lightweight TrialData-shaped object for mid-loop goal evaluation.
 * Only needs messages and toolValidations fields used by evaluateGoalCondition.
 */
function buildPartialTrialForGoalCheck(messages: ModelMessage[], toolCalls: TelemetryCollector) {
	const trialMessages: Array<{
		role: string
		content?: string
		toolCalls?: Array<{ id: string; name: string; input: unknown }>
	}> = []

	for (const msg of messages) {
		if (msg.role === 'user') {
			trialMessages.push({
				role: 'user',
				content: typeof msg.content === 'string' ? msg.content : '',
			})
		} else if (msg.role === 'assistant') {
			// biome-ignore lint/suspicious/noExplicitAny: AI SDK message content varies across versions
			const content = msg.content as any
			const parts: Array<{ type: string; [k: string]: unknown }> =
				typeof content === 'string'
					? [{ type: 'text', text: content }]
					: Array.isArray(content)
						? content
						: []

			const textContent = parts
				.filter((p) => p.type === 'text')
				.map((p) => (p as { type: 'text'; text: string }).text)
				.join('')

			const calls = parts
				.filter((p) => p.type === 'tool-call')
				.map((p) => ({
					id: (p as unknown as { toolCallId: string }).toolCallId,
					name: (p as unknown as { toolName: string }).toolName,
					input: (p as unknown as { args: unknown }).args,
				}))

			trialMessages.push({
				role: 'assistant',
				content: textContent || undefined,
				toolCalls: calls.length > 0 ? calls : undefined,
			})
		}
	}

	return {
		messages: trialMessages,
		toolValidations: toolCalls.getToolCalls().map((tc) => ({
			toolCallId: tc.toolCallId,
			toolName: tc.toolName,
			validatedInput: tc.validatedInput,
			passed: tc.validationPassed,
		})),
	}
}

function checkGoalsMet(
	goalConditions: GoalCondition[],
	messages: ModelMessage[],
	telemetry: TelemetryCollector,
): { allMet: boolean; unmetGoals: GoalCondition[] } {
	if (goalConditions.length === 0) {
		return { allMet: false, unmetGoals: [] }
	}

	const partialTrial = buildPartialTrialForGoalCheck(messages, telemetry)
	const unmetGoals: GoalCondition[] = []

	for (let i = 0; i < goalConditions.length; i++) {
		// biome-ignore lint/suspicious/noExplicitAny: partial trial shape for evaluation
		const result = evaluateGoalCondition(goalConditions[i], partialTrial as any, i)
		if (!result.passed) {
			unmetGoals.push(goalConditions[i])
		}
	}

	return { allMet: unmetGoals.length === 0, unmetGoals }
}

export async function executeMultiTurn(config: MultiTurnConfig): Promise<HarnessResult> {
	const { context } = config
	const model = await getProviderModel(context.config)
	const toolSearchActive =
		context.toolCatalog.discoveredToolNames.size > 0 &&
		context.toolCatalog.searchableTools.length > 0

	const messages: ModelMessage[] = []
	let totalSteps = 0
	let totalInputTokens = 0
	let totalOutputTokens = 0
	let totalTokensAll = 0
	let lastFinishReason = 'stop'
	let lastText = ''
	let lastReasoning: string | null = null
	const allSteps: unknown[] = []
	const allResponseMessages: unknown[] = []
	let simulatedTurnCount = 0
	const maxSimTurns = config.maxSimulatedTurns ?? MAX_SIMULATED_TURNS

	// Send explicit prompts
	let promptIndex = 0

	while (totalSteps < config.maxSteps) {
		let userMessage: string

		if (promptIndex < config.prompts.length) {
			userMessage = config.prompts[promptIndex]
			promptIndex++
		} else if (config.simulateWithLlm) {
			// Check if goals are met before simulating
			const goalConditions = config.goalConditions ?? []
			if (goalConditions.length > 0) {
				const { allMet, unmetGoals } = checkGoalsMet(goalConditions, messages, context.telemetry)
				if (allMet) {
					console.log('[multi-turn] All goals met, stopping simulation')
					break
				}

				if (simulatedTurnCount >= maxSimTurns) {
					console.log('[multi-turn] Max simulated turns reached')
					break
				}

				console.log(
					`[multi-turn] Simulating prompt (turn ${simulatedTurnCount + 1}), ${unmetGoals.length} unmet goals`,
				)
				const simResult = await generateSimulatedPrompt(
					messages,
					unmetGoals,
					config.simulationInstructions,
					context.utilityLlmCalls,
				)
				console.log(
					`[multi-turn] Simulation result: satisfied=${simResult.satisfied}, text="${simResult.text.slice(0, 100)}"`,
				)
				if (simResult.satisfied) break
				userMessage = simResult.text
			} else {
				// No goal conditions — just simulate up to limit
				if (simulatedTurnCount >= maxSimTurns) break

				console.log(
					`[multi-turn] Simulating prompt (turn ${simulatedTurnCount + 1}), no goal conditions`,
				)
				const simResult = await generateSimulatedPrompt(
					messages,
					[],
					config.simulationInstructions,
					context.utilityLlmCalls,
				)
				console.log(
					`[multi-turn] Simulation result: satisfied=${simResult.satisfied}, text="${simResult.text.slice(0, 100)}"`,
				)
				if (simResult.satisfied) break
				userMessage = simResult.text
			}
			simulatedTurnCount++
		} else {
			break
		}

		messages.push({ role: 'user', content: userMessage })

		// Include subsequent user messages in response messages for trial data
		// (the first prompt is prepended by the trial extractor)
		if (allResponseMessages.length > 0) {
			allResponseMessages.push({ role: 'user', content: userMessage })
		}

		const remainingSteps = config.maxSteps - totalSteps
		const result = await generateText({
			model,
			messages,
			...(context.systemPrompt ? { system: context.systemPrompt } : {}),
			tools: config.tools,
			stopWhen: [stepCountIs(remainingSteps), isLoopFinished()],
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

		// Accumulate response messages into conversation
		for (const msg of result.response.messages) {
			messages.push(msg as ModelMessage)
		}

		totalSteps += result.steps.length
		totalInputTokens += result.totalUsage.inputTokens ?? 0
		totalOutputTokens += result.totalUsage.outputTokens ?? 0
		totalTokensAll += result.totalUsage.totalTokens ?? 0
		lastFinishReason = result.finishReason
		lastText = result.text
		lastReasoning = result.reasoningText ?? null
		allSteps.push(...result.steps)
		allResponseMessages.push(...result.response.messages)
	}

	return {
		responseText: lastText,
		toolCalls: context.telemetry.getToolCalls(),
		stepCount: totalSteps,
		totalTokens: totalTokensAll,
		promptTokens: totalInputTokens,
		completionTokens: totalOutputTokens,
		latencyMs: context.telemetry.getElapsedMs(),
		finishReason: lastFinishReason,
		steps: allSteps,
		responseMessages: allResponseMessages,
		reasoning: lastReasoning,
		effectiveSystemPrompt: context.systemPrompt ?? null,
		utilityLlmCalls: context.utilityLlmCalls.length > 0 ? context.utilityLlmCalls : undefined,
		mockPersistence: context.mockPersistence.size > 0 ? context.mockPersistence : undefined,
	}
}

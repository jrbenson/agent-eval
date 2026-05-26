import { generateObject, generateText, jsonSchema, stepCountIs } from 'ai'
import { getUtilityModel } from '../provider-registry'
import type { ResolvedToolDef } from '../tool-runtime'
import { extractMessages, extractSteps } from '../trial-extractor'
import { normalizeOutputSchema, stripSyntheticNulls } from './output-schema'
import { buildPersistenceTools } from './persistence-tools'

export interface UtilityLlmCall {
	purpose: 'toolMock' | 'simulation'
	toolCallId?: string
	toolName?: string
	systemPrompt?: string | null
	userPrompt?: string | null
	assistantResponse?: string | null
	inputTokens: number
	outputTokens: number
	latencyMs: number
	messages?: import('../../../shared/schemas/trial.schema').TrialMessage[]
	steps?: import('../../../shared/schemas/trial.schema').TrialStep[]
}

export function mockCacheKey(toolName: string, input: unknown): string {
	const sorted = JSON.stringify(
		input,
		input && typeof input === 'object'
			? Object.keys(input as Record<string, unknown>).sort()
			: undefined,
	)
	return `${toolName}::${sorted}`
}

export async function executeLlmDefault(
	toolDef: ResolvedToolDef,
	input: unknown,
	cache: Map<string, unknown>,
	utilityLlmCalls: UtilityLlmCall[],
	mockPersistence: Map<string, string>,
	toolCallId?: string,
): Promise<unknown> {
	const llmConfig = toolDef.mockResponse?.llmDefaultConfig
	if (!llmConfig) {
		return { success: true, toolName: toolDef.name, receivedInput: input }
	}

	if (!llmConfig.persistenceEnabled) {
		const key = mockCacheKey(toolDef.name, input)
		const cached = cache.get(key)
		if (cached !== undefined) {
			return cached
		}
	}

	const { getUtilityLlmProfile } = await import('../../data/settings')
	const profile = getUtilityLlmProfile('toolMock')
	if (!profile) {
		throw new Error(
			'No utility LLM profile configured for tool mocking. Set one in Settings -> Utility LLM.',
		)
	}

	const model = await getUtilityModel(profile)

	const systemParts = [
		`You are simulating a tool called "${toolDef.name}".`,
		`Description: ${toolDef.description}`,
		'',
		'You must respond with a realistic tool response based on the provided reference data and input parameters.',
	]

	if (llmConfig.outputSchema) {
		systemParts.push('Your response must conform to the output schema provided.')
	}

	if (llmConfig.persistenceEnabled) {
		systemParts.push(
			'',
			'## Persistence',
			'You have access to a named persistence store shared across tool calls within this trial.',
			'Use the persistence tools to read/write state before producing your final response.',
			'When you are done, respond with the final JSON tool response.',
		)
		if (llmConfig.persistenceHint) {
			systemParts.push('', 'Persistence hint:', llmConfig.persistenceHint)
		}
	}

	if (llmConfig.systemPromptAddendum) {
		systemParts.push('', llmConfig.systemPromptAddendum)
	}

	if (llmConfig.referenceData) {
		systemParts.push('', '## Reference Data', llmConfig.referenceData)
	}

	if (llmConfig.outputSchema) {
		systemParts.push('', '## Output Schema', JSON.stringify(llmConfig.outputSchema, null, 2))
	}

	const system = systemParts.join('\n')
	const userParts: string[] = []
	if (llmConfig.promptPrefix) {
		userParts.push(llmConfig.promptPrefix, '')
	}
	userParts.push('The tool was called with the following input:')
	userParts.push(JSON.stringify(input, null, 2))
	userParts.push(
		'',
		'Respond ONLY with the JSON tool response. No explanation, no markdown fences.',
	)

	const prompt = userParts.join('\n')
	const callStart = Date.now()

	let result: unknown
	let inputTokens = 0
	let outputTokens = 0
	let rawResponseMessages: unknown[] = []
	let rawSteps: unknown[] = []

	if (llmConfig.persistenceEnabled) {
		const persistenceTools = buildPersistenceTools(mockPersistence)
		const generation = await generateText({
			model,
			system,
			prompt,
			tools: persistenceTools,
			stopWhen: stepCountIs(10),
			temperature: profile.temperature,
			...(profile.maxTokens ? { maxOutputTokens: profile.maxTokens } : {}),
		})
		try {
			result = JSON.parse(generation.text)
		} catch {
			result = generation.text
		}
		inputTokens = generation.usage?.inputTokens ?? 0
		outputTokens = generation.usage?.outputTokens ?? 0
		rawResponseMessages = generation.response.messages as unknown[]
		rawSteps = generation.steps as unknown[]
	} else if (llmConfig.outputSchema) {
		const normalizedOutput = normalizeOutputSchema(llmConfig.outputSchema)
		const generation = await generateObject({
			model,
			schema: jsonSchema(normalizedOutput),
			system,
			prompt,
			temperature: profile.temperature,
			...(profile.maxTokens ? { maxOutputTokens: profile.maxTokens } : {}),
		})
		result = stripSyntheticNulls(generation.object, llmConfig.outputSchema)
		inputTokens = generation.usage?.inputTokens ?? 0
		outputTokens = generation.usage?.outputTokens ?? 0
	} else {
		const generation = await generateText({
			model,
			system,
			prompt,
			temperature: profile.temperature,
			...(profile.maxTokens ? { maxOutputTokens: profile.maxTokens } : {}),
		})
		try {
			result = JSON.parse(generation.text)
		} catch {
			result = generation.text
		}
		inputTokens = generation.usage?.inputTokens ?? 0
		outputTokens = generation.usage?.outputTokens ?? 0
		rawResponseMessages = generation.response.messages as unknown[]
		rawSteps = generation.steps as unknown[]
	}

	const latencyMs = Date.now() - callStart
	const processedMessages = extractMessages(rawResponseMessages)
	const processedSteps = rawSteps.length > 0 ? extractSteps(rawSteps, processedMessages, 0) : []

	utilityLlmCalls.push({
		purpose: 'toolMock',
		...(toolCallId ? { toolCallId } : {}),
		toolName: toolDef.name,
		systemPrompt: system,
		userPrompt: prompt,
		assistantResponse: typeof result === 'string' ? result : JSON.stringify(result),
		inputTokens,
		outputTokens,
		latencyMs,
		...(processedMessages.length > 0 ? { messages: processedMessages } : {}),
		...(processedSteps.length > 0 ? { steps: processedSteps } : {}),
	})

	if (!llmConfig.persistenceEnabled) {
		cache.set(mockCacheKey(toolDef.name, input), result)
	}

	return result
}

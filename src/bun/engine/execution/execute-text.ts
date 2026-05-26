import { generateText } from 'ai'
import { type HarnessConfig, getProviderModel } from '../provider-registry'
import type { ToolCallTelemetry } from '../telemetry'
import { TelemetryCollector } from '../telemetry'

export interface HarnessResult {
	responseText: string
	toolCalls: ToolCallTelemetry[]
	stepCount: number
	totalTokens: number
	promptTokens: number
	completionTokens: number
	latencyMs: number
	finishReason: string
	steps: unknown[]
	responseMessages: unknown[]
	reasoning: string | null
	effectiveSystemPrompt: string | null
	utilityLlmCalls?: import('../mock-runtime').UtilityLlmCall[]
	mockPersistence?: Map<string, string>
}

export function reasoningSpread(config: HarnessConfig) {
	if (config.reasoning && config.reasoning !== 'provider-default') {
		return {
			reasoning: config.reasoning as 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh',
		}
	}
	return {}
}

export function optionalConfigSpread(config: HarnessConfig) {
	return {
		...(config.maxTokens ? { maxOutputTokens: config.maxTokens } : {}),
		...(config.topP !== undefined ? { topP: config.topP } : {}),
		...reasoningSpread(config),
	}
}

export async function generateSimpleText(
	config: HarnessConfig,
	prompt: string,
	systemPrompt?: string,
): Promise<HarnessResult> {
	const telemetry = new TelemetryCollector()
	telemetry.start()

	const model = await getProviderModel(config)
	const result = await generateText({
		model,
		prompt,
		...(systemPrompt ? { system: systemPrompt } : {}),
		temperature: config.temperature,
		...optionalConfigSpread(config),
	})

	return {
		responseText: result.text,
		toolCalls: [],
		stepCount: 1,
		totalTokens: result.usage.totalTokens ?? 0,
		promptTokens: result.usage.inputTokens ?? 0,
		completionTokens: result.usage.outputTokens ?? 0,
		latencyMs: telemetry.getElapsedMs(),
		finishReason: result.finishReason,
		steps: result.steps,
		responseMessages: result.response.messages,
		reasoning: result.reasoningText ?? null,
		effectiveSystemPrompt: systemPrompt ?? null,
	}
}

import type { ResolvedToolDef } from '../tool-runtime'
import { type UtilityLlmCall, executeLlmDefault } from './execute-llm-default'

export async function evaluateMockResponse(
	toolDef: ResolvedToolDef,
	validatedInput: unknown,
	cache: Map<string, unknown>,
	utilityLlmCalls: UtilityLlmCall[],
	mockPersistence: Map<string, string>,
	toolCallId?: string,
): Promise<unknown> {
	const config = toolDef.mockResponse
	if (!config) {
		return {
			success: true,
			toolName: toolDef.name,
			receivedInput: validatedInput,
		}
	}

	for (const rule of config.rules) {
		try {
			const condition = new Function('input', 'toolName', 'store', `return (${rule.condition})`)
			if (condition(validatedInput, toolDef.name, mockPersistence)) {
				if (rule.persistenceOps) {
					for (const operation of rule.persistenceOps) {
						try {
							const evaluatedKey =
								operation.keyMode === 'expression'
									? new Function('input', 'toolName', 'store', `return (${operation.key})`)(
											validatedInput,
											toolDef.name,
											mockPersistence,
										)
									: operation.key
							const evaluatedContent =
								operation.contentMode === 'expression'
									? new Function('input', 'toolName', 'store', `return (${operation.content})`)(
											validatedInput,
											toolDef.name,
											mockPersistence,
										)
									: operation.content
							const key = String(evaluatedKey)
							const content = String(evaluatedContent)
							if (operation.mode === 'replace') {
								mockPersistence.set(key, content)
							} else if (operation.mode === 'append') {
								mockPersistence.set(key, (mockPersistence.get(key) ?? '') + content)
							} else if (operation.mode === 'prepend') {
								mockPersistence.set(key, content + (mockPersistence.get(key) ?? ''))
							}
						} catch {
							// ignore malformed persistence expressions
						}
					}
				}

				if (rule.responseMode === 'expression') {
					try {
						const response = new Function('input', 'toolName', 'store', `return (${rule.response})`)
						return response(validatedInput, toolDef.name, mockPersistence)
					} catch {
						return rule.response
					}
				}

				return rule.response
			}
		} catch {
			// ignore malformed rule conditions
		}
	}

	if (config.defaultResponseType === 'llm' && config.llmDefaultConfig) {
		return executeLlmDefault(
			toolDef,
			validatedInput,
			cache,
			utilityLlmCalls,
			mockPersistence,
			toolCallId,
		)
	}

	const raw = config.defaultResponse ?? {
		success: true,
		toolName: toolDef.name,
		receivedInput: validatedInput,
	}
	if (config.defaultResponseMode === 'expression') {
		try {
			const response = new Function('input', 'toolName', 'store', `return (${raw})`)
			return response(validatedInput, toolDef.name, mockPersistence)
		} catch {
			return raw
		}
	}

	return raw
}

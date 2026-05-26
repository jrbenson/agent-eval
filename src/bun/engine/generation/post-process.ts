import type { GeneratableEntityType } from './types'

function tryParseJson(value: unknown) {
	if (typeof value !== 'string') {
		return value
	}
	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}

function postProcessToolDefinition(result: Record<string, unknown>) {
	const parameters =
		typeof result.parameters === 'string' ? tryParseJson(result.parameters) : result.parameters

	let defaultResponse: unknown = { success: true }
	if (typeof result.mockDefaultResponse === 'string') {
		defaultResponse = tryParseJson(result.mockDefaultResponse)
	}

	const rules: unknown[] = []
	if (Array.isArray(result.mockRules)) {
		for (const rule of result.mockRules as Record<string, unknown>[]) {
			const parsed = { ...rule }
			parsed.response = tryParseJson(parsed.response)
			rules.push(parsed)
		}
	}

	return {
		...result,
		parameters,
		defaultResponseType: result.mockDefaultResponseType ?? 'static',
		defaultResponse,
		rules,
	}
}

function postProcessTask(result: Record<string, unknown>) {
	if (!Array.isArray(result.goalConditions)) {
		return result
	}

	return {
		...result,
		goalConditions: (result.goalConditions as Record<string, unknown>[]).map((condition) => ({
			...condition,
			inputSubset: tryParseJson(condition.inputSubset),
			schema: tryParseJson(condition.schema),
			subset: tryParseJson(condition.subset),
		})),
	}
}

function postProcessToolMockResponse(result: Record<string, unknown>) {
	return {
		...result,
		defaultResponse: tryParseJson(result.defaultResponse),
		rules: Array.isArray(result.rules)
			? (result.rules as Record<string, unknown>[]).map((rule) => ({
					...rule,
					response: tryParseJson(rule.response),
				}))
			: result.rules,
	}
}

export function postProcessGeneratedResult(
	entityType: GeneratableEntityType,
	result: Record<string, unknown>,
) {
	if (entityType === 'toolDefinition') {
		const { defaultResponseType, defaultResponse, rules, ...rest } =
			postProcessToolDefinition(result)

		return {
			...rest,
			mockResponse: {
				defaultResponseType,
				defaultResponse,
				rules,
			},
		}
	}
	if (entityType === 'task') {
		return postProcessTask(result)
	}
	if (entityType === 'toolMockResponse') {
		return postProcessToolMockResponse(result)
	}

	return result
}

import type { TaskGoalConditionResult, TaskTrialAnalysisResult } from '../../shared/rpc-types'
import type { GoalCondition } from '../../shared/schemas/task.schema'
import type { TrialData } from '../../shared/schemas/trial.schema'
import { validateToolInputFromSchema } from './validation'

type JsonParseResult = { ok: true; value: unknown } | { ok: false; reason: string }

type ToolCallRecord = {
	name: string
	input: unknown
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepExactMatch(expected: unknown, actual: unknown): boolean {
	if (Array.isArray(expected)) {
		if (!Array.isArray(actual) || actual.length !== expected.length) return false
		return expected.every((item, index) => deepExactMatch(item, actual[index]))
	}

	if (isPlainObject(expected)) {
		if (!isPlainObject(actual)) return false
		const expectedKeys = Object.keys(expected)
		const actualKeys = Object.keys(actual)
		if (expectedKeys.length !== actualKeys.length) return false
		return expectedKeys.every(
			(key) => actualKeys.includes(key) && deepExactMatch(expected[key], actual[key]),
		)
	}

	return Object.is(expected, actual)
}

export function deepSubsetMatch(expected: unknown, actual: unknown): boolean {
	if (Array.isArray(expected)) {
		return deepExactMatch(expected, actual)
	}

	if (isPlainObject(expected)) {
		if (!isPlainObject(actual)) return false
		return Object.keys(expected).every(
			(key) => Object.hasOwn(actual, key) && deepSubsetMatch(expected[key], actual[key]),
		)
	}

	return Object.is(expected, actual)
}

function getFinalAssistantText(trial: TrialData): string | null {
	for (let index = trial.messages.length - 1; index >= 0; index--) {
		const message = trial.messages[index]
		if (message?.role !== 'assistant') continue
		if (typeof message.content === 'string') return message.content
	}
	return null
}

function parseFinalAssistantJson(trial: TrialData): JsonParseResult {
	const text = getFinalAssistantText(trial)
	if (!text?.trim()) {
		return { ok: false, reason: 'final assistant output was empty' }
	}

	try {
		return { ok: true, value: JSON.parse(text) }
	} catch {
		return { ok: false, reason: 'final output was not valid JSON' }
	}
}

function collectToolCalls(trial: TrialData): ToolCallRecord[] {
	const validationById = new Map(
		(trial.toolValidations ?? []).map((validation) => [validation.toolCallId, validation]),
	)

	const calls: ToolCallRecord[] = []
	for (const message of trial.messages) {
		if (message.role !== 'assistant' || !message.toolCalls) continue
		for (const toolCall of message.toolCalls) {
			const validation = validationById.get(toolCall.id)
			calls.push({
				name: toolCall.name,
				input: validation?.validatedInput ?? toolCall.input,
			})
		}
	}

	return calls
}

export function evaluateGoalCondition(
	condition: GoalCondition,
	trial: TrialData,
	index: number,
): TaskGoalConditionResult {
	switch (condition.type) {
		case 'string_match': {
			const text = getFinalAssistantText(trial)
			if (!text) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: 'no assistant text output to evaluate',
				}
			}

			const haystack = condition.caseSensitive ? text : text.toLowerCase()
			const needle = condition.caseSensitive ? condition.pattern : condition.pattern.toLowerCase()
			const passed = haystack.includes(needle)
			return {
				index,
				type: condition.type,
				passed,
				reason: passed
					? `assistant output contained ${JSON.stringify(condition.pattern)}`
					: `assistant output did not contain ${JSON.stringify(condition.pattern)}`,
			}
		}

		case 'regex': {
			const text = getFinalAssistantText(trial)
			if (!text) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: 'no assistant text output to evaluate',
				}
			}

			try {
				const regex = new RegExp(condition.pattern)
				const passed = regex.test(text)
				return {
					index,
					type: condition.type,
					passed,
					reason: passed
						? `assistant output matched /${condition.pattern}/`
						: `assistant output did not match /${condition.pattern}/`,
				}
			} catch {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: `invalid regex pattern: ${condition.pattern}`,
				}
			}
		}

		case 'tool_called': {
			const matchingCalls = collectToolCalls(trial).filter(
				(call) => call.name === condition.toolName,
			)

			if (matchingCalls.length === 0) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: `tool ${condition.toolName} was never called`,
				}
			}

			if (!condition.inputSubset) {
				return {
					index,
					type: condition.type,
					passed: true,
					reason: `tool ${condition.toolName} was called`,
				}
			}

			const passed = matchingCalls.some((call) =>
				deepSubsetMatch(condition.inputSubset, call.input),
			)
			return {
				index,
				type: condition.type,
				passed,
				reason: passed
					? `tool ${condition.toolName} matched inputSubset`
					: `tool ${condition.toolName} was called, but no call matched inputSubset`,
			}
		}

		case 'schema_match': {
			const parsed = parseFinalAssistantJson(trial)
			if (!parsed.ok) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: parsed.reason,
				}
			}

			const validation = validateToolInputFromSchema(parsed.value, condition.schema)
			return {
				index,
				type: condition.type,
				passed: validation.passed,
				reason: validation.passed
					? 'final output matched schema'
					: (validation.errors?.join('; ') ?? 'final output did not match schema'),
			}
		}

		case 'output_subset': {
			const parsed = parseFinalAssistantJson(trial)
			if (!parsed.ok) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: parsed.reason,
				}
			}

			if (!isPlainObject(parsed.value)) {
				return {
					index,
					type: condition.type,
					passed: false,
					reason: 'final output was not a JSON object',
				}
			}

			const passed = deepSubsetMatch(condition.subset, parsed.value)
			return {
				index,
				type: condition.type,
				passed,
				reason: passed ? 'final output matched subset' : 'final output did not match subset',
			}
		}
	}
}

export function evaluateGoalConditions(
	conditions: GoalCondition[],
	trial: TrialData,
	trialId: string,
	agentConfigId: string,
): TaskTrialAnalysisResult {
	const conditionResults = conditions.map((condition, index) =>
		evaluateGoalCondition(condition, trial, index),
	)
	return {
		trialId,
		agentConfigId,
		goalMet: conditionResults.every((result) => result.passed),
		conditionResults,
	}
}

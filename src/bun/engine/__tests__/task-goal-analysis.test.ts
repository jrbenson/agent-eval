import { describe, expect, it } from 'bun:test'
import type { GoalCondition } from '../../../shared/schemas/task.schema'
import type { TrialData } from '../../../shared/schemas/trial.schema'
import {
	deepSubsetMatch,
	evaluateGoalCondition,
	evaluateGoalConditions,
} from '../task-analysis-core'

function createTrial(overrides: Partial<TrialData> = {}): TrialData {
	return {
		trialId: 'trial-1',
		runId: 'run-1',
		agent: {
			provider: 'openai',
			model: 'gpt-5',
			temperature: 0,
		},
		scenarioType: 'task',
		scenarioId: 'task-1',
		messages: [
			{
				role: 'assistant',
				content: '{"weather":{"location":"New York","unit":"F"}}',
				toolCalls: [
					{
						id: 'tool-1',
						name: 'get_weather',
						input: { location: 'New York', unit: 'F' },
					},
				],
			},
		],
		steps: [],
		toolValidations: [
			{
				toolCallId: 'tool-1',
				toolName: 'get_weather',
				validatedInput: { location: 'New York', unit: 'F' },
				validationPassed: true,
				validationErrors: [],
				durationMs: 1,
			},
		],
		metrics: {
			totalTokens: 10,
			promptTokens: 5,
			completionTokens: 5,
			totalLatencyMs: 100,
			stepCount: 1,
			finishReason: 'stop',
		},
		status: 'completed',
		createdAt: '2026-05-05T00:00:00.000Z',
		...overrides,
	}
}

describe('task goal analysis', () => {
	it('covers subset matching and broad goal evaluation outcomes', () => {
		expect(
			deepSubsetMatch(
				{ weather: { location: 'New York' } },
				{ weather: { location: 'New York', unit: 'F' }, other: true },
			),
		).toBe(true)
		expect(deepSubsetMatch({ location: 'Boston' }, { location: 'New York' })).toBe(false)
		expect(deepSubsetMatch([{ a: 1 }], [{ a: 1, b: 2 }])).toBe(false)

		const trial = createTrial()
		expect(
			evaluateGoalCondition(
				{
					type: 'tool_called',
					toolName: 'get_weather',
					inputSubset: { location: 'New York' },
				},
				trial,
				0,
			).passed,
		).toBe(true)

		const invalidJsonResult = evaluateGoalCondition(
			{ type: 'output_subset', subset: { weather: { location: 'New York' } } },
			createTrial({ messages: [{ role: 'assistant', content: 'not-json' }] }),
			0,
		)
		expect(invalidJsonResult.passed).toBe(false)
		expect(invalidJsonResult.reason).toContain('not valid JSON')

		expect(
			evaluateGoalCondition(
				{ type: 'output_subset', subset: { weather: { location: 'New York' } } },
				trial,
				0,
			).passed,
		).toBe(true)

		const conditions: GoalCondition[] = [
			{
				type: 'tool_called',
				toolName: 'get_weather',
				inputSubset: { location: 'New York' },
			},
			{ type: 'string_match', pattern: 'New York', caseSensitive: false },
		]

		expect(evaluateGoalConditions(conditions, trial, 'trial-1', 'agent-1').goalMet).toBe(true)
		expect(
			evaluateGoalConditions(
				[...conditions, { type: 'string_match', pattern: 'Boston', caseSensitive: false }],
				trial,
				'trial-1',
				'agent-1',
			).goalMet,
		).toBe(false)
	})
})

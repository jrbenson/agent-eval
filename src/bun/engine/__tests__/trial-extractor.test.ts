import { describe, expect, it } from 'bun:test'
import type { TrialMessage } from '../../../shared/schemas/trial.schema'
import { extractSteps, extractTrialData } from '../trial-extractor'

function createAssistantMessage(content: string): TrialMessage {
	return {
		role: 'assistant',
		content,
	}
}

describe('trial extractor', () => {
	it('assigns trailing response messages to the final step when step counts stop short', () => {
		const responseMessages = [
			createAssistantMessage('tool call'),
			{
				role: 'tool',
				content: '{"ok":true}',
				toolResultFor: 'call-1',
				toolName: 'search',
			} satisfies TrialMessage,
			createAssistantMessage('follow up'),
			{
				role: 'tool',
				content: '{"done":true}',
				toolResultFor: 'call-2',
				toolName: 'save',
			} satisfies TrialMessage,
			createAssistantMessage('final answer'),
		]

		const steps = extractSteps(
			[
				{
					response: { messages: [{}, {}] },
					usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
					finishReason: 'tool-calls',
				},
				{
					response: { messages: [{}, {}, {}] },
					usage: { promptTokens: 12, completionTokens: 6, totalTokens: 18 },
					finishReason: 'stop',
				},
			],
			responseMessages,
		)

		expect(steps).toHaveLength(2)
		expect(steps[0]?.messageIndices).toEqual([0, 1])
		expect(steps[1]?.messageIndices).toEqual([2, 3, 4])
	})

	it('builds trial data with prompt offsets, tool results, validations, and persistence snapshots', () => {
		const trial = extractTrialData(
			{
				responseText: 'Final summary',
				toolCalls: [
					{
						toolCallId: 'call-1',
						toolName: 'search',
						input: { rawQuery: 'docs' },
						validatedInput: { query: 'docs' },
						output: { matches: 2 },
						durationMs: 12,
						validationPassed: true,
						validationErrors: null,
						error: null,
					},
				],
				stepCount: 1,
				totalTokens: 30,
				promptTokens: 20,
				completionTokens: 10,
				latencyMs: 50,
				finishReason: 'stop',
				steps: [
					{
						response: { messages: [{}, {}, {}] },
						usage: { inputTokens: 20, outputTokens: 10, totalTokens: 30 },
						finishReason: 'stop',
					},
				],
				responseMessages: [
					{
						role: 'assistant',
						content: [
							{
								type: 'tool-call',
								toolCallId: 'call-1',
								toolName: 'search',
								input: { query: 'docs' },
							},
						],
					},
					{
						role: 'tool',
						content: [
							{
								toolCallId: 'call-1',
								toolName: 'search',
								output: { matches: 2 },
							},
						],
					},
					{
						role: 'assistant',
						content: [{ type: 'text', text: 'Final summary' }],
					},
				],
				reasoning: null,
				effectiveSystemPrompt: 'System prompt',
				mockPersistence: new Map([['file:README.md', 'seed content']]),
			},
			{
				trialId: 'trial-1',
				runId: 'run-1',
				agentConfig: {
					provider: 'openai',
					model: 'mock-model',
					temperature: 0,
				},
				sourceParams: {
					provider: 'openai',
					model: 'mock-model',
					temperature: 0,
					repetitions: 1,
				},
				scenarioType: 'task',
				scenarioId: 'task-1',
				userPrompt: 'Summarize the docs',
				systemPrompt: 'System prompt',
			},
		)

		expect(trial.messages).toEqual([
			{ role: 'system', content: 'System prompt' },
			{ role: 'user', content: 'Summarize the docs' },
			{
				role: 'assistant',
				content: null,
				toolCalls: [{ id: 'call-1', name: 'search', input: { query: 'docs' } }],
			},
			{
				role: 'tool',
				content: '{"matches":2}',
				toolResultFor: 'call-1',
				toolName: 'search',
			},
			{ role: 'assistant', content: 'Final summary' },
		])
		expect(trial.steps[0]?.messageIndices).toEqual([2, 3, 4])
		expect(trial.toolValidations).toEqual([
			{
				toolCallId: 'call-1',
				toolName: 'search',
				validatedInput: { query: 'docs' },
				validationPassed: true,
				validationErrors: [],
				durationMs: 12,
			},
		])
		expect(trial.persistenceSnapshot).toEqual([{ name: 'file:README.md', content: 'seed content' }])
	})
})

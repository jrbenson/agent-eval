import { describe, expect, it } from 'bun:test'
import type { LanguageModelV3GenerateResult } from '@ai-sdk/provider'
import { MockLanguageModelV3 } from 'ai/test'
import { createEvaluation } from '../../bun/data/evaluations'
import { getRun, getTrial, getTrialSummaries } from '../../bun/data/runs'
import { createTask } from '../../bun/data/tasks'
import { runEvaluation } from '../../bun/engine/runner'
import { analyzeTaskRun } from '../../bun/engine/task-analysis'
import { materializePresetTaskDependencies } from '../fixtures/preset-materialization'
import { withTestRuntime } from '../fixtures/test-runtime'

function createUsage(
	inputTokens: number,
	outputTokens: number,
): LanguageModelV3GenerateResult['usage'] {
	return {
		inputTokens: {
			total: inputTokens,
			noCache: inputTokens,
			cacheRead: undefined,
			cacheWrite: undefined,
		},
		outputTokens: {
			total: outputTokens,
			text: outputTokens,
			reasoning: undefined,
		},
	}
}

function toolCallStep(
	toolCalls: Array<{ toolCallId: string; toolName: string; input: Record<string, unknown> }>,
	usage: { input: number; output: number },
): LanguageModelV3GenerateResult {
	return {
		content: toolCalls.map((toolCall) => ({
			type: 'tool-call' as const,
			toolCallId: toolCall.toolCallId,
			toolName: toolCall.toolName,
			input: JSON.stringify(toolCall.input),
		})),
		finishReason: { unified: 'tool-calls', raw: 'tool-calls' },
		usage: createUsage(usage.input, usage.output),
		warnings: [],
	}
}

function textStep(
	text: string,
	usage: { input: number; output: number },
): LanguageModelV3GenerateResult {
	return {
		content: [{ type: 'text' as const, text }],
		finishReason: { unified: 'stop', raw: 'stop' },
		usage: createUsage(usage.input, usage.output),
		warnings: [],
	}
}

describe('preset-backed task flow', () => {
	it('runs a task through the real runner with preset tool, content, and skill sets', async () => {
		const scriptedSteps = [
			toolCallStep(
				[
					{
						toolCallId: 'call-load-skill',
						toolName: 'load_skill',
						input: { name: 'summarize' },
					},
				],
				{ input: 12, output: 4 },
			),
			toolCallStep(
				[
					{
						toolCallId: 'call-read-file',
						toolName: 'read_file',
						input: { path: 'README.md' },
					},
					{
						toolCallId: 'call-edit-file',
						toolName: 'edit_file',
						input: {
							path: 'summary.md',
							oldString: '',
							newString: 'Summary saved.',
						},
					},
				],
				{ input: 10, output: 6 },
			),
			textStep('Summary saved.', { input: 8, output: 3 }),
		]
		let generateCallIndex = 0
		const model = new MockLanguageModelV3({
			doGenerate: async () => {
				const step = scriptedSteps[generateCallIndex] ?? scriptedSteps[scriptedSteps.length - 1]
				generateCallIndex += 1
				return step
			},
		})

		await withTestRuntime({
			modelResolver: async () => model,
			run: async () => {
				const deps = materializePresetTaskDependencies()

				const { id: taskId } = createTask({
					label: 'Preset-backed summary task',
					taskPrompts: ['Load the summarization skill, read the README, and save a summary.'],
					toolRefs: [{ type: 'toolSet', toolSetId: deps.toolSetId }],
					contentRefs: [{ type: 'contentSet', contentSetId: deps.contentSetId }],
					skillRefs: [{ type: 'skillSet', skillSetId: deps.skillSetId }],
					goalConditions: [
						{
							type: 'tool_called',
							toolName: 'edit_file',
							inputSubset: { path: 'summary.md' },
						},
						{
							type: 'string_match',
							pattern: 'Summary saved.',
							caseSensitive: false,
						},
					],
				})

				const { id: evaluationId } = createEvaluation({
					label: 'Preset-backed summary eval',
					scenarioId: taskId,
					scenarioType: 'task',
					agentConfigs: [
						{
							provider: 'openai',
							model: 'mock-model',
							temperature: 0,
						},
					],
					concurrency: 1,
					maxSteps: 5,
				})

				const runId = await runEvaluation({
					runId: crypto.randomUUID(),
					evaluationId,
				})

				const run = getRun(runId)
				expect(run).not.toBeNull()
				expect(run?.status).toBe('completed')
				expect(run?.scenarioSnapshot.id).toBe(taskId)

				const summaries = getTrialSummaries(runId)
				expect(summaries).toHaveLength(1)
				expect(summaries[0]?.status).toBe('completed')

				const trial = getTrial(runId, summaries[0]!.trialId)
				expect(trial).not.toBeNull()
				expect(trial?.messages.some((message) => message.role === 'system')).toBe(true)
				expect(
					trial?.messages.some(
						(message) =>
							message.role === 'assistant' &&
							message.toolCalls?.some((toolCall) => toolCall.name === 'load_skill'),
					),
				).toBe(true)
				expect(
					trial?.messages.some(
						(message) =>
							message.role === 'assistant' &&
							message.toolCalls?.some((toolCall) => toolCall.name === 'edit_file'),
					),
				).toBe(true)
				expect(
					trial?.messages.some(
						(message) =>
							message.role === 'tool' &&
							message.toolName === 'load_skill' &&
							message.content?.includes('Summarization Skill'),
					),
				).toBe(true)

				expect(trial?.toolValidations).toHaveLength(2)
				expect(trial?.toolValidations?.map((validation) => validation.toolName)).toEqual([
					'read_file',
					'edit_file',
				])
				expect(trial?.persistenceSnapshot?.map((entry) => entry.name)).toEqual(
					expect.arrayContaining(['file:README.md', 'file:notes.txt', 'file:users.jsonl']),
				)

				const analysis = analyzeTaskRun(runId, 'current')
				expect(analysis).not.toBeNull()
				expect(analysis?.hasGoal).toBe(true)
				expect(analysis?.aggregates).toEqual([
					{
						agentConfigId: 'openai:mock-model',
						successCount: 1,
						failureCount: 0,
						total: 1,
					},
				])
				expect(analysis?.trials[0]?.goalMet).toBe(true)
				expect(analysis?.trials[0]?.conditionResults.every((condition) => condition.passed)).toBe(
					true,
				)
			},
		})
	})
})

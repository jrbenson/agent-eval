import { describe, expect, it } from 'bun:test'
import { withTestRuntime } from '../../../testing/fixtures/test-runtime'
import { createEvaluation, getEvaluation, updateEvaluation } from '../../data/evaluations'
import { createTask, getTask, updateTask } from '../../data/tasks'
import { computeEvaluationSignature, resolveRunAnalysisContext } from '../run-analysis-context'

describe('run analysis context', () => {
	it('separates analysis drift from evaluation drift while preserving current-source analysis', async () => {
		await withTestRuntime({
			run: () => {
				const { id: taskId } = createTask({
					label: 'Task under analysis',
					taskPrompts: ['Summarize the README'],
					toolRefs: [],
					contentRefs: [],
					skillRefs: [],
					goalConditions: [
						{
							type: 'string_match',
							pattern: 'done',
							caseSensitive: false,
						},
					],
				})

				const { id: evaluationId } = createEvaluation({
					label: 'Eval under analysis',
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

				const evaluationSnapshot = getEvaluation(evaluationId)
				const scenarioSnapshot = getTask(taskId)
				if (!evaluationSnapshot || !scenarioSnapshot) {
					throw new Error('Failed to create analysis context fixtures')
				}

				const run = {
					sourceEvaluationId: evaluationId,
					evaluationSnapshot,
					scenarioSnapshot,
					scenario: { id: taskId, type: 'task' as const },
					evaluationSignature: computeEvaluationSignature(evaluationSnapshot, scenarioSnapshot),
				}

				const baseline = resolveRunAnalysisContext(run, 'current')
				expect(baseline.analysis.source).toBe('current')
				expect(baseline.analysis.currentAvailable).toBe(true)
				expect(baseline.analysis.drift.kinds).toEqual([])

				updateTask(taskId, {
					goalConditions: [
						{
							type: 'string_match',
							pattern: 'complete',
							caseSensitive: false,
						},
					],
				})

				const analysisOnlyDrift = resolveRunAnalysisContext(run, 'current')
				expect(analysisOnlyDrift.analysis.drift.kinds).toEqual(['analysis-drift'])
				expect(analysisOnlyDrift.analysis.drift.details).toContain(
					'Current goal conditions differ from the snapshot.',
				)

				updateTask(taskId, { taskPrompts: ['Summarize the notes instead'] })
				updateEvaluation(evaluationId, {
					concurrency: 3,
					agentConfigs: [
						{
							provider: 'openai',
							model: 'mock-model',
							temperature: 0.4,
						},
					],
				})

				const fullDrift = resolveRunAnalysisContext(run, 'current')
				expect(fullDrift.analysis.source).toBe('current')
				expect(fullDrift.analysis.drift.kinds).toEqual(
					expect.arrayContaining(['analysis-drift', 'evaluation-drift']),
				)
				expect(fullDrift.analysis.drift.details).toEqual(
					expect.arrayContaining([
						'Current goal conditions differ from the snapshot.',
						'Current evaluation run settings differ from the snapshot.',
						'Current agent matrix differs from the snapshot.',
						'Current task prompt or task resources differ from the snapshot.',
					]),
				)
			},
		})
	})
})

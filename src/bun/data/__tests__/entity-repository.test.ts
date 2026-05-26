import { describe, expect, it } from 'bun:test'
import { withTestRuntime } from '../../../testing/fixtures/test-runtime'
import { getEvaluation } from '../evaluations'
import { writeJsonAtomic } from '../fs/json-store'
import { evaluationPath, toolDefPath } from '../paths'
import { createSurvey, listSurveys } from '../surveys'
import { getToolDefinition } from '../tools'

describe('entity repository integrations', () => {
	it('derives survey question counts from stored survey data', async () => {
		await withTestRuntime({
			run: () => {
				createSurvey({
					label: 'Agent feedback',
					questions: [
						{
							id: crypto.randomUUID(),
							text: 'How helpful was the answer?',
							responseFormat: 'likert',
						},
						{
							id: crypto.randomUUID(),
							text: 'What went well?',
							responseFormat: 'free_text',
						},
					],
					orderingStrategy: 'fixed',
				})

				const surveys = listSurveys()
				expect(surveys).toHaveLength(1)
				expect(surveys[0]?.questionCount).toBe(2)
			},
		})
	})

	it('normalizes legacy evaluation defaults on read', async () => {
		await withTestRuntime({
			run: () => {
				const now = new Date().toISOString()
				writeJsonAtomic(evaluationPath('legacy-evaluation'), {
					id: 'legacy-evaluation',
					label: 'Legacy evaluation',
					scenarioId: 'scenario-1',
					scenarioType: 'task',
					agentConfigs: [],
					concurrency: 3,
					createdAt: now,
					updatedAt: now,
				})

				const evaluation = getEvaluation('legacy-evaluation')
				expect(evaluation?.concurrency).toBe(3)
				expect(evaluation?.maxSteps).toBe(64)
				expect(evaluation?.toolSearchMode).toBe('keyword')
			},
		})
	})

	it('normalizes legacy tool definition defaults on read', async () => {
		await withTestRuntime({
			run: () => {
				const now = new Date().toISOString()
				writeJsonAtomic(toolDefPath('legacy-tool'), {
					id: 'legacy-tool',
					label: 'Legacy Tool',
					name: 'legacy_tool',
					description: 'Legacy tool definition',
					parameters: {
						type: 'object',
						properties: {},
					},
					mockResponse: {
						defaultResponse: { success: false },
					},
					createdAt: now,
					updatedAt: now,
				})

				const toolDef = getToolDefinition('legacy-tool')
				expect(toolDef?.core).toBe(false)
				expect(toolDef?.mockResponse.defaultResponseType).toBe('static')
				expect(toolDef?.mockResponse.defaultResponse).toEqual({
					success: false,
				})
				expect(toolDef?.mockResponse.rules).toEqual([])
			},
		})
	})
})

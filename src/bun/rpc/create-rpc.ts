import { BrowserView } from 'electrobun/bun'
import type { AppRPC } from '../../shared/rpc-types'
import {
	createContentSet,
	createContentSetFromPreset,
	deleteContentSet,
	getContentSet,
	listContentSets,
	updateContentSet,
} from '../data/content-sets'
import {
	createContent,
	createContentFromPreset,
	deleteContent,
	getContent,
	listContents,
	updateContent,
} from '../data/contents'
import {
	createEvaluation,
	deleteEvaluation,
	getEvaluation,
	listEvaluations,
	updateEvaluation,
} from '../data/evaluations'
import { generateFakeData } from '../data/fake-data'
import { listModels, validateApiKey } from '../data/providers'
import {
	findTrialSummary,
	getDashboardStats,
	getRun,
	getTrial,
	getTrialSummaries,
	listAllTrialSummaries,
	listRuns,
} from '../data/runs'
import {
	deleteAgentConfig,
	getApiKeyStatus,
	getProviderConfig,
	getUtilityLlmProfile,
	listAgentConfigs,
	listProviderStatus,
	listUtilityLlmProfiles,
	saveAgentConfig,
	setApiKey,
	setKeyValidationStatus,
	setProviderConfig,
	setUtilityLlmProfile,
} from '../data/settings'
import {
	createSkillSet,
	createSkillSetFromPreset,
	deleteSkillSet,
	getSkillSet,
	listSkillSets,
	updateSkillSet,
} from '../data/skill-sets'
import {
	createSkill,
	createSkillFromPreset,
	deleteSkill,
	getSkill,
	listSkills,
	updateSkill,
} from '../data/skills'
import { createSurvey, deleteSurvey, getSurvey, listSurveys, updateSurvey } from '../data/surveys'
import { createTask, deleteTask, getTask, listTasks, updateTask } from '../data/tasks'
import {
	createToolSet,
	createToolSetFromPreset,
	deleteToolSet,
	exportToolSet,
	getToolSet,
	listToolSets,
	updateToolSet,
} from '../data/tool-sets'
import {
	analyzeToolImport,
	commitToolImport,
	createToolDefinition,
	createToolFromPreset,
	deleteToolDefinition,
	exportToolDefinition,
	getToolDefinition,
	listToolDefinitions,
	updateToolDefinition,
} from '../data/tools'
import { validateVariantCrossings } from '../engine/evaluation/variant-crossings'
import { generateBatchToolMocks, generateElement } from '../engine/generate-element'
import { resolveRunAnalysisContext } from '../engine/run-analysis-context'
import { cancelRun, runEvaluation } from '../engine/runner'
import { extractSurveyAnswers } from '../engine/survey-extractor'
import { analyzeTaskRun } from '../engine/task-analysis'
import {
	listPresetContentSets,
	listPresetContents,
	listPresetSkillSets,
	listPresetSkills,
	listPresetToolSets,
	listPresetTools,
} from '../presets'
import { broadcastMessage, closePopoutByWindowId, openPopout } from '../windows/registry'

function notifyChange(
	entityType: string,
	entityId: string,
	action: 'created' | 'updated' | 'deleted',
) {
	broadcastMessage('dataChanged', { entityType, entityId, action })
}

function mut<T extends { id: string }>(
	entityType: string,
	action: 'created' | 'updated' | 'deleted',
	fn: () => T,
): T {
	const result = fn()
	notifyChange(entityType, result.id, action)
	return result
}

function mutUpdate(entityType: string, id: string, fn: () => unknown) {
	fn()
	notifyChange(entityType, id, 'updated')
	return { success: true as const }
}

function mutDelete(entityType: string, id: string, fn: () => void) {
	fn()
	notifyChange(entityType, id, 'deleted')
	return { success: true as const }
}

export function createRpc() {
	return BrowserView.defineRPC<AppRPC>({
		maxRequestTime: 120000,
		handlers: {
			requests: {
				ping: () => ({ pong: true as const, timestamp: Date.now() }),

				createSurvey: (params) => mut('survey', 'created', () => createSurvey(params)),
				getSurvey: ({ id }) => getSurvey(id),
				listSurveys: () => listSurveys(),
				updateSurvey: ({ id, ...rest }) => mutUpdate('survey', id, () => updateSurvey(id, rest)),
				deleteSurvey: ({ id }) => mutDelete('survey', id, () => deleteSurvey(id)),

				createTask: (params) => mut('task', 'created', () => createTask(params)),
				getTask: ({ id }) => getTask(id),
				listTasks: () => listTasks(),
				updateTask: ({ id, ...rest }) => mutUpdate('task', id, () => updateTask(id, rest)),
				deleteTask: ({ id }) => mutDelete('task', id, () => deleteTask(id)),

				createToolDefinition: (params) =>
					mut('toolDefinition', 'created', () => createToolDefinition(params)),
				getToolDefinition: ({ id }) => getToolDefinition(id),
				listToolDefinitions: () => listToolDefinitions(),
				updateToolDefinition: ({ id, ...rest }) =>
					mutUpdate('toolDefinition', id, () => updateToolDefinition(id, rest)),
				deleteToolDefinition: ({ id }) =>
					mutDelete('toolDefinition', id, () => deleteToolDefinition(id)),

				createToolSet: (params) => mut('toolSet', 'created', () => createToolSet(params)),
				getToolSet: ({ id }) => getToolSet(id),
				listToolSets: () => listToolSets(),
				updateToolSet: ({ id, ...rest }) => mutUpdate('toolSet', id, () => updateToolSet(id, rest)),
				deleteToolSet: ({ id }) => mutDelete('toolSet', id, () => deleteToolSet(id)),

				createContent: (params) => mut('content', 'created', () => createContent(params)),
				getContent: ({ id }) => getContent(id),
				listContents: () => listContents(),
				updateContent: ({ id, ...rest }) => mutUpdate('content', id, () => updateContent(id, rest)),
				deleteContent: ({ id }) => mutDelete('content', id, () => deleteContent(id)),

				createContentSet: (params) => mut('contentSet', 'created', () => createContentSet(params)),
				getContentSet: ({ id }) => getContentSet(id),
				listContentSets: () => listContentSets(),
				updateContentSet: ({ id, ...rest }) =>
					mutUpdate('contentSet', id, () => updateContentSet(id, rest)),
				deleteContentSet: ({ id }) => mutDelete('contentSet', id, () => deleteContentSet(id)),

				createSkill: (params) => mut('skill', 'created', () => createSkill(params)),
				getSkill: ({ id }) => getSkill(id),
				listSkills: () => listSkills(),
				updateSkill: ({ id, ...rest }) => mutUpdate('skill', id, () => updateSkill(id, rest)),
				deleteSkill: ({ id }) => mutDelete('skill', id, () => deleteSkill(id)),

				createSkillSet: (params) => mut('skillSet', 'created', () => createSkillSet(params)),
				getSkillSet: ({ id }) => getSkillSet(id),
				listSkillSets: () => listSkillSets(),
				updateSkillSet: ({ id, ...rest }) =>
					mutUpdate('skillSet', id, () => updateSkillSet(id, rest)),
				deleteSkillSet: ({ id }) => mutDelete('skillSet', id, () => deleteSkillSet(id)),

				listPresetTools: () => {
					return listPresetTools().map(({ mockResponse, ...rest }) => rest)
				},
				listPresetToolSets: () => listPresetToolSets(),
				copyPresetTool: ({ presetId }) => {
					const result = createToolFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('toolDefinition', result.id, 'created')
					return result
				},
				copyPresetToolSet: ({ presetId }) => {
					const result = createToolSetFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('toolSet', result.id, 'created')
					return result
				},

				listPresetContents: () => listPresetContents(),
				listPresetContentSets: () => listPresetContentSets(),
				copyPresetContent: ({ presetId }) => {
					const result = createContentFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('content', result.id, 'created')
					return result
				},
				copyPresetContentSet: ({ presetId }) => {
					const result = createContentSetFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('contentSet', result.id, 'created')
					return result
				},

				listPresetSkills: () => listPresetSkills(),
				listPresetSkillSets: () => listPresetSkillSets(),
				copyPresetSkill: ({ presetId }) => {
					const result = createSkillFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('skill', result.id, 'created')
					return result
				},
				copyPresetSkillSet: ({ presetId }) => {
					const result = createSkillSetFromPreset(presetId)
					if (!result) {
						throw new Error(`Preset not found: ${presetId}`)
					}
					notifyChange('skillSet', result.id, 'created')
					return result
				},

				exportToolDefinition: ({ id, includeMockBehavior }) => {
					const data = exportToolDefinition(id, includeMockBehavior)
					if (!data) {
						throw new Error(`Tool not found: ${id}`)
					}
					return { json: JSON.stringify(data, null, 2) }
				},
				exportToolSet: ({ id, includeMockBehavior }) => {
					const data = exportToolSet(id, includeMockBehavior)
					if (!data) {
						throw new Error(`Tool set not found: ${id}`)
					}
					return { json: JSON.stringify(data, null, 2) }
				},
				analyzeToolImport: ({ json }) => {
					const parsed = JSON.parse(json)
					return analyzeToolImport(parsed)
				},
				commitToolImport: ({ json, toolSetLabel }) => {
					const parsed = JSON.parse(json)
					const { toolIds } = commitToolImport(parsed)

					for (const toolId of toolIds) {
						notifyChange('toolDefinition', toolId, 'created')
					}

					let toolSetId: string | undefined
					if (toolSetLabel?.trim() && toolIds.length > 0) {
						const trimmed = toolSetLabel.trim()
						const existing = listToolSets().find((toolSet) => toolSet.label === trimmed)
						if (existing) {
							const newRefs = toolIds.map((id) => ({ toolDefinitionId: id }))
							updateToolSet(existing.id, {
								toolRefs: [...existing.toolRefs, ...newRefs],
							})
							toolSetId = existing.id
							notifyChange('toolSet', existing.id, 'updated')
						} else {
							const created = createToolSet({
								label: trimmed,
								toolRefs: toolIds.map((id) => ({ toolDefinitionId: id })),
							})
							toolSetId = created.id
							notifyChange('toolSet', created.id, 'created')
						}
					}

					return { toolIds, toolSetId }
				},

				saveAgentConfig: (params) => {
					const result = saveAgentConfig(params)
					notifyChange('agentConfig', result.id, 'updated')
					return result
				},
				listAgentConfigs: () => listAgentConfigs(),
				deleteAgentConfig: ({ id }) => mutDelete('agentConfig', id, () => deleteAgentConfig(id)),

				createEvaluation: (params) => mut('evaluation', 'created', () => createEvaluation(params)),
				getEvaluation: ({ id }) => getEvaluation(id),
				listEvaluations: () => listEvaluations(),
				updateEvaluation: ({ id, ...rest }) =>
					mutUpdate('evaluation', id, () => updateEvaluation(id, rest)),
				deleteEvaluation: ({ id }) => mutDelete('evaluation', id, () => deleteEvaluation(id)),

				// Bulk Delete
				bulkDeleteSurveys: ({ ids }) => {
					for (const id of ids) deleteSurvey(id)
					for (const id of ids) notifyChange('survey', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteTasks: ({ ids }) => {
					for (const id of ids) deleteTask(id)
					for (const id of ids) notifyChange('task', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteToolDefinitions: ({ ids }) => {
					for (const id of ids) deleteToolDefinition(id)
					for (const id of ids) notifyChange('toolDefinition', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteToolSets: ({ ids }) => {
					for (const id of ids) deleteToolSet(id)
					for (const id of ids) notifyChange('toolSet', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteContent: ({ ids }) => {
					for (const id of ids) deleteContent(id)
					for (const id of ids) notifyChange('content', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteContentSets: ({ ids }) => {
					for (const id of ids) deleteContentSet(id)
					for (const id of ids) notifyChange('contentSet', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteSkills: ({ ids }) => {
					for (const id of ids) deleteSkill(id)
					for (const id of ids) notifyChange('skill', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteSkillSets: ({ ids }) => {
					for (const id of ids) deleteSkillSet(id)
					for (const id of ids) notifyChange('skillSet', id, 'deleted')
					return { success: true as const }
				},
				bulkDeleteEvaluations: ({ ids }) => {
					for (const id of ids) deleteEvaluation(id)
					for (const id of ids) notifyChange('evaluation', id, 'deleted')
					return { success: true as const }
				},

				startRun: ({ evaluationId }) => {
					const definition = getEvaluation(evaluationId)
					if (!definition) {
						throw new Error(`Evaluation definition not found: ${evaluationId}`)
					}

					// Validate variant crossings if configured
					if (
						definition.variantCrossings &&
						definition.variantCrossings.length > 0 &&
						definition.scenarioType === 'task'
					) {
						const task = getTask(definition.scenarioId)
						if (!task) {
							throw new Error(`Task not found: ${definition.scenarioId}`)
						}
						const errors = validateVariantCrossings(task, definition.variantCrossings)
						if (errors.length > 0) {
							throw new Error(
								`Invalid variant crossings: ${errors.map((e) => e.message).join('; ')}`,
							)
						}
					}

					const runId = crypto.randomUUID()
					runEvaluation({
						runId,
						evaluationId,
						onProgress: (progress) => {
							broadcastMessage('evalProgress', progress)
						},
					})
						.then(() => {
							broadcastMessage('evalComplete', {
								runId,
								scenarioId: definition.scenarioId,
								success: true,
							})
						})
						.catch((err) => {
							console.error('[eval] Error:', err)
							broadcastMessage('evalComplete', {
								runId,
								scenarioId: definition.scenarioId,
								success: false,
							})
						})

					return { runId }
				},
				cancelRun: ({ runId }) => {
					const success = cancelRun(runId)
					if (success) {
						notifyChange('result', runId, 'updated')
					}
					return { success }
				},
				getRunStatus: ({ runId }) => {
					const run = getRun(runId)
					if (!run) {
						return {
							runId,
							scenarioId: '',
							sourceEvaluationId: '',
							evaluationLabel: null,
							status: 'pending' as const,
							completedRuns: 0,
							totalRuns: 0,
						}
					}

					const evaluation = getEvaluation(run.sourceEvaluationId)
					return {
						runId: run.id,
						scenarioId: run.scenario.id,
						scenarioType: (run.scenario.type ?? undefined) as 'survey' | 'task' | undefined,
						sourceEvaluationId: run.sourceEvaluationId,
						evaluationLabel: evaluation?.label ?? run.evaluationSnapshot.label ?? null,
						status: run.status as 'pending' | 'running' | 'completed' | 'failed' | 'cancelled',
						completedRuns: run.completedTrials,
						totalRuns: run.totalTrials,
					}
				},

				listRuns: ({ evaluationId }) => listRuns(evaluationId),
				getRun: ({ runId }) => getRun(runId),
				getRunResults: ({ runId }) => getTrialSummaries(runId),
				getRunResult: ({ id }) => findTrialSummary(id),
				getTrialData: ({ runId, trialId }) => getTrial(runId, trialId),
				getTaskRunAnalysis: ({ runId, analysisLens }) => analyzeTaskRun(runId, analysisLens),
				listRunResults: (params) => listAllTrialSummaries(params),
				extractSurveyRunAnswers: ({ runId, analysisLens }) => {
					const run = getRun(runId)
					if (!run) {
						return {
							analysis: {
								analysisLens,
								source: 'snapshot' as const,
								currentAvailable: false,
								currentUnavailableReason: 'Run not found.',
								drift: {
									kinds: [],
									details: [],
									detailsByKind: {
										'analysis-drift': [],
										'evaluation-drift': [],
									},
								},
							},
							extractions: [],
							questionOptions: [],
						}
					}

					const { analysis, currentScenario } = resolveRunAnalysisContext(run, analysisLens)
					const activeSurvey =
						analysis.source === 'current' ? currentScenario : run.scenarioSnapshot
					const surveyDef = activeSurvey as {
						questions?: Array<{
							id: string
							text: string
							options?: string[]
						}>
					}

					const summaries = getTrialSummaries(runId)
					const questions = surveyDef.questions ?? []
					const questionOptions = questions.flatMap((question) =>
						question.options && question.options.length > 0
							? [{ questionId: question.id, options: question.options }]
							: [],
					)

					const extractions = summaries
						.filter((summary) => summary.status === 'completed')
						.map((summary) => {
							const trial = getTrial(runId, summary.trialId)
							if (!trial) {
								return {
									trialId: summary.trialId,
									agentConfigId: summary.agentConfigId,
									answers: [],
								}
							}

							const messages = trial.messages.filter((message) => message.role !== 'system')
							const questionOrder = trial.questionOrder ?? []
							const questionResponses: {
								questionId: string
								questionText: string
								responseText: string
							}[] = []

							for (let index = 0; index < messages.length - 1; index += 2) {
								const userMessage = messages[index]
								const assistantMessage = messages[index + 1]
								if (userMessage?.role !== 'user' || assistantMessage?.role !== 'assistant') {
									continue
								}

								const questionIndex = Math.floor(index / 2)
								const originalIndex = questionOrder[questionIndex] ?? questionIndex
								const questionDef = questions[originalIndex]

								questionResponses.push({
									questionId: questionDef?.id ?? `q${questionIndex}`,
									questionText: questionDef?.text ?? userMessage.content ?? '',
									responseText: assistantMessage.content ?? '',
								})
							}

							const answers = extractSurveyAnswers(questionResponses, questions)
							return {
								trialId: summary.trialId,
								agentConfigId: summary.agentConfigId,
								answers,
							}
						})

					return {
						analysis,
						extractions,
						questionOptions,
					}
				},

				setApiKey: async ({ provider, apiKey }) => {
					const result = await setApiKey(provider, apiKey)
					try {
						const valid = await validateApiKey(provider)
						if (valid) {
							setKeyValidationStatus(provider, 'valid')
						} else {
							const config = getProviderConfig(provider)
							const needsConfig = provider === 'azure' && !config.resourceName
							setKeyValidationStatus(provider, needsConfig ? 'unvalidated' : 'invalid')
						}
					} catch {
						setKeyValidationStatus(provider, 'invalid')
					}
					return result
				},
				getApiKeyStatus: async ({ provider }) => getApiKeyStatus(provider),
				listProviderStatus: async () => listProviderStatus(),
				validateApiKey: async ({ provider }) => {
					const valid = await validateApiKey(provider)
					setKeyValidationStatus(provider, valid ? 'valid' : 'invalid')
					return { valid }
				},
				listModels: async ({ provider }) => listModels(provider),
				setProviderConfig: async ({ provider, config }) => {
					const result = setProviderConfig(provider, config)
					try {
						const valid = await validateApiKey(provider)
						setKeyValidationStatus(provider, valid ? 'valid' : 'invalid')
					} catch {
						// ignore, validation is optional here
					}
					return result
				},
				getProviderConfig: ({ provider }) => getProviderConfig(provider),

				openDataDir: async () => {
					const { openDataDir } = await import('../data/paths')
					openDataDir()
					return { success: true }
				},
				getDashboardStats: () => getDashboardStats(),

				getUtilityLlmProfile: ({ purpose }) => getUtilityLlmProfile(purpose),
				setUtilityLlmProfile: ({ purpose, profile }) => setUtilityLlmProfile(purpose, profile),
				listUtilityLlmProfiles: () => listUtilityLlmProfiles(),

				generateFakeData: async ({ schema, count, seed }) => {
					const data = await generateFakeData({ schema, count, seed })
					return { data }
				},

				generateElement: async ({ entityType, existingData, userInstructions }) => {
					return generateElement(entityType, existingData, userInstructions)
				},
				generateBatchToolMocks: async ({ toolIds }) => {
					return generateBatchToolMocks(toolIds)
				},

				openPopoutWindow: async ({ entityType, entityId }) => {
					const windowId = await openPopout(entityType, entityId)
					return { windowId }
				},
				closePopoutWindow: ({ windowId }) => {
					closePopoutByWindowId(windowId)
					return { ok: true }
				},
			},
			messages: {
				logFromView: ({ msg }) => {
					console.log('[webview]', msg)
				},
			},
		},
	})
}

export type AppViewRpc = ReturnType<typeof createRpc>
export type RpcFactory = () => AppViewRpc

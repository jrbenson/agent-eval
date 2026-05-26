import type { RPCSchema } from 'electrobun/bun'
import type { Provider, ReasoningEffort, ToolSearchHints } from './schemas/agent-config.schema'
import type { CreateContentSetParams, StoredContentSet } from './schemas/content-set.schema'
import type { CreateContentParams, StoredContent } from './schemas/content.schema'
import type { CreateSkillSetParams, StoredSkillSet } from './schemas/skill-set.schema'
import type { CreateSkillParams, StoredSkill } from './schemas/skill.schema'
import type { SurveyQuestion } from './schemas/survey.schema'
import type {
	GoalCondition,
	TaskContentRef,
	TaskSkillRef,
	TaskToolRef,
	TaskVariant,
} from './schemas/task.schema'
import type {
	CreateToolDefinitionParams,
	StoredToolDefinition,
	ToolDefinition,
} from './schemas/tool-definition.schema'
import type { CreateToolSetParams, StoredToolSet } from './schemas/tool-set.schema'
import type { TrialData } from './schemas/trial.schema'

// ---- Preset types ----

export type PresetToolDef = {
	presetId: string
	label: string
	name: string
	description: string
	parameters: Record<string, unknown>
	core: boolean
	keywords?: string[]
}

export type PresetToolSetDef = {
	presetId: string
	label: string
	description?: string
	toolPresetIds: string[]
	keywords?: string[]
}

export type PresetContentDef = {
	presetId: string
	label: string
	name: string
}

export type PresetContentSetDef = {
	presetId: string
	label: string
	description?: string
	contentPresetIds: string[]
}

export type PresetSkillDef = {
	presetId: string
	label: string
	name: string
	description: string
}

export type PresetSkillSetDef = {
	presetId: string
	label: string
	description?: string
	skillPresetIds: string[]
}

export type ImportToolResult = {
	index: number
	name: string
	status: 'ready' | 'coerced' | 'failed'
	warnings: string[]
	error?: string
}

export type ExtractedAnswer = {
	questionId: string
	questionText: string
	responseFormat: 'free_text' | 'likert' | 'multiple_choice' | 'ranking'
	raw: string
	confidence: 'exact' | 'inferred' | 'partial' | 'failed'
	likertValue?: number | null
	choiceValue?: string | null
	choiceIndex?: number | null
	rankingValue?: string[] | null
	rankingIndices?: number[] | null
	freeTextValue?: string
}

export type SurveyRunExtraction = {
	trialId: string
	agentConfigId: string
	answers: ExtractedAnswer[]
}

export type UtilityLlmProfile = {
	provider: string
	model: string
	temperature: number
	maxTokens?: number
}

export type UtilityLlmPurpose =
	| 'toolMock'
	| 'evaluation'
	| 'summarization'
	| 'generate'
	| 'simulation'

export type GeneratableEntityType =
	| 'toolDefinition'
	| 'toolSet'
	| 'skill'
	| 'skillSet'
	| 'content'
	| 'contentSet'
	| 'task'
	| 'survey'
	| 'evaluation'
	| 'toolMockResponse'

export type BatchToolMockResult = {
	toolId: string
	success: boolean
	error?: string
}

export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
export type ScenarioType = 'survey' | 'task'
export type AnalysisLens = 'current' | 'snapshot'
export type AnalysisSource = 'current' | 'snapshot'
export type DriftKind = 'analysis-drift' | 'evaluation-drift'

export type DriftSummary = {
	kinds: DriftKind[]
	details: string[]
	detailsByKind: Record<DriftKind, string[]>
}

export type RunAnalysisMetadata = {
	analysisLens: AnalysisLens
	source: AnalysisSource
	currentAvailable: boolean
	currentUnavailableReason: string | null
	drift: DriftSummary
}

// ---- Payload types (referencing schema types for enums/unions) ----

export type CreateSurveyParams = {
	label: string
	questions: SurveyQuestion[]
	orderingStrategy: 'fixed' | 'randomized' | 'latin_square'
	systemPrompt?: string
}

export type TaskParams = {
	label: string
	taskPrompts: string[]
	systemPrompt?: string
	toolRefs: TaskToolRef[]
	/** @deprecated Legacy inline tool definitions — use toolRefs instead */
	toolDefinitions?: ToolDefinition[]
	contentRefs?: TaskContentRef[]
	skillRefs?: TaskSkillRef[]
	inlineSkills?: Array<{
		name: string
		description: string
		content: string
	}>
	goalConditions?: GoalCondition[]
	initialPersistence?: Array<{ name: string; content: string }>
	simulateWithLlm?: boolean
	simulationInstructions?: string
	primaryVariantLabel?: string
	variants?: TaskVariant[]
}

export type AgentConfigParams = {
	provider: Provider
	model: string
	temperature: number
	maxTokens?: number
	topP?: number
	repetitions?: number
	reasoning?: ReasoningEffort
	toolSearch?: boolean
	toolSearchHints?: ToolSearchHints
	toolSearchMode?: ToolSearchMode
	subagentsEnabled?: boolean
	subagentMaxDepth?: number
}

export type StartRunParams = {
	evaluationId: string
}

export type ToolSearchMode = 'keyword' | 'semantic'

export type CreateEvaluationParams = {
	label: string
	scenarioId: string
	scenarioType: ScenarioType
	agentConfigs: AgentConfigParams[]
	concurrency?: number
	maxSteps?: number
	maxSimulatedTurns?: number
	toolSearchMode?: ToolSearchMode
	variantCrossings?: string[][]
}

export type CrossingManifestEntry = {
	crossedVariantId: string
	crossedVariantLabel: string
	constituentIds: string[]
}

export type RunProgress = {
	runId: string
	scenarioId: string
	scenarioType?: ScenarioType
	sourceEvaluationId: string
	evaluationLabel: string | null
	status: RunStatus
	completedRuns: number
	totalRuns: number
	currentModel?: string
	currentStep?: number
}

export type ApiKeyParams = {
	provider: string
	apiKey: string
}

// ---- Stored entity types (returned from data layer) ----

export type StoredSurvey = CreateSurveyParams & {
	id: string
	createdAt: string
	updatedAt: string
}

export type StoredTask = TaskParams & {
	id: string
	createdAt: string
	updatedAt: string
}

export type StoredEvaluation = CreateEvaluationParams & {
	id: string
	createdAt: string
	updatedAt: string
}

export type StoredRunRecord = {
	id: string
	sourceEvaluationId: string
	scenario: { id: string; type: ScenarioType; [key: string]: unknown }
	agentConfigs: AgentConfigParams[]
	concurrency: number
	status: RunStatus
	completedTrials: number
	totalTrials: number
	createdAt: string
	completedAt: string | null
}

export type StoredRunDetailRecord = StoredRunRecord & {
	snapshotVersion: number
	evaluationSignature: string
	evaluationSnapshot: StoredEvaluation
	scenarioSnapshot: StoredTask | StoredSurvey
	crossingManifest?: CrossingManifestEntry[]
}

export type TrialSummaryResult = {
	trialId: string
	agentConfigId: string
	variantId?: string
	status: 'completed' | 'failed'
	stepCount: number
	totalTokens: number
	promptTokens: number
	completionTokens: number
	latencyMs: number
	finishReason: string
	error: string | null
	createdAt: string
}

export type TaskGoalConditionResult = {
	index: number
	type: GoalCondition['type']
	passed: boolean
	reason: string
}

export type TaskTrialAnalysisResult = {
	trialId: string
	agentConfigId: string
	variantId?: string
	goalMet: boolean
	conditionResults: TaskGoalConditionResult[]
}

export type VariantAnalysisResult = {
	variantId: string
	variantLabel: string
	goalConditions: GoalCondition[]
	trials: TaskTrialAnalysisResult[]
	aggregates: Array<{
		agentConfigId: string
		successCount: number
		failureCount: number
		total: number
	}>
}

export type TaskRunAnalysisResult = {
	analysis: RunAnalysisMetadata
	hasGoal: boolean
	goalConditions: GoalCondition[]
	trials: TaskTrialAnalysisResult[]
	aggregates: Array<{
		agentConfigId: string
		successCount: number
		failureCount: number
		total: number
	}>
	variants?: VariantAnalysisResult[]
}

export type SurveyQuestionOptions = {
	questionId: string
	options: string[]
}

export type SurveyRunAnswersResult = {
	analysis: RunAnalysisMetadata
	extractions: SurveyRunExtraction[]
	questionOptions: SurveyQuestionOptions[]
}

// ---- RPC Schema Definition ----

export type AppRPC = {
	bun: RPCSchema<{
		requests: {
			// Health
			ping: {
				params: Record<string, never>
				response: { pong: true; timestamp: number }
			}

			// Survey CRUD
			createSurvey: {
				params: CreateSurveyParams
				response: { id: string }
			}
			getSurvey: {
				params: { id: string }
				response: StoredSurvey | null
			}
			listSurveys: {
				params: Record<string, never>
				response: StoredSurvey[]
			}
			updateSurvey: {
				params: { id: string } & Partial<CreateSurveyParams>
				response: { success: boolean }
			}
			deleteSurvey: {
				params: { id: string }
				response: { success: boolean }
			}

			// Task CRUD
			createTask: {
				params: TaskParams
				response: { id: string }
			}
			getTask: {
				params: { id: string }
				response: StoredTask | null
			}
			listTasks: {
				params: Record<string, never>
				response: StoredTask[]
			}
			updateTask: {
				params: { id: string } & Partial<TaskParams>
				response: { success: boolean }
			}
			deleteTask: {
				params: { id: string }
				response: { success: boolean }
			}

			// Tool Definitions
			createToolDefinition: {
				params: CreateToolDefinitionParams
				response: { id: string }
			}
			getToolDefinition: {
				params: { id: string }
				response: StoredToolDefinition | null
			}
			listToolDefinitions: {
				params: Record<string, never>
				response: StoredToolDefinition[]
			}
			updateToolDefinition: {
				params: { id: string } & Partial<CreateToolDefinitionParams>
				response: { success: boolean }
			}
			deleteToolDefinition: {
				params: { id: string }
				response: { success: boolean }
			}

			// Tool Sets
			createToolSet: {
				params: CreateToolSetParams
				response: { id: string }
			}
			getToolSet: {
				params: { id: string }
				response: StoredToolSet | null
			}
			listToolSets: {
				params: Record<string, never>
				response: StoredToolSet[]
			}
			updateToolSet: {
				params: { id: string } & Partial<CreateToolSetParams>
				response: { success: boolean }
			}
			deleteToolSet: {
				params: { id: string }
				response: { success: boolean }
			}

			// Content CRUD
			createContent: {
				params: CreateContentParams
				response: { id: string }
			}
			getContent: {
				params: { id: string }
				response: StoredContent | null
			}
			listContents: {
				params: Record<string, never>
				response: StoredContent[]
			}
			updateContent: {
				params: { id: string } & Partial<CreateContentParams>
				response: { success: boolean }
			}
			deleteContent: {
				params: { id: string }
				response: { success: boolean }
			}

			// Content Sets
			createContentSet: {
				params: CreateContentSetParams
				response: { id: string }
			}
			getContentSet: {
				params: { id: string }
				response: StoredContentSet | null
			}
			listContentSets: {
				params: Record<string, never>
				response: StoredContentSet[]
			}
			updateContentSet: {
				params: { id: string } & Partial<CreateContentSetParams>
				response: { success: boolean }
			}
			deleteContentSet: {
				params: { id: string }
				response: { success: boolean }
			}

			// Skill CRUD
			createSkill: {
				params: CreateSkillParams
				response: { id: string }
			}
			getSkill: {
				params: { id: string }
				response: StoredSkill | null
			}
			listSkills: {
				params: Record<string, never>
				response: StoredSkill[]
			}
			updateSkill: {
				params: { id: string } & Partial<CreateSkillParams>
				response: { success: boolean }
			}
			deleteSkill: {
				params: { id: string }
				response: { success: boolean }
			}

			// Skill Sets
			createSkillSet: {
				params: CreateSkillSetParams
				response: { id: string }
			}
			getSkillSet: {
				params: { id: string }
				response: StoredSkillSet | null
			}
			listSkillSets: {
				params: Record<string, never>
				response: StoredSkillSet[]
			}
			updateSkillSet: {
				params: { id: string } & Partial<CreateSkillSetParams>
				response: { success: boolean }
			}
			deleteSkillSet: {
				params: { id: string }
				response: { success: boolean }
			}

			// Tool Presets
			listPresetTools: {
				params: Record<string, never>
				response: PresetToolDef[]
			}
			listPresetToolSets: {
				params: Record<string, never>
				response: PresetToolSetDef[]
			}
			copyPresetTool: {
				params: { presetId: string }
				response: { id: string }
			}
			copyPresetToolSet: {
				params: { presetId: string }
				response: { id: string; toolIds: string[] }
			}

			// Content Presets
			listPresetContents: {
				params: Record<string, never>
				response: PresetContentDef[]
			}
			listPresetContentSets: {
				params: Record<string, never>
				response: PresetContentSetDef[]
			}
			copyPresetContent: {
				params: { presetId: string }
				response: { id: string }
			}
			copyPresetContentSet: {
				params: { presetId: string }
				response: { id: string; contentIds: string[] }
			}

			// Skill Presets
			listPresetSkills: {
				params: Record<string, never>
				response: PresetSkillDef[]
			}
			listPresetSkillSets: {
				params: Record<string, never>
				response: PresetSkillSetDef[]
			}
			copyPresetSkill: {
				params: { presetId: string }
				response: { id: string }
			}
			copyPresetSkillSet: {
				params: { presetId: string }
				response: { id: string; skillIds: string[] }
			}

			// Tool Import/Export
			exportToolDefinition: {
				params: { id: string; includeMockBehavior: boolean }
				response: { json: string }
			}
			exportToolSet: {
				params: { id: string; includeMockBehavior: boolean }
				response: { json: string }
			}
			analyzeToolImport: {
				params: { json: string }
				response: ImportToolResult[]
			}
			commitToolImport: {
				params: { json: string; toolSetLabel?: string }
				response: { toolIds: string[]; toolSetId?: string }
			}

			// Agent Configs
			saveAgentConfig: {
				params: AgentConfigParams
				response: { id: string }
			}
			listAgentConfigs: {
				params: Record<string, never>
				response: (AgentConfigParams & { id: string })[]
			}
			deleteAgentConfig: {
				params: { id: string }
				response: { success: boolean }
			}

			// Evaluations
			createEvaluation: {
				params: CreateEvaluationParams
				response: { id: string }
			}
			getEvaluation: {
				params: { id: string }
				response: StoredEvaluation | null
			}
			listEvaluations: {
				params: Record<string, never>
				response: StoredEvaluation[]
			}
			updateEvaluation: {
				params: { id: string } & Partial<CreateEvaluationParams>
				response: { success: boolean }
			}
			deleteEvaluation: {
				params: { id: string }
				response: { success: boolean }
			}

			// Bulk Delete
			bulkDeleteSurveys: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteTasks: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteToolDefinitions: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteToolSets: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteContent: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteContentSets: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteSkills: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteSkillSets: {
				params: { ids: string[] }
				response: { success: boolean }
			}
			bulkDeleteEvaluations: {
				params: { ids: string[] }
				response: { success: boolean }
			}

			// Eval Execution
			startRun: {
				params: StartRunParams
				response: { runId: string }
			}
			cancelRun: {
				params: { runId: string }
				response: { success: boolean }
			}
			getRunStatus: {
				params: { runId: string }
				response: RunProgress
			}

			// Results
			listRuns: {
				params: { evaluationId?: string }
				response: StoredRunRecord[]
			}
			getRun: {
				params: { runId: string }
				response: StoredRunDetailRecord | null
			}
			getRunResults: {
				params: { runId: string }
				response: TrialSummaryResult[]
			}
			getRunResult: {
				params: { id: string }
				response: (TrialSummaryResult & { runId: string }) | null
			}
			getTrialData: {
				params: { runId: string; trialId: string }
				response: TrialData | null
			}
			getTaskRunAnalysis: {
				params: { runId: string; analysisLens: AnalysisLens }
				response: TaskRunAnalysisResult | null
			}
			listRunResults: {
				params: {
					scenarioId?: string
					scenarioType?: string
					limit?: number
					offset?: number
				}
				response: {
					results: (TrialSummaryResult & {
						runId: string
						scenarioId: string
						scenarioType: string
					})[]
					total: number
				}
			}
			// Survey Extraction
			extractSurveyRunAnswers: {
				params: { runId: string; analysisLens: AnalysisLens }
				response: SurveyRunAnswersResult
			}

			// Settings / API Keys
			setApiKey: {
				params: ApiKeyParams
				response: { success: boolean }
			}
			getApiKeyStatus: {
				params: { provider: string }
				response: { isSet: boolean; keyStatus: string | null }
			}
			listProviderStatus: {
				params: Record<string, never>
				response: {
					provider: string
					isSet: boolean
					keyStatus: string | null
				}[]
			}
			validateApiKey: {
				params: { provider: string }
				response: { valid: boolean }
			}
			listModels: {
				params: { provider: string }
				response: string[]
			}
			setProviderConfig: {
				params: { provider: string; config: Record<string, string> }
				response: { success: boolean }
			}
			getProviderConfig: {
				params: { provider: string }
				response: Record<string, string>
			}
			openDataDir: {
				params: Record<string, never>
				response: { success: boolean }
			}

			// Dashboard Stats
			getDashboardStats: {
				params: Record<string, never>
				response: {
					surveyCount: number
					taskCount: number
					resultCount: number
					recentRuns: StoredRunRecord[]
				}
			}

			// Utility LLM Settings
			getUtilityLlmProfile: {
				params: { purpose: UtilityLlmPurpose }
				response: UtilityLlmProfile | null
			}
			setUtilityLlmProfile: {
				params: { purpose: UtilityLlmPurpose; profile: UtilityLlmProfile }
				response: { success: boolean }
			}
			listUtilityLlmProfiles: {
				params: Record<string, never>
				response: Record<string, UtilityLlmProfile | null>
			}

			// Fake Data Generation
			generateFakeData: {
				params: {
					schema: Record<string, unknown>
					count?: number
					seed?: number
				}
				response: { data: unknown }
			}

			// Generative Help
			generateElement: {
				params: {
					entityType: GeneratableEntityType
					existingData: Record<string, unknown>
					userInstructions?: string
				}
				response: { result: Record<string, unknown> }
			}
			generateBatchToolMocks: {
				params: { toolIds: string[] }
				response: { results: BatchToolMockResult[] }
			}

			// Window Management
			openPopoutWindow: {
				params: { entityType: string; entityId: string }
				response: { windowId: number }
			}
			closePopoutWindow: {
				params: { windowId: number }
				response: { ok: boolean }
			}
		}
		messages: {
			logFromView: { msg: string }
		}
	}>
	webview: RPCSchema<{
		requests: {
			checkDirtyState: {
				params: Record<string, never>
				response: { isDirty: boolean }
			}
			resolveCloseGuard: {
				params: Record<string, never>
				response: { action: 'saved' | 'discarded' | 'cancelled' }
			}
		}
		messages: {
			evalProgress: RunProgress
			evalComplete: { runId: string; scenarioId: string; success: boolean }
			notification: {
				type: 'info' | 'success' | 'warning' | 'error'
				message: string
			}
			dataChanged: {
				entityType: string
				entityId: string
				action: 'created' | 'updated' | 'deleted'
			}
		}
	}>
}

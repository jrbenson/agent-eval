import { createHash } from 'node:crypto'
import type {
	AnalysisLens,
	DriftKind,
	DriftSummary,
	RunAnalysisMetadata,
	ScenarioType,
} from '../../shared/rpc-types'
import { type Evaluation, getEvaluation } from '../data/evaluations'
import { type StoredSurvey, getSurvey } from '../data/surveys'
import { type StoredTask, getTask } from '../data/tasks'

type ScenarioSnapshot = StoredTask | StoredSurvey

export interface RunAnalysisInput {
	sourceEvaluationId: string
	evaluationSnapshot: Evaluation
	scenarioSnapshot: ScenarioSnapshot
	scenario: {
		id: string
		type: ScenarioType
	}
	evaluationSignature: string
}

export const ANALYSIS_ENGINE_VERSION = 1

function stableNormalize(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map((item) => stableNormalize(item))
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>
		const normalizedEntries = Object.keys(record)
			.sort()
			.map((key) => [key, stableNormalize(record[key])])
		return Object.fromEntries(normalizedEntries)
	}

	return value
}

function stableStringify(value: unknown): string {
	return JSON.stringify(stableNormalize(value))
}

function hashSignature(value: unknown): string {
	return createHash('sha256').update(stableStringify(value)).digest('hex')
}

function normalizeAgentConfig(config: Evaluation['agentConfigs'][number]) {
	return {
		provider: config.provider,
		model: config.model,
		temperature: config.temperature,
		maxTokens: config.maxTokens ?? null,
		topP: config.topP ?? null,
		repetitions: config.repetitions ?? 1,
		reasoning: config.reasoning ?? 'provider-default',
		toolSearch: config.toolSearch ?? false,
		toolSearchHints: config.toolSearchHints ?? 'none',
		toolSearchMode: config.toolSearchMode ?? 'keyword',
		subagentsEnabled: config.subagentsEnabled ?? false,
		subagentMaxDepth: config.subagentMaxDepth ?? 1,
	}
}

function normalizeTaskExecutionSignature(task: StoredTask) {
	return {
		taskPrompts: task.taskPrompts,
		systemPrompt: task.systemPrompt ?? null,
		toolRefs: task.toolRefs ?? [],
		contentRefs: task.contentRefs ?? [],
		skillRefs: task.skillRefs ?? [],
		inlineSkills: task.inlineSkills ?? [],
		initialPersistence: task.initialPersistence ?? [],
		simulateWithLlm: task.simulateWithLlm ?? false,
		simulationInstructions: task.simulationInstructions ?? null,
		variants: task.variants ?? [],
	}
}

function normalizeSurveyExecutionSignature(survey: StoredSurvey) {
	return {
		orderingStrategy: survey.orderingStrategy,
		systemPrompt: survey.systemPrompt ?? null,
	}
}

function normalizeTaskAnalysisSignature(task: StoredTask) {
	return {
		goalConditions: task.goalConditions ?? [],
	}
}

function normalizeSurveyAnalysisSignature(survey: StoredSurvey) {
	return {
		questions: survey.questions ?? [],
	}
}

export function buildEvaluationSignatureInput(evaluation: Evaluation, scenario: ScenarioSnapshot) {
	return {
		scenarioType: evaluation.scenarioType,
		scenarioRef: {
			scenarioId: evaluation.scenarioId,
			scenarioType: evaluation.scenarioType,
		},
		agentConfigs: evaluation.agentConfigs.map((config) => normalizeAgentConfig(config)),
		concurrency: evaluation.concurrency,
		maxSteps: evaluation.maxSteps ?? 10,
		toolSearchMode: evaluation.toolSearchMode ?? 'keyword',
		variantCrossings: evaluation.variantCrossings ?? [],
		scenario:
			evaluation.scenarioType === 'task'
				? normalizeTaskExecutionSignature(scenario as StoredTask)
				: normalizeSurveyExecutionSignature(scenario as StoredSurvey),
	}
}

export function computeEvaluationSignature(
	evaluation: Evaluation,
	scenario: ScenarioSnapshot,
): string {
	return hashSignature(buildEvaluationSignatureInput(evaluation, scenario))
}

export function buildAnalysisSignatureInput(
	scenarioType: ScenarioType,
	scenario: ScenarioSnapshot,
) {
	return {
		scenarioType,
		analysisEngineVersion: ANALYSIS_ENGINE_VERSION,
		scenario:
			scenarioType === 'task'
				? normalizeTaskAnalysisSignature(scenario as StoredTask)
				: normalizeSurveyAnalysisSignature(scenario as StoredSurvey),
	}
}

export function computeAnalysisSignature(
	scenarioType: ScenarioType,
	scenario: ScenarioSnapshot,
): string {
	return hashSignature(buildAnalysisSignatureInput(scenarioType, scenario))
}

function loadScenario(scenarioType: ScenarioType, scenarioId: string): ScenarioSnapshot | null {
	return scenarioType === 'task' ? getTask(scenarioId) : getSurvey(scenarioId)
}

function createDriftSummary(): DriftSummary {
	return {
		kinds: [],
		details: [],
		detailsByKind: {
			'analysis-drift': [],
			'evaluation-drift': [],
		},
	}
}

function uniqueStrings(values: string[]): string[] {
	return values.filter((value, index, all) => all.indexOf(value) === index)
}

function pushDriftDetail(summary: DriftSummary, kind: DriftKind, detail: string) {
	if (!summary.kinds.includes(kind)) {
		summary.kinds.push(kind)
	}
	if (!summary.details.includes(detail)) {
		summary.details.push(detail)
	}
	if (!summary.detailsByKind[kind].includes(detail)) {
		summary.detailsByKind[kind].push(detail)
	}
}

function buildEvaluationDriftSummary(
	run: RunAnalysisInput,
	currentEvaluation: Evaluation | null,
): DriftSummary {
	const summary = createDriftSummary()

	if (!currentEvaluation) {
		return summary
	}

	if (currentEvaluation.scenarioType !== run.evaluationSnapshot.scenarioType) {
		pushDriftDetail(
			summary,
			'evaluation-drift',
			'Current evaluation uses a different scenario type than the snapshot.',
		)
		return summary
	}

	if (currentEvaluation.scenarioId !== run.evaluationSnapshot.scenarioId) {
		pushDriftDetail(
			summary,
			'evaluation-drift',
			'Current evaluation points to a different scenario than the snapshot.',
		)
		return summary
	}

	const currentScenario = loadScenario(currentEvaluation.scenarioType, currentEvaluation.scenarioId)
	if (!currentScenario) {
		return summary
	}

	if (
		stableStringify(
			run.evaluationSnapshot.agentConfigs.map((config) => normalizeAgentConfig(config)),
		) !==
		stableStringify(currentEvaluation.agentConfigs.map((config) => normalizeAgentConfig(config)))
	) {
		pushDriftDetail(summary, 'evaluation-drift', 'Current agent matrix differs from the snapshot.')
	}

	if (
		run.evaluationSnapshot.concurrency !== currentEvaluation.concurrency ||
		(run.evaluationSnapshot.maxSteps ?? 10) !== (currentEvaluation.maxSteps ?? 10) ||
		(run.evaluationSnapshot.toolSearchMode ?? 'keyword') !==
			(currentEvaluation.toolSearchMode ?? 'keyword')
	) {
		pushDriftDetail(
			summary,
			'evaluation-drift',
			'Current evaluation run settings differ from the snapshot.',
		)
	}

	if (computeEvaluationSignature(currentEvaluation, currentScenario) !== run.evaluationSignature) {
		pushDriftDetail(
			summary,
			'evaluation-drift',
			run.scenario.type === 'task'
				? 'Current task prompt or task resources differ from the snapshot.'
				: 'Current survey run behavior differs from the snapshot.',
		)
	}

	return summary
}

function buildAnalysisDriftSummary(
	run: RunAnalysisInput,
	currentScenario: ScenarioSnapshot | null,
): DriftSummary {
	const summary = createDriftSummary()

	if (!currentScenario) {
		return summary
	}

	if (
		computeAnalysisSignature(run.scenario.type, currentScenario) !==
		computeAnalysisSignature(run.scenario.type, run.scenarioSnapshot)
	) {
		pushDriftDetail(
			summary,
			'analysis-drift',
			run.scenario.type === 'task'
				? 'Current goal conditions differ from the snapshot.'
				: 'Current survey questions or answer extraction inputs differ from the snapshot.',
		)
	}

	return summary
}

export function resolveCurrentRunEntities(run: RunAnalysisInput) {
	const currentEvaluation = getEvaluation(run.sourceEvaluationId)
	if (!currentEvaluation) {
		return {
			currentEvaluation: null,
			currentScenario: null,
			currentAvailable: false,
			currentUnavailableReason: 'Current evaluation no longer exists.',
		}
	}

	if (currentEvaluation.scenarioType !== run.evaluationSnapshot.scenarioType) {
		return {
			currentEvaluation,
			currentScenario: null,
			currentAvailable: false,
			currentUnavailableReason: 'Current evaluation now references a different scenario type.',
		}
	}

	if (currentEvaluation.scenarioId !== run.evaluationSnapshot.scenarioId) {
		return {
			currentEvaluation,
			currentScenario: null,
			currentAvailable: false,
			currentUnavailableReason: 'Current evaluation now references a different scenario.',
		}
	}

	const currentScenario = loadScenario(currentEvaluation.scenarioType, currentEvaluation.scenarioId)
	if (!currentScenario) {
		return {
			currentEvaluation,
			currentScenario: null,
			currentAvailable: false,
			currentUnavailableReason: `Current ${currentEvaluation.scenarioType} no longer exists.`,
		}
	}

	return {
		currentEvaluation,
		currentScenario,
		currentAvailable: true,
		currentUnavailableReason: null,
	}
}

export function resolveRunAnalysisContext(
	run: RunAnalysisInput,
	analysisLens: AnalysisLens,
): {
	analysis: RunAnalysisMetadata
	currentEvaluation: Evaluation | null
	currentScenario: ScenarioSnapshot | null
} {
	const current = resolveCurrentRunEntities(run)
	const evaluationDrift = buildEvaluationDriftSummary(run, current.currentEvaluation)
	const analysisDrift = buildAnalysisDriftSummary(run, current.currentScenario)
	const drift: DriftSummary = {
		kinds: uniqueStrings([...evaluationDrift.kinds, ...analysisDrift.kinds]) as DriftKind[],
		details: uniqueStrings([...evaluationDrift.details, ...analysisDrift.details]),
		detailsByKind: {
			'analysis-drift': uniqueStrings([
				...evaluationDrift.detailsByKind['analysis-drift'],
				...analysisDrift.detailsByKind['analysis-drift'],
			]),
			'evaluation-drift': uniqueStrings([
				...evaluationDrift.detailsByKind['evaluation-drift'],
				...analysisDrift.detailsByKind['evaluation-drift'],
			]),
		},
	}

	return {
		analysis: {
			analysisLens,
			source: analysisLens === 'current' && current.currentAvailable ? 'current' : 'snapshot',
			currentAvailable: current.currentAvailable,
			currentUnavailableReason:
				analysisLens === 'current' && !current.currentAvailable
					? current.currentUnavailableReason
					: null,
			drift,
		},
		currentEvaluation: current.currentEvaluation,
		currentScenario: current.currentScenario,
	}
}

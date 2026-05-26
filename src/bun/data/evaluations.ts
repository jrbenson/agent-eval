import type { AgentConfigParams, ToolSearchMode } from '../../shared/rpc-types'
import { evaluationPath, evaluationsDir } from './paths'
import { createEntityRepository, sortByCreatedAtDescending } from './shared/entity-repository'

export interface Evaluation {
	id: string
	label: string
	scenarioId: string
	scenarioType: 'survey' | 'task'
	agentConfigs: AgentConfigParams[]
	concurrency: number
	maxSteps: number
	maxSimulatedTurns: number
	toolSearchMode: ToolSearchMode
	/** Crossing groups: each inner array is a set of variant IDs (or "primary") to cross. */
	variantCrossings?: string[][]
	createdAt: string
	updatedAt: string
}

export type CreateEvaluationParams = {
	label: string
	scenarioId: string
	scenarioType: 'survey' | 'task'
	agentConfigs: AgentConfigParams[]
	concurrency?: number
	maxSteps?: number
	maxSimulatedTurns?: number
	toolSearchMode?: ToolSearchMode
	variantCrossings?: string[][]
}

function normalizeEvaluation(evaluation: Evaluation): Evaluation {
	const normalized: Evaluation = {
		...evaluation,
		concurrency: evaluation.concurrency ?? 9,
		maxSteps: evaluation.maxSteps ?? 64,
		maxSimulatedTurns: evaluation.maxSimulatedTurns ?? 5,
		toolSearchMode: evaluation.toolSearchMode ?? 'keyword',
	}
	// Strip empty / absent crossings to keep stored data clean
	if (!normalized.variantCrossings || normalized.variantCrossings.length === 0) {
		normalized.variantCrossings = undefined
	}
	return normalized
}

const evaluationRepository = createEntityRepository<CreateEvaluationParams, Evaluation>({
	pathForId: evaluationPath,
	dirPath: evaluationsDir,
	createStored(data, meta) {
		return normalizeEvaluation({
			id: meta.id,
			label: data.label,
			scenarioId: data.scenarioId,
			scenarioType: data.scenarioType,
			agentConfigs: data.agentConfigs,
			concurrency: data.concurrency ?? 9,
			maxSteps: data.maxSteps ?? 64,
			maxSimulatedTurns: data.maxSimulatedTurns ?? 5,
			toolSearchMode: data.toolSearchMode ?? 'keyword',
			variantCrossings: data.variantCrossings,
			createdAt: meta.now,
			updatedAt: meta.now,
		})
	},
	normalize: normalizeEvaluation,
	sort: sortByCreatedAtDescending,
})

export const createEvaluation = evaluationRepository.create
export const getEvaluation = evaluationRepository.get
export const listEvaluations = evaluationRepository.list
export const updateEvaluation = evaluationRepository.update
export const deleteEvaluation = evaluationRepository.delete

import type { RunProgress } from '../../../shared/rpc-types'
import { getEvaluation } from '../../data/evaluations'
import { appendTrialSummary, createRun, updateRunStatus } from '../../data/runs'
import { type StoredSurvey, getSurvey } from '../../data/surveys'
import { type StoredTask, getTask } from '../../data/tasks'
import { ConcurrencyLimiter } from '../concurrency'
import { createFailedTrialSummary } from '../trial-extractor'
import { resolveVariant } from './resolve-variant'
import { runSurveyTrial } from './run-survey-trial'
import { runTaskTrial } from './run-task-trial'
import { type AgentEntry, buildAgentConfigId, buildAgentEntries } from './trial-config'
import {
	type CrossedVariantEntry,
	getGroupedVariantIds,
	resolveCrossedVariants,
} from './variant-crossings'

export type { RunProgress }

export interface RunConfig {
	runId: string
	evaluationId: string
	onProgress?: (progress: RunProgress) => void
}

const activeRuns = new Map<string, { cancelled: boolean }>()

export function cancelRun(runId: string): boolean {
	const run = activeRuns.get(runId)
	if (!run) {
		return false
	}
	run.cancelled = true
	return true
}

function loadScenarioSnapshot(
	scenarioType: 'survey' | 'task',
	scenarioId: string,
): StoredTask | StoredSurvey {
	if (scenarioType === 'survey') {
		const survey = getSurvey(scenarioId)
		if (!survey) {
			throw new Error(`Survey not found: ${scenarioId}`)
		}
		return survey
	}

	const task = getTask(scenarioId)
	if (!task) {
		throw new Error(`Task not found: ${scenarioId}`)
	}
	return task
}

async function executeTrials(args: {
	runId: string
	runState: { cancelled: boolean }
	agentEntries: AgentEntry[]
	scenarioType: 'survey' | 'task'
	scenarioId: string
	scenarioSnapshot: StoredTask | StoredSurvey
	variantEntries: Array<{ variantId?: string; task: StoredTask }>
	concurrency: number
	maxSteps: number
	maxSimulatedTurns: number
	definition: {
		toolSearchMode: 'keyword' | 'semantic'
		sourceEvaluationId: string
		evaluationLabel: string | null
	}
	onProgress?: (progress: RunProgress) => void
}) {
	// Use pre-built variant entries
	const variantEntries = args.variantEntries

	const totalTrials =
		args.scenarioType === 'task'
			? args.agentEntries.length * variantEntries.length
			: args.agentEntries.length

	const progress: RunProgress = {
		runId: args.runId,
		scenarioId: args.scenarioId,
		sourceEvaluationId: args.definition.sourceEvaluationId,
		evaluationLabel: args.definition.evaluationLabel,
		status: 'running',
		completedRuns: 0,
		totalRuns: totalTrials,
	}

	updateRunStatus(args.runId, 'running')
	args.onProgress?.(progress)

	const limiter = new ConcurrencyLimiter(args.concurrency)
	let hasError = false

	// Build flat list of trial work items
	type TrialWork = {
		entry: AgentEntry
		index: number
		variantId?: string
		task?: StoredTask
	}
	const workItems: TrialWork[] = []

	if (args.scenarioType === 'task') {
		let idx = 0
		for (const ve of variantEntries) {
			for (const entry of args.agentEntries) {
				workItems.push({
					entry,
					index: idx++,
					variantId: ve.variantId,
					task: ve.task,
				})
			}
		}
	} else {
		for (let i = 0; i < args.agentEntries.length; i++) {
			workItems.push({ entry: args.agentEntries[i], index: i })
		}
	}

	const tasks = workItems.map((work) =>
		limiter.run(async () => {
			if (args.runState.cancelled) {
				return
			}

			const trialId = crypto.randomUUID()
			const agentConfigId = buildAgentConfigId(work.entry)
			progress.currentModel = `${work.entry.config.provider}/${work.entry.config.model}`
			args.onProgress?.(progress)

			try {
				if (args.scenarioType === 'survey') {
					await runSurveyTrial({
						runId: args.runId,
						trialId,
						agentConfigId,
						runIndex: work.index,
						scenarioId: args.scenarioId,
						survey: args.scenarioSnapshot as {
							questions: Array<{
								id: string
								text: string
								responseFormat: string
								options?: string[] | null
							}>
							orderingStrategy: string
							systemPrompt?: string
						},
						agentConfig: work.entry.config,
						sourceParams: work.entry.sourceParams,
					})
				} else {
					await runTaskTrial({
						runId: args.runId,
						trialId,
						agentConfigId,
						scenarioId: args.scenarioId,
						maxSteps: args.maxSteps,
						maxSimulatedTurns: args.maxSimulatedTurns,
						scenarioType: 'task',
						task: work.task!,
						agentConfig: work.entry.config,
						sourceParams: work.entry.sourceParams,
						definitionToolSearchMode: args.definition.toolSearchMode,
						variantId: work.variantId,
					})
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error)
				appendFailureSummary(args.runId, trialId, agentConfigId, errorMessage, work.variantId)
				hasError = true
			}

			progress.completedRuns += 1
			args.onProgress?.(progress)
			updateRunStatus(args.runId, 'running', progress.completedRuns)
		}),
	)

	await Promise.allSettled(tasks)

	const finalStatus = args.runState.cancelled ? 'cancelled' : hasError ? 'failed' : 'completed'
	updateRunStatus(args.runId, finalStatus, progress.completedRuns)

	progress.status = finalStatus as RunProgress['status']
	args.onProgress?.(progress)
}

function appendFailureSummary(
	runId: string,
	trialId: string,
	agentConfigId: string,
	errorMessage: string,
	variantId?: string,
) {
	appendTrialSummary(
		runId,
		createFailedTrialSummary(trialId, agentConfigId, errorMessage, variantId),
	)
}

export async function runEvaluation(config: RunConfig): Promise<string> {
	const { runId: preGeneratedRunId, evaluationId, onProgress } = config
	const definition = getEvaluation(evaluationId)
	if (!definition) {
		throw new Error(`Evaluation not found: ${evaluationId}`)
	}

	const scenarioSnapshot = loadScenarioSnapshot(definition.scenarioType, definition.scenarioId)
	const agentEntries = buildAgentEntries(definition.agentConfigs)

	// Build variant entries and optional crossing manifest
	type VariantEntry = { variantId?: string; task: StoredTask }
	let variantEntries: VariantEntry[] = []
	let crossingManifest: CrossedVariantEntry['manifest'][] | undefined

	if (definition.scenarioType === 'task') {
		const primary = scenarioSnapshot as StoredTask
		const groups = definition.variantCrossings

		if (groups && groups.length >= 2) {
			// Crossing mode: build crossed combinations
			const crossed = resolveCrossedVariants(primary, groups)
			crossingManifest = crossed.map((c) => c.manifest)
			for (const entry of crossed) {
				variantEntries.push({
					variantId: entry.manifest.crossedVariantId,
					task: entry.task,
				})
			}
			// Add ungrouped variants as standalone entries
			const groupedIds = getGroupedVariantIds(groups)
			const hasPrimaryInGroup = groupedIds.has('primary')
			if (!hasPrimaryInGroup) {
				variantEntries.unshift({ task: primary }) // primary standalone
			}
			for (const variant of primary.variants ?? []) {
				if (!groupedIds.has(variant.id)) {
					variantEntries.push({
						variantId: variant.id,
						task: resolveVariant(primary, variant),
					})
				}
			}
		} else {
			// Legacy flat mode
			variantEntries = [{ task: primary }]
			for (const variant of primary.variants ?? []) {
				variantEntries.push({
					variantId: variant.id,
					task: resolveVariant(primary, variant),
				})
			}
		}
	}

	const totalTrials =
		definition.scenarioType === 'task'
			? agentEntries.length * variantEntries.length
			: agentEntries.length

	const { id: runId } = createRun({
		id: preGeneratedRunId,
		evaluationSnapshot: { ...definition },
		scenarioSnapshot,
		totalTrials,
		crossingManifest,
	})

	const runState = { cancelled: false }
	activeRuns.set(runId, runState)

	try {
		await executeTrials({
			runId,
			runState,
			agentEntries,
			scenarioType: definition.scenarioType,
			scenarioId: definition.scenarioId,
			scenarioSnapshot,
			variantEntries,
			concurrency: definition.concurrency,
			maxSteps: definition.maxSteps ?? 64,
			maxSimulatedTurns: definition.maxSimulatedTurns ?? 5,
			definition: {
				toolSearchMode: definition.toolSearchMode ?? 'keyword',
				sourceEvaluationId: evaluationId,
				evaluationLabel: definition.label,
			},
			onProgress,
		})
	} finally {
		activeRuns.delete(runId)
	}

	return runId
}

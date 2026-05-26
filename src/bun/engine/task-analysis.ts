import type {
	AnalysisLens,
	CrossingManifestEntry,
	TaskRunAnalysisResult,
	TaskTrialAnalysisResult,
	TrialSummaryResult,
	VariantAnalysisResult,
} from '../../shared/rpc-types'
import type { GoalCondition, TaskVariant } from '../../shared/schemas/task.schema'
import { getRun, getTrial, getTrialSummaries } from '../data/runs'
import { resolveRunAnalysisContext } from './run-analysis-context'
import { evaluateGoalConditions } from './task-analysis-core'

export {
	deepSubsetMatch,
	evaluateGoalCondition,
	evaluateGoalConditions,
} from './task-analysis-core'

type GoalBearingTask = {
	goalConditions?: GoalCondition[]
	primaryVariantLabel?: string
	variants?: TaskVariant[]
}

function buildFailedTrialAnalysis(
	summary: TrialSummaryResult,
	goalConditions: GoalCondition[],
): TaskTrialAnalysisResult {
	return {
		trialId: summary.trialId,
		agentConfigId: summary.agentConfigId,
		variantId: summary.variantId,
		goalMet: false,
		conditionResults: goalConditions.map((condition, index) => ({
			index,
			type: condition.type,
			passed: false,
			reason: `trial failed: ${summary.error ?? 'no trial data available'}`,
		})),
	}
}

function buildAggregates(trials: TaskTrialAnalysisResult[]) {
	const aggregateMap = new Map<
		string,
		{ successCount: number; failureCount: number; total: number }
	>()
	for (const trial of trials) {
		if (!aggregateMap.has(trial.agentConfigId)) {
			aggregateMap.set(trial.agentConfigId, {
				successCount: 0,
				failureCount: 0,
				total: 0,
			})
		}
		const aggregate = aggregateMap.get(trial.agentConfigId)!
		aggregate.total += 1
		if (trial.goalMet) {
			aggregate.successCount += 1
		} else {
			aggregate.failureCount += 1
		}
	}
	return [...aggregateMap.entries()].map(([agentConfigId, aggregate]) => ({
		agentConfigId,
		...aggregate,
	}))
}

function analyzeTrials(
	summaries: TrialSummaryResult[],
	goalConditions: GoalCondition[],
	runId: string,
): TaskTrialAnalysisResult[] {
	return summaries.map((summary) => {
		if (summary.status !== 'completed') {
			return buildFailedTrialAnalysis(summary, goalConditions)
		}

		const trial = getTrial(runId, summary.trialId)
		if (!trial) {
			return buildFailedTrialAnalysis(summary, goalConditions)
		}

		const result = evaluateGoalConditions(
			goalConditions,
			trial,
			summary.trialId,
			summary.agentConfigId,
		)
		return { ...result, variantId: summary.variantId }
	})
}

export function analyzeTaskRun(
	runId: string,
	analysisLens: AnalysisLens,
): TaskRunAnalysisResult | null {
	const run = getRun(runId)
	if (!run || run.scenario.type !== 'task') return null

	const { analysis, currentScenario } = resolveRunAnalysisContext(run, analysisLens)
	const task =
		analysis.source === 'current'
			? (currentScenario as GoalBearingTask)
			: (run.scenarioSnapshot as GoalBearingTask)
	const goalConditions = task.goalConditions ?? []
	const variants = task.variants ?? []
	const crossingManifest = run.crossingManifest

	if (goalConditions.length === 0) {
		return {
			analysis,
			hasGoal: false,
			goalConditions: [],
			trials: [],
			aggregates: [],
		}
	}

	const allSummaries = getTrialSummaries(runId)

	// Partition summaries by variant
	const primarySummaries = allSummaries.filter((s) => !s.variantId)
	const primaryTrials = analyzeTrials(primarySummaries, goalConditions, runId)

	// Build variant analysis
	let variantResults: VariantAnalysisResult[] | undefined
	const hasCrossings = crossingManifest && crossingManifest.length > 0
	const hasVariants = variants.length > 0 || hasCrossings

	if (hasVariants) {
		variantResults = []

		// Include primary if it has trials
		if (primarySummaries.length > 0) {
			variantResults.push({
				variantId: 'primary',
				variantLabel: task.primaryVariantLabel ?? 'Primary',
				goalConditions,
				trials: primaryTrials,
				aggregates: buildAggregates(primaryTrials),
			})
		}

		// Crossed variant entries from manifest
		if (hasCrossings) {
			const variantMap = new Map(variants.map((v) => [v.id, v]))
			for (const entry of crossingManifest) {
				const crossedGoals = resolveCrossedGoalConditions(entry, variantMap, goalConditions)
				const crossedSummaries = allSummaries.filter((s) => s.variantId === entry.crossedVariantId)
				const crossedTrials = analyzeTrials(crossedSummaries, crossedGoals, runId)
				variantResults.push({
					variantId: entry.crossedVariantId,
					variantLabel: entry.crossedVariantLabel,
					goalConditions: crossedGoals,
					trials: crossedTrials,
					aggregates: buildAggregates(crossedTrials),
				})
			}
		}

		// Non-crossed individual variants
		const _crossedVariantIds = new Set(crossingManifest?.map((e) => e.crossedVariantId) ?? [])
		const crossedConstituentIds = new Set(crossingManifest?.flatMap((e) => e.constituentIds) ?? [])
		for (const variant of variants) {
			// Skip variants that are part of a crossing group
			if (crossedConstituentIds.has(variant.id)) continue
			const variantGoalConditions = variant.overrides.goalConditions ?? goalConditions
			const variantSummaries = allSummaries.filter((s) => s.variantId === variant.id)
			const variantTrials = analyzeTrials(variantSummaries, variantGoalConditions, runId)
			variantResults.push({
				variantId: variant.id,
				variantLabel: variant.label,
				goalConditions: variantGoalConditions,
				trials: variantTrials,
				aggregates: buildAggregates(variantTrials),
			})
		}
	}

	// All trials combined for the top-level (backward compat)
	const allTrials = analyzeTrials(allSummaries, goalConditions, runId)

	return {
		analysis,
		hasGoal: true,
		goalConditions,
		trials: allTrials,
		aggregates: buildAggregates(primaryTrials),
		variants: variantResults,
	}
}

/**
 * Resolve the effective goal conditions for a crossed variant combination.
 * Under disjoint-key enforcement, at most one constituent can override goalConditions.
 */
function resolveCrossedGoalConditions(
	entry: CrossingManifestEntry,
	variantMap: Map<string, TaskVariant>,
	primaryGoals: GoalCondition[],
): GoalCondition[] {
	for (const id of entry.constituentIds) {
		if (id === 'primary') continue
		const variant = variantMap.get(id)
		if (variant?.overrides.goalConditions) {
			return variant.overrides.goalConditions
		}
	}
	return primaryGoals
}

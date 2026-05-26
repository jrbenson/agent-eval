import { readdirSync, statSync } from 'node:fs'
import type { CrossingManifestEntry } from '../../shared/rpc-types'
import type { TrialData, TrialSummary } from '../../shared/schemas/trial.schema'
import { computeEvaluationSignature } from '../engine/run-analysis-context'
import type { Evaluation } from './evaluations'
import { ensureDir, readJsonOrNull, writeJsonAtomic } from './fs/json-store'
import { appendJsonLine, readJsonLines } from './fs/jsonl-store'
import {
	evaluationMetaPath,
	resultRunDir,
	resultsDir,
	surveysDir,
	tasksDir,
	trialPath,
	trialsDir,
	trialsIndexPath,
} from './paths'
import type { StoredSurvey } from './surveys'
import type { StoredTask } from './tasks'

// ---- Types ----

type RunRecordFile = {
	snapshotVersion: 1
	evaluationSignature: string
	evaluationSnapshot: Evaluation
	scenarioSnapshot: StoredTask | StoredSurvey
	crossingManifest?: CrossingManifestEntry[]
	status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
	completedTrials: number
	totalTrials: number
	createdAt: string
	completedAt: string | null
}

export interface RunRecord extends RunRecordFile {
	sourceEvaluationId: string
	scenario: {
		id: string
		type: 'survey' | 'task'
		[key: string]: unknown
	}
	agentConfigs: Evaluation['agentConfigs']
	concurrency: number
}

function hydrateRunRecord(id: string, meta: RunRecordFile): RunRecord & { id: string } {
	return {
		...meta,
		id,
		sourceEvaluationId: meta.evaluationSnapshot.id,
		scenario: {
			id: meta.scenarioSnapshot.id,
			type: meta.evaluationSnapshot.scenarioType,
		},
		agentConfigs: meta.evaluationSnapshot.agentConfigs,
		concurrency: meta.evaluationSnapshot.concurrency,
	}
}

// ---- Run CRUD ----

export function createRun(data: {
	id?: string
	evaluationSnapshot: Evaluation
	scenarioSnapshot: StoredTask | StoredSurvey
	totalTrials: number
	crossingManifest?: CrossingManifestEntry[]
}): { id: string } {
	const id = data.id ?? crypto.randomUUID()
	const now = new Date().toISOString()

	const meta: RunRecordFile = {
		snapshotVersion: 1,
		evaluationSignature: computeEvaluationSignature(data.evaluationSnapshot, data.scenarioSnapshot),
		evaluationSnapshot: data.evaluationSnapshot,
		scenarioSnapshot: data.scenarioSnapshot,
		crossingManifest: data.crossingManifest,
		status: 'pending',
		totalTrials: data.totalTrials,
		completedTrials: 0,
		createdAt: now,
		completedAt: null,
	}

	const runDir = resultRunDir(id)
	ensureDir(runDir)
	writeJsonAtomic(evaluationMetaPath(id), meta)

	return { id }
}

export function getRun(id: string): (RunRecord & { id: string }) | null {
	const meta = readJsonOrNull<RunRecordFile>(evaluationMetaPath(id))
	if (!meta) return null
	return hydrateRunRecord(id, meta)
}

export function updateRunStatus(
	id: string,
	status: RunRecord['status'],
	completedTrials?: number,
): void {
	const meta = readJsonOrNull<RunRecordFile>(evaluationMetaPath(id))
	if (!meta) return
	meta.status = status
	if (completedTrials !== undefined) meta.completedTrials = completedTrials
	if (status === 'completed' || status === 'failed' || status === 'cancelled') {
		meta.completedAt = new Date().toISOString()
	}
	writeJsonAtomic(evaluationMetaPath(id), meta)
}

export function listRuns(evaluationId?: string): (RunRecord & { id: string })[] {
	const dir = resultsDir()
	let entries: string[]
	try {
		entries = readdirSync(dir)
	} catch {
		return []
	}

	const runs: (RunRecord & { id: string })[] = []
	for (const entry of entries) {
		const entryPath = `${dir}/${entry}`
		try {
			if (!statSync(entryPath).isDirectory()) continue
			const meta = getRun(entry)
			if (meta) {
				if (evaluationId && meta.sourceEvaluationId !== evaluationId) continue
				runs.push(meta)
			}
		} catch {
			// skip
		}
	}

	return runs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// ---- Trials (JSONL index) ----

export function appendTrialSummary(runId: string, summary: TrialSummary): void {
	appendJsonLine(trialsIndexPath(runId), summary)
}

export function getTrialSummaries(runId: string): TrialSummary[] {
	return readJsonLines<TrialSummary>(trialsIndexPath(runId))
}

// ---- Trial Detail Files ----

export function saveTrial(runId: string, trialId: string, data: TrialData): void {
	ensureDir(trialsDir(runId))
	writeJsonAtomic(trialPath(runId, trialId), data)
}

export function getTrial(runId: string, trialId: string): TrialData | null {
	return readJsonOrNull<TrialData>(trialPath(runId, trialId))
}

// ---- Cross-Run Queries ----

export function findTrialSummary(trialId: string): (TrialSummary & { runId: string }) | null {
	const allRuns = listRuns()
	for (const run of allRuns) {
		const summaries = getTrialSummaries(run.id)
		const found = summaries.find((s) => s.trialId === trialId)
		if (found) return { ...found, runId: run.id }
	}
	return null
}

export function listAllTrialSummaries(params: {
	scenarioId?: string
	scenarioType?: string
	limit?: number
	offset?: number
}): {
	results: (TrialSummary & {
		runId: string
		scenarioId: string
		scenarioType: string
	})[]
	total: number
} {
	const allRuns = listRuns()
	const allResults: (TrialSummary & {
		runId: string
		scenarioId: string
		scenarioType: string
	})[] = []

	for (const run of allRuns) {
		if (params.scenarioId && run.scenario.id !== params.scenarioId) continue
		if (params.scenarioType && run.scenario.type !== params.scenarioType) continue

		const summaries = getTrialSummaries(run.id)
		for (const summary of summaries) {
			allResults.push({
				...summary,
				runId: run.id,
				scenarioId: run.scenario.id,
				scenarioType: run.scenario.type,
			})
		}
	}

	allResults.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

	const total = allResults.length
	const offset = params.offset ?? 0
	const limit = params.limit ?? 50

	return {
		results: allResults.slice(offset, offset + limit),
		total,
	}
}

// ---- Dashboard Stats ----

export function getDashboardStats() {
	let surveyCount = 0
	let taskCount = 0

	try {
		surveyCount = readdirSync(surveysDir()).filter((f) => f.endsWith('.json')).length
	} catch {
		// dir may not exist
	}

	try {
		taskCount = readdirSync(tasksDir()).filter((f) => f.endsWith('.json')).length
	} catch {
		// dir may not exist
	}

	const allRuns = listRuns()

	return {
		surveyCount,
		taskCount,
		resultCount: allRuns.length,
		recentRuns: allRuns.slice(0, 5),
	}
}

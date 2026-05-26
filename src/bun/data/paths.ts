import { ensureDir } from './fs/json-store'

let dataDir: string | null = null

export function setDataDir(dir: string): void {
	dataDir = dir
}

/**
 * Test-only override for redirecting app data into a temporary directory.
 */
export function setDataDirForTests(dir: string): void {
	setDataDir(dir)
}

export function resetDataDirForTests(): void {
	dataDir = null
}

function getDataDir(): string {
	if (dataDir) return dataDir
	const envDir = process.env.AGENT_EVAL_DATA_DIR
	if (envDir) {
		dataDir = envDir
		return envDir
	}
	throw new Error('Data directory not initialized. Call setDataDir() before using data paths.')
}

/**
 * Ensure all required data directories exist. Call once at startup.
 */
export function initDataDirs(): void {
	const root = getDataDir()
	ensureDir(`${root}/scenarios/surveys`)
	ensureDir(`${root}/scenarios/tasks`)
	ensureDir(`${root}/tools/definitions`)
	ensureDir(`${root}/tools/sets`)
	ensureDir(`${root}/context/contents`)
	ensureDir(`${root}/context/content-sets`)
	ensureDir(`${root}/context/skills`)
	ensureDir(`${root}/context/skill-sets`)
	ensureDir(`${root}/results`)
	ensureDir(`${root}/evaluations`)
}

export function openDataDir(): void {
	const dir = getDataDir()

	const platform = process.platform
	if (platform === 'darwin') {
		Bun.spawn(['open', dir])
	} else if (platform === 'win32') {
		Bun.spawn(['explorer', dir])
	} else {
		Bun.spawn(['xdg-open', dir])
	}
}

export function settingsPath(): string {
	return `${getDataDir()}/settings.json`
}

export function surveysDir(): string {
	return `${getDataDir()}/scenarios/surveys`
}

export function surveyPath(id: string): string {
	return `${surveysDir()}/${id}.json`
}

export function tasksDir(): string {
	return `${getDataDir()}/scenarios/tasks`
}

export function taskPath(id: string): string {
	return `${tasksDir()}/${id}.json`
}

export function toolDefsDir(): string {
	return `${getDataDir()}/tools/definitions`
}

export function toolDefPath(id: string): string {
	return `${toolDefsDir()}/${id}.json`
}

export function toolSetsDir(): string {
	return `${getDataDir()}/tools/sets`
}

export function toolSetPath(id: string): string {
	return `${toolSetsDir()}/${id}.json`
}

export function resultsDir(): string {
	return `${getDataDir()}/results`
}

export function resultRunDir(runId: string): string {
	return `${resultsDir()}/${runId}`
}

export function evaluationMetaPath(runId: string): string {
	return `${resultRunDir(runId)}/evaluation.json`
}

export function trialsIndexPath(runId: string): string {
	return `${resultRunDir(runId)}/trials.jsonl`
}

export function trialsDir(runId: string): string {
	return `${resultRunDir(runId)}/trials`
}

export function trialPath(runId: string, trialId: string): string {
	return `${trialsDir(runId)}/${trialId}.json`
}

export function evaluationsDir(): string {
	return `${getDataDir()}/evaluations`
}

export function evaluationPath(id: string): string {
	return `${evaluationsDir()}/${id}.json`
}

export function contentsDir(): string {
	return `${getDataDir()}/context/contents`
}

export function contentPath(id: string): string {
	return `${contentsDir()}/${id}.json`
}

export function contentSetsDir(): string {
	return `${getDataDir()}/context/content-sets`
}

export function contentSetPath(id: string): string {
	return `${contentSetsDir()}/${id}.json`
}

export function skillsDir(): string {
	return `${getDataDir()}/context/skills`
}

export function skillPath(id: string): string {
	return `${skillsDir()}/${id}.json`
}

export function skillSetsDir(): string {
	return `${getDataDir()}/context/skill-sets`
}

export function skillSetPath(id: string): string {
	return `${skillSetsDir()}/${id}.json`
}

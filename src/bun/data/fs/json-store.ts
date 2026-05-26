import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs'

// ---- Error Types ----

export class StoreError extends Error {
	constructor(
		public readonly kind: 'not-found' | 'parse-error' | 'write-error',
		message: string,
		public readonly filePath: string,
		options?: ErrorOptions,
	) {
		super(message, options)
		this.name = 'StoreError'
	}
}

// ---- Directory Helpers ----

export function ensureDir(path: string): void {
	mkdirSync(path, { recursive: true })
}

// ---- JSON File Operations ----

/**
 * Read and parse a JSON file. Throws StoreError on not-found or parse failure.
 */
export function readJson<T>(path: string): T {
	if (!existsSync(path)) {
		throw new StoreError('not-found', `File not found: ${path}`, path)
	}
	try {
		return JSON.parse(readFileSync(path, 'utf-8')) as T
	} catch (err) {
		throw new StoreError('parse-error', `Failed to parse JSON: ${path}`, path, {
			cause: err,
		})
	}
}

/**
 * Read and parse a JSON file, returning null if not found.
 * Throws StoreError on parse failure (corrupt data is not silently swallowed).
 */
export function readJsonOrNull<T>(path: string): T | null {
	if (!existsSync(path)) return null
	try {
		return JSON.parse(readFileSync(path, 'utf-8')) as T
	} catch (err) {
		throw new StoreError('parse-error', `Failed to parse JSON: ${path}`, path, {
			cause: err,
		})
	}
}

/**
 * Atomic JSON write: writes to a temp file then renames.
 * Ensures read-after-write consistency even on crash.
 */
export function writeJsonAtomic(path: string, data: unknown): void {
	const tmp = `${path}.tmp`
	try {
		writeFileSync(tmp, JSON.stringify(data, null, 2))
		renameSync(tmp, path)
	} catch (err) {
		// Clean up temp file if rename failed
		try {
			if (existsSync(tmp)) unlinkSync(tmp)
		} catch {
			// ignore cleanup errors
		}
		throw new StoreError('write-error', `Failed to write JSON: ${path}`, path, {
			cause: err,
		})
	}
}

/**
 * List all .json files in a directory. Returns parsed objects.
 * Logs a warning for corrupt files instead of silently skipping them.
 */
export function listJsonDir<T>(dir: string, sort?: (a: T, b: T) => number): T[] {
	let files: string[]
	try {
		files = readdirSync(dir).filter((f) => f.endsWith('.json'))
	} catch {
		return []
	}

	const results: T[] = []
	for (const file of files) {
		const path = `${dir}/${file}`
		try {
			results.push(JSON.parse(readFileSync(path, 'utf-8')) as T)
		} catch (err) {
			console.warn(`[store] Skipping corrupt JSON file: ${path}`, err)
		}
	}

	if (sort) results.sort(sort)
	return results
}

/**
 * Delete a JSON file. Returns true if deleted, false if not found.
 */
export function deleteJsonFile(path: string): boolean {
	if (!existsSync(path)) return false
	unlinkSync(path)
	return true
}

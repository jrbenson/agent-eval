import { appendFileSync, existsSync, readFileSync } from 'node:fs'

/**
 * Read a JSONL file, parsing each line. Malformed lines are skipped with a warning.
 */
export function readJsonLines<T>(path: string): T[] {
	if (!existsSync(path)) return []
	const text = readFileSync(path, 'utf-8')
	const results: T[] = []

	for (const line of text.split('\n')) {
		const trimmed = line.trim()
		if (!trimmed) continue
		try {
			results.push(JSON.parse(trimmed) as T)
		} catch (err) {
			console.warn(`[store] Skipping malformed JSONL line in ${path}:`, err)
		}
	}

	return results
}

/**
 * Append a single JSON object as a line to a JSONL file.
 */
export function appendJsonLine(path: string, data: unknown): void {
	appendFileSync(path, `${JSON.stringify(data)}\n`)
}

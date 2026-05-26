/**
 * Generate a default name like "Survey 001", "Eval 002", etc.
 * Increments until a unique name is found.
 */
export function generateDefaultName(prefix: string, existingNames: string[]): string {
	const nameSet = new Set(existingNames.map((n) => n.toLowerCase()))
	let num = 1
	while (true) {
		const candidate = `${prefix} ${String(num).padStart(3, '0')}`
		if (!nameSet.has(candidate.toLowerCase())) return candidate
		num++
	}
}

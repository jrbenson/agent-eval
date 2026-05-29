/**
 * Parse agentConfigId into hierarchy segments.
 * Format: "provider:model" or "provider:model (opts)"
 */
export function parseConfigId(id: string): {
	provider: string
	model: string
	opts: string
} {
	const match = id.match(/^([^:]+):(.+?)\s*(?:\((.+)\))?$/)
	if (!match) return { provider: id, model: '', opts: '' }
	return {
		provider: match[1],
		model: match[2].trim(),
		opts: match[3] ?? '',
	}
}

/**
 * Shared text-cleaning utilities for LLM response parsing.
 * Used at view-time for display normalization and extraction analysis.
 * Never applied to persisted data.
 */

/** Remove XML/HTML-like tags (e.g. <think>...</think>, <output>, etc.) */
export function stripXmlTags(text: string): string {
	// Remove paired reasoning/chain-of-thought tags with content
	let result = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
	// Remove any remaining XML-style tags (opening/closing/self-closing)
	result = result.replace(/<\/?[a-z][a-z0-9_-]*\b[^>]*\/?>/gi, '')
	return result
}

/** Strip content after a pipe separator (explanation portion). */
export function stripPipeExplanation(text: string): string {
	return text.replace(/\s*\|.*$/, '')
}

/**
 * Remove decorative inline formatting from response text:
 * markdown headings, bold/italic markers, backticks, trailing punctuation.
 */
export function stripFormatting(text: string): string {
	return (
		text
			// Remove markdown heading prefixes (e.g., "# My Answer" → "My Answer")
			.replace(/^#{1,6}\s+/gm, '')
			// Remove markdown bold/italic markers
			.replace(/\*{1,3}/g, '')
			// Remove backticks
			.replace(/`/g, '')
			// Trim trailing punctuation like "–", "—", ":"
			.replace(/[\s–—:]+$/, '')
			.trim()
	)
}

/**
 * Unwrap paired formatting wrappers from outside-in:
 * **bold**, *italic*, `code`, [brackets], "quotes", 'quotes', (parens)
 */
export function stripWrappingMarkup(text: string): string {
	let result = text
	let changed = true
	while (changed) {
		changed = false
		const trimmed = result.trim()
		if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
			result = trimmed.slice(2, -2)
			changed = true
			continue
		}
		if (
			trimmed.startsWith('*') &&
			trimmed.endsWith('*') &&
			!trimmed.startsWith('**') &&
			trimmed.length > 2
		) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		if (trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
		}
	}
	return result
}

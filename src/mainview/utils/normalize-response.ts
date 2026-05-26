/**
 * Display-time normalization for survey free text responses.
 * Strips wrapping markup, XML tags, and extraneous whitespace
 * without modifying stored data.
 */

/** Remove XML/HTML-like tags (e.g. <think>...</think>, <output>, etc.) */
function stripXmlTags(text: string): string {
	// Remove self-closing and paired tags with content for known reasoning tags
	let result = text.replace(/<think>[\s\S]*?<\/think>/gi, '')
	// Remove any remaining XML-style tags (opening/closing/self-closing)
	result = result.replace(/<\/?[a-z][a-z0-9_-]*\b[^>]*\/?>/gi, '')
	return result
}

/** Remove wrapping formatting like **text**, `text`, [text], "text" */
function stripWrappingMarkup(text: string): string {
	let result = text
	// Iteratively strip paired wrappers from outside in
	let changed = true
	while (changed) {
		changed = false
		const trimmed = result.trim()
		// **bold**
		if (trimmed.startsWith('**') && trimmed.endsWith('**') && trimmed.length > 4) {
			result = trimmed.slice(2, -2)
			changed = true
			continue
		}
		// *italic*
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
		// `code`
		if (trimmed.startsWith('`') && trimmed.endsWith('`') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		// [brackets]
		if (trimmed.startsWith('[') && trimmed.endsWith(']') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		// "double quotes"
		if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		// 'single quotes'
		if (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
			continue
		}
		// (parens) — only if the whole thing is wrapped
		if (trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.length > 2) {
			result = trimmed.slice(1, -1)
			changed = true
		}
	}
	return result
}

/**
 * Normalize a free text response for display.
 * Strips XML tags, wrapping markup, collapses whitespace.
 */
export function normalizeDisplayResponse(raw: string): string {
	let result = stripXmlTags(raw)
	result = stripWrappingMarkup(result)
	// Collapse whitespace and trim
	result = result.replace(/\s+/g, ' ').trim()
	return result
}

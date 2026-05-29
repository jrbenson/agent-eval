/**
 * Display-time normalization for survey free text responses.
 * Strips wrapping markup, XML tags, and extraneous whitespace
 * without modifying stored data.
 */

import { stripWrappingMarkup, stripXmlTags } from '../../shared/text-cleaning'

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

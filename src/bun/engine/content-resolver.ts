import type { TaskContentRef } from '../../shared/schemas/task.schema'
import { getContentSet } from '../data/content-sets'
import { getContent } from '../data/contents'
import { dedupeByLastWrite } from './resolution/ordered-dedupe'

export interface ContentResolutionResult {
	entries: Array<{ name: string; content: string }>
	warnings: string[]
}

/**
 * Resolve content refs into a flat list of { name, content } entries.
 * Order-based last-write-wins for duplicate names.
 */
export function resolveTaskContent(contentRefs: TaskContentRef[]): ContentResolutionResult {
	const warnings: string[] = []
	const flatList: Array<{ name: string; content: string }> = []

	for (const ref of contentRefs) {
		if (ref.type === 'content') {
			const c = getContent(ref.contentId)
			if (!c) {
				warnings.push(`Content not found: ${ref.contentId}`)
				continue
			}
			flatList.push({ name: c.name, content: c.content })
		} else if (ref.type === 'contentSet') {
			const cs = getContentSet(ref.contentSetId)
			if (!cs) {
				warnings.push(`Content set not found: ${ref.contentSetId}`)
				continue
			}
			for (const setRef of cs.contentRefs) {
				const c = getContent(setRef.contentId)
				if (!c) {
					warnings.push(`Content not found in set "${cs.label}": ${setRef.contentId}`)
					continue
				}
				flatList.push({ name: c.name, content: c.content })
			}
		}
	}

	const { items } = dedupeByLastWrite(flatList, {
		key: (entry) => entry.name,
	})

	return { entries: items, warnings }
}

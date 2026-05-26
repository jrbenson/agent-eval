import type { TaskToolRef } from '../../shared/schemas/task.schema'
import { getToolSet } from '../data/tool-sets'
import { getToolDefinition } from '../data/tools'
import { dedupeByLastWrite } from './resolution/ordered-dedupe'
import type { ResolvedToolDef } from './tool-runtime'

export interface ToolResolutionResult {
	tools: ResolvedToolDef[]
	warnings: string[]
}

/**
 * Deep-merge a JSON Schema additions fragment into a tool's parameter schema.
 * Merges `properties` (additions overwrite) and unions `required` arrays.
 */
function applySchemaAdditions(
	toolSchema: Record<string, unknown>,
	additions: Record<string, unknown>,
): Record<string, unknown> {
	const merged = structuredClone(toolSchema)

	if (additions.properties) {
		merged.properties = {
			...(merged.properties as Record<string, unknown>),
			...(additions.properties as Record<string, unknown>),
		}
	}

	if (additions.required) {
		const existing = new Set((merged.required as string[]) ?? [])
		for (const r of additions.required as string[]) existing.add(r)
		merged.required = [...existing]
	}

	return merged
}

/**
 * Merge tool-level and set-level keywords, deduplicating.
 */
function mergeKeywords(toolKw?: string[], setKw?: string[]): string[] {
	const merged = new Set<string>()
	if (toolKw) for (const k of toolKw) merged.add(k)
	if (setKw) for (const k of setKw) merged.add(k)
	return [...merged]
}

/**
 * Resolve a task's toolRefs (which may include individual tool refs and tool set refs)
 * into a flat list of ResolvedToolDef[], applying order-based last-write-wins for
 * duplicate tool names and merging schema additions from tool sets.
 */
export function resolveTaskTools(toolRefs: TaskToolRef[]): ToolResolutionResult {
	const warnings: string[] = []
	const flatList: ResolvedToolDef[] = []

	for (const ref of toolRefs) {
		if (ref.type === 'tool') {
			const td = getToolDefinition(ref.toolDefinitionId)
			if (!td) {
				warnings.push(`Tool definition not found: ${ref.toolDefinitionId}`)
				continue
			}
			flatList.push({
				name: td.name,
				description: td.description,
				parameters: td.parameters,
				mockResponse: td.mockResponse,
				core: td.core,
				...(td.keywords?.length ? { keywords: td.keywords } : {}),
			})
		} else if (ref.type === 'toolSet') {
			const ts = getToolSet(ref.toolSetId)
			if (!ts) {
				warnings.push(`Tool set not found: ${ref.toolSetId}`)
				continue
			}
			for (const setRef of ts.toolRefs) {
				const td = getToolDefinition(setRef.toolDefinitionId)
				if (!td) {
					warnings.push(
						`Tool definition not found in set "${ts.label}": ${setRef.toolDefinitionId}`,
					)
					continue
				}
				const params = ts.schemaAdditions
					? applySchemaAdditions(td.parameters, ts.schemaAdditions)
					: td.parameters
				const mergedKeywords = mergeKeywords(td.keywords, ts.keywords)
				flatList.push({
					name: td.name,
					description: td.description,
					parameters: params,
					mockResponse: td.mockResponse,
					core: td.core,
					...(mergedKeywords.length ? { keywords: mergedKeywords } : {}),
				})
			}
		}
	}

	const deduped = dedupeByLastWrite(flatList, {
		key: (tool) => tool.name,
		duplicateWarning: (name) => `Duplicate tool name "${name}" resolved by order`,
	})
	warnings.push(...deduped.warnings)

	return { tools: deduped.items, warnings }
}

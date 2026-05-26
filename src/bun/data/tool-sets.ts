import type { CreateToolSetParams, StoredToolSet } from '../../shared/schemas/tool-set.schema'
import { getPresetToolSet } from '../presets'
import { toolSetPath, toolSetsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'
import { createToolFromPreset, exportToolDefinition } from './tools'

const toolSetRepository = createEntityRepository<CreateToolSetParams, StoredToolSet>({
	pathForId: toolSetPath,
	dirPath: toolSetsDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			label: data.label,
			description: data.description,
			toolRefs: data.toolRefs ?? [],
			schemaAdditions: data.schemaAdditions,
			...(data.keywords?.length ? { keywords: data.keywords } : {}),
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
})

export const createToolSet = toolSetRepository.create
export const getToolSet = toolSetRepository.get
export const listToolSets = toolSetRepository.list
export const updateToolSet = toolSetRepository.update
export const deleteToolSet = toolSetRepository.delete

// ---- Preset copy ----

export function createToolSetFromPreset(
	presetId: string,
): { id: string; toolIds: string[] } | null {
	const preset = getPresetToolSet(presetId)
	if (!preset) return null

	const toolIds: string[] = []
	const toolRefs: { toolDefinitionId: string }[] = []

	for (const toolPresetId of preset.toolPresetIds) {
		const result = createToolFromPreset(toolPresetId)
		if (result) {
			toolIds.push(result.id)
			toolRefs.push({ toolDefinitionId: result.id })
		}
	}

	const { id } = createToolSet({
		label: preset.label,
		description: preset.description,
		toolRefs,
		schemaAdditions: preset.schemaAdditions,
		keywords: preset.keywords,
	})

	return { id, toolIds }
}

// ---- Export ----

export function exportToolSet(
	id: string,
	includeMockBehavior: boolean,
): Record<string, unknown>[] | null {
	const set = getToolSet(id)
	if (!set) return null

	const tools: Record<string, unknown>[] = []
	for (const ref of set.toolRefs) {
		const exported = exportToolDefinition(ref.toolDefinitionId, includeMockBehavior)
		if (exported) tools.push(exported)
	}

	return tools
}

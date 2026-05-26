import type {
	CreateContentSetParams,
	StoredContentSet,
} from '../../shared/schemas/content-set.schema'
import { getPresetContentSet } from '../presets'
import { createContentFromPreset } from './contents'
import { contentSetPath, contentSetsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'

const contentSetRepository = createEntityRepository<CreateContentSetParams, StoredContentSet>({
	pathForId: contentSetPath,
	dirPath: contentSetsDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			label: data.label,
			description: data.description,
			contentRefs: data.contentRefs ?? [],
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
})

export const createContentSet = contentSetRepository.create
export const getContentSet = contentSetRepository.get
export const listContentSets = contentSetRepository.list
export const updateContentSet = contentSetRepository.update
export const deleteContentSet = contentSetRepository.delete

export function createContentSetFromPreset(
	presetId: string,
): { id: string; contentIds: string[] } | null {
	const preset = getPresetContentSet(presetId)
	if (!preset) return null

	const contentIds: string[] = []
	const contentRefs: { contentId: string }[] = []

	for (const cpId of preset.contentPresetIds) {
		const result = createContentFromPreset(cpId)
		if (result) {
			contentIds.push(result.id)
			contentRefs.push({ contentId: result.id })
		}
	}

	const { id } = createContentSet({
		label: preset.label,
		description: preset.description,
		contentRefs,
	})

	return { id, contentIds }
}

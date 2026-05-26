import type { CreateContentParams, StoredContent } from '../../shared/schemas/content.schema'
import { getPresetContent } from '../presets'
import { contentPath, contentsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'

const contentRepository = createEntityRepository<CreateContentParams, StoredContent>({
	pathForId: contentPath,
	dirPath: contentsDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			label: data.label,
			name: data.name,
			content: data.content,
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
})

export const createContent = contentRepository.create
export const getContent = contentRepository.get
export const listContents = contentRepository.list
export const updateContent = contentRepository.update
export const deleteContent = contentRepository.delete

export function createContentFromPreset(presetId: string): { id: string } | null {
	const preset = getPresetContent(presetId)
	if (!preset) return null
	return createContent({
		label: preset.label,
		name: preset.name,
		content: preset.content,
	})
}

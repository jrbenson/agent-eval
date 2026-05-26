import type { CreateSkillSetParams, StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import { getPresetSkillSet } from '../presets'
import { skillSetPath, skillSetsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'
import { createSkillFromPreset } from './skills'

const skillSetRepository = createEntityRepository<CreateSkillSetParams, StoredSkillSet>({
	pathForId: skillSetPath,
	dirPath: skillSetsDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			label: data.label,
			description: data.description,
			skillRefs: data.skillRefs ?? [],
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
})

export const createSkillSet = skillSetRepository.create
export const getSkillSet = skillSetRepository.get
export const listSkillSets = skillSetRepository.list
export const updateSkillSet = skillSetRepository.update
export const deleteSkillSet = skillSetRepository.delete

export function createSkillSetFromPreset(
	presetId: string,
): { id: string; skillIds: string[] } | null {
	const preset = getPresetSkillSet(presetId)
	if (!preset) return null

	const skillIds: string[] = []
	const skillRefs: { skillId: string }[] = []

	for (const spId of preset.skillPresetIds) {
		const result = createSkillFromPreset(spId)
		if (result) {
			skillIds.push(result.id)
			skillRefs.push({ skillId: result.id })
		}
	}

	const { id } = createSkillSet({
		label: preset.label,
		description: preset.description,
		skillRefs,
	})

	return { id, skillIds }
}

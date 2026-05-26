import type { CreateSkillParams, StoredSkill } from '../../shared/schemas/skill.schema'
import { getPresetSkill } from '../presets'
import { skillPath, skillsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'

const skillRepository = createEntityRepository<CreateSkillParams, StoredSkill>({
	pathForId: skillPath,
	dirPath: skillsDir,
	createStored(data, meta) {
		return {
			id: meta.id,
			label: data.label,
			name: data.name,
			description: data.description,
			content: data.content,
			createdAt: meta.now,
			updatedAt: meta.now,
		}
	},
	sort: sortByCreatedAtAscending,
})

export const createSkill = skillRepository.create
export const getSkill = skillRepository.get
export const listSkills = skillRepository.list
export const updateSkill = skillRepository.update
export const deleteSkill = skillRepository.delete

export function createSkillFromPreset(presetId: string): { id: string } | null {
	const preset = getPresetSkill(presetId)
	if (!preset) return null
	return createSkill({
		label: preset.label,
		name: preset.name,
		description: preset.description,
		content: preset.content,
	})
}

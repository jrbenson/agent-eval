import { createContentSetFromPreset } from '../../bun/data/content-sets'
import { createSkillSetFromPreset } from '../../bun/data/skill-sets'
import { createToolSetFromPreset } from '../../bun/data/tool-sets'

export interface MaterializedPresetTaskDependencies {
	toolSetId: string
	toolIds: string[]
	contentSetId: string
	contentIds: string[]
	skillSetId: string
	skillIds: string[]
}

export function materializePresetTaskDependencies(): MaterializedPresetTaskDependencies {
	const toolSet = createToolSetFromPreset('preset:file-tools')
	const contentSet = createContentSetFromPreset('preset-content-set-project-files')
	const skillSet = createSkillSetFromPreset('preset-skill-set-analysis')

	if (!toolSet || !contentSet || !skillSet) {
		throw new Error('Failed to materialize preset task dependencies for testing')
	}

	return {
		toolSetId: toolSet.id,
		toolIds: toolSet.toolIds,
		contentSetId: contentSet.id,
		contentIds: contentSet.contentIds,
		skillSetId: skillSet.id,
		skillIds: skillSet.skillIds,
	}
}

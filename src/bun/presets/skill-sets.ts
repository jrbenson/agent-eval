import type { PresetSkillSet } from './types'

export const PRESET_SKILL_SETS: PresetSkillSet[] = [
	{
		presetId: 'preset-skill-set-analysis',
		label: 'Analysis Skills',
		description: 'Skills for reviewing and summarizing content',
		skillPresetIds: ['preset-skill-code-review', 'preset-skill-summarize'],
	},
]

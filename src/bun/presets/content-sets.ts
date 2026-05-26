import type { PresetContentSet } from './types'

export const PRESET_CONTENT_SETS: PresetContentSet[] = [
	{
		presetId: 'preset-content-set-project-files',
		label: 'Project Files',
		description: 'Sample project files for file-based tool testing',
		contentPresetIds: ['preset-content-readme', 'preset-content-notes', 'preset-content-records'],
	},
]

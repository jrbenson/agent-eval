import type { PresetToolSet } from './types'

export const PRESET_TOOL_SETS: PresetToolSet[] = [
	{
		presetId: 'preset:file-tools',
		label: 'File Tools',
		description: 'Basic file reading and editing tools.',
		toolPresetIds: ['preset:read_file', 'preset:edit_file'],
		keywords: ['file', 'read', 'edit', 'write'],
	},
]

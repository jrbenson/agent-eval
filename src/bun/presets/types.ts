import type { MockResponseConfig } from '../../shared/schemas/tool-definition.schema'

export interface PresetToolDefinition {
	presetId: string
	label: string
	name: string
	description: string
	parameters: Record<string, unknown>
	mockResponse: MockResponseConfig
	core: boolean
	keywords?: string[]
}

export interface PresetToolSet {
	presetId: string
	label: string
	description?: string
	toolPresetIds: string[]
	schemaAdditions?: Record<string, unknown>
	keywords?: string[]
}

export interface PresetContent {
	presetId: string
	label: string
	name: string
	content: string
}

export interface PresetContentSet {
	presetId: string
	label: string
	description?: string
	contentPresetIds: string[]
}

export interface PresetSkill {
	presetId: string
	label: string
	name: string
	description: string
	content: string
}

export interface PresetSkillSet {
	presetId: string
	label: string
	description?: string
	skillPresetIds: string[]
}

import { PRESET_CONTENT_SETS } from './content-sets'
import { PRESET_CONTENTS } from './contents'
import { PRESET_SKILL_SETS } from './skill-sets'
import { PRESET_SKILLS } from './skills'
import { PRESET_TOOL_SETS } from './tool-sets'
import { PRESET_TOOLS } from './tools'
import type {
	PresetContent,
	PresetContentSet,
	PresetSkill,
	PresetSkillSet,
	PresetToolDefinition,
	PresetToolSet,
} from './types'

export function listPresetTools(): PresetToolDefinition[] {
	return PRESET_TOOLS
}

export function getPresetTool(presetId: string): PresetToolDefinition | null {
	return PRESET_TOOLS.find((t) => t.presetId === presetId) ?? null
}

export function listPresetToolSets(): PresetToolSet[] {
	return PRESET_TOOL_SETS
}

export function getPresetToolSet(presetId: string): PresetToolSet | null {
	return PRESET_TOOL_SETS.find((s) => s.presetId === presetId) ?? null
}

export function listPresetContents(): PresetContent[] {
	return PRESET_CONTENTS
}

export function getPresetContent(presetId: string): PresetContent | null {
	return PRESET_CONTENTS.find((c) => c.presetId === presetId) ?? null
}

export function listPresetContentSets(): PresetContentSet[] {
	return PRESET_CONTENT_SETS
}

export function getPresetContentSet(presetId: string): PresetContentSet | null {
	return PRESET_CONTENT_SETS.find((s) => s.presetId === presetId) ?? null
}

export function listPresetSkills(): PresetSkill[] {
	return PRESET_SKILLS
}

export function getPresetSkill(presetId: string): PresetSkill | null {
	return PRESET_SKILLS.find((s) => s.presetId === presetId) ?? null
}

export function listPresetSkillSets(): PresetSkillSet[] {
	return PRESET_SKILL_SETS
}

export function getPresetSkillSet(presetId: string): PresetSkillSet | null {
	return PRESET_SKILL_SETS.find((s) => s.presetId === presetId) ?? null
}

export type {
	PresetContent,
	PresetContentSet,
	PresetSkill,
	PresetSkillSet,
	PresetToolDefinition,
	PresetToolSet,
}

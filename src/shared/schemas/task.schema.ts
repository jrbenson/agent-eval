import { z } from 'zod'
import { ToolDefinitionSchema } from './tool-definition.schema'

export const TaskToolRefSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('tool'),
		toolDefinitionId: z.string(),
	}),
	z.object({
		type: z.literal('toolSet'),
		toolSetId: z.string(),
	}),
])

export type TaskToolRef = z.infer<typeof TaskToolRefSchema>

export const TaskContentRefSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('content'),
		contentId: z.string(),
	}),
	z.object({
		type: z.literal('contentSet'),
		contentSetId: z.string(),
	}),
])

export type TaskContentRef = z.infer<typeof TaskContentRefSchema>

export const TaskSkillRefSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('skill'),
		skillId: z.string(),
	}),
	z.object({
		type: z.literal('skillSet'),
		skillSetId: z.string(),
	}),
])

export type TaskSkillRef = z.infer<typeof TaskSkillRefSchema>

export const InlineSkillSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	content: z.string(),
})

export type InlineSkill = z.infer<typeof InlineSkillSchema>

export const GoalConditionSchema = z.discriminatedUnion('type', [
	z.object({
		type: z.literal('string_match'),
		pattern: z.string().min(1),
		caseSensitive: z.boolean().default(false),
	}),
	z.object({
		type: z.literal('regex'),
		pattern: z.string().min(1),
	}),
	z.object({
		type: z.literal('tool_called'),
		toolName: z.string().min(1),
		inputSubset: z.record(z.string(), z.unknown()).optional(),
	}),
	z.object({
		type: z.literal('schema_match'),
		schema: z.record(z.string(), z.unknown()),
	}),
	z.object({
		type: z.literal('output_subset'),
		subset: z.record(z.string(), z.unknown()),
	}),
])

export const TaskSchema = z.object({
	id: z.string().uuid(),
	label: z.string().min(1),
	taskPrompts: z.array(z.string().min(1)).min(1),
	systemPrompt: z.string().optional(),
	toolRefs: z.array(TaskToolRefSchema).default([]),
	/** @deprecated Legacy inline tool definitions — migrated to toolRefs on load */
	toolDefinitions: z.array(ToolDefinitionSchema).optional(),
	contentRefs: z.array(TaskContentRefSchema).default([]),
	skillRefs: z.array(TaskSkillRefSchema).default([]),
	inlineSkills: z.array(InlineSkillSchema).optional(),
	goalConditions: z.array(GoalConditionSchema).default([]),
	initialPersistence: z.array(z.object({ name: z.string(), content: z.string() })).optional(),
	simulateWithLlm: z.boolean().default(false),
	simulationInstructions: z.string().optional(),
	primaryVariantLabel: z.string().optional(),
	variants: z.array(z.lazy(() => TaskVariantSchema)).default([]),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

export type GoalCondition = z.infer<typeof GoalConditionSchema>
export type Task = z.infer<typeof TaskSchema>

/**
 * Fields that a variant may override.
 * Adding a new field to TaskSchema + this list makes it overridable.
 */
export const OVERRIDABLE_KEYS = [
	'taskPrompts',
	'systemPrompt',
	'goalConditions',
	'toolRefs',
	'contentRefs',
	'skillRefs',
	'inlineSkills',
	'initialPersistence',
	'simulateWithLlm',
	'simulationInstructions',
] as const

export type OverridableKey = (typeof OVERRIDABLE_KEYS)[number]

const TaskBodySchema = TaskSchema.pick(
	Object.fromEntries(OVERRIDABLE_KEYS.map((k) => [k, true])) as Record<OverridableKey, true>,
)

export const TaskVariantOverridesSchema = TaskBodySchema.partial()
export type TaskVariantOverrides = z.infer<typeof TaskVariantOverridesSchema>

export const TaskVariantSchema = z.object({
	id: z.string().uuid(),
	label: z.string().min(1),
	overrides: TaskVariantOverridesSchema,
})
export type TaskVariant = z.infer<typeof TaskVariantSchema>

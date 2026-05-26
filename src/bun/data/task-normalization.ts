import type { TaskParams } from '../../shared/rpc-types'
import type { TaskToolRef, TaskVariant } from '../../shared/schemas/task.schema'

type TaskCollectionFields = Pick<
	TaskParams,
	| 'systemPrompt'
	| 'toolRefs'
	| 'contentRefs'
	| 'skillRefs'
	| 'inlineSkills'
	| 'goalConditions'
	| 'initialPersistence'
	| 'simulateWithLlm'
	| 'simulationInstructions'
	| 'variants'
>

type NormalizedTaskCollections = {
	systemPrompt?: string
	toolRefs: TaskToolRef[]
	contentRefs: NonNullable<TaskParams['contentRefs']>
	skillRefs: NonNullable<TaskParams['skillRefs']>
	inlineSkills: NonNullable<TaskParams['inlineSkills']>
	goalConditions: NonNullable<TaskParams['goalConditions']>
	initialPersistence: NonNullable<TaskParams['initialPersistence']>
	simulateWithLlm: boolean
	simulationInstructions?: string
	variants: TaskVariant[]
}

/** Migrate legacy toolRefs (without `type` field) to discriminated union format. */
export function migrateToolRefs(refs: unknown[] | undefined): TaskToolRef[] {
	if (!refs) return []
	return (refs as Record<string, unknown>[]).map((ref) => {
		if (ref.type) return ref as TaskToolRef
		return {
			type: 'tool' as const,
			toolDefinitionId: ref.toolDefinitionId as string,
		}
	})
}

export function normalizeTaskCollections<T extends TaskCollectionFields>(task: T) {
	return {
		...task,
		systemPrompt: task.systemPrompt?.trim() ? task.systemPrompt : undefined,
		toolRefs: migrateToolRefs(task.toolRefs),
		contentRefs: task.contentRefs ?? [],
		skillRefs: task.skillRefs ?? [],
		inlineSkills: task.inlineSkills ?? [],
		goalConditions: task.goalConditions ?? [],
		initialPersistence: task.initialPersistence ?? [],
		simulateWithLlm: task.simulateWithLlm ?? false,
		simulationInstructions: task.simulationInstructions?.trim()
			? task.simulationInstructions
			: undefined,
		variants: normalizeVariants(task.variants),
	} as Omit<T, keyof TaskCollectionFields> & NormalizedTaskCollections
}

/** Normalize variant overrides — migrate toolRefs within each variant. */
function normalizeVariants(variants: TaskVariant[] | undefined): TaskVariant[] {
	if (!variants || variants.length === 0) return []
	return variants.map((variant) => ({
		...variant,
		overrides: {
			...variant.overrides,
			...(variant.overrides.toolRefs
				? { toolRefs: migrateToolRefs(variant.overrides.toolRefs) }
				: {}),
		},
	}))
}

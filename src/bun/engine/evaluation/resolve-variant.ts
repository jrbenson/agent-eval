import type { StoredTask } from '../../../shared/rpc-types'
import type { OVERRIDABLE_KEYS, TaskVariant } from '../../../shared/schemas/task.schema'

export type ResolvedVariantTask = StoredTask & {
	_variantId: string
	_variantLabel: string
}

/**
 * Merge a variant's overrides onto the primary task to produce a resolved task.
 * Only fields present in overrides replace the primary; others are inherited.
 */
export function resolveVariant(primary: StoredTask, variant: TaskVariant): ResolvedVariantTask {
	const overrides: Partial<StoredTask> = {}
	for (const key of Object.keys(variant.overrides) as Array<(typeof OVERRIDABLE_KEYS)[number]>) {
		const value = variant.overrides[key]
		if (value !== undefined) {
			;(overrides as Record<string, unknown>)[key] = value
		}
	}

	return {
		...primary,
		...overrides,
		_variantId: variant.id,
		_variantLabel: variant.label,
	}
}

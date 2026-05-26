import type { CrossingManifestEntry, StoredTask } from '../../../shared/rpc-types'
import type { OverridableKey } from '../../../shared/schemas/task.schema'
import { resolveVariant } from './resolve-variant'

const PRIMARY_SENTINEL = 'primary'

// ---- Validation ----

export interface CrossingValidationError {
	message: string
}

/**
 * Validate variant crossing groups against the task's variants.
 * Returns an empty array when valid, or a list of errors.
 */
export function validateVariantCrossings(
	task: StoredTask,
	groups: string[][],
): CrossingValidationError[] {
	const errors: CrossingValidationError[] = []
	const variantMap = new Map((task.variants ?? []).map((v) => [v.id, v]))

	// Rule 4: non-empty groups
	for (let i = 0; i < groups.length; i++) {
		if (groups[i].length === 0) {
			errors.push({ message: `Group ${i + 1} is empty.` })
		}
	}

	// Rule 5: at least two groups
	if (groups.length < 2) {
		errors.push({
			message: 'At least two crossing groups are required.',
		})
	}

	// Rule 1: all variant IDs must exist (or be "primary")
	const seenIds = new Set<string>()
	for (let gi = 0; gi < groups.length; gi++) {
		for (const id of groups[gi]) {
			if (id !== PRIMARY_SENTINEL && !variantMap.has(id)) {
				errors.push({
					message: `Group ${gi + 1} references unknown variant ID "${id}".`,
				})
			}
			// Rule 2: no variant in more than one group
			if (seenIds.has(id)) {
				errors.push({
					message: `Variant "${id === PRIMARY_SENTINEL ? 'Primary' : (variantMap.get(id)?.label ?? id)}" appears in multiple groups.`,
				})
			}
			seenIds.add(id)
		}
	}

	// Rule 3: disjoint override keys across groups
	const keysByGroup: Set<OverridableKey>[] = groups.map((group) => {
		const keys = new Set<OverridableKey>()
		for (const id of group) {
			if (id === PRIMARY_SENTINEL) continue // primary has no overrides
			const variant = variantMap.get(id)
			if (!variant) continue
			for (const key of Object.keys(variant.overrides) as OverridableKey[]) {
				if (variant.overrides[key] !== undefined) {
					keys.add(key)
				}
			}
		}
		return keys
	})

	for (let i = 0; i < keysByGroup.length; i++) {
		for (let j = i + 1; j < keysByGroup.length; j++) {
			for (const key of keysByGroup[i]) {
				if (keysByGroup[j].has(key)) {
					errors.push({
						message: `Groups ${i + 1} and ${j + 1} both override "${key}". Each overridable key must be isolated to one group.`,
					})
				}
			}
		}
	}

	return errors
}

/**
 * Get the set of override keys used by all variants in a crossing group.
 * Useful for UI to determine which variants are valid additions to other groups.
 */
export function getGroupOverrideKeys(
	task: StoredTask,
	groupVariantIds: string[],
): Set<OverridableKey> {
	const variantMap = new Map((task.variants ?? []).map((v) => [v.id, v]))
	const keys = new Set<OverridableKey>()
	for (const id of groupVariantIds) {
		if (id === PRIMARY_SENTINEL) continue
		const variant = variantMap.get(id)
		if (!variant) continue
		for (const key of Object.keys(variant.overrides) as OverridableKey[]) {
			if (variant.overrides[key] !== undefined) {
				keys.add(key)
			}
		}
	}
	return keys
}

// ---- Cartesian product ----

function cartesianProduct<T>(arrays: T[][]): T[][] {
	if (arrays.length === 0) return [[]]
	return arrays.reduce<T[][]>(
		(acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
		[[]],
	)
}

// ---- Crossing resolution ----

export interface CrossedVariantEntry {
	manifest: CrossingManifestEntry
	task: StoredTask
}

/**
 * Resolve crossing groups into materialized variant combinations.
 * Each combination is a fresh UUID, a composite label, and a resolved task snapshot.
 */
export function resolveCrossedVariants(
	primary: StoredTask,
	groups: string[][],
): CrossedVariantEntry[] {
	const variantMap = new Map((primary.variants ?? []).map((v) => [v.id, v]))

	const combinations = cartesianProduct(groups)

	return combinations.map((combo) => {
		const constituentIds = combo.slice().sort()
		const labels: string[] = []

		// Sequentially apply each constituent's overrides
		let resolved = primary
		for (const id of combo) {
			if (id === PRIMARY_SENTINEL) {
				labels.push(primary.primaryVariantLabel ?? 'Primary')
				continue
			}
			const variant = variantMap.get(id)
			if (!variant) continue
			labels.push(variant.label)
			resolved = resolveVariant(resolved, variant)
		}

		const crossedVariantId = crypto.randomUUID()

		return {
			manifest: {
				crossedVariantId,
				crossedVariantLabel: labels.join(', '),
				constituentIds,
			},
			task: resolved,
		}
	})
}

/**
 * Determine which task variant IDs are assigned to crossing groups.
 */
export function getGroupedVariantIds(groups: string[][]): Set<string> {
	const ids = new Set<string>()
	for (const group of groups) {
		for (const id of group) {
			ids.add(id)
		}
	}
	return ids
}

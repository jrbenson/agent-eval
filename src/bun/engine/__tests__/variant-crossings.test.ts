import { describe, expect, it } from 'bun:test'
import type { StoredTask } from '../../../shared/rpc-types'
import type { TaskVariant } from '../../../shared/schemas/task.schema'
import {
	getGroupedVariantIds,
	resolveCrossedVariants,
	validateVariantCrossings,
} from '../evaluation/variant-crossings'

function makeVariant(
	id: string,
	label: string,
	overrides: TaskVariant['overrides'] = {},
): TaskVariant {
	return { id, label, overrides }
}

function makeTask(variants: TaskVariant[]): StoredTask {
	return {
		id: 'task-1',
		label: 'Test Task',
		taskPrompts: ['Do the thing'],
		toolRefs: [],
		contentRefs: [],
		skillRefs: [],
		goalConditions: [{ type: 'string_match', pattern: 'done', caseSensitive: false }],
		simulateWithLlm: false,
		primaryVariantLabel: 'Primary',
		variants,
		createdAt: '2025-01-01T00:00:00Z',
		updatedAt: '2025-01-01T00:00:00Z',
	} as StoredTask
}

// ---- validateVariantCrossings ----

describe('validateVariantCrossings', () => {
	const vPromptA = makeVariant('v-prompt-a', 'Prompt A', {
		taskPrompts: ['Alt prompt A'],
	})
	const vPromptB = makeVariant('v-prompt-b', 'Prompt B', {
		taskPrompts: ['Alt prompt B'],
	})
	const vToolA = makeVariant('v-tool-a', 'ToolSet A', {
		toolRefs: [{ type: 'tool', toolDefinitionId: 'tool-1' }],
	})
	const vToolB = makeVariant('v-tool-b', 'ToolSet B', {
		toolRefs: [{ type: 'tool', toolDefinitionId: 'tool-2' }],
	})

	const task = makeTask([vPromptA, vPromptB, vToolA, vToolB])

	it('accepts valid disjoint groups', () => {
		const errors = validateVariantCrossings(task, [
			[vPromptA.id, vPromptB.id],
			[vToolA.id, vToolB.id],
		])
		expect(errors).toHaveLength(0)
	})

	it('accepts primary in a group', () => {
		const errors = validateVariantCrossings(task, [
			['primary', vPromptA.id],
			[vToolA.id, vToolB.id],
		])
		expect(errors).toHaveLength(0)
	})

	it('rejects fewer than 2 groups', () => {
		const errors = validateVariantCrossings(task, [[vPromptA.id]])
		expect(errors.some((e) => e.message.includes('two crossing groups'))).toBe(true)
	})

	it('rejects empty groups', () => {
		const errors = validateVariantCrossings(task, [[vPromptA.id], []])
		expect(errors.some((e) => e.message.includes('empty'))).toBe(true)
	})

	it('rejects unknown variant IDs', () => {
		const errors = validateVariantCrossings(task, [['nonexistent-id'], [vToolA.id]])
		expect(errors.some((e) => e.message.includes('unknown variant'))).toBe(true)
	})

	it('rejects variant in multiple groups', () => {
		const errors = validateVariantCrossings(task, [
			[vPromptA.id, vToolA.id],
			[vToolA.id, vToolB.id],
		])
		expect(errors.some((e) => e.message.includes('multiple groups'))).toBe(true)
	})

	it('rejects overlapping override keys across groups', () => {
		const vConflict = makeVariant('v-conflict', 'Conflict', {
			taskPrompts: ['conflicting prompt'],
		})
		const conflictTask = makeTask([vPromptA, vConflict, vToolA])
		const errors = validateVariantCrossings(conflictTask, [
			[vPromptA.id],
			[vConflict.id, vToolA.id],
		])
		expect(errors.some((e) => e.message.includes('taskPrompts'))).toBe(true)
	})
})

// ---- resolveCrossedVariants ----

describe('resolveCrossedVariants', () => {
	const vPromptA = makeVariant('v-prompt-a', 'Prompt A', {
		taskPrompts: ['Alt prompt A'],
	})
	const vPromptB = makeVariant('v-prompt-b', 'Prompt B', {
		taskPrompts: ['Alt prompt B'],
	})
	const vToolA = makeVariant('v-tool-a', 'ToolSet A', {
		toolRefs: [{ type: 'tool', toolDefinitionId: 'tool-1' }],
	})
	const vToolB = makeVariant('v-tool-b', 'ToolSet B', {
		toolRefs: [{ type: 'tool', toolDefinitionId: 'tool-2' }],
	})

	const task = makeTask([vPromptA, vPromptB, vToolA, vToolB])

	it('produces correct cartesian product', () => {
		const entries = resolveCrossedVariants(task, [
			[vPromptA.id, vPromptB.id],
			[vToolA.id, vToolB.id],
		])
		expect(entries).toHaveLength(4)
	})

	it('each entry has unique crossedVariantId', () => {
		const entries = resolveCrossedVariants(task, [
			[vPromptA.id, vPromptB.id],
			[vToolA.id, vToolB.id],
		])
		const ids = entries.map((e) => e.manifest.crossedVariantId)
		expect(new Set(ids).size).toBe(4)
	})

	it('composite labels include constituent variant labels', () => {
		const entries = resolveCrossedVariants(task, [[vPromptA.id], [vToolA.id, vToolB.id]])
		expect(entries).toHaveLength(2)
		expect(entries[0].manifest.crossedVariantLabel).toBe('Prompt A, ToolSet A')
		expect(entries[1].manifest.crossedVariantLabel).toBe('Prompt A, ToolSet B')
	})

	it('resolved task merges overrides from both groups', () => {
		const entries = resolveCrossedVariants(task, [[vPromptA.id], [vToolA.id]])
		expect(entries).toHaveLength(1)
		const resolved = entries[0].task
		expect(resolved.taskPrompts).toEqual(['Alt prompt A'])
		expect(resolved.toolRefs).toEqual([{ type: 'tool', toolDefinitionId: 'tool-1' }])
	})

	it('includes primary in crossing when specified', () => {
		const entries = resolveCrossedVariants(task, [['primary', vPromptA.id], [vToolA.id]])
		expect(entries).toHaveLength(2)
		// First: primary × toolA — primary label + tool label
		const primaryEntry = entries.find((e) => e.manifest.constituentIds.includes('primary'))!
		expect(primaryEntry.manifest.crossedVariantLabel).toContain('Primary')
		// Task prompts should be original (primary = no override)
		expect(primaryEntry.task.taskPrompts).toEqual(['Do the thing'])
	})

	it('constituentIds are sorted', () => {
		const entries = resolveCrossedVariants(task, [[vToolB.id], [vPromptA.id]])
		expect(entries).toHaveLength(1)
		const ids = entries[0].manifest.constituentIds
		// Sorted lexically
		expect(ids).toEqual([...ids].sort())
	})
})

// ---- getGroupedVariantIds ----

describe('getGroupedVariantIds', () => {
	it('collects all IDs from groups', () => {
		const ids = getGroupedVariantIds([
			['a', 'b'],
			['c', 'primary'],
		])
		expect(ids).toEqual(new Set(['a', 'b', 'c', 'primary']))
	})

	it('returns empty set for empty groups', () => {
		expect(getGroupedVariantIds([])).toEqual(new Set())
	})
})

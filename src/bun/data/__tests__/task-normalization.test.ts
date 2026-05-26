import { describe, expect, it } from 'bun:test'
import type { TaskParams } from '../../../shared/rpc-types'
import { normalizeTaskCollections } from '../task-normalization'

type StoredTaskLike = TaskParams & {
	id: string
	createdAt: string
	updatedAt: string
}

function createStoredTask(overrides: Partial<StoredTaskLike> = {}): StoredTaskLike {
	return {
		id: '00000000-0000-0000-0000-000000000000',
		label: 'Scenario Task',
		taskPrompts: ['Do the thing'],
		toolRefs: [],
		contentRefs: [{ type: 'content', contentId: 'content-1' }],
		skillRefs: [{ type: 'skill', skillId: 'skill-1' }],
		inlineSkills: [{ name: 'inline', description: 'desc', content: 'body' }],
		goalConditions: [
			{
				type: 'string_match',
				pattern: 'done',
				caseSensitive: false,
			},
		],
		initialPersistence: [{ name: 'seed', content: '{}' }],
		createdAt: '2026-04-30T00:00:00.000Z',
		updatedAt: '2026-04-30T00:00:00.000Z',
		...overrides,
	}
}

describe('task normalization', () => {
	it('preserves explicit clears and normalizes optional collections', () => {
		const cleared = normalizeTaskCollections(
			createStoredTask({
				contentRefs: [],
				skillRefs: [],
				inlineSkills: [],
				goalConditions: [],
				initialPersistence: [],
			}),
		)

		expect(cleared.contentRefs).toEqual([])
		expect(cleared.skillRefs).toEqual([])
		expect(cleared.inlineSkills).toEqual([])
		expect(cleared.goalConditions).toEqual([])
		expect(cleared.initialPersistence).toEqual([])

		const normalized = normalizeTaskCollections(
			createStoredTask({
				systemPrompt: '   ',
				contentRefs: undefined,
				skillRefs: undefined,
				inlineSkills: undefined,
				initialPersistence: undefined,
			}),
		)

		expect(normalized.systemPrompt).toBeUndefined()
		expect(normalized.contentRefs).toEqual([])
		expect(normalized.skillRefs).toEqual([])
		expect(normalized.inlineSkills).toEqual([])
		expect(normalized.goalConditions).toHaveLength(1)
		expect(normalized.initialPersistence).toEqual([])
	})
})

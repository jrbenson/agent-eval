import type { InlineSkill, TaskSkillRef } from '../../shared/schemas/task.schema'
import { getSkillSet } from '../data/skill-sets'
import { getSkill } from '../data/skills'
import { dedupeByLastWrite } from './resolution/ordered-dedupe'

export interface ResolvedSkill {
	name: string
	description: string
	content: string
}

export interface SkillResolutionResult {
	skills: ResolvedSkill[]
	warnings: string[]
}

/**
 * Resolve skill refs + inline skills into a flat list.
 * Shared refs come first, inline skills appended after.
 * Dedup by name (case-insensitive), last-write-wins.
 */
export function resolveTaskSkills(
	skillRefs: TaskSkillRef[],
	inlineSkills: InlineSkill[],
): SkillResolutionResult {
	const warnings: string[] = []
	const flatList: ResolvedSkill[] = []

	for (const ref of skillRefs) {
		if (ref.type === 'skill') {
			const s = getSkill(ref.skillId)
			if (!s) {
				warnings.push(`Skill not found: ${ref.skillId}`)
				continue
			}
			flatList.push({
				name: s.name,
				description: s.description,
				content: s.content,
			})
		} else if (ref.type === 'skillSet') {
			const ss = getSkillSet(ref.skillSetId)
			if (!ss) {
				warnings.push(`Skill set not found: ${ref.skillSetId}`)
				continue
			}
			for (const setRef of ss.skillRefs) {
				const s = getSkill(setRef.skillId)
				if (!s) {
					warnings.push(`Skill not found in set "${ss.label}": ${setRef.skillId}`)
					continue
				}
				flatList.push({
					name: s.name,
					description: s.description,
					content: s.content,
				})
			}
		}
	}

	// Append inline skills after shared refs
	for (const inline of inlineSkills) {
		flatList.push({
			name: inline.name,
			description: inline.description,
			content: inline.content,
		})
	}

	const { items } = dedupeByLastWrite(flatList, {
		key: (skill) => skill.name,
		normalizeKey: (name) => name.toLowerCase(),
	})

	return { skills: items, warnings }
}

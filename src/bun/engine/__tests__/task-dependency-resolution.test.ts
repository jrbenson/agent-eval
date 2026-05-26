import { describe, expect, it } from 'bun:test'
import { withTestRuntime } from '../../../testing/fixtures/test-runtime'
import { createContentSet } from '../../data/content-sets'
import { createContent } from '../../data/contents'
import { createSkillSet } from '../../data/skill-sets'
import { createSkill } from '../../data/skills'
import { resolveTaskContent } from '../content-resolver'
import { resolveTaskSkills } from '../skill-resolver'

describe('task dependency resolvers', () => {
	it('resolve content and skill dependencies with override order, deduping, and warnings intact', async () => {
		await withTestRuntime({
			run: () => {
				const { id: setReadmeId } = createContent({
					label: 'README from set',
					name: 'file:README.md',
					content: 'set readme',
				})
				const { id: notesId } = createContent({
					label: 'Notes',
					name: 'file:notes.txt',
					content: 'notes body',
				})
				const { id: directReadmeId } = createContent({
					label: 'README direct',
					name: 'file:README.md',
					content: 'direct readme',
				})

				const { id: contentSetId } = createContentSet({
					label: 'Project files',
					contentRefs: [
						{ contentId: setReadmeId },
						{ contentId: notesId },
						{ contentId: 'missing-content' },
					],
				})

				const contentResolution = resolveTaskContent([
					{ type: 'contentSet', contentSetId },
					{ type: 'content', contentId: directReadmeId },
				])

				expect(contentResolution.entries).toEqual([
					{ name: 'file:README.md', content: 'direct readme' },
					{ name: 'file:notes.txt', content: 'notes body' },
				])
				expect(contentResolution.warnings).toEqual([
					'Content not found in set "Project files": missing-content',
				])

				const { id: reviewSkillId } = createSkill({
					label: 'Review skill',
					name: 'review',
					description: 'Review code',
					content: 'set review',
				})
				const { id: summarizeSkillId } = createSkill({
					label: 'Summarize skill',
					name: 'summarize',
					description: 'Summarize text',
					content: 'set summarize',
				})

				const { id: skillSetId } = createSkillSet({
					label: 'Analysis skills',
					skillRefs: [
						{ skillId: reviewSkillId },
						{ skillId: summarizeSkillId },
						{ skillId: 'missing-skill' },
					],
				})

				const skillResolution = resolveTaskSkills(
					[{ type: 'skillSet', skillSetId }],
					[
						{
							name: 'Review',
							description: 'Inline review override',
							content: 'inline review',
						},
					],
				)

				expect(skillResolution.skills).toEqual([
					{
						name: 'Review',
						description: 'Inline review override',
						content: 'inline review',
					},
					{
						name: 'summarize',
						description: 'Summarize text',
						content: 'set summarize',
					},
				])
				expect(skillResolution.warnings).toEqual([
					'Skill not found in set "Analysis skills": missing-skill',
				])
			},
		})
	})
})

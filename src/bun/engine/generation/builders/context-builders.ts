import { CreateContentSetParamsSchema } from '../../../../shared/schemas/content-set.schema'
import { CreateContentParamsSchema } from '../../../../shared/schemas/content.schema'
import { CreateSkillSetParamsSchema } from '../../../../shared/schemas/skill-set.schema'
import { CreateSkillParamsSchema } from '../../../../shared/schemas/skill.schema'
import { listContentSets } from '../../../data/content-sets'
import { listContents } from '../../../data/contents'
import { listSkillSets } from '../../../data/skill-sets'
import { listSkills } from '../../../data/skills'
import { buildExistingDataPrompt, zodToOutputSchema } from '../helpers'
import type { PromptBuilder } from '../types'

export function skillPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const skills = listSkills()
			return { existingSkillNames: skills.map((skill) => skill.name) }
		},
		buildSystemPrompt(context) {
			const names = (context.existingSkillNames as string[]).join(', ')
			return `You are an expert at writing agent skill instructions for an AI evaluation platform.

A skill has:
- label: Human-readable display name
- name: A kebab-case machine name for discovery
- description: Short description shown to agent for discovery
- content: Detailed markdown instructions the agent receives when the skill is loaded

Existing skill names: ${names || '(none)'}

The content field should be detailed markdown with clear instructions, examples, and edge cases.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a complete skill definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(CreateSkillParamsSchema)
		},
	}
}

export function skillSetPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const skills = listSkills()
			const skillSets = listSkillSets()
			return {
				skills: skills.map((skill) => ({
					id: skill.id,
					name: skill.name,
					description: skill.description,
				})),
				existingSetNames: skillSets.map((skillSet) => skillSet.label),
			}
		},
		buildSystemPrompt(context) {
			const skills = context.skills as {
				id: string
				name: string
				description: string
			}[]
			return `You are organizing skills into logical sets for AI agent evaluation.

Available skills:
${skills.map((skill) => `- ${skill.name} (id: ${skill.id}): ${skill.description}`).join('\n')}

Generate a skill set by selecting relevant skills. The skillRefs array must use "skillId" matching ids above.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a skill set definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(CreateSkillSetParamsSchema)
		},
	}
}

export function contentPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const contents = listContents()
			return { existingContentNames: contents.map((content) => content.name) }
		},
		buildSystemPrompt(context) {
			const names = (context.existingContentNames as string[]).join(', ')
			return `You are an expert at authoring contextual content documents for AI agent evaluation.

A content item has:
- label: Human-readable display name
- name: A unique machine name / key
- content: The actual content text (can be markdown, JSON, plain text, etc.)

Existing content names: ${names || '(none)'}

The content should be realistic and detailed, representing data an agent might need to reference.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a complete content definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(CreateContentParamsSchema)
		},
	}
}

export function contentSetPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const contents = listContents()
			const contentSets = listContentSets()
			return {
				contents: contents.map((content) => ({
					id: content.id,
					name: content.name,
					label: content.label,
				})),
				existingSetNames: contentSets.map((contentSet) => contentSet.label),
			}
		},
		buildSystemPrompt(context) {
			const contents = context.contents as {
				id: string
				name: string
				label: string
			}[]
			return `You are organizing content items into logical sets for AI agent evaluation.

Available content items:
${contents.map((content) => `- ${content.name} (id: ${content.id}): ${content.label}`).join('\n')}

Generate a content set by selecting relevant content items. The contentRefs array must use "contentId" matching ids above.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a content set definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(CreateContentSetParamsSchema)
		},
	}
}

import { z } from 'zod'
import { ProviderSchema } from '../../../../shared/schemas/agent-config.schema'
import { SurveyQuestionSchema } from '../../../../shared/schemas/survey.schema'
import { listContentSets } from '../../../data/content-sets'
import { listContents } from '../../../data/contents'
import { listEvaluations } from '../../../data/evaluations'
import { listSkillSets } from '../../../data/skill-sets'
import { listSkills } from '../../../data/skills'
import { listSurveys } from '../../../data/surveys'
import { listTasks } from '../../../data/tasks'
import { listToolSets } from '../../../data/tool-sets'
import { listToolDefinitions } from '../../../data/tools'
import { buildExistingDataPrompt, zodToOutputSchema } from '../helpers'
import type { PromptBuilder } from '../types'

export function taskPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const tools = listToolDefinitions()
			const toolSets = listToolSets()
			const skills = listSkills()
			const skillSets = listSkillSets()
			const contents = listContents()
			const contentSets = listContentSets()
			return {
				tools: tools.map((toolDef) => ({
					id: toolDef.id,
					name: toolDef.name,
					description: toolDef.description,
				})),
				toolSets: toolSets.map((toolSet) => ({
					id: toolSet.id,
					label: toolSet.label,
					description: toolSet.description,
				})),
				skills: skills.map((skill) => ({
					id: skill.id,
					name: skill.name,
					description: skill.description,
				})),
				skillSets: skillSets.map((skillSet) => ({
					id: skillSet.id,
					label: skillSet.label,
					description: skillSet.description,
				})),
				contents: contents.map((content) => ({
					id: content.id,
					name: content.name,
					label: content.label,
				})),
				contentSets: contentSets.map((contentSet) => ({
					id: contentSet.id,
					label: contentSet.label,
					description: contentSet.description,
				})),
			}
		},
		buildSystemPrompt(context) {
			const tools = context.tools as {
				id: string
				name: string
				description: string
			}[]
			const toolSets = context.toolSets as {
				id: string
				label: string
				description?: string
			}[]
			const skills = context.skills as {
				id: string
				name: string
				description: string
			}[]
			const skillSets = context.skillSets as {
				id: string
				label: string
				description?: string
			}[]
			const contents = context.contents as {
				id: string
				name: string
				label: string
			}[]
			const contentSets = context.contentSets as {
				id: string
				label: string
				description?: string
			}[]

			return `You are an expert at designing evaluation tasks for AI agents.

A task defines a scenario for testing an agent. It includes:
- label: Display name
- taskPrompts: Array of prompts sent to the agent in sequence (minimum one)
- systemPrompt: Optional system prompt
- toolRefs: References to tools/tool sets available to the agent
- contentRefs: References to content/content sets available
- skillRefs: References to skills/skill sets available
- goalConditions: Optional list of success checks

Available tools:
${tools.map((toolDef) => `- Tool: ${toolDef.name} (id: ${toolDef.id}): ${toolDef.description}`).join('\n')}
${toolSets.map((toolSet) => `- ToolSet: ${toolSet.label} (id: ${toolSet.id}): ${toolSet.description || 'no description'}`).join('\n')}

Available skills:
${skills.map((skill) => `- Skill: ${skill.name} (id: ${skill.id}): ${skill.description}`).join('\n')}
${skillSets.map((skillSet) => `- SkillSet: ${skillSet.label} (id: ${skillSet.id}): ${skillSet.description || 'no description'}`).join('\n')}

Available content:
${contents.map((content) => `- Content: ${content.name} (id: ${content.id}): ${content.label}`).join('\n')}
${contentSets.map((contentSet) => `- ContentSet: ${contentSet.label} (id: ${contentSet.id}): ${contentSet.description || 'no description'}`).join('\n')}

Tool refs use: { type: "tool", toolDefinitionId: "<id>" } or { type: "toolSet", toolSetId: "<id>" }
Content refs use: { type: "content", contentId: "<id>" } or { type: "contentSet", contentSetId: "<id>" }
Skill refs use: { type: "skill", skillId: "<id>" } or { type: "skillSet", skillSetId: "<id>" }

Goal condition types:
- string_match: { type: "string_match", pattern: "text", caseSensitive: false }
- regex: { type: "regex", pattern: "regex_pattern" }
- tool_called: { type: "tool_called", toolName: "tool_name", inputSubset: { ... } }
- schema_match: { type: "schema_match", schema: { JSON Schema } }
- output_subset: { type: "output_subset", subset: { ... } }

Goal evaluation semantics:
- goalConditions is an array
- if goalConditions is empty, the task has no formal goal evaluation
- if goalConditions has items, every condition must pass`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a complete task definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return {
				type: 'object',
				properties: {
					label: { type: 'string' },
					taskPrompts: {
						type: 'array',
						items: { type: 'string' },
						minItems: 1,
					},
					systemPrompt: { type: 'string' },
					toolRefs: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								type: { type: 'string', enum: ['tool', 'toolSet'] },
								toolDefinitionId: { type: 'string' },
								toolSetId: { type: 'string' },
							},
							required: ['type'],
						},
					},
					contentRefs: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								type: { type: 'string', enum: ['content', 'contentSet'] },
								contentId: { type: 'string' },
								contentSetId: { type: 'string' },
							},
							required: ['type'],
						},
					},
					skillRefs: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								type: { type: 'string', enum: ['skill', 'skillSet'] },
								skillId: { type: 'string' },
								skillSetId: { type: 'string' },
							},
							required: ['type'],
						},
					},
					goalConditions: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								type: {
									type: 'string',
									enum: ['string_match', 'regex', 'tool_called', 'schema_match', 'output_subset'],
								},
								pattern: { type: 'string' },
								caseSensitive: { type: 'boolean' },
								toolName: { type: 'string' },
								inputSubset: {
									type: 'string',
									description: 'JSON string of expected tool input subset object',
								},
								schema: {
									type: 'string',
									description: 'JSON string of JSON Schema object',
								},
								subset: {
									type: 'string',
									description: 'JSON string of required output subset object',
								},
							},
							required: ['type'],
						},
					},
				},
				required: ['label', 'taskPrompts'],
				additionalProperties: false,
			}
		},
	}
}

export function surveyPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const surveys = listSurveys()
			return { existingSurveyNames: surveys.map((survey) => survey.label) }
		},
		buildSystemPrompt(context) {
			const names = (context.existingSurveyNames as string[]).join(', ')
			return `You are an expert at designing evaluation surveys for AI agents.

A survey has:
- label: Display name
- questions: Array of question objects
- orderingStrategy: "fixed", "randomized", or "latin_square"
- systemPrompt: Optional system prompt for the agent

Each question has:
- id: A unique UUID
- text: The question text
- responseFormat: "free_text", "likert", "multiple_choice", or "ranking"
- options: Array of option strings (required for multiple_choice and ranking)

For likert questions, the agent responds on a 1-5 scale.
For multiple_choice, provide 3-6 options.
For ranking, provide items to rank.

Existing survey names: ${names || '(none)'}`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a complete survey definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(
				z.object({
					label: z.string().min(1),
					questions: z.array(SurveyQuestionSchema),
					orderingStrategy: z.enum(['fixed', 'randomized', 'latin_square']).default('fixed'),
					systemPrompt: z.string().optional(),
				}),
			)
		},
	}
}

export function evaluationPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const tasks = listTasks()
			const surveys = listSurveys()
			const evaluations = listEvaluations()
			return {
				tasks: tasks.map((task) => ({ id: task.id, label: task.label })),
				surveys: surveys.map((survey) => ({
					id: survey.id,
					label: survey.label,
				})),
				existingEvalNames: evaluations.map((evaluation) => evaluation.label),
			}
		},
		buildSystemPrompt(context) {
			const tasks = context.tasks as { id: string; label: string }[]
			const surveys = context.surveys as { id: string; label: string }[]
			return `You are designing evaluation configurations for AI agent testing.

An evaluation links a scenario (task or survey) to agent configurations for comparative testing.

Available scenarios:
${tasks.map((task) => `- Task: ${task.label} (id: ${task.id})`).join('\n')}
${surveys.map((survey) => `- Survey: ${survey.label} (id: ${survey.id})`).join('\n')}

Agent config options:
- provider: "openai", "anthropic", "google", "mistral", "groq", "xai", "azure"
- model: Provider-specific model name
- temperature: 0-2
- repetitions: How many times to repeat each trial

Generate an evaluation with a scenario and one or more agent configs to compare.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate an evaluation configuration.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(
				z.object({
					label: z.string().min(1),
					scenarioId: z.string(),
					scenarioType: z.enum(['task', 'survey']),
					agentConfigs: z.array(
						z.object({
							provider: ProviderSchema,
							model: z.string().min(1),
							temperature: z.number().min(0).max(2),
							repetitions: z.number().positive().optional(),
						}),
					),
					concurrency: z.number().positive().optional(),
					maxSteps: z.number().positive().optional(),
				}),
			)
		},
	}
}

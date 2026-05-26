import { z } from 'zod'

export const ProviderSchema = z.enum([
	'openai',
	'anthropic',
	'google',
	'mistral',
	'groq',
	'xai',
	'azure',
])

export const ToolSearchHintsSchema = z.enum(['none', 'names_only', 'names_and_descriptions'])

export const ReasoningEffortSchema = z.enum([
	'provider-default',
	'none',
	'minimal',
	'low',
	'medium',
	'high',
	'xhigh',
])

export const AgentConfigSchema = z.object({
	id: z.string().uuid(),
	provider: ProviderSchema,
	model: z.string().min(1),
	temperature: z.number().min(0).max(2).default(0),
	maxTokens: z.number().positive().optional(),
	topP: z.number().min(0).max(1).optional(),
	toolSearch: z.boolean().default(false),
	toolSearchHints: ToolSearchHintsSchema.default('none'),
	toolSearchMode: z.enum(['keyword', 'semantic']).default('keyword'), // "semantic" not yet implemented — falls back to keyword
	subagentsEnabled: z.boolean().default(false),
	subagentMaxDepth: z.number().positive().default(1),
})

export type Provider = z.infer<typeof ProviderSchema>
export type ToolSearchHints = z.infer<typeof ToolSearchHintsSchema>
export type ReasoningEffort = z.infer<typeof ReasoningEffortSchema>
export type AgentConfig = z.infer<typeof AgentConfigSchema>

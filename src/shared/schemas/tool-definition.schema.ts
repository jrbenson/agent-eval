import { z } from 'zod'

export const ToolParameterSchema = z.object({
	name: z.string().min(1),
	type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'enum']),
	description: z.string().optional(),
	required: z.boolean().default(true),
	items: z.unknown().optional(),
	properties: z.unknown().optional(),
})

export const ToolDefinitionSchema = z.object({
	name: z.string().min(1),
	description: z.string().min(1),
	parameters: z.array(ToolParameterSchema),
})

export type ToolParameter = z.infer<typeof ToolParameterSchema>
export type ToolDefinition = z.infer<typeof ToolDefinitionSchema>

// ---- Standalone tool definition (persisted entity) ----

export type DefaultResponseType = 'static' | 'llm'

export interface LlmDefaultConfig {
	referenceData: string
	outputSchema?: Record<string, unknown>
	systemPromptAddendum?: string
	promptPrefix?: string
	persistenceEnabled?: boolean
	persistenceHint?: string
}

export interface PersistenceOp {
	key: string
	keyMode?: 'static' | 'expression'
	mode: 'replace' | 'append' | 'prepend'
	content: string
	contentMode?: 'static' | 'expression'
}

export interface MockResponseRule {
	id: string
	condition: string
	response: unknown
	responseMode?: 'static' | 'expression'
	persistenceOps?: PersistenceOp[]
}

export interface MockResponseConfig {
	defaultResponseType: DefaultResponseType
	defaultResponse: unknown
	defaultResponseMode?: 'static' | 'expression'
	rules: MockResponseRule[]
	llmDefaultConfig?: LlmDefaultConfig
}

export interface StoredToolDefinition {
	id: string
	label: string
	name: string
	description: string
	parameters: Record<string, unknown>
	mockResponse: MockResponseConfig
	core: boolean
	keywords?: string[]
	createdAt: string
	updatedAt: string
}

export interface CreateToolDefinitionParams {
	label: string
	name: string
	description: string
	parameters: Record<string, unknown>
	mockResponse?: MockResponseConfig
	core?: boolean
	keywords?: string[]
}

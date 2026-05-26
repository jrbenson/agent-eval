import { z } from 'zod'

export const ToolSetToolRefSchema = z.object({
	toolDefinitionId: z.string(),
})

export type ToolSetToolRef = z.infer<typeof ToolSetToolRefSchema>

export const CreateToolSetParamsSchema = z.object({
	label: z.string().min(1),
	description: z.string().optional(),
	toolRefs: z.array(ToolSetToolRefSchema).default([]),
	schemaAdditions: z.record(z.string(), z.unknown()).optional(),
	keywords: z.array(z.string()).optional(),
})

export type CreateToolSetParams = z.infer<typeof CreateToolSetParamsSchema>

export interface StoredToolSet {
	id: string
	label: string
	description?: string
	toolRefs: ToolSetToolRef[]
	schemaAdditions?: Record<string, unknown>
	keywords?: string[]
	createdAt: string
	updatedAt: string
}

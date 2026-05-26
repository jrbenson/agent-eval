import { z } from 'zod'

export const CreateContentParamsSchema = z.object({
	label: z.string().min(1),
	name: z.string().min(1),
	content: z.string(),
})

export type CreateContentParams = z.infer<typeof CreateContentParamsSchema>

export interface StoredContent {
	id: string
	label: string
	name: string
	content: string
	createdAt: string
	updatedAt: string
}

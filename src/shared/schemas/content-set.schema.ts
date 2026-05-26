import { z } from 'zod'

export const ContentSetContentRefSchema = z.object({
	contentId: z.string(),
})

export type ContentSetContentRef = z.infer<typeof ContentSetContentRefSchema>

export const CreateContentSetParamsSchema = z.object({
	label: z.string().min(1),
	description: z.string().optional(),
	contentRefs: z.array(ContentSetContentRefSchema).default([]),
})

export type CreateContentSetParams = z.infer<typeof CreateContentSetParamsSchema>

export interface StoredContentSet {
	id: string
	label: string
	description?: string
	contentRefs: ContentSetContentRef[]
	createdAt: string
	updatedAt: string
}

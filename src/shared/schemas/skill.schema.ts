import { z } from 'zod'

export const CreateSkillParamsSchema = z.object({
	label: z.string().min(1),
	name: z.string().min(1),
	description: z.string().min(1),
	content: z.string(),
})

export type CreateSkillParams = z.infer<typeof CreateSkillParamsSchema>

export interface StoredSkill {
	id: string
	label: string
	name: string
	description: string
	content: string
	createdAt: string
	updatedAt: string
}

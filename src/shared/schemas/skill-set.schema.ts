import { z } from 'zod'

export const SkillSetSkillRefSchema = z.object({
	skillId: z.string(),
})

export type SkillSetSkillRef = z.infer<typeof SkillSetSkillRefSchema>

export const CreateSkillSetParamsSchema = z.object({
	label: z.string().min(1),
	description: z.string().optional(),
	skillRefs: z.array(SkillSetSkillRefSchema).default([]),
})

export type CreateSkillSetParams = z.infer<typeof CreateSkillSetParamsSchema>

export interface StoredSkillSet {
	id: string
	label: string
	description?: string
	skillRefs: SkillSetSkillRef[]
	createdAt: string
	updatedAt: string
}

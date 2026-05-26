import { z } from 'zod'

export const SurveyQuestionSchema = z.object({
	id: z.string(),
	text: z.string().min(1),
	responseFormat: z
		.enum(['free_text', 'likert', 'multiple_choice', 'ranking'])
		.default('free_text'),
	options: z.array(z.string()).optional(),
})

export const SurveyTestSchema = z.object({
	id: z.string().uuid(),
	label: z.string().min(1),
	questions: z.array(SurveyQuestionSchema),
	orderingStrategy: z.enum(['fixed', 'randomized', 'latin_square']).default('fixed'),
	systemPrompt: z.string().optional(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
})

export type SurveyQuestion = z.infer<typeof SurveyQuestionSchema>
export type SurveyTest = z.infer<typeof SurveyTestSchema>

import { generateObject, jsonSchema } from 'ai'
import { getUtilityLlmProfile } from '../../data/settings'
import { normalizeOutputSchema, stripSyntheticNulls } from '../mock-runtime'
import { getUtilityModel } from '../provider-registry'
import { postProcessGeneratedResult } from './post-process'
import { getPromptBuilder } from './registry'
import type { GeneratableEntityType } from './types'

export async function generateElement(
	entityType: GeneratableEntityType,
	existingData: Record<string, unknown>,
	userInstructions?: string,
): Promise<{ result: Record<string, unknown> }> {
	const profile = getUtilityLlmProfile('generate')
	if (!profile) {
		throw new Error(
			'No Generate utility LLM profile configured. Set it in Settings -> Utility LLM.',
		)
	}

	const model = await getUtilityModel(profile)
	const builder = getPromptBuilder(entityType)
	const context = builder.gatherContext()
	const systemPrompt = builder.buildSystemPrompt(context)
	const userPrompt = builder.buildUserPrompt(existingData, context, userInstructions)
	const schema = builder.outputSchema()
	const normalizedSchema = normalizeOutputSchema(schema)

	const { object } = await generateObject({
		model,
		system: systemPrompt,
		prompt: userPrompt,
		schema: jsonSchema(normalizedSchema),
		temperature: profile.temperature,
		...(profile.maxTokens ? { maxTokens: profile.maxTokens } : {}),
	})

	const result = postProcessGeneratedResult(
		entityType,
		stripSyntheticNulls(object, schema) as Record<string, unknown>,
	)
	return { result }
}

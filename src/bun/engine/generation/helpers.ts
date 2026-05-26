import { z } from 'zod'

export function zodToOutputSchema(schema: z.ZodType): Record<string, unknown> {
	const { $schema, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>
	return rest
}

export function buildExistingDataPrompt(
	existingData: Record<string, unknown>,
	filterEmpty = true,
): string {
	const entries = Object.entries(existingData).filter(
		([, value]) =>
			!filterEmpty ||
			(value !== '' &&
				value !== undefined &&
				value !== null &&
				!(Array.isArray(value) && value.length === 0)),
	)
	if (entries.length === 0) {
		return ''
	}
	return `\n\nCurrent state:\n${JSON.stringify(Object.fromEntries(entries), null, 2)}`
}

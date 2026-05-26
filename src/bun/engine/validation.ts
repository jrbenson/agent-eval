import * as z from 'zod'

export type ValidationResult = {
	passed: boolean
	data: unknown
	errors: string[] | null
}

/**
 * Validate raw tool call input against a JSON Schema object.
 * Uses Zod v4's fromJSONSchema() for recursive, spec-faithful validation.
 *
 * Custom error messages from `x-error-messages` are preserved via post-processing:
 * after validation, Zod issue paths are resolved back to the schema and custom
 * messages are substituted if found.
 */
export function validateToolInputFromSchema(
	rawInput: unknown,
	schema: Record<string, unknown>,
): ValidationResult {
	try {
		const zodSchema = z.fromJSONSchema(schema)
		const result = zodSchema.safeParse(rawInput)

		if (result.success) {
			return { passed: true, data: result.data, errors: null }
		}

		const errors = result.error.issues.map((issue) => {
			const path = (issue.path as (string | number)[]).join('.')
			const customMsg = lookupCustomMessage(schema, issue.path as (string | number)[])
			const message = customMsg ?? issue.message
			return path ? `${path}: ${message}` : message
		})

		return { passed: false, data: rawInput, errors }
	} catch (err) {
		// If schema conversion itself fails, report it as a validation error
		const message = err instanceof Error ? err.message : 'Schema conversion failed'
		return {
			passed: false,
			data: rawInput,
			errors: [`schema error: ${message}`],
		}
	}
}

/**
 * Walk a JSON Schema following a Zod issue path to find x-error-messages.
 */
function lookupCustomMessage(
	schema: Record<string, unknown>,
	path: (string | number)[],
): string | null {
	let current: Record<string, unknown> = schema

	for (const segment of path) {
		if (typeof segment === 'string' && current.properties) {
			const props = current.properties as Record<string, Record<string, unknown>>
			if (props[segment]) {
				current = props[segment]
			} else {
				return null
			}
		} else if (typeof segment === 'number' && current.items) {
			// Array items — use the items schema
			current = current.items as Record<string, unknown>
		} else {
			return null
		}
	}

	const errorMessages = current['x-error-messages'] as Record<string, string> | undefined
	if (!errorMessages) return null

	// Return the first custom message found (most specific match)
	const values = Object.values(errorMessages)
	return values.length > 0 ? values[0] : null
}

export function normalizeOutputSchema(schema: Record<string, unknown>): Record<string, unknown> {
	const normalized = { ...schema }

	if (!normalized.type) {
		normalized.type = 'object'
	}

	if (normalized.type === 'object' && normalized.properties) {
		const originalRequired = new Set(
			Array.isArray(normalized.required) ? (normalized.required as string[]) : [],
		)
		const allKeys = Object.keys(normalized.properties as Record<string, unknown>)

		normalized.required = allKeys
		normalized.additionalProperties = false

		const properties = {
			...(normalized.properties as Record<string, unknown>),
		}
		for (const key of allKeys) {
			let property = properties[key]
			if (property && typeof property === 'object') {
				property = normalizeOutputSchema(property as Record<string, unknown>)
			}
			if (!originalRequired.has(key) && property && typeof property === 'object') {
				properties[key] = {
					anyOf: [property, { type: 'null' }],
				}
			} else {
				properties[key] = property
			}
		}
		normalized.properties = properties
	}

	if (normalized.type === 'array' && normalized.items) {
		normalized.items = normalizeOutputSchema(normalized.items as Record<string, unknown>)
	}

	return normalized
}

export function stripSyntheticNulls(value: unknown, schema: Record<string, unknown>): unknown {
	if (value === null || value === undefined || typeof value !== 'object') {
		return value
	}
	if (Array.isArray(value)) {
		const itemSchema = schema.items as Record<string, unknown> | undefined
		return value.map((item) => (itemSchema ? stripSyntheticNulls(item, itemSchema) : item))
	}

	const properties = schema.properties as Record<string, Record<string, unknown>> | undefined
	if (!properties) {
		return value
	}

	const originalRequired = new Set(
		Array.isArray(schema.required) ? (schema.required as string[]) : [],
	)

	const result: Record<string, unknown> = {}
	for (const [key, propertyValue] of Object.entries(value as Record<string, unknown>)) {
		const propertySchema = properties[key]
		if (propertyValue === null && !originalRequired.has(key)) {
			continue
		}
		result[key] = propertySchema
			? stripSyntheticNulls(propertyValue, propertySchema)
			: propertyValue
	}

	return result
}

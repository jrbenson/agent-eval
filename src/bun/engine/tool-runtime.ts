import type { MockResponseConfig } from '../../shared/schemas/tool-definition.schema'

export interface ToolDef {
	name: string
	description: string
	parameters: {
		name: string
		type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
		description?: string
		required: boolean
	}[]
}

export interface ResolvedToolDef {
	name: string
	description: string
	parameters: Record<string, unknown>
	mockResponse?: MockResponseConfig
	core?: boolean
	keywords?: string[]
}

/**
 * Normalize a JSON Schema for model advertisement.
 * Ensures `type: "object"`, `properties`, `additionalProperties: false`.
 * Respects the original `required` array instead of forcing all keys required.
 */
export function normalizeToolSchema(schema: Record<string, unknown>): Record<string, unknown> {
	const normalized = { ...schema }

	if (!normalized.type) {
		normalized.type = 'object'
	}

	if (!normalized.properties) {
		normalized.properties = {}
	}

	if (normalized.additionalProperties === undefined) {
		normalized.additionalProperties = false
	}

	if (!normalized.required) {
		normalized.required = []
	}

	return normalized
}

/**
 * Convert legacy flat ToolDef parameters to a JSON Schema object.
 */
export function legacyParamsToSchema(
	params: {
		name: string
		type: string
		description?: string
		required: boolean
	}[],
): Record<string, unknown> {
	const properties: Record<string, unknown> = {}
	const required: string[] = []

	for (const p of params) {
		properties[p.name] = {
			type: p.type,
			...(p.description ? { description: p.description } : {}),
		}
		if (p.required) required.push(p.name)
	}

	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {}),
		additionalProperties: false,
	}
}

import type {
	CreateToolDefinitionParams,
	MockResponseConfig,
	StoredToolDefinition,
} from '../../shared/schemas/tool-definition.schema'
import { legacyParamsToSchema } from '../engine/tool-runtime'
import { getPresetTool } from '../presets'
import { toolDefPath, toolDefsDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'

const DEFAULT_MOCK_RESPONSE = {
	defaultResponseType: 'static' as const,
	defaultResponse: { success: true },
	rules: [],
}

function normalizeMockResponse(mockResponse?: MockResponseConfig): MockResponseConfig {
	return {
		...DEFAULT_MOCK_RESPONSE,
		...mockResponse,
		defaultResponseType: mockResponse?.defaultResponseType ?? 'static',
		defaultResponse: mockResponse?.defaultResponse ?? DEFAULT_MOCK_RESPONSE.defaultResponse,
		rules: mockResponse?.rules ?? [],
	}
}

function normalizeToolDefinition(toolDef: StoredToolDefinition): StoredToolDefinition {
	return {
		...toolDef,
		core: toolDef.core ?? false,
		mockResponse: normalizeMockResponse(toolDef.mockResponse),
	}
}

const toolRepository = createEntityRepository<CreateToolDefinitionParams, StoredToolDefinition>({
	pathForId: toolDefPath,
	dirPath: toolDefsDir,
	createStored(data, meta) {
		return normalizeToolDefinition({
			id: meta.id,
			label: data.label,
			name: data.name,
			description: data.description,
			parameters: data.parameters,
			mockResponse: normalizeMockResponse(data.mockResponse),
			core: data.core ?? false,
			...(data.keywords?.length ? { keywords: data.keywords } : {}),
			createdAt: meta.now,
			updatedAt: meta.now,
		})
	},
	normalize: normalizeToolDefinition,
	sort: sortByCreatedAtAscending,
})

export const createToolDefinition = toolRepository.create
export const getToolDefinition = toolRepository.get
export const listToolDefinitions = toolRepository.list
export const updateToolDefinition = toolRepository.update
export const deleteToolDefinition = toolRepository.delete

// ---- Preset copy ----

export function createToolFromPreset(presetId: string): { id: string } | null {
	const preset = getPresetTool(presetId)
	if (!preset) return null
	return createToolDefinition({
		label: preset.label,
		name: preset.name,
		description: preset.description,
		parameters: preset.parameters,
		mockResponse: preset.mockResponse,
		core: preset.core,
		keywords: preset.keywords,
	})
}

// ---- Export ----

export function exportToolDefinition(
	id: string,
	includeMockBehavior: boolean,
): Record<string, unknown> | null {
	const tool = getToolDefinition(id)
	if (!tool) return null

	const base: Record<string, unknown> = {
		name: tool.name,
		description: tool.description,
		parameters: tool.parameters,
	}

	if (includeMockBehavior) {
		base.label = tool.label
		base.mockResponse = tool.mockResponse
		base.core = tool.core
		if (tool.keywords?.length) base.keywords = tool.keywords
	}

	return base
}

// ---- Import ----

export interface ImportToolResult {
	index: number
	name: string
	status: 'ready' | 'coerced' | 'failed'
	warnings: string[]
	error?: string
}

function normalizeToolObject(raw: unknown):
	| {
			data: CreateToolDefinitionParams
			warnings: string[]
	  }
	| { error: string } {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		return { error: 'Expected a JSON object' }
	}

	const obj = raw as Record<string, unknown>
	const warnings: string[] = []

	// OpenAI function calling wrapper: { type: "function", function: { ... } }
	if (obj.type === 'function' && typeof obj.function === 'object' && obj.function !== null) {
		const inner = obj.function as Record<string, unknown>
		Object.assign(obj, inner)
		obj.function = undefined
		obj.type = undefined
		warnings.push('Unwrapped OpenAI function calling format')
	}

	// Field name coercion: function_name → name
	if (!obj.name && obj.function_name && typeof obj.function_name === 'string') {
		obj.name = obj.function_name
		obj.function_name = undefined
		warnings.push('Renamed function_name → name')
	}

	// Parameter field coercion: input_schema / inputSchema / schema → parameters
	if (!obj.parameters && obj.input_schema) {
		obj.parameters = obj.input_schema
		obj.input_schema = undefined
		warnings.push('Renamed input_schema → parameters (Anthropic format)')
	}
	if (!obj.parameters && obj.inputSchema) {
		obj.parameters = obj.inputSchema
		obj.inputSchema = undefined
		warnings.push('Renamed inputSchema → parameters (MCP format)')
	}
	if (!obj.parameters && obj.schema) {
		obj.parameters = obj.schema
		obj.schema = undefined
		warnings.push('Renamed schema → parameters')
	}

	// reserved → core
	if (obj.core === undefined && obj.reserved !== undefined) {
		obj.core = obj.reserved
		obj.reserved = undefined
		warnings.push('Renamed reserved → core')
	}

	// Legacy flat params array → JSON Schema
	if (Array.isArray(obj.parameters)) {
		try {
			obj.parameters = legacyParamsToSchema(
				obj.parameters as {
					name: string
					type: string
					description?: string
					required: boolean
				}[],
			)
			warnings.push('Converted legacy parameters array to JSON Schema')
		} catch {
			return { error: 'Failed to convert legacy parameters array' }
		}
	}

	// Validate name
	if (typeof obj.name !== 'string' || obj.name.trim().length === 0) {
		return { error: "Missing or empty 'name' field" }
	}
	const name = obj.name.trim()

	// Default description
	let description = typeof obj.description === 'string' ? obj.description : ''
	if (!description) {
		description = '(imported tool)'
		warnings.push('Added default description')
	}

	// Coerce executionGuidance into description
	if (typeof obj.executionGuidance === 'string' && obj.executionGuidance.trim()) {
		description = `${description} | ${obj.executionGuidance.trim()}`
		obj.executionGuidance = undefined
		warnings.push('Appended executionGuidance to description')
	}

	// Default parameters
	let parameters: Record<string, unknown>
	if (
		typeof obj.parameters === 'object' &&
		obj.parameters !== null &&
		!Array.isArray(obj.parameters)
	) {
		parameters = obj.parameters as Record<string, unknown>
		if (!parameters.type) parameters.type = 'object'
		if (!parameters.properties) parameters.properties = {}
	} else {
		parameters = {
			type: 'object',
			properties: {},
			additionalProperties: false,
		}
		warnings.push('Added empty default parameters')
	}

	// Derive label
	const label =
		typeof obj.label === 'string' && obj.label.trim()
			? obj.label.trim()
			: name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
	if (!obj.label) {
		warnings.push('Derived label from name')
	}

	const result: CreateToolDefinitionParams = {
		label,
		name,
		description,
		parameters,
	}

	// Pass through native fields if present
	if (obj.mockResponse && typeof obj.mockResponse === 'object') {
		result.mockResponse = obj.mockResponse as MockResponseConfig
	}
	if (typeof obj.core === 'boolean') {
		result.core = obj.core
	}
	if (Array.isArray(obj.keywords)) {
		result.keywords = obj.keywords.filter((k): k is string => typeof k === 'string')
	}

	return { data: result, warnings }
}

function toItemArray(rawJson: unknown): unknown[] {
	if (Array.isArray(rawJson)) return rawJson
	return [rawJson]
}

export function analyzeToolImport(rawJson: unknown): ImportToolResult[] {
	const items = toItemArray(rawJson)
	return items.map((item, index) => {
		const result = normalizeToolObject(item)
		if ('error' in result) {
			return {
				index,
				name: '(unknown)',
				status: 'failed' as const,
				warnings: [],
				error: result.error,
			}
		}
		return {
			index,
			name: result.data.name,
			status: result.warnings.length > 0 ? ('coerced' as const) : ('ready' as const),
			warnings: result.warnings,
		}
	})
}

export function commitToolImport(rawJson: unknown): { toolIds: string[] } {
	const items = toItemArray(rawJson)
	const toolIds: string[] = []

	for (const item of items) {
		const result = normalizeToolObject(item)
		if ('error' in result) continue
		const { id } = createToolDefinition(result.data)
		toolIds.push(id)
	}

	return { toolIds }
}

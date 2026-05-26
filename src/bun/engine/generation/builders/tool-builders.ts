import { z } from 'zod'
import { ToolSetToolRefSchema } from '../../../../shared/schemas/tool-set.schema'
import { listToolSets } from '../../../data/tool-sets'
import { listToolDefinitions } from '../../../data/tools'
import { buildExistingDataPrompt, zodToOutputSchema } from '../helpers'
import type { PromptBuilder } from '../types'

export function toolDefinitionPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const tools = listToolDefinitions()
			return { existingToolNames: tools.map((toolDef) => toolDef.name) }
		},
		buildSystemPrompt(context) {
			const names = (context.existingToolNames as string[]).join(', ')
			return `You are an expert tool definition author for an AI agent evaluation platform.
Your job is to generate a complete tool definition with realistic parameters AND a mock response configuration.

The tool definition must include:
- label: A human-readable display name
- name: A snake_case function name (must be unique)
- description: A clear description of what the tool does
- parameters: A JSON Schema object (as a JSON string) describing the tool's input parameters

The mock response configuration must include:
- mockDefaultResponseType: "static" (returns fixed JSON) or "llm" (dynamic LLM generation)
- mockDefaultResponse: A realistic JSON response as a JSON string matching what the real tool would return
- mockRules: Conditional response rules (2-4) that handle common input variations

Existing tool names to avoid: ${names || '(none)'}

Guidelines:
- Parameter schemas must be valid JSON Schema (type: object with properties)
- Use descriptive parameter names and include descriptions for each
- Keep parameters practical and realistic
- The tool should represent something an AI agent would realistically use
- Mock responses should be realistic JSON matching what a real API would return
- Mock rules should reference parameter names and cover common variations
- Rule conditions are JavaScript expressions with \`input\` in scope (e.g. \`input.city === "London"\`)`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a complete tool definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return {
				type: 'object',
				properties: {
					label: {
						type: 'string',
						description: 'Human-readable display name',
					},
					name: { type: 'string', description: 'snake_case function name' },
					description: { type: 'string', description: 'What the tool does' },
					parameters: {
						type: 'string',
						description:
							'JSON Schema object as a JSON string. Example: {"type":"object","properties":{"city":{"type":"string"}},"required":["city"]}',
					},
					core: {
						type: 'boolean',
						description: 'Whether the tool is always available',
					},
					keywords: {
						type: 'array',
						items: { type: 'string' },
						description: 'Keywords for tool search discovery',
					},
					mockDefaultResponseType: {
						type: 'string',
						enum: ['static', 'llm'],
						description: 'How the tool responds by default',
					},
					mockDefaultResponse: {
						type: 'string',
						description: 'Default response value as a JSON string',
					},
					mockRules: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string', description: 'UUID' },
								condition: {
									type: 'string',
									description: 'JavaScript expression with input in scope',
								},
								response: {
									type: 'string',
									description: 'Response value as a JSON string',
								},
							},
							required: ['id', 'condition', 'response'],
						},
						description: 'Conditional response rules',
					},
				},
				required: [
					'label',
					'name',
					'description',
					'parameters',
					'mockDefaultResponseType',
					'mockDefaultResponse',
					'mockRules',
				],
				additionalProperties: false,
			}
		},
	}
}

export function toolSetPromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			const tools = listToolDefinitions()
			const toolSets = listToolSets()
			return {
				tools: tools.map((toolDef) => ({
					id: toolDef.id,
					name: toolDef.name,
					description: toolDef.description,
				})),
				existingSetNames: toolSets.map((toolSet) => toolSet.label),
			}
		},
		buildSystemPrompt(context) {
			const tools = context.tools as {
				id: string
				name: string
				description: string
			}[]
			return `You are an expert at organizing tools into logical sets for AI agent evaluation.

Available tools:
${tools.map((toolDef) => `- ${toolDef.name} (id: ${toolDef.id}): ${toolDef.description}`).join('\n')}

Generate a tool set by selecting relevant tools from the list above and providing a label and description.
The toolRefs array must contain objects with "toolDefinitionId" matching the tool ids above.
Only include tools that logically belong together.`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a tool set definition.'
			prompt += buildExistingDataPrompt(existingData)
			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}
			return prompt
		},
		outputSchema() {
			return zodToOutputSchema(
				z.object({
					label: z.string().min(1),
					description: z.string().optional(),
					toolRefs: z.array(ToolSetToolRefSchema).default([]),
					keywords: z.array(z.string()).optional(),
				}),
			)
		},
	}
}

export function toolMockResponsePromptBuilder(): PromptBuilder {
	return {
		gatherContext() {
			return {}
		},
		buildSystemPrompt() {
			return `You are an expert at creating mock response configurations for tool definitions in an AI agent evaluation platform.

A MockResponseConfig controls how a tool responds when called by an agent during evaluation. The config has:

1. defaultResponseType: "static" or "llm"
   - "static": Returns a fixed JSON response (most common for simple tools)
   - "llm": Uses an LLM to dynamically generate responses (for complex tools needing contextual replies)

2. defaultResponse: The default response value when no conditional rules match.
   This should be a realistic JSON value matching what the real tool would return.

3. rules: An ordered array of conditional response rules, evaluated top-to-bottom. First match wins.
   Each rule has:
   - id: A unique UUID
   - condition: A JavaScript expression with \`input\` (the tool call arguments) in scope.
     Examples: \`input.city === "London"\`, \`input.action === "list"\`, \`input.path.endsWith(".json")\`
   - response: The response value (JSON) returned when the condition matches.

GUIDELINES FOR HIGH-QUALITY MOCKS:
- The defaultResponse must be a realistic JSON value -- use the same structure a real API would return.
- Create 2-4 conditional rules that cover the most common input variations based on the tool's parameters.
- Rule conditions should reference actual parameter names from the tool's schema.
- Rule responses should be structurally consistent with the default response.
- For tools with enum parameters, create a rule per significant enum value.
- For tools with string parameters, use contains/startsWith/endsWith checks for realistic conditions.
- JSON values should be realistic (real city names, plausible file contents, valid-looking IDs).

EXAMPLE: A weather tool with parameters { city: string, units: string }:
- defaultResponse: { "temperature": 22, "condition": "Partly Cloudy", "humidity": 65 }
- Rule 1: condition \`input.city === "London"\`, response { "temperature": 15, "condition": "Rainy", "humidity": 85 }
- Rule 2: condition \`input.units === "fahrenheit"\`, response { "temperature": 72, "condition": "Sunny", "humidity": 45 }`
		},
		buildUserPrompt(existingData, _context, userInstructions) {
			let prompt = 'Generate a mock response configuration for this tool.'

			const toolInfo: Record<string, unknown> = {
				name: existingData.toolName,
				description: existingData.toolDescription,
			}
			if (existingData.toolParameters) {
				toolInfo.parametersSchema = existingData.toolParameters
			}
			prompt += `\n\nTool definition:\n${JSON.stringify(toolInfo, null, 2)}`

			const parameters = existingData.toolParameters as Record<string, unknown> | undefined
			if (parameters?.properties && typeof parameters.properties === 'object') {
				const properties = parameters.properties as Record<string, Record<string, unknown>>
				const required = new Set(Array.isArray(parameters.required) ? parameters.required : [])
				const parameterDescriptions = Object.entries(properties).map(([name, property]) => {
					const parts = [`- ${name} (${property.type || 'unknown'})`]
					if (required.has(name)) parts.push('[required]')
					if (property.description) parts.push(`-- ${property.description}`)
					if (property.enum) parts.push(`values: ${JSON.stringify(property.enum)}`)
					return parts.join(' ')
				})
				prompt += `\n\nParameter details:\n${parameterDescriptions.join('\n')}`
			}

			const mockData = existingData.mockResponse
			if (mockData && typeof mockData === 'object' && Object.keys(mockData).length > 0) {
				prompt += `\n\nCurrent mock config (improve or extend this):\n${JSON.stringify(mockData, null, 2)}`
			}

			if (userInstructions) {
				prompt += `\n\nAdditional instructions: ${userInstructions}`
			}

			return prompt
		},
		outputSchema() {
			return {
				type: 'object',
				properties: {
					defaultResponseType: {
						type: 'string',
						enum: ['static', 'llm'],
					},
					defaultResponse: {
						type: 'string',
						description: 'Default response value as a JSON string',
					},
					rules: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								id: { type: 'string', description: 'UUID' },
								condition: {
									type: 'string',
									description: 'JavaScript expression with input in scope',
								},
								response: {
									type: 'string',
									description: 'Response value as a JSON string when condition matches',
								},
							},
							required: ['id', 'condition', 'response'],
						},
					},
				},
				required: ['defaultResponseType', 'defaultResponse', 'rules'],
				additionalProperties: false,
			}
		},
	}
}

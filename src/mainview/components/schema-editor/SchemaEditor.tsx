import { Button, VStack } from '@chakra-ui/react'
import { FiPlus } from 'react-icons/fi'
import PropertyNode from './PropertyNode'

export interface ValidationConstraints {
	// String
	minLength?: number
	maxLength?: number
	pattern?: string
	format?: string

	// Number
	minimum?: number
	maximum?: number
	exclusiveMinimum?: number
	exclusiveMaximum?: number
	multipleOf?: number

	// Array
	minItems?: number
	maxItems?: number
	uniqueItems?: boolean

	// Object
	minProperties?: number
	maxProperties?: number

	// Custom error messages keyed by constraint keyword
	errorMessages?: Record<string, string>
}

export interface EditorNode {
	key: string
	name: string
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum'
	description: string
	required: boolean
	properties?: EditorNode[]
	itemTypes?: EditorNode[]
	validation?: ValidationConstraints
	enumValues?: string[]
}

// ---- JSON Schema ↔ EditorNode conversion ----

export function editorNodesToJsonSchema(nodes: EditorNode[]): Record<string, unknown> {
	const properties: Record<string, unknown> = {}
	const required: string[] = []

	for (const node of nodes) {
		if (!node.name.trim()) continue
		properties[node.name] = nodeToSchema(node)
		if (node.required) required.push(node.name)
	}

	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {}),
		additionalProperties: false,
	}
}

function nodeToSchema(node: EditorNode): Record<string, unknown> {
	const base: Record<string, unknown> = {}
	if (node.description) base.description = node.description

	// Spread validation constraints as JSON Schema keywords
	if (node.validation) {
		const { errorMessages, ...constraints } = node.validation
		for (const [key, value] of Object.entries(constraints)) {
			if (value !== undefined && value !== '') base[key] = value
		}
		if (errorMessages && Object.keys(errorMessages).length > 0) {
			base['x-error-messages'] = errorMessages
		}
	}

	switch (node.type) {
		case 'object': {
			const inner = editorNodesToJsonSchema(node.properties ?? [])
			return { ...inner, ...base }
		}
		case 'array': {
			const itemSchemas = (node.itemTypes ?? []).map(nodeToSchema)
			return {
				type: 'array',
				items:
					itemSchemas.length === 0
						? {}
						: itemSchemas.length === 1
							? itemSchemas[0]
							: { anyOf: itemSchemas },
				...base,
			}
		}
		case 'enum': {
			return {
				type: 'string',
				enum: node.enumValues ?? [],
				...base,
			}
		}
		default:
			return { type: node.type, ...base }
	}
}

export function jsonSchemaToEditorNodes(schema: Record<string, unknown>): EditorNode[] {
	const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>
	const required = (schema.required ?? []) as string[]
	const nodes: EditorNode[] = []

	for (const [name, prop] of Object.entries(properties)) {
		nodes.push(schemaToNode(name, prop, required.includes(name)))
	}

	return nodes
}

const CONSTRAINT_KEYS = new Set([
	'minLength',
	'maxLength',
	'pattern',
	'format',
	'minimum',
	'maximum',
	'exclusiveMinimum',
	'exclusiveMaximum',
	'multipleOf',
	'minItems',
	'maxItems',
	'uniqueItems',
	'minProperties',
	'maxProperties',
])

export function extractValidation(
	schema: Record<string, unknown>,
): ValidationConstraints | undefined {
	const constraints: Record<string, unknown> = {}
	let hasAny = false

	for (const key of CONSTRAINT_KEYS) {
		if (key in schema && schema[key] !== undefined) {
			constraints[key] = schema[key]
			hasAny = true
		}
	}

	const errorMessages = schema['x-error-messages'] as Record<string, string> | undefined
	if (errorMessages && Object.keys(errorMessages).length > 0) {
		constraints.errorMessages = errorMessages
		hasAny = true
	}

	return hasAny ? (constraints as ValidationConstraints) : undefined
}

function schemaToNode(
	name: string,
	schema: Record<string, unknown>,
	isRequired: boolean,
): EditorNode {
	const type = (schema.type as EditorNode['type']) ?? 'string'
	const description = (schema.description as string) ?? ''
	const key = crypto.randomUUID()
	const validation = extractValidation(schema)

	// Detect enum (has `enum` keyword with array value)
	if ('enum' in schema && Array.isArray(schema.enum)) {
		return {
			key,
			name,
			type: 'enum',
			description,
			required: isRequired,
			enumValues: schema.enum as string[],
			validation,
		}
	}

	if (type === 'object') {
		return {
			key,
			name,
			type: 'object',
			description,
			required: isRequired,
			properties: jsonSchemaToEditorNodes(schema),
			validation,
		}
	}

	if (type === 'array') {
		const items = schema.items as Record<string, unknown> | undefined
		let itemTypes: EditorNode[] = []
		if (items) {
			const anyOf = items.anyOf as Record<string, unknown>[] | undefined
			if (anyOf) {
				itemTypes = anyOf.map((s, i) => schemaToNode(`item_${i}`, s, true))
			} else {
				itemTypes = [schemaToNode('item_0', items, true)]
			}
		}
		return {
			key,
			name,
			type: 'array',
			description,
			required: isRequired,
			itemTypes,
			validation,
		}
	}

	return { key, name, type, description, required: isRequired, validation }
}

function createNode(): EditorNode {
	return {
		key: crypto.randomUUID(),
		name: '',
		type: 'string',
		description: '',
		required: true,
	}
}

// ---- Component ----

interface SchemaEditorProps {
	nodes: EditorNode[]
	onChange: (nodes: EditorNode[]) => void
}

export default function SchemaEditor({ nodes, onChange }: SchemaEditorProps) {
	const addProperty = () => {
		onChange([...nodes, createNode()])
	}

	const updateNode = (index: number, updated: EditorNode) => {
		onChange(nodes.map((n, i) => (i === index ? updated : n)))
	}

	const removeNode = (index: number) => {
		onChange(nodes.filter((_, i) => i !== index))
	}

	return (
		<VStack gap={1} align="stretch">
			{nodes.map((node, i) => (
				<PropertyNode
					key={node.key}
					node={node}
					depth={0}
					onChange={(updated) => updateNode(i, updated)}
					onRemove={() => removeNode(i)}
				/>
			))}
			<Button size="xs" variant="subtle" onClick={addProperty} w="fit-content" pl={1}>
				<FiPlus />
				Add Parameter
			</Button>
		</VStack>
	)
}

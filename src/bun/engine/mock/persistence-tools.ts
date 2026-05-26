import { jsonSchema, tool } from 'ai'

export function buildPersistenceTools(store: Map<string, string>) {
	return {
		persistence_read: tool({
			description: 'Read a value from the persistence store by name',
			inputSchema: jsonSchema({
				type: 'object' as const,
				properties: {
					name: {
						type: 'string' as const,
						description: 'The name to read',
					},
				},
				required: ['name'],
				additionalProperties: false,
			}),
			execute: async (rawInput) => {
				const { name } = rawInput as { name: string }
				const value = store.get(name)
				return value !== undefined ? { value } : { value: null }
			},
		}),
		persistence_write: tool({
			description:
				'Write (replace) a value in the persistence store. Creates the entry if it does not exist.',
			inputSchema: jsonSchema({
				type: 'object' as const,
				properties: {
					name: {
						type: 'string' as const,
						description: 'The name to write',
					},
					content: {
						type: 'string' as const,
						description: 'The content to store',
					},
				},
				required: ['name', 'content'],
				additionalProperties: false,
			}),
			execute: async (rawInput) => {
				const { name, content } = rawInput as { name: string; content: string }
				store.set(name, content)
				return { success: true }
			},
		}),
		persistence_append: tool({
			description:
				'Append content to an existing value in the persistence store. Creates the entry if it does not exist.',
			inputSchema: jsonSchema({
				type: 'object' as const,
				properties: {
					name: {
						type: 'string' as const,
						description: 'The name to append to',
					},
					content: {
						type: 'string' as const,
						description: 'The content to append',
					},
				},
				required: ['name', 'content'],
				additionalProperties: false,
			}),
			execute: async (rawInput) => {
				const { name, content } = rawInput as { name: string; content: string }
				store.set(name, (store.get(name) ?? '') + content)
				return { success: true }
			},
		}),
		persistence_list: tool({
			description: 'List all names currently in the persistence store',
			inputSchema: jsonSchema({
				type: 'object' as const,
				properties: {},
				required: [] as string[],
				additionalProperties: false,
			}),
			execute: async () => {
				return { names: [...store.keys()] }
			},
		}),
	}
}

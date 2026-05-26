import type { PresetToolDefinition } from './types'

export const PRESET_TOOLS: PresetToolDefinition[] = [
	{
		presetId: 'preset:read_file',
		label: 'Read File',
		name: 'read_file',
		description: 'Read the contents of a file at a given path. Optionally specify a line range.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'File path to read' },
				startLine: {
					type: 'number',
					description: 'Start line (1-based, optional)',
				},
				endLine: {
					type: 'number',
					description: 'End line (1-based, inclusive, optional)',
				},
			},
			required: ['path'],
			additionalProperties: false,
		},
		mockResponse: {
			defaultResponseType: 'static',
			defaultResponse: {
				content:
					'# Sample File\n\nThis is a placeholder file returned by the mock.\nLine 4\nLine 5',
			},
			rules: [
				{
					id: 'json-file',
					condition: 'input.path && input.path.endsWith(".json")',
					response: {
						content: '{\n  "key": "value",\n  "items": [1, 2, 3]\n}',
					},
				},
			],
		},
		core: false,
		keywords: ['file', 'read', 'content', 'text'],
	},
	{
		presetId: 'preset:edit_file',
		label: 'Edit File',
		name: 'edit_file',
		description: 'Replace a string in a file with a new string.',
		parameters: {
			type: 'object',
			properties: {
				path: { type: 'string', description: 'File path to edit' },
				oldString: {
					type: 'string',
					description: 'Exact text to find and replace',
				},
				newString: { type: 'string', description: 'Replacement text' },
			},
			required: ['path', 'oldString', 'newString'],
			additionalProperties: false,
		},
		mockResponse: {
			defaultResponseType: 'static',
			defaultResponse: { success: true },
			rules: [],
		},
		core: false,
		keywords: ['file', 'edit', 'write', 'replace', 'modify'],
	},
	{
		presetId: 'preset:todo',
		label: 'Todo List',
		name: 'todo',
		description: 'Manage a todo list. Supports add, complete, remove, and list actions.',
		parameters: {
			type: 'object',
			properties: {
				action: {
					type: 'string',
					enum: ['add', 'complete', 'remove', 'list'],
					description: 'Action to perform',
				},
				item: { type: 'string', description: 'Todo item text (for add)' },
				id: {
					type: 'number',
					description: 'Todo item id (for complete/remove)',
				},
			},
			required: ['action'],
			additionalProperties: false,
		},
		mockResponse: {
			defaultResponseType: 'llm',
			defaultResponse: { success: true },
			rules: [
				{
					id: 'list-action',
					condition: 'input.action === "list"',
					response: {
						items: [
							{ id: 1, text: 'Review pull request', completed: false },
							{ id: 2, text: 'Update documentation', completed: true },
						],
					},
				},
			],
			llmDefaultConfig: {
				referenceData:
					'This is a todo list tool. On "add", add the item and return {success:true, id:<newId>}. On "complete", mark the item done. On "remove", delete the item. On "list", return all items with their status.',
				persistenceEnabled: true,
				persistenceHint: 'Store the todo list as a JSON array under the key "todos".',
			},
		},
		core: false,
		keywords: ['todo', 'task', 'list', 'manage', 'checklist'],
	},
]

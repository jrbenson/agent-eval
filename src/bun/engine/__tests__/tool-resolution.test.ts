import { describe, expect, it } from 'bun:test'
import { withTestRuntime } from '../../../testing/fixtures/test-runtime'
import { createToolSet } from '../../data/tool-sets'
import { createToolDefinition } from '../../data/tools'
import { resolveTaskTools } from '../tool-resolver'

describe('tool resolver', () => {
	it('merges tool-set schema additions, carries merged keywords, and resolves duplicate names by order', async () => {
		await withTestRuntime({
			run: () => {
				const { id: directSearchId } = createToolDefinition({
					label: 'Direct Search',
					name: 'search',
					description: 'Direct search tool',
					parameters: {
						type: 'object',
						properties: {
							path: { type: 'string' },
						},
						required: ['path'],
						additionalProperties: false,
					},
					keywords: ['direct-search'],
				})

				const { id: setSearchId } = createToolDefinition({
					label: 'Set Search',
					name: 'search',
					description: 'Search tool from set',
					parameters: {
						type: 'object',
						properties: {
							path: { type: 'string' },
						},
						required: ['path'],
						additionalProperties: false,
					},
					keywords: ['tool-search'],
				})

				const { id: lintId } = createToolDefinition({
					label: 'Lint Tool',
					name: 'lint',
					description: 'Lint files',
					parameters: {
						type: 'object',
						properties: {
							path: { type: 'string' },
						},
						required: ['path'],
						additionalProperties: false,
					},
					keywords: ['lint'],
				})

				const { id: toolSetId } = createToolSet({
					label: 'Workspace Tools',
					toolRefs: [
						{ toolDefinitionId: setSearchId },
						{ toolDefinitionId: lintId },
						{ toolDefinitionId: 'missing-tool' },
					],
					schemaAdditions: {
						properties: {
							recursive: { type: 'boolean' },
						},
						required: ['recursive'],
					},
					keywords: ['workspace'],
				})

				const resolved = resolveTaskTools([
					{ type: 'tool', toolDefinitionId: directSearchId },
					{ type: 'toolSet', toolSetId },
				])

				expect(resolved.tools).toHaveLength(2)
				expect(resolved.tools.map((tool) => tool.name)).toEqual(['search', 'lint'])
				expect(resolved.warnings).toEqual(
					expect.arrayContaining([
						'Tool definition not found in set "Workspace Tools": missing-tool',
						'Duplicate tool name "search" resolved by order',
					]),
				)

				const searchTool = resolved.tools[0]
				expect(searchTool?.description).toBe('Search tool from set')
				expect(searchTool?.parameters).toEqual({
					type: 'object',
					properties: {
						path: { type: 'string' },
						recursive: { type: 'boolean' },
					},
					required: expect.arrayContaining(['path', 'recursive']),
					additionalProperties: false,
				})
				expect(searchTool?.keywords).toEqual(expect.arrayContaining(['tool-search', 'workspace']))
			},
		})
	})
})

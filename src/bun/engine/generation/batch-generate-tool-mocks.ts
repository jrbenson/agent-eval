import { listToolDefinitions, updateToolDefinition } from '../../data/tools'
import { ConcurrencyLimiter } from '../concurrency'
import { generateElement } from './generate-element'

export async function generateBatchToolMocks(toolIds: string[]): Promise<{
	results: Array<{ toolId: string; success: boolean; error?: string }>
}> {
	const limiter = new ConcurrencyLimiter(3)
	const results: Array<{ toolId: string; success: boolean; error?: string }> = []

	const tools = listToolDefinitions()
	const toolMap = new Map(tools.map((toolDef) => [toolDef.id, toolDef]))

	await Promise.all(
		toolIds.map((toolId) =>
			limiter.run(async () => {
				const toolDef = toolMap.get(toolId)
				if (!toolDef) {
					results.push({
						toolId,
						success: false,
						error: 'Tool not found',
					})
					return
				}

				try {
					const { result } = await generateElement('toolMockResponse', {
						toolName: toolDef.name,
						toolDescription: toolDef.description,
						toolParameters: toolDef.parameters,
						mockResponse: {},
					})

					updateToolDefinition(toolId, {
						mockResponse: {
							defaultResponseType: (result.defaultResponseType as 'static' | 'llm') ?? 'static',
							defaultResponse: result.defaultResponse ?? { success: true },
							rules:
								(result.rules as Array<{
									id: string
									condition: string
									response: unknown
								}>) ?? [],
						},
					})

					results.push({ toolId, success: true })
				} catch (error) {
					results.push({
						toolId,
						success: false,
						error: String(error),
					})
				}
			}),
		),
	)

	return { results }
}

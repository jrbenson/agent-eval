export type GeneratableEntityType =
	| 'toolDefinition'
	| 'toolSet'
	| 'skill'
	| 'skillSet'
	| 'content'
	| 'contentSet'
	| 'task'
	| 'survey'
	| 'evaluation'
	| 'toolMockResponse'

export interface PromptBuilder {
	gatherContext(): Record<string, unknown>
	buildSystemPrompt(context: Record<string, unknown>): string
	buildUserPrompt(
		existingData: Record<string, unknown>,
		context: Record<string, unknown>,
		userInstructions?: string,
	): string
	outputSchema(): Record<string, unknown>
}

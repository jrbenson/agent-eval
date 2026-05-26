import {
	contentPromptBuilder,
	contentSetPromptBuilder,
	skillPromptBuilder,
	skillSetPromptBuilder,
} from './builders/context-builders'
import {
	evaluationPromptBuilder,
	surveyPromptBuilder,
	taskPromptBuilder,
} from './builders/scenario-builders'
import {
	toolDefinitionPromptBuilder,
	toolMockResponsePromptBuilder,
	toolSetPromptBuilder,
} from './builders/tool-builders'
import type { GeneratableEntityType, PromptBuilder } from './types'

const PROMPT_BUILDERS: Record<GeneratableEntityType, () => PromptBuilder> = {
	toolDefinition: toolDefinitionPromptBuilder,
	toolSet: toolSetPromptBuilder,
	skill: skillPromptBuilder,
	skillSet: skillSetPromptBuilder,
	content: contentPromptBuilder,
	contentSet: contentSetPromptBuilder,
	task: taskPromptBuilder,
	survey: surveyPromptBuilder,
	evaluation: evaluationPromptBuilder,
	toolMockResponse: toolMockResponsePromptBuilder,
}

export function getPromptBuilder(entityType: GeneratableEntityType): PromptBuilder {
	return PROMPT_BUILDERS[entityType]()
}

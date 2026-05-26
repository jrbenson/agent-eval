import type { TrialMessage, TrialStep } from '../../../shared/schemas/trial.schema'

export function getStepMessages(messages: TrialMessage[], step: Pick<TrialStep, 'messageIndices'>) {
	return step.messageIndices.map((index) => messages[index]).filter(Boolean)
}

export function getUnassignedMessages(
	messages: TrialMessage[],
	steps: Pick<TrialStep, 'messageIndices'>[],
	excludedIndices: number[] = [],
) {
	const assignedIndices = new Set<number>(excludedIndices)
	for (const step of steps) {
		for (const index of step.messageIndices) {
			assignedIndices.add(index)
		}
	}

	return messages.flatMap((message, index) =>
		assignedIndices.has(index) ? [] : [{ index, message }],
	)
}

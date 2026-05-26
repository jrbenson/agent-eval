import { Code, Icon, Text, Timeline } from '@chakra-ui/react'
import { useMemo } from 'react'
import { FiAlertCircle } from 'react-icons/fi'
import type { ToolValidation, TrialData } from '../../../shared/schemas/trial.schema'
import MessageBlock from './MessageBlock'
import StepGroup from './StepGroup'
import { getStepMessages, getUnassignedMessages } from './message-entries'

export default function TranscriptView({ trial }: { trial: TrialData }) {
	// Build validation lookup by toolCallId
	const validationMap = useMemo(() => {
		const map = new Map<string, ToolValidation>()
		if (trial.toolValidations) {
			for (const v of trial.toolValidations) {
				map.set(v.toolCallId, v)
			}
		}
		return map
	}, [trial.toolValidations])

	const systemIndex = trial.messages.findIndex((m) => m.role === 'system' && m.content)
	const userIndex = trial.messages.findIndex((m) => m.role === 'user' && m.content)
	const systemMessage = systemIndex >= 0 ? trial.messages[systemIndex] : null
	const userMessage = userIndex >= 0 ? trial.messages[userIndex] : null
	const unassignedMessages = getUnassignedMessages(
		trial.messages,
		trial.steps,
		[systemIndex, userIndex].filter((index) => index >= 0),
	)

	function getValidation(message: TrialData['messages'][number]) {
		const toolCallId = message.toolCalls?.[0]?.id
		return toolCallId ? validationMap.get(toolCallId) : undefined
	}

	return (
		<Timeline.Root variant="plain">
			{/* Error display */}
			{trial.error && (
				<Timeline.Item>
					<Timeline.Connector>
						<Timeline.Separator />
						<Timeline.Indicator color="red.400">
							<Icon fontSize="xs">
								<FiAlertCircle />
							</Icon>
						</Timeline.Indicator>
					</Timeline.Connector>
					<Timeline.Content>
						<Timeline.Title>
							<Text fontSize="xs" fontWeight="bold" color="red.400" textTransform="uppercase">
								Error
							</Text>
						</Timeline.Title>
						<Code display="block" whiteSpace="pre-wrap" p={2} mt={1} fontSize="xs">
							{trial.error}
						</Code>
					</Timeline.Content>
				</Timeline.Item>
			)}

			{/* System prompt */}
			{systemMessage && <MessageBlock message={systemMessage} />}

			{/* User prompt */}
			{userMessage && <MessageBlock message={userMessage} />}

			{/* Step-grouped transcript */}
			{trial.steps.map((step) => {
				const stepMessages = getStepMessages(trial.messages, step)
				return (
					<StepGroup
						key={step.stepIndex}
						step={step}
						messages={stepMessages}
						validations={validationMap}
					/>
				)
			})}

			{/* Messages not assigned to any step */}
			{unassignedMessages.map(({ index, message }) => (
				<MessageBlock key={index} message={message} validation={getValidation(message)} />
			))}
		</Timeline.Root>
	)
}

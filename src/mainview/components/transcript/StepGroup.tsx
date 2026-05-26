import { HStack, Icon, Text, Timeline } from '@chakra-ui/react'
import { FiHash, FiZap } from 'react-icons/fi'
import type { ToolValidation, TrialMessage, TrialStep } from '../../../shared/schemas/trial.schema'
import MessageBlock from './MessageBlock'
import ReasoningBlock from './ReasoningBlock'

export default function StepGroup({
	step,
	messages,
	validations,
}: {
	step: TrialStep
	messages: TrialMessage[]
	validations: Map<string, ToolValidation>
}) {
	return (
		<>
			{/* Step header as a timeline item */}
			<Timeline.Item>
				<Timeline.Connector>
					<Timeline.Separator />
					<Timeline.Indicator color="fg.muted">
						<Icon fontSize="2xs">
							<FiHash />
						</Icon>
					</Timeline.Indicator>
				</Timeline.Connector>
				<Timeline.Content>
					<Timeline.Title>
						<HStack gap={2}>
							<Text fontSize="xs" fontWeight="bold" color="fg.muted" textTransform="uppercase">
								Step {step.stepIndex + 1}
							</Text>
							<Text fontSize="xs" color="fg.muted">
								{step.usage.totalTokens} tokens
							</Text>
							{step.finishReason !== 'stop' && (
								<Text fontSize="xs" color="yellow.500">
									{step.finishReason}
								</Text>
							)}
						</HStack>
					</Timeline.Title>
				</Timeline.Content>
			</Timeline.Item>

			{/* Reasoning */}
			{step.reasoning && (
				<Timeline.Item>
					<Timeline.Connector>
						<Timeline.Separator />
						<Timeline.Indicator color="orange.400">
							<Icon fontSize="xs">
								<FiZap />
							</Icon>
						</Timeline.Indicator>
					</Timeline.Connector>
					<Timeline.Content>
						<ReasoningBlock reasoning={step.reasoning} />
					</Timeline.Content>
				</Timeline.Item>
			)}

			{/* Messages */}
			{messages.map((msg, i) => {
				const toolCallId = msg.toolCalls?.[0]?.id
				const validation = toolCallId ? validations.get(toolCallId) : undefined

				return <MessageBlock key={`${step.stepIndex}-${i}`} message={msg} validation={validation} />
			})}
		</>
	)
}

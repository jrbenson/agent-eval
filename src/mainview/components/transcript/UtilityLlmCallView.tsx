import { Badge, HStack, Text, Timeline, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { TrialStep, UtilityLlmCall } from '../../../shared/schemas/trial.schema'
import CollapsibleSection from '../CollapsibleSection'
import MessageBlock from './MessageBlock'
import StepGroup from './StepGroup'
import { getStepMessages, getUnassignedMessages } from './message-entries'

export default function UtilityLlmCallView({
	call,
	index,
}: {
	call: UtilityLlmCall
	index: number
}) {
	const validationMap = useMemo(() => new Map(), [])

	const hasMessages = call.messages && call.messages.length > 0
	const hasSteps = call.steps && call.steps.length > 0
	const unassignedMessages = getUnassignedMessages(call.messages ?? [], call.steps ?? [])

	const title = call.toolName
		? `${call.toolName} (${call.purpose})`
		: `Utility Call ${index + 1} (${call.purpose})`

	return (
		<CollapsibleSection title={title} defaultExpanded={false}>
			<VStack align="stretch" gap={2}>
				<HStack gap={3} flexWrap="wrap">
					<Badge size="sm" colorPalette="cyan" variant="subtle" fontSize="xs">
						{call.purpose}
					</Badge>
					{call.toolCallId && (
						<Text fontSize="xs" color="fg.muted" fontFamily="mono">
							{call.toolCallId.slice(0, 12)}…
						</Text>
					)}
					<Text fontSize="xs" color="fg.muted">
						{call.inputTokens + call.outputTokens} tokens
					</Text>
					<Text fontSize="xs" color="fg.muted">
						{(call.latencyMs / 1000).toFixed(1)}s
					</Text>
					{hasSteps && (
						<Text fontSize="xs" color="fg.muted">
							{call.steps!.length} steps
						</Text>
					)}
				</HStack>
				{(call.systemPrompt || call.userPrompt || call.assistantResponse || hasMessages) && (
					<Timeline.Root variant="plain">
						{/* System prompt sent to utility LLM */}
						{call.systemPrompt && (
							<MessageBlock message={{ role: 'system', content: call.systemPrompt }} />
						)}
						{/* User prompt sent to utility LLM */}
						{call.userPrompt && (
							<MessageBlock message={{ role: 'user', content: call.userPrompt }} />
						)}
						{/* Assistant response from utility LLM */}
						{call.assistantResponse && (
							<MessageBlock message={{ role: 'assistant', content: call.assistantResponse }} />
						)}
						{call.steps?.map((step: TrialStep) => (
							<StepGroup
								key={step.stepIndex}
								step={step}
								messages={getStepMessages(call.messages ?? [], step)}
								validations={validationMap}
							/>
						))}
						{unassignedMessages.map(({ index, message }) => (
							<MessageBlock key={index} message={message} />
						))}
					</Timeline.Root>
				)}
				{!call.systemPrompt && !call.userPrompt && !call.assistantResponse && !hasMessages && (
					<Text fontSize="xs" color="fg.muted" fontStyle="italic">
						No message transcript available.
					</Text>
				)}
			</VStack>
		</CollapsibleSection>
	)
}

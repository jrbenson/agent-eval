import { Text, Timeline, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { SubagentTrace, ToolValidation } from '../../../shared/schemas/trial.schema'
import CollapsibleSection from '../CollapsibleSection'
import MessageBlock from './MessageBlock'
import StepGroup from './StepGroup'
import { getStepMessages, getUnassignedMessages } from './message-entries'

export default function SubagentTraceView({ trace }: { trace: SubagentTrace }) {
	const validationMap = useMemo(() => {
		const map = new Map<string, ToolValidation>()
		if (trace.toolValidations) {
			for (const v of trace.toolValidations) {
				map.set(v.toolCallId, v)
			}
		}
		return map
	}, [trace.toolValidations])

	const unassignedMessages = getUnassignedMessages(trace.messages ?? [], trace.steps ?? [])

	function getValidation(message: SubagentTrace['messages'][number]) {
		const toolCallId = message.toolCalls?.[0]?.id
		return toolCallId ? validationMap.get(toolCallId) : undefined
	}

	return (
		<CollapsibleSection title={`Subagent (depth ${trace.depth})`} defaultExpanded={false}>
			<VStack align="stretch" pl={4} gap={2}>
				<Text fontSize="xs" color="fg.muted">
					{trace.tokens.total} tokens · {(trace.latencyMs / 1000).toFixed(1)}s ·{' '}
					{trace.steps?.length ?? 0} steps
				</Text>
				<Timeline.Root variant="plain">
					{/* System prompt inherited by subagent */}
					{trace.systemPrompt && (
						<MessageBlock message={{ role: 'system', content: trace.systemPrompt }} />
					)}
					{/* User prompt (delegated task) */}
					<MessageBlock message={{ role: 'user', content: trace.task }} />
					{trace.steps.map((step) => (
						<StepGroup
							key={step.stepIndex}
							step={step}
							messages={getStepMessages(trace.messages, step)}
							validations={validationMap}
						/>
					))}
					{unassignedMessages.map(({ index, message }) => (
						<MessageBlock key={index} message={message} validation={getValidation(message)} />
					))}
				</Timeline.Root>
				{trace.responseText && (
					<Text fontSize="xs" color="fg.muted" fontStyle="italic">
						Response: {trace.responseText}
					</Text>
				)}
			</VStack>
		</CollapsibleSection>
	)
}

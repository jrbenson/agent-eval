import { Badge, HStack, Icon, IconButton, Text, Timeline, VStack } from '@chakra-ui/react'
import {
	FiArrowDown,
	FiCpu,
	FiMessageSquare,
	FiSettings,
	FiTerminal,
	FiTool,
	FiUser,
} from 'react-icons/fi'
import type { ToolValidation, TrialMessage } from '../../../shared/schemas/trial.schema'
import CodeEditor from '../CodeEditor'
import SubagentTraceView from './SubagentTraceView'

const ROLE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
	system: { icon: FiSettings, color: 'fg.muted', label: 'System' },
	user: { icon: FiUser, color: 'blue.400', label: 'Task' },
	assistant: { icon: FiCpu, color: 'purple.400', label: 'Assistant' },
	tool: { icon: FiTerminal, color: 'yellow.500', label: 'Tool Results' },
}

// Tool-call assistant messages get a distinct config
const TOOL_CALL_CONFIG = {
	icon: FiTool,
	color: 'yellow.500',
	label: 'Tool Calls',
}

function getMessageConfig(message: TrialMessage) {
	if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
		return TOOL_CALL_CONFIG
	}
	return (
		ROLE_CONFIG[message.role] ?? {
			icon: FiMessageSquare,
			color: 'fg.muted',
			label: message.role,
		}
	)
}

function tryFormatJson(text: string): string {
	try {
		return JSON.stringify(JSON.parse(text), null, 2)
	} catch {
		return text
	}
}

export default function MessageBlock({
	message,
	validation,
}: {
	message: TrialMessage
	validation?: ToolValidation
}) {
	const config = getMessageConfig(message)
	const isToolCallMsg =
		message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0

	return (
		<Timeline.Item>
			<Timeline.Connector>
				<Timeline.Separator />
				<Timeline.Indicator color={config.color}>
					<Icon fontSize="xs">
						<config.icon />
					</Icon>
				</Timeline.Indicator>
			</Timeline.Connector>
			<Timeline.Content>
				<Timeline.Title>
					<HStack gap={2} flexWrap="wrap">
						<Text fontSize="xs" fontWeight="bold" color={config.color} textTransform="uppercase">
							{config.label}
						</Text>
						{isToolCallMsg && validation && <ValidationBadge validation={validation} />}
						{message.finishReason && message.finishReason !== 'stop' && (
							<Badge size="sm" variant="outline" colorPalette="yellow" fontSize="xs">
								{message.finishReason}
							</Badge>
						)}
					</HStack>
				</Timeline.Title>

				{message.content &&
					(message.role === 'tool' ? (
						<VStack
							gap={1}
							align="stretch"
							id={message.toolResultFor ? `tool-result-${message.toolResultFor}` : undefined}
						>
							{message.toolName && (
								<Badge
									size="sm"
									variant="subtle"
									colorPalette="yellow"
									fontSize="xs"
									width="fit-content"
								>
									{message.toolName}
								</Badge>
							)}
							<CodeEditor
								value={tryFormatJson(message.content)}
								mode="json"
								readOnly
								showGutter={false}
								minLines={1}
								maxLines={15}
								name={`tool-result-${message.toolResultFor ?? 'unknown'}`}
							/>
						</VStack>
					) : (
						<Text fontSize="sm" whiteSpace="pre-wrap" color="fg.muted">
							{message.content}
						</Text>
					))}

				{isToolCallMsg && (
					<VStack gap={2} mt={1} align="stretch">
						{message.toolCalls!.map((tc) => (
							<VStack key={tc.id} gap={1} align="stretch">
								<HStack gap={1}>
									<Badge colorPalette="yellow" fontSize="xs" width="fit-content">
										{tc.name}
									</Badge>
									<IconButton
										aria-label="Jump to result"
										size="2xs"
										variant="ghost"
										onClick={() => {
											document.getElementById(`tool-result-${tc.id}`)?.scrollIntoView({
												behavior: 'smooth',
												block: 'center',
											})
										}}
									>
										<FiArrowDown />
									</IconButton>
								</HStack>
								<ToolCallBlock toolCall={tc} />
							</VStack>
						))}
						{validation &&
							validation.validationErrors.length > 0 &&
							validation.validationErrors.map((err) => (
								<Text key={err} fontSize="xs" color="red.300">
									{err}
								</Text>
							))}
						{validation?.subagentTrace && <SubagentTraceView trace={validation.subagentTrace} />}
					</VStack>
				)}
			</Timeline.Content>
		</Timeline.Item>
	)
}

function ToolCallBlock({
	toolCall,
}: {
	toolCall: { id: string; name: string; input: Record<string, unknown> }
}) {
	const inputStr = JSON.stringify(toolCall.input, null, 2)

	return (
		<CodeEditor
			value={inputStr}
			mode="json"
			readOnly
			showGutter={false}
			minLines={1}
			maxLines={15}
			name={`tool-call-${toolCall.id}`}
		/>
	)
}

function ValidationBadge({ validation }: { validation: ToolValidation }) {
	const palette = validation.validationPassed ? 'green' : 'red'

	return (
		<Badge fontSize="xs" colorPalette={palette} variant="subtle">
			{validation.validationPassed ? 'valid' : 'invalid'}
			{validation.durationMs > 0 && ` (${validation.durationMs}ms)`}
		</Badge>
	)
}

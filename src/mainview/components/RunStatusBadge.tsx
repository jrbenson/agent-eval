import { Code, Popover, Portal } from '@chakra-ui/react'
import { statusColor } from '../utils/status'
import StatusIndicator from './StatusIndicator'

export default function RunStatusBadge({
	status,
	fontSize,
	error,
}: {
	status: string
	fontSize?: string
	error?: string | null
}) {
	const badge = (
		<StatusIndicator
			colorPalette={statusColor(status)}
			size="sm"
			fontSize={fontSize}
			cursor={error ? 'pointer' : undefined}
		>
			{status}
		</StatusIndicator>
	)

	if (!error) return badge

	return (
		<Popover.Root>
			<Popover.Trigger asChild>{badge}</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content maxW="400px">
						<Popover.Arrow />
						<Popover.Body>
							<Code display="block" whiteSpace="pre-wrap" p={2} fontSize="xs" colorPalette="red">
								{error}
							</Code>
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

import { IconButton, Popover, Portal, Text } from '@chakra-ui/react'
import { type ReactNode, useEffect, useState } from 'react'
import { FiInfo } from 'react-icons/fi'

interface ToggleTipProps {
	content: ReactNode
	maxW?: string
}

export default function ToggleTip({ content, maxW = '280px' }: ToggleTipProps) {
	const [open, setOpen] = useState(false)

	useEffect(() => {
		if (!open) return
		const close = () => setOpen(false)
		window.addEventListener('scroll', close, true)
		return () => window.removeEventListener('scroll', close, true)
	}, [open])

	return (
		<Popover.Root
			open={open}
			onOpenChange={(e) => setOpen(e.open)}
			positioning={{ placement: 'top' }}
		>
			<Popover.Trigger asChild>
				<IconButton aria-label="Help" size="2xs" variant="ghost" color="fg.muted">
					<FiInfo />
				</IconButton>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content maxW={maxW}>
						<Popover.Arrow>
							<Popover.ArrowTip />
						</Popover.Arrow>
						<Popover.Body>
							{typeof content === 'string' ? <Text fontSize="xs">{content}</Text> : content}
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

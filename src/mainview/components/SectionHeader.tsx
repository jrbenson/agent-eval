import { Collapsible, HStack, Heading, Icon, Text, VStack } from '@chakra-ui/react'
import { type ReactNode, useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

export function SectionHeader({
	title,
	description,
	actions,
	trailing,
	collapsible,
	defaultOpen = true,
	open: controlledOpen,
	onOpenChange,
	children,
}: {
	title: string
	description: string
	actions?: ReactNode
	trailing?: ReactNode
	collapsible?: boolean
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	children?: ReactNode
}) {
	const [internalOpen, setInternalOpen] = useState(defaultOpen)
	const isOpen = controlledOpen ?? internalOpen
	const setOpen = onOpenChange ?? setInternalOpen

	const header = (
		<HStack
			gap={4}
			align="center"
			justify="space-between"
			pb={2}
			{...(collapsible
				? {
						cursor: 'pointer',
						onClick: () => setOpen(!isOpen),
						userSelect: 'none',
					}
				: {})}
		>
			<VStack gap={0} align="stretch">
				<HStack gap={2} align="center">
					<Heading size="md" textTransform="uppercase">
						{title}
					</Heading>
					{collapsible && (
						<Icon boxSize={3} color="fg" flexShrink={0}>
							{isOpen ? <FiChevronDown /> : <FiChevronRight />}
						</Icon>
					)}
					{trailing}
				</HStack>
				<HStack gap={1} align="center">
					<Text fontSize="xs" color="fg.muted" lineClamp={1}>
						{description}
					</Text>
				</HStack>
			</VStack>
			{(trailing || actions) && (
				<HStack gap={2} flexShrink={0} onClick={(e) => e.stopPropagation()}>
					{actions}
				</HStack>
			)}
		</HStack>
	)

	if (!collapsible || !children) return header

	return (
		<Collapsible.Root open={isOpen} onOpenChange={(e) => setOpen(e.open)}>
			<Collapsible.Trigger asChild>{header}</Collapsible.Trigger>
			<Collapsible.Content>{children}</Collapsible.Content>
		</Collapsible.Root>
	)
}

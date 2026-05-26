import { Box, Collapsible, HStack, Heading } from '@chakra-ui/react'
import { type ReactNode, useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

interface CollapsibleSectionProps {
	title: string
	defaultExpanded?: boolean
	headerRight?: ReactNode
	count?: number
	children: ReactNode
}

export default function CollapsibleSection({
	title,
	defaultExpanded = true,
	headerRight,
	count,
	children,
}: CollapsibleSectionProps) {
	const [open, setOpen] = useState(defaultExpanded)
	const onToggle = () => setOpen((prev) => !prev)

	return (
		<Box mb={4}>
			<HStack
				justify="space-between"
				align="center"
				py={2}
				px={1}
				cursor="pointer"
				_hover={{ bg: 'bg.subtle' }}
				borderRadius="md"
				userSelect="none"
			>
				<HStack gap={2} onClick={onToggle} flex={1}>
					<Box as={open ? FiChevronDown : FiChevronRight} boxSize={4} color="fg.subtle" />
					<Heading size="sm" textTransform="uppercase">
						{title}
						{count !== undefined && (
							<Box as="span" ml={2} fontSize="xs" color="fg.muted" fontWeight="normal">
								({count})
							</Box>
						)}
					</Heading>
				</HStack>
				{headerRight && <Box onClick={(e) => e.stopPropagation()}>{headerRight}</Box>}
			</HStack>
			<Collapsible.Root open={open}>
				<Collapsible.Content>
					<Box pt={2} pl={6}>
						{children}
					</Box>
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	)
}

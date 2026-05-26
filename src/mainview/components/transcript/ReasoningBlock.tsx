import { Box, Collapsible, HStack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'

export default function ReasoningBlock({
	reasoning,
}: {
	reasoning: string | { type: string; text: string }[]
}) {
	const [open, setOpen] = useState(false)
	const onToggle = () => setOpen((prev) => !prev)

	const text =
		typeof reasoning === 'string'
			? reasoning
			: Array.isArray(reasoning)
				? reasoning
						.map((r) => (typeof r === 'string' ? r : r.text))
						.filter(Boolean)
						.join('\n')
				: String(reasoning)

	return (
		<Box>
			<HStack cursor="pointer" onClick={onToggle} _hover={{ opacity: 0.8 }} gap={1}>
				<Box as={open ? FiChevronDown : FiChevronRight} color="orange.400" boxSize={3} />
				<Text fontSize="xs" fontWeight="bold" color="orange.400" textTransform="uppercase">
					Reasoning
				</Text>
			</HStack>
			<Collapsible.Root open={open}>
				<Collapsible.Content>
					<Text fontSize="sm" fontStyle="italic" color="fg.muted" whiteSpace="pre-wrap" mt={1}>
						{text}
					</Text>
				</Collapsible.Content>
			</Collapsible.Root>
		</Box>
	)
}

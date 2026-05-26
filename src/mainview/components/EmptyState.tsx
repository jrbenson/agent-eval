import { Box, EmptyState as ChakraEmptyState, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'

export default function EmptyState({
	icon,
	title,
	description,
	message,
	action,
}: {
	icon?: IconType
	title?: string
	description?: string
	message: string
	action?: ReactNode
}) {
	const titleText = title ?? message
	const indicator = icon ? <Box as={icon} boxSize={6} /> : null

	return (
		<ChakraEmptyState.Root size="sm" py={8}>
			<ChakraEmptyState.Content>
				{indicator && <ChakraEmptyState.Indicator>{indicator}</ChakraEmptyState.Indicator>}
				{description ? (
					<VStack gap={1} textAlign="center">
						<ChakraEmptyState.Title>{titleText}</ChakraEmptyState.Title>
						<ChakraEmptyState.Description>{description}</ChakraEmptyState.Description>
					</VStack>
				) : (
					<ChakraEmptyState.Title>{titleText}</ChakraEmptyState.Title>
				)}
				{action}
			</ChakraEmptyState.Content>
		</ChakraEmptyState.Root>
	)
}

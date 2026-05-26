import { Spinner, Text, VStack } from '@chakra-ui/react'

interface LoadingBlockProps {
	label?: string
	py?: number | string
	align?: 'start' | 'center'
}

export default function LoadingBlock({
	label = 'Loading...',
	py = 4,
	align = 'start',
}: LoadingBlockProps) {
	return (
		<VStack py={py} gap={2} align={align}>
			<Spinner size="sm" color="fg.muted" />
			<Text color="fg.muted" fontSize="sm">
				{label}
			</Text>
		</VStack>
	)
}

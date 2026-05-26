import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import PageHeader from './PageHeader'

interface ListPageLayoutProps {
	title: string
	description?: string
	actions?: ReactNode
	children: ReactNode
}

export default function ListPageLayout({
	title,
	description,
	actions,
	children,
}: ListPageLayoutProps) {
	return (
		<Flex direction="column" h="100%" minH={0}>
			{/* Fixed header */}
			<Box
				flexShrink={0}
				bg="bg"
				borderBottom="1px solid"
				borderColor="border.subtle"
				pb={3}
				pt={4}
				px={6}
			>
				<PageHeader title={title} description={description} actions={actions} />
			</Box>

			{/* Scrollable body */}
			<Box flex={1} overflowY="auto" minH={0}>
				<Box px={6} pt={4} pb={8}>
					{children}
				</Box>
			</Box>
		</Flex>
	)
}

import { Box, Flex } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import { useTrailingAction } from '../hooks/use-trailing-action'
import PageHeader, { type BreadcrumbItem } from './PageHeader'

interface DrillInLayoutProps {
	title: string
	onTitleChange?: (value: string) => void
	breadcrumbs: BreadcrumbItem[]
	actions?: ReactNode
	inlineStatus?: ReactNode
	trailingAction?: ReactNode
	subHeader?: ReactNode
	children: ReactNode
}

export default function DrillInLayout({
	title,
	onTitleChange,
	breadcrumbs,
	actions,
	inlineStatus,
	trailingAction,
	subHeader,
	children,
}: DrillInLayoutProps) {
	const contextTrailing = useTrailingAction()
	const effectiveTrailing = trailingAction ?? contextTrailing
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
				<PageHeader
					title={title}
					onTitleChange={onTitleChange}
					breadcrumbs={breadcrumbs}
					actions={actions}
					inlineStatus={inlineStatus}
					trailingAction={effectiveTrailing}
				/>
				{subHeader && <Box mt={1}>{subHeader}</Box>}
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

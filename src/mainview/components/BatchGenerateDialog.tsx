import { Badge, Card, Spinner, Table, Text, VStack } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import type { BatchToolMockResult } from '../../shared/rpc-types'
import { useGenerateBatchToolMocks } from '../hooks/use-generate-element'
import AppDialog, { AppDialogFooter } from './AppDialog'

interface BatchGenerateDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	toolIds: string[]
	toolNames: Record<string, string>
}

export default function BatchGenerateDialog({
	open,
	onOpenChange,
	toolIds,
	toolNames,
}: BatchGenerateDialogProps) {
	const generate = useGenerateBatchToolMocks()
	const firedRef = useRef(false)

	// biome-ignore lint/correctness/useExhaustiveDependencies: generate.mutate is stable per TanStack Query; including generate object would infinite-loop
	useEffect(() => {
		if (open && toolIds.length > 0 && !firedRef.current) {
			firedRef.current = true
			generate.mutate({ toolIds })
		}
		if (!open) {
			firedRef.current = false
		}
	}, [open, toolIds])

	const handleClose = () => {
		generate.reset()
		onOpenChange(false)
	}

	const results = generate.data?.results
	const succeeded = results?.filter((r) => r.success).length ?? 0
	const failed = results?.filter((r) => !r.success).length ?? 0

	return (
		<AppDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) handleClose()
			}}
			title="Generating Mock Responses"
			size="lg"
			error={generate.isError ? String(generate.error) : null}
			footer={
				generate.isPending ? undefined : (
					<AppDialogFooter onCancel={handleClose} onConfirm={handleClose} confirmLabel="Done" />
				)
			}
		>
			<VStack gap={3} align="stretch">
				{generate.isPending && (
					<VStack gap={2} py={4} align="center">
						<Spinner size="lg" />
						<Text fontSize="sm" color="fg.muted">
							Generating mock responses for {toolIds.length} tool
							{toolIds.length !== 1 ? 's' : ''}...
						</Text>
					</VStack>
				)}

				{results && (
					<>
						<Text fontSize="sm" color="fg.muted">
							{succeeded} succeeded, {failed} failed out of {results.length} tool
							{results.length !== 1 ? 's' : ''}.
						</Text>
						<Card.Root variant="outline">
							<Card.Body p={0} maxH="400px" overflowY="auto">
								<Table.Root size="sm">
									<Table.Header>
										<Table.Row>
											<Table.ColumnHeader>Tool</Table.ColumnHeader>
											<Table.ColumnHeader width="1">Status</Table.ColumnHeader>
											<Table.ColumnHeader>Error</Table.ColumnHeader>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{results.map((r: BatchToolMockResult) => (
											<Table.Row key={r.toolId}>
												<Table.Cell fontFamily="mono" fontSize="xs">
													{toolNames[r.toolId] ?? r.toolId}
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap">
													{r.success ? (
														<Badge size="sm" colorPalette="green">
															Done
														</Badge>
													) : (
														<Badge size="sm" colorPalette="red">
															Failed
														</Badge>
													)}
												</Table.Cell>
												<Table.Cell fontSize="xs" color="fg.muted">
													{r.error ?? ''}
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</>
				)}
			</VStack>
		</AppDialog>
	)
}

import { Badge, Card, Checkbox, Field, Table, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { ImportToolResult } from '../../shared/rpc-types'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import AppDialog, { AppDialogFooter } from './AppDialog'
import EntityPickerCombobox from './EntityPickerCombobox'

interface ImportConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	results: ImportToolResult[]
	toolSets: StoredToolSet[]
	toolSetLabel: string
	onToolSetLabelChange: (label: string) => void
	generateMocks: boolean
	onGenerateMocksChange: (value: boolean) => void
	onConfirm: () => void
	onCancel: () => void
	committing: boolean
}

function statusBadge(status: ImportToolResult['status']) {
	switch (status) {
		case 'ready':
			return (
				<Badge size="sm" colorPalette="green">
					Ready
				</Badge>
			)
		case 'coerced':
			return (
				<Badge size="sm" colorPalette="yellow">
					Coerced
				</Badge>
			)
		case 'failed':
			return (
				<Badge size="sm" colorPalette="red">
					Failed
				</Badge>
			)
	}
}

export default function ImportConfirmDialog({
	open,
	onOpenChange,
	results,
	toolSets,
	toolSetLabel,
	onToolSetLabelChange,
	generateMocks,
	onGenerateMocksChange,
	onConfirm,
	onCancel,
	committing,
}: ImportConfirmDialogProps) {
	const importable = results.filter((r) => r.status !== 'failed')
	const failed = results.filter((r) => r.status === 'failed')

	const toolSetItems = useMemo(
		() => toolSets.map((ts) => ({ label: ts.label, value: ts.label })),
		[toolSets],
	)

	return (
		<AppDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) onCancel()
				onOpenChange(isOpen)
			}}
			title="Import Preview"
			size="lg"
			footer={
				<AppDialogFooter
					onCancel={onCancel}
					onConfirm={onConfirm}
					confirmLabel={`Import ${importable.length} tool${importable.length !== 1 ? 's' : ''}`}
					confirmLoading={committing}
				/>
			}
		>
			<VStack gap={3} align="stretch">
				<Text fontSize="sm" color="fg.muted">
					{importable.length} tool{importable.length !== 1 ? 's' : ''} will be imported
					{failed.length > 0 && `, ${failed.length} failed`}.
				</Text>

				<Card.Root variant="outline">
					<Card.Body p={0} maxH="400px" overflowY="auto">
						<Table.Root size="sm">
							<Table.Header>
								<Table.Row>
									<Table.ColumnHeader>#</Table.ColumnHeader>
									<Table.ColumnHeader>Name</Table.ColumnHeader>
									<Table.ColumnHeader>Status</Table.ColumnHeader>
									<Table.ColumnHeader>Notes</Table.ColumnHeader>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{results.map((r) => (
									<Table.Row key={r.index}>
										<Table.Cell width="1" color="fg.muted" fontSize="xs">
											{r.index + 1}
										</Table.Cell>
										<Table.Cell fontFamily="mono" fontSize="xs">
											{r.name}
										</Table.Cell>
										<Table.Cell width="1" whiteSpace="nowrap">
											{statusBadge(r.status)}
										</Table.Cell>
										<Table.Cell fontSize="xs" color="fg.muted">
											{r.error ?? (r.warnings.length > 0 ? r.warnings.join('; ') : '')}
										</Table.Cell>
									</Table.Row>
								))}
							</Table.Body>
						</Table.Root>
					</Card.Body>
				</Card.Root>

				<Field.Root>
					<Field.Label fontSize="sm">Add to Tool Set (optional)</Field.Label>
					<EntityPickerCombobox
						allowCustomValue
						emptyMessage="No matching tool sets"
						inputValue={toolSetLabel}
						items={toolSetItems}
						onInputValueChange={onToolSetLabelChange}
						onSelect={onToolSetLabelChange}
						placeholder="Type to search or create a tool set..."
						renderItem={(item) => item.label}
					/>
					<Field.HelperText fontSize="xs">
						Select an existing tool set or type a new name to create one.
					</Field.HelperText>
				</Field.Root>

				<Checkbox.Root
					checked={generateMocks}
					onCheckedChange={(e) => onGenerateMocksChange(!!e.checked)}
					disabled={importable.length === 0}
				>
					<Checkbox.HiddenInput />
					<Checkbox.Control>
						<Checkbox.Indicator />
					</Checkbox.Control>
					<Checkbox.Label fontSize="sm">Generate mock responses for imported tools</Checkbox.Label>
				</Checkbox.Root>
			</VStack>
		</AppDialog>
	)
}

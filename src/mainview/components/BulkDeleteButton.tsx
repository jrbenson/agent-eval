import { Button, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import AppDialog from './AppDialog'

interface BulkDeleteButtonProps {
	count: number
	onDelete: () => void
	isLoading?: boolean
	entityLabel?: string
}

export default function BulkDeleteButton({
	count,
	onDelete,
	isLoading,
	entityLabel = 'items',
}: BulkDeleteButtonProps) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				size="xs"
				variant="ghost"
				colorPalette="red"
				onClick={(e) => {
					e.stopPropagation()
					setOpen(true)
				}}
			>
				<FiTrash2 />
				Delete ({count})
			</Button>
			<AppDialog
				open={open}
				onOpenChange={setOpen}
				title="Confirm Bulk Delete"
				size="sm"
				footer={
					<>
						<Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button
							colorPalette="red"
							size="sm"
							loading={isLoading}
							onClick={() => {
								onDelete()
								setOpen(false)
							}}
						>
							Delete {count} {entityLabel}
						</Button>
					</>
				}
			>
				<Text>
					Delete {count} {entityLabel}? This cannot be undone.
				</Text>
			</AppDialog>
		</>
	)
}

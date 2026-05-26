import { IconButton } from '@chakra-ui/react'
import type React from 'react'
import { FiTrash2 } from 'react-icons/fi'

export default function ConfirmDeleteButton({
	onDelete,
	isLoading,
	'aria-label': ariaLabel = 'Delete',
}: {
	onDelete: () => void
	isLoading?: boolean
	'aria-label'?: string
}) {
	return (
		<IconButton
			aria-label={ariaLabel}
			size="xs"
			variant="ghost"
			colorPalette="red"
			loading={isLoading}
			onClick={(e: React.MouseEvent) => {
				e.stopPropagation()
				onDelete()
			}}
		>
			<FiTrash2 />
		</IconButton>
	)
}

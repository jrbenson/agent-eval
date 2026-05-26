import { Checkbox, Table } from '@chakra-ui/react'
import type { ComponentProps, KeyboardEvent } from 'react'

type TableRowProps = ComponentProps<typeof Table.Row>

interface ClickableRowProps extends Omit<TableRowProps, 'onClick'> {
	onClick: () => void
	selected?: boolean
	onSelectToggle?: () => void
}

export default function ClickableRow({
	onClick,
	children,
	selected,
	onSelectToggle,
	...props
}: ClickableRowProps) {
	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault()
			onClick()
		}
	}

	return (
		<Table.Row
			cursor="pointer"
			_hover={{ bg: 'bg.subtle' }}
			tabIndex={0}
			onClick={onClick}
			onKeyDown={handleKeyDown}
			{...props}
		>
			{onSelectToggle !== undefined && (
				<Table.Cell width="1" px={1}>
					<Checkbox.Root
						size="sm"
						checked={!!selected}
						onCheckedChange={() => onSelectToggle()}
						onClick={(e) => e.stopPropagation()}
					>
						<Checkbox.HiddenInput />
						<Checkbox.Control>
							<Checkbox.Indicator />
						</Checkbox.Control>
					</Checkbox.Root>
				</Table.Cell>
			)}
			{children}
		</Table.Row>
	)
}

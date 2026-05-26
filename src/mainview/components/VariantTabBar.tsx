import { Button, CloseButton, Editable, Tabs } from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlus } from 'react-icons/fi'

export interface VariantTab {
	id: string
	label: string
}

interface VariantTabBarProps {
	variants: VariantTab[]
	activeTabId: string // "primary" or variant UUID
	primaryLabel?: string
	onSelect: (tabId: string) => void
	onAdd: () => void
	onRename: (id: string, newLabel: string) => void
	onDelete: (id: string) => void
}

export function VariantTabBar({
	variants,
	activeTabId,
	primaryLabel = 'Primary',
	onSelect,
	onAdd,
	onRename,
	onDelete,
}: VariantTabBarProps) {
	const [editingId, setEditingId] = useState<string | null>(null)

	const stopKeyPropagation = (e: React.KeyboardEvent) => {
		e.stopPropagation()
		if (e.key === ' ') e.preventDefault()
	}

	return (
		<Tabs.Root
			value={activeTabId}
			onValueChange={(e) => {
				if (!editingId) onSelect(e.value)
			}}
			variant="line"
			size="sm"
		>
			<Tabs.List flex="1 1 auto">
				<Tabs.Trigger
					value="primary"
					onKeyDown={editingId === 'primary' ? stopKeyPropagation : undefined}
				>
					{activeTabId === 'primary' ? (
						<Editable.Root
							defaultValue={primaryLabel}
							activationMode="click"
							onValueCommit={(e) => {
								setEditingId(null)
								if (e.value.trim()) onRename('primary', e.value.trim())
							}}
							onEditChange={(details) => setEditingId(details.edit ? 'primary' : null)}
							onClick={(e) => e.stopPropagation()}
							onKeyDown={stopKeyPropagation}
						>
							<Editable.Preview />
							<Editable.Input onKeyDown={stopKeyPropagation} />
						</Editable.Root>
					) : (
						primaryLabel
					)}
				</Tabs.Trigger>

				{variants.map((v) => (
					<Tabs.Trigger
						value={v.id}
						key={v.id}
						onKeyDown={editingId === v.id ? stopKeyPropagation : undefined}
					>
						{activeTabId === v.id ? (
							<Editable.Root
								defaultValue={v.label}
								activationMode="click"
								onValueCommit={(e) => {
									setEditingId(null)
									if (e.value.trim()) onRename(v.id, e.value.trim())
								}}
								onEditChange={(details) => setEditingId(details.edit ? v.id : null)}
								onClick={(e) => e.stopPropagation()}
								onKeyDown={stopKeyPropagation}
							>
								<Editable.Preview />
								<Editable.Input onKeyDown={stopKeyPropagation} />
							</Editable.Root>
						) : (
							v.label
						)}
						<CloseButton
							as="span"
							role="button"
							size="2xs"
							me="-2"
							onClick={(e) => {
								e.stopPropagation()
								onDelete(v.id)
							}}
						/>
					</Tabs.Trigger>
				))}

				<Button alignSelf="center" ms="2" size="2xs" variant="ghost" onClick={onAdd}>
					<FiPlus /> Add Variant
				</Button>
			</Tabs.List>
		</Tabs.Root>
	)
}

import { Combobox, Portal, useFilter, useListCollection } from '@chakra-ui/react'
import { type ReactNode, useEffect, useMemo } from 'react'

export interface EntityPickerItem {
	label: string
	value: string
	group?: string
}

interface EntityPickerComboboxProps<TItem extends EntityPickerItem> {
	allowCustomValue?: boolean
	emptyMessage: string
	inputValue?: string
	items: TItem[]
	itemToString?: (item: TItem) => string
	onInputValueChange?: (value: string) => void
	onSelect: (value: string) => void
	placeholder?: string
	renderItem: (item: TItem) => ReactNode
	value?: string[]
}

export default function EntityPickerCombobox<TItem extends EntityPickerItem>({
	allowCustomValue,
	emptyMessage,
	inputValue,
	items,
	itemToString = (item) => item.label,
	onInputValueChange,
	onSelect,
	placeholder,
	renderItem,
	value = [],
}: EntityPickerComboboxProps<TItem>) {
	const { contains } = useFilter({ sensitivity: 'base' })
	const { collection, filter, set } = useListCollection({
		initialItems: items,
		filter: contains,
		itemToString,
		itemToValue: (item) => item.value,
	})

	useEffect(() => {
		set(items)
		filter(inputValue ?? '')
	}, [filter, inputValue, items, set])

	const groups = useMemo(() => {
		const seen = new Set<string>()
		const groupLabels: string[] = []

		for (const item of collection.items) {
			if (!item.group || seen.has(item.group)) continue
			seen.add(item.group)
			groupLabels.push(item.group)
		}

		return groupLabels
	}, [collection.items])

	const renderComboboxItem = (item: TItem) => (
		<Combobox.Item item={item} key={item.value}>
			{renderItem(item)}
			<Combobox.ItemIndicator />
		</Combobox.Item>
	)

	return (
		<Combobox.Root
			allowCustomValue={allowCustomValue}
			collection={collection}
			inputBehavior="autohighlight"
			inputValue={inputValue}
			onInputValueChange={(event) => {
				onInputValueChange?.(event.inputValue)
				filter(event.inputValue)
			}}
			onValueChange={(event) => {
				if (event.value[0]) onSelect(event.value[0])
			}}
			openOnClick
			value={value}
		>
			<Combobox.Control>
				<Combobox.Input placeholder={placeholder} />
				<Combobox.IndicatorGroup>
					<Combobox.ClearTrigger />
					<Combobox.Trigger />
				</Combobox.IndicatorGroup>
			</Combobox.Control>
			<Portal>
				<Combobox.Positioner>
					<Combobox.Content>
						<Combobox.Empty>{emptyMessage}</Combobox.Empty>
						{groups.length > 0
							? groups.map((group) => (
									<Combobox.ItemGroup key={group}>
										<Combobox.ItemGroupLabel fontWeight="normal" fontSize="xs" color="fg.muted">
											{group}
										</Combobox.ItemGroupLabel>
										{collection.items
											.filter((item) => item.group === group)
											.map((item) => renderComboboxItem(item))}
									</Combobox.ItemGroup>
								))
							: collection.items.map((item) => renderComboboxItem(item))}
					</Combobox.Content>
				</Combobox.Positioner>
			</Portal>
		</Combobox.Root>
	)
}

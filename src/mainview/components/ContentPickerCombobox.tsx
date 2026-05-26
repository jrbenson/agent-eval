import { Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { StoredContentSet } from '../../shared/schemas/content-set.schema'
import type { StoredContent } from '../../shared/schemas/content.schema'
import EntityPickerCombobox from './EntityPickerCombobox'

interface ContentItem {
	label: string
	value: string
	key: string
}

interface ContentPickerComboboxProps {
	contents: StoredContent[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function ContentPickerCombobox({
	contents,
	excludeIds,
	onSelect,
	placeholder = 'Search content...',
}: ContentPickerComboboxProps) {
	const items = useMemo<ContentItem[]>(
		() =>
			contents
				.filter((c) => !excludeIds.has(c.id))
				.map((c) => ({
					label: c.label,
					value: c.id,
					key: c.name,
				})),
		[contents, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No content found"
			items={items}
			itemToString={(item) => `${item.label} ${item.key}`}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<VStack gap={0} align="start" flex={1}>
					<Text fontSize="sm">{item.label}</Text>
					<Text fontSize="xs" color="fg.muted" fontFamily="mono">
						{item.key}
					</Text>
				</VStack>
			)}
		/>
	)
}

interface ContentSetPickerComboboxProps {
	contentSets: StoredContentSet[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function ContentSetPickerCombobox({
	contentSets,
	excludeIds,
	onSelect,
	placeholder = 'Attach a content set...',
}: ContentSetPickerComboboxProps) {
	const items = useMemo(
		() =>
			contentSets
				.filter((cs) => !excludeIds.has(cs.id))
				.map((cs) => ({
					label: cs.label,
					value: cs.id,
					count: cs.contentRefs.length,
				})),
		[contentSets, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No content sets found"
			items={items}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<VStack gap={0} align="start" flex={1}>
					<Text fontSize="sm">{item.label}</Text>
					<Text fontSize="xs" color="fg.muted">
						{item.count} item{item.count !== 1 ? 's' : ''}
					</Text>
				</VStack>
			)}
		/>
	)
}

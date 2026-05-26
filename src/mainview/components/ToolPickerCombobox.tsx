import { Badge, HStack, Text, VStack } from '@chakra-ui/react'
import { useMemo } from 'react'
import type { StoredToolDefinition } from '../../shared/schemas/tool-definition.schema'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import EntityPickerCombobox from './EntityPickerCombobox'

interface ToolItem {
	label: string
	value: string
	toolName: string
	isLlm: boolean
	hasPersistence: boolean
}

function hasAnyPersistence(td: StoredToolDefinition): boolean {
	if (td.mockResponse.llmDefaultConfig?.persistenceEnabled) return true
	for (const rule of td.mockResponse.rules) {
		if (rule.persistenceOps && rule.persistenceOps.length > 0) return true
	}
	return false
}

interface ToolPickerComboboxProps {
	tools: StoredToolDefinition[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function ToolPickerCombobox({
	tools,
	excludeIds,
	onSelect,
	placeholder = 'Search tools...',
}: ToolPickerComboboxProps) {
	const items = useMemo<ToolItem[]>(
		() =>
			tools
				.filter((d) => !excludeIds.has(d.id))
				.map((d) => ({
					label: d.label || d.name,
					value: d.id,
					toolName: d.name,
					isLlm: d.mockResponse.defaultResponseType === 'llm',
					hasPersistence: hasAnyPersistence(d),
				})),
		[tools, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No tools found"
			items={items}
			itemToString={(item) => `${item.label} ${item.toolName}`}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<VStack gap={0} align="start" flex={1}>
					<HStack gap={2}>
						<Text fontSize="sm">{item.label}</Text>
						{item.isLlm && (
							<Badge size="xs" colorPalette="cyan" variant="subtle">
								LLM
							</Badge>
						)}
						{item.hasPersistence && (
							<Badge size="xs" colorPalette="orange" variant="subtle">
								persistence
							</Badge>
						)}
					</HStack>
					{item.toolName !== item.label && (
						<Text fontSize="xs" color="fg.muted" fontFamily="mono">
							{item.toolName}
						</Text>
					)}
				</VStack>
			)}
		/>
	)
}

interface ToolSetItem {
	label: string
	value: string
	toolCount: number
}

interface ToolSetPickerComboboxProps {
	toolSets: StoredToolSet[]
	excludeIds: Set<string>
	onSelect: (id: string) => void
	placeholder?: string
}

export function ToolSetPickerCombobox({
	toolSets,
	excludeIds,
	onSelect,
	placeholder = 'Search tool sets...',
}: ToolSetPickerComboboxProps) {
	const items = useMemo<ToolSetItem[]>(
		() =>
			toolSets
				.filter((s) => !excludeIds.has(s.id))
				.map((s) => ({
					label: s.label,
					value: s.id,
					toolCount: s.toolRefs.length,
				})),
		[toolSets, excludeIds],
	)

	if (items.length === 0) return null

	return (
		<EntityPickerCombobox
			emptyMessage="No tool sets found"
			items={items}
			onSelect={onSelect}
			placeholder={placeholder}
			renderItem={(item) => (
				<HStack gap={2} flex={1}>
					<Text fontSize="sm">{item.label}</Text>
					<Text fontSize="xs" color="fg.muted">
						{item.toolCount} tools
					</Text>
				</HStack>
			)}
		/>
	)
}

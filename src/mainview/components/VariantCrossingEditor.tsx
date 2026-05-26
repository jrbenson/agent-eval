import {
	Button,
	Combobox,
	Field,
	HStack,
	Portal,
	TagsInput,
	VStack,
	useCombobox,
	useFilter,
	useListCollection,
	useTagsInput,
} from '@chakra-ui/react'
import { useId, useMemo, useRef } from 'react'
import { FiPlus, FiTrash2 } from 'react-icons/fi'
import type { TaskVariant } from '../../shared/schemas/task.schema'
import type { OverridableKey } from '../../shared/schemas/task.schema'

interface VariantCrossingEditorProps {
	variants: TaskVariant[]
	primaryVariantLabel?: string
	groups: string[][]
	onChange: (groups: string[][]) => void
}

/** Get override keys for a single variant (empty set for "primary"). */
function getVariantKeys(variant: TaskVariant | undefined): Set<OverridableKey> {
	if (!variant) return new Set()
	const keys = new Set<OverridableKey>()
	for (const key of Object.keys(variant.overrides) as OverridableKey[]) {
		if (variant.overrides[key] !== undefined) {
			keys.add(key)
		}
	}
	return keys
}

/** Compute the union of override keys for all other groups. */
function getOtherGroupsKeys(
	groups: string[][],
	currentGroupIndex: number,
	variantMap: Map<string, TaskVariant>,
): Set<OverridableKey> {
	const keys = new Set<OverridableKey>()
	for (let i = 0; i < groups.length; i++) {
		if (i === currentGroupIndex) continue
		for (const id of groups[i]) {
			if (id === 'primary') continue
			for (const k of getVariantKeys(variantMap.get(id))) {
				keys.add(k)
			}
		}
	}
	return keys
}

/** Check if a variant's keys conflict with a set of occupied keys. */
function hasKeyConflict(
	variantId: string,
	variantMap: Map<string, TaskVariant>,
	occupiedKeys: Set<OverridableKey>,
): boolean {
	if (variantId === 'primary') return false
	const variant = variantMap.get(variantId)
	if (!variant) return false
	for (const k of getVariantKeys(variant)) {
		if (occupiedKeys.has(k)) return true
	}
	return false
}

// ---- Single Group Editor ----

function GroupEditor({
	groupIndex,
	groupIds,
	availableItems,
	variantMap,
	primaryLabel,
	onUpdate,
	onRemove,
}: {
	groupIndex: number
	groupIds: string[]
	availableItems: { label: string; value: string; disabled: boolean }[]
	variantMap: Map<string, TaskVariant>
	primaryLabel: string
	onUpdate: (ids: string[]) => void
	onRemove: () => void
}) {
	const uid = useId()
	const controlRef = useRef<HTMLDivElement | null>(null)

	const labelFor = (id: string) =>
		id === 'primary' ? primaryLabel : (variantMap.get(id)?.label ?? id)

	const { contains } = useFilter({ sensitivity: 'base' })

	const enabledItems = useMemo(() => availableItems.filter((i) => !i.disabled), [availableItems])

	const { collection, filter } = useListCollection({
		initialItems: enabledItems,
		filter: (items, query) => items.filter((i) => contains(i.label, query)),
	})

	const tags = useTagsInput({
		ids: { input: `input_${uid}`, control: `control_${uid}` },
		value: groupIds.map((id) => labelFor(id)),
		onValueChange: (e) => {
			// Map labels back to IDs — on remove
			const newLabels = new Set(e.value)
			const kept = groupIds.filter((id) => newLabels.has(labelFor(id)))
			onUpdate(kept)
		},
	})

	const combobox = useCombobox({
		ids: { input: `input_${uid}`, control: `control_${uid}` },
		collection,
		openOnClick: true,
		onInputValueChange(e) {
			filter(e.inputValue)
		},
		value: [],
		allowCustomValue: false,
		onValueChange: (e) => {
			const selectedValue = e.value[0]
			if (selectedValue && !groupIds.includes(selectedValue)) {
				onUpdate([...groupIds, selectedValue])
				tags.addValue(labelFor(selectedValue))
			}
		},
		selectionBehavior: 'clear',
	})

	return (
		<HStack gap={2} align="end" width="full">
			<Field.Root flex="1">
				<Field.Label fontSize="xs">Group {groupIndex + 1}</Field.Label>
				<Combobox.RootProvider value={combobox}>
					<TagsInput.RootProvider value={tags}>
						<TagsInput.Control ref={controlRef}>
							{tags.value.map((tag, index) => (
								<TagsInput.Item key={index} index={index} value={tag}>
									<TagsInput.ItemPreview>
										<TagsInput.ItemText>{tag}</TagsInput.ItemText>
										<TagsInput.ItemDeleteTrigger />
									</TagsInput.ItemPreview>
								</TagsInput.Item>
							))}
							<Combobox.Input unstyled asChild>
								<TagsInput.Input placeholder="Add variant..." />
							</Combobox.Input>
						</TagsInput.Control>
						<Portal>
							<Combobox.Positioner>
								<Combobox.Content>
									{collection.items.length === 0 && (
										<Combobox.Empty>No variants available</Combobox.Empty>
									)}
									{collection.items.map((item) => (
										<Combobox.Item item={item} key={item.value}>
											<Combobox.ItemText>{item.label}</Combobox.ItemText>
											<Combobox.ItemIndicator />
										</Combobox.Item>
									))}
								</Combobox.Content>
							</Combobox.Positioner>
						</Portal>
					</TagsInput.RootProvider>
				</Combobox.RootProvider>
			</Field.Root>
			<Button size="xs" variant="ghost" colorPalette="red" onClick={onRemove} title="Remove group">
				<FiTrash2 />
			</Button>
		</HStack>
	)
}

// ---- Main Component ----

export default function VariantCrossingEditor({
	variants,
	primaryVariantLabel,
	groups,
	onChange,
}: VariantCrossingEditorProps) {
	const primaryLabel = primaryVariantLabel || 'Primary'
	const variantMap = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants])

	const allAssigned = useMemo(() => {
		const set = new Set<string>()
		for (const g of groups) {
			for (const id of g) set.add(id)
		}
		return set
	}, [groups])

	const addGroup = () => onChange([...groups, []])

	const updateGroup = (index: number, ids: string[]) => {
		const next = groups.map((g, i) => (i === index ? ids : g))
		onChange(next)
	}

	const removeGroup = (index: number) => {
		onChange(groups.filter((_, i) => i !== index))
	}

	// Can add a group if there are at least 2 unassigned variants
	// (or if we have fewer than 2 groups so far)
	const unassignedCount = variants.length + 1 - allAssigned.size // +1 for primary
	const canAddGroup = groups.length < 2 || unassignedCount > 0

	return (
		<VStack gap={3} align="stretch">
			{groups.map((groupIds, gi) => {
				const otherKeys = getOtherGroupsKeys(groups, gi, variantMap)
				// Build available items: primary + each variant not in other groups
				const availableItems = [
					{
						label: primaryLabel,
						value: 'primary',
						disabled: allAssigned.has('primary') && !groupIds.includes('primary'),
					},
					...variants.map((v) => ({
						label: v.label,
						value: v.id,
						disabled:
							(allAssigned.has(v.id) && !groupIds.includes(v.id)) ||
							hasKeyConflict(v.id, variantMap, otherKeys),
					})),
				]

				return (
					<GroupEditor
						key={gi}
						groupIndex={gi}
						groupIds={groupIds}
						availableItems={availableItems}
						variantMap={variantMap}
						primaryLabel={primaryLabel}
						onUpdate={(ids) => updateGroup(gi, ids)}
						onRemove={() => removeGroup(gi)}
					/>
				)
			})}

			<Button
				size="xs"
				variant="outline"
				onClick={addGroup}
				disabled={!canAddGroup}
				alignSelf="start"
			>
				<FiPlus /> Add Group
			</Button>
		</VStack>
	)
}

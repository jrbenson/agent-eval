import {
	Box,
	Button,
	Checkbox,
	Flex,
	IconButton,
	Input,
	Portal,
	Select,
	VStack,
	createListCollection,
} from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlus, FiSliders, FiTrash2 } from 'react-icons/fi'
import EnumTagInput from './EnumTagInput'
import type { EditorNode } from './SchemaEditor'
import ValidationDialog from './ValidationDialog'

const TYPES = ['string', 'number', 'boolean', 'array', 'object', 'enum'] as const

const typeCollection = createListCollection({
	items: TYPES.map((t) => ({ label: t, value: t })),
})

interface PropertyNodeProps {
	node: EditorNode
	depth: number
	onChange: (node: EditorNode) => void
	onRemove: () => void
	isArrayItem?: boolean
	canRemove?: boolean
}

export default function PropertyNode({
	node,
	depth,
	onChange,
	onRemove,
	isArrayItem = false,
	canRemove = true,
}: PropertyNodeProps) {
	const [validationOpen, setValidationOpen] = useState(false)
	const hasValidation = (() => {
		if (!node.validation) return false
		const { errorMessages, ...rest } = node.validation
		const hasConstraints = Object.values(rest).some((v) => v !== undefined && v !== '')
		const hasMessages = errorMessages && Object.keys(errorMessages).length > 0
		return hasConstraints || !!hasMessages
	})()

	const update = (partial: Partial<EditorNode>) => {
		const updated = { ...node, ...partial }
		// Reset children when type changes
		if (partial.type && partial.type !== node.type) {
			if (partial.type === 'object') {
				updated.properties = []
				updated.itemTypes = undefined
				updated.enumValues = undefined
			} else if (partial.type === 'array') {
				updated.itemTypes = [
					{
						key: crypto.randomUUID(),
						name: 'item_0',
						type: 'string',
						description: '',
						required: true,
					},
				]
				updated.properties = undefined
				updated.enumValues = undefined
			} else if (partial.type === 'enum') {
				updated.enumValues = []
				updated.properties = undefined
				updated.itemTypes = undefined
			} else {
				updated.properties = undefined
				updated.itemTypes = undefined
				updated.enumValues = undefined
			}
			// Clear validation when type changes — constraints are type-specific
			updated.validation = undefined
		}
		onChange(updated)
	}

	const addChildProperty = () => {
		const child: EditorNode = {
			key: crypto.randomUUID(),
			name: '',
			type: 'string',
			description: '',
			required: true,
		}
		onChange({ ...node, properties: [...(node.properties ?? []), child] })
	}

	const addItemType = () => {
		const item: EditorNode = {
			key: crypto.randomUUID(),
			name: `item_${(node.itemTypes ?? []).length}`,
			type: 'string',
			description: '',
			required: true,
		}
		onChange({ ...node, itemTypes: [...(node.itemTypes ?? []), item] })
	}

	const updateChild = (index: number, updated: EditorNode) => {
		const children = [...(node.properties ?? [])]
		children[index] = updated
		onChange({ ...node, properties: children })
	}

	const removeChild = (index: number) => {
		onChange({
			...node,
			properties: (node.properties ?? []).filter((_, i) => i !== index),
		})
	}

	const updateItemType = (index: number, updated: EditorNode) => {
		const items = [...(node.itemTypes ?? [])]
		items[index] = updated
		onChange({ ...node, itemTypes: items })
	}

	const removeItemType = (index: number) => {
		const items = (node.itemTypes ?? []).filter((_, i) => i !== index)
		if (items.length === 0) return
		onChange({ ...node, itemTypes: items })
	}

	return (
		<Box
			pl={depth > 0 ? 4 : 0}
			borderLeft={depth > 0 ? '2px solid' : undefined}
			borderColor="border.subtle"
		>
			<Flex gap={2} align="center" py={1}>
				{isArrayItem ? (
					<Input size="xs" value="TYPE" disabled w="120px" fontFamily="mono" fontSize="2xs" />
				) : (
					<Input
						size="xs"
						placeholder="name"
						value={node.name}
						onChange={(e) => update({ name: e.target.value })}
						w="120px"
						fontFamily="mono"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
					/>
				)}
				<Select.Root
					collection={typeCollection}
					size="xs"
					w="100px"
					value={[node.type]}
					onValueChange={(e) => update({ type: e.value[0] as EditorNode['type'] })}
				>
					<Select.HiddenSelect />
					<Select.Control>
						<Select.Trigger>
							<Select.ValueText />
						</Select.Trigger>
						<Select.IndicatorGroup>
							<Select.Indicator />
						</Select.IndicatorGroup>
					</Select.Control>
					<Portal>
						<Select.Positioner>
							<Select.Content>
								{typeCollection.items.map((item) => (
									<Select.Item item={item} key={item.value}>
										{item.label}
										<Select.ItemIndicator />
									</Select.Item>
								))}
							</Select.Content>
						</Select.Positioner>
					</Portal>
				</Select.Root>
				<Input
					size="xs"
					placeholder="description"
					value={node.description}
					onChange={(e) => update({ description: e.target.value })}
					flex={1}
					autoCapitalize="off"
					autoCorrect="off"
					spellCheck={false}
				/>
				{isArrayItem ? (
					<Box w="42px" />
				) : (
					<Checkbox.Root
						size="sm"
						checked={node.required}
						onCheckedChange={(e) => update({ required: !!e.checked })}
					>
						<Checkbox.HiddenInput />
						<Checkbox.Control>
							<Checkbox.Indicator />
						</Checkbox.Control>
						<Checkbox.Label>req</Checkbox.Label>
					</Checkbox.Root>
				)}
				{node.type !== 'boolean' ? (
					<IconButton
						aria-label="Validation rules"
						size="xs"
						variant={hasValidation ? 'subtle' : 'ghost'}
						colorPalette={hasValidation ? 'blue' : 'gray'}
						onClick={() => setValidationOpen(true)}
					>
						<FiSliders />
					</IconButton>
				) : (
					<Box w="32px" flexShrink={0} />
				)}
				<IconButton
					aria-label="Remove"
					size="xs"
					variant="ghost"
					colorPalette="red"
					onClick={onRemove}
					disabled={!canRemove}
				>
					<FiTrash2 />
				</IconButton>
			</Flex>

			{/* Object children */}
			{node.type === 'object' && (
				<VStack gap={0} align="stretch" ml={2} pb={1}>
					{(node.properties ?? []).map((child, i) => (
						<PropertyNode
							key={child.key}
							node={child}
							depth={depth + 1}
							onChange={(updated) => updateChild(i, updated)}
							onRemove={() => removeChild(i)}
						/>
					))}
					<Box pl={4} borderLeft="2px solid" borderColor="border.subtle">
						<Button size="xs" variant="subtle" onClick={addChildProperty} w="fit-content" pl={1}>
							<FiPlus />
							Add Property
						</Button>
					</Box>
				</VStack>
			)}

			{/* Array item types */}
			{node.type === 'array' && (
				<VStack gap={0} align="stretch" ml={2} pb={1}>
					{(node.itemTypes ?? []).map((item, i) => (
						<PropertyNode
							key={item.key}
							node={item}
							depth={depth + 1}
							onChange={(updated) => updateItemType(i, updated)}
							onRemove={() => removeItemType(i)}
							isArrayItem
							canRemove={(node.itemTypes ?? []).length > 1}
						/>
					))}
					<Box pl={4} borderLeft="2px solid" borderColor="border.subtle">
						<Button size="xs" variant="subtle" onClick={addItemType} pl={1} w="fit-content">
							<FiPlus />
							Add Valid Type
						</Button>
					</Box>
				</VStack>
			)}

			{/* Enum values */}
			{node.type === 'enum' && (
				<Flex ml={2} mt={1} align="stretch">
					<Box pl={4} borderLeft="2px solid" borderColor="border.subtle" flex={1}>
						<EnumTagInput
							values={node.enumValues ?? []}
							onChange={(enumValues) => onChange({ ...node, enumValues })}
						/>
					</Box>
					{/* Spacer matching req + validation + delete button widths */}
					<Box flexShrink={0} w="110px" />
				</Flex>
			)}

			{/* Validation dialog */}
			<ValidationDialog
				node={node}
				open={validationOpen}
				onOpenChange={(open) => setValidationOpen(open)}
				onApply={(validation) => {
					onChange({ ...node, validation })
					setValidationOpen(false)
				}}
			/>
		</Box>
	)
}

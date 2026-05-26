import {
	Box,
	Checkbox,
	Flex,
	HStack,
	Input,
	NumberInput,
	Portal,
	Select,
	Text,
	VStack,
	createListCollection,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import AppDialog, { AppDialogFooter } from '../AppDialog'
import type { EditorNode, ValidationConstraints } from './SchemaEditor'

const FORMAT_OPTIONS = createListCollection({
	items: [
		{ label: '(none)', value: '' },
		{ label: 'email', value: 'email' },
		{ label: 'uri', value: 'uri' },
		{ label: 'date-time', value: 'date-time' },
		{ label: 'date', value: 'date' },
		{ label: 'time', value: 'time' },
		{ label: 'uuid', value: 'uuid' },
		{ label: 'ipv4', value: 'ipv4' },
		{ label: 'ipv6', value: 'ipv6' },
	],
})

interface ValidationDialogProps {
	node: EditorNode
	open: boolean
	onOpenChange: (open: boolean) => void
	onApply: (validation: ValidationConstraints | undefined) => void
}

export default function ValidationDialog({
	node,
	open,
	onOpenChange,
	onApply,
}: ValidationDialogProps) {
	const [constraints, setConstraints] = useState<ValidationConstraints>(() => node.validation ?? {})
	const [messages, setMessages] = useState<Record<string, string>>(
		() => node.validation?.errorMessages ?? {},
	)

	// Re-sync when dialog opens (node.validation may have changed externally)
	useEffect(() => {
		if (open) {
			setConstraints(node.validation ?? {})
			setMessages(node.validation?.errorMessages ?? {})
		}
	}, [open, node.validation])

	const updateConstraint = (key: string, value: unknown) => {
		setConstraints((prev) => ({ ...prev, [key]: value }))
	}

	const updateMessage = (key: string, value: string) => {
		setMessages((prev) => {
			if (!value) {
				const next = { ...prev }
				delete next[key]
				return next
			}
			return { ...prev, [key]: value }
		})
	}

	const handleApply = () => {
		const cleaned: Record<string, unknown> = {}
		let hasAny = false

		for (const [k, v] of Object.entries(constraints)) {
			if (k === 'errorMessages') continue
			if (v !== undefined && v !== '' && v !== null) {
				cleaned[k] = v
				hasAny = true
			}
		}

		if (Object.keys(messages).length > 0) {
			cleaned.errorMessages = messages
			hasAny = true
		}

		onApply(hasAny ? (cleaned as ValidationConstraints) : undefined)
	}

	const handleClear = () => {
		setConstraints({})
		setMessages({})
	}

	const title = `Validation: ${node.name || '(unnamed)'}`

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			title={title}
			size="md"
			footer={
				<Flex w="100%" justify="space-between">
					<Box
						as="button"
						fontSize="sm"
						color="fg.muted"
						cursor="pointer"
						onClick={handleClear}
						_hover={{ color: 'fg' }}
					>
						Clear all
					</Box>
					<HStack>
						<AppDialogFooter
							onCancel={() => onOpenChange(false)}
							onConfirm={handleApply}
							confirmLabel="Apply"
						/>
					</HStack>
				</Flex>
			}
		>
			<VStack gap={4} align="stretch">
				{node.type === 'string' && (
					<StringConstraints
						constraints={constraints}
						messages={messages}
						onChange={updateConstraint}
						onMessageChange={updateMessage}
					/>
				)}
				{node.type === 'number' && (
					<NumberConstraints
						constraints={constraints}
						messages={messages}
						onChange={updateConstraint}
						onMessageChange={updateMessage}
					/>
				)}
				{node.type === 'array' && (
					<ArrayConstraints
						constraints={constraints}
						messages={messages}
						onChange={updateConstraint}
						onMessageChange={updateMessage}
					/>
				)}
				{node.type === 'object' && (
					<ObjectConstraints
						constraints={constraints}
						messages={messages}
						onChange={updateConstraint}
						onMessageChange={updateMessage}
					/>
				)}
				{node.type === 'enum' && (
					<EnumConstraints messages={messages} onMessageChange={updateMessage} />
				)}
			</VStack>
		</AppDialog>
	)
}

// ---- Constraint form sections ----

interface ConstraintSectionProps {
	constraints: ValidationConstraints
	messages: Record<string, string>
	onChange: (key: string, value: unknown) => void
	onMessageChange: (key: string, value: string) => void
}

function ConstraintRow({
	label,
	messageKey,
	messages,
	onMessageChange,
	children,
}: {
	label: string
	messageKey: string
	messages: Record<string, string>
	onMessageChange: (key: string, value: string) => void
	children: React.ReactNode
}) {
	return (
		<Box>
			<Flex gap={2} align="center">
				<Text fontSize="sm" w="130px" flexShrink={0}>
					{label}
				</Text>
				<Box flex={1}>{children}</Box>
			</Flex>
			<Box pl="130px" mt={1}>
				<Input
					size="xs"
					placeholder="Custom error message (optional)"
					value={messages[messageKey] ?? ''}
					onChange={(e) => onMessageChange(messageKey, e.target.value)}
					fontSize="2xs"
					color="fg.muted"
				/>
			</Box>
		</Box>
	)
}

function StringConstraints({
	constraints,
	messages,
	onChange,
	onMessageChange,
}: ConstraintSectionProps) {
	return (
		<VStack gap={3} align="stretch">
			<Text fontWeight="medium" fontSize="sm" color="fg.muted">
				String constraints
			</Text>
			<ConstraintRow
				label="Min length"
				messageKey="minLength"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.minLength !== undefined ? String(constraints.minLength) : ''}
					onValueChange={(e) => onChange('minLength', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Max length"
				messageKey="maxLength"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.maxLength !== undefined ? String(constraints.maxLength) : ''}
					onValueChange={(e) => onChange('maxLength', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Pattern (regex)"
				messageKey="pattern"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<Input
					size="sm"
					placeholder="e.g. ^[a-z]+$"
					value={constraints.pattern ?? ''}
					onChange={(e) => onChange('pattern', e.target.value || undefined)}
					fontFamily="mono"
					fontSize="xs"
				/>
			</ConstraintRow>

			<ConstraintRow
				label="Format"
				messageKey="format"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<Select.Root
					collection={FORMAT_OPTIONS}
					size="sm"
					value={constraints.format ? [constraints.format] : ['']}
					onValueChange={(e) => onChange('format', e.value[0] || undefined)}
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
								{FORMAT_OPTIONS.items.map((item) => (
									<Select.Item item={item} key={item.value}>
										{item.label}
										<Select.ItemIndicator />
									</Select.Item>
								))}
							</Select.Content>
						</Select.Positioner>
					</Portal>
				</Select.Root>
			</ConstraintRow>
		</VStack>
	)
}

function NumberConstraints({
	constraints,
	messages,
	onChange,
	onMessageChange,
}: ConstraintSectionProps) {
	return (
		<VStack gap={3} align="stretch">
			<Text fontWeight="medium" fontSize="sm" color="fg.muted">
				Number constraints
			</Text>
			<ConstraintRow
				label="Minimum"
				messageKey="minimum"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					value={constraints.minimum !== undefined ? String(constraints.minimum) : ''}
					onValueChange={(e) => onChange('minimum', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Maximum"
				messageKey="maximum"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					value={constraints.maximum !== undefined ? String(constraints.maximum) : ''}
					onValueChange={(e) => onChange('maximum', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Exclusive min"
				messageKey="exclusiveMinimum"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					value={
						constraints.exclusiveMinimum !== undefined ? String(constraints.exclusiveMinimum) : ''
					}
					onValueChange={(e) =>
						onChange('exclusiveMinimum', e.value === '' ? undefined : e.valueAsNumber)
					}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Exclusive max"
				messageKey="exclusiveMaximum"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					value={
						constraints.exclusiveMaximum !== undefined ? String(constraints.exclusiveMaximum) : ''
					}
					onValueChange={(e) =>
						onChange('exclusiveMaximum', e.value === '' ? undefined : e.valueAsNumber)
					}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Multiple of"
				messageKey="multipleOf"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.multipleOf !== undefined ? String(constraints.multipleOf) : ''}
					onValueChange={(e) =>
						onChange('multipleOf', e.value === '' ? undefined : e.valueAsNumber)
					}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>
		</VStack>
	)
}

function ArrayConstraints({
	constraints,
	messages,
	onChange,
	onMessageChange,
}: ConstraintSectionProps) {
	return (
		<VStack gap={3} align="stretch">
			<Text fontWeight="medium" fontSize="sm" color="fg.muted">
				Array constraints
			</Text>
			<ConstraintRow
				label="Min items"
				messageKey="minItems"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.minItems !== undefined ? String(constraints.minItems) : ''}
					onValueChange={(e) => onChange('minItems', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Max items"
				messageKey="maxItems"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.maxItems !== undefined ? String(constraints.maxItems) : ''}
					onValueChange={(e) => onChange('maxItems', e.value === '' ? undefined : e.valueAsNumber)}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<Box>
				<Flex gap={2} align="center">
					<Text fontSize="sm" w="130px" flexShrink={0}>
						Unique items
					</Text>
					<Checkbox.Root
						size="sm"
						checked={constraints.uniqueItems ?? false}
						onCheckedChange={(e) => onChange('uniqueItems', !!e.checked || undefined)}
					>
						<Checkbox.HiddenInput />
						<Checkbox.Control>
							<Checkbox.Indicator />
						</Checkbox.Control>
						<Checkbox.Label>Require unique</Checkbox.Label>
					</Checkbox.Root>
				</Flex>
				<Box pl="130px" mt={1}>
					<Input
						size="xs"
						placeholder="Custom error message (optional)"
						value={messages.uniqueItems ?? ''}
						onChange={(e) => onMessageChange('uniqueItems', e.target.value)}
						fontSize="2xs"
						color="fg.muted"
					/>
				</Box>
			</Box>
		</VStack>
	)
}

function ObjectConstraints({
	constraints,
	messages,
	onChange,
	onMessageChange,
}: ConstraintSectionProps) {
	return (
		<VStack gap={3} align="stretch">
			<Text fontWeight="medium" fontSize="sm" color="fg.muted">
				Object constraints
			</Text>
			<ConstraintRow
				label="Min properties"
				messageKey="minProperties"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.minProperties !== undefined ? String(constraints.minProperties) : ''}
					onValueChange={(e) =>
						onChange('minProperties', e.value === '' ? undefined : e.valueAsNumber)
					}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>

			<ConstraintRow
				label="Max properties"
				messageKey="maxProperties"
				messages={messages}
				onMessageChange={onMessageChange}
			>
				<NumberInput.Root
					size="sm"
					min={0}
					value={constraints.maxProperties !== undefined ? String(constraints.maxProperties) : ''}
					onValueChange={(e) =>
						onChange('maxProperties', e.value === '' ? undefined : e.valueAsNumber)
					}
				>
					<NumberInput.Input placeholder="—" />
				</NumberInput.Root>
			</ConstraintRow>
		</VStack>
	)
}

function EnumConstraints({
	messages,
	onMessageChange,
}: {
	messages: Record<string, string>
	onMessageChange: (key: string, value: string) => void
}) {
	return (
		<VStack gap={3} align="stretch">
			<Text fontWeight="medium" fontSize="sm" color="fg.muted">
				Enum constraints
			</Text>
			<Text fontSize="xs" color="fg.muted">
				Enum values are defined in the parameter row. You can provide a custom error message shown
				when the value doesn't match any allowed option.
			</Text>
			<Box>
				<Text fontSize="sm" mb={1}>
					Error message
				</Text>
				<Input
					size="sm"
					placeholder='e.g. "Color must be one of: red, green, blue"'
					value={messages.enum ?? ''}
					onChange={(e) => onMessageChange('enum', e.target.value)}
				/>
			</Box>
		</VStack>
	)
}

import {
	Box,
	Center,
	Checkbox,
	Field,
	Flex,
	HStack,
	IconButton,
	Input,
	Menu,
	NumberInput,
	Popover,
	Portal,
	Select,
	Stack,
	Table,
	Text,
	createListCollection,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FiTrash2 } from 'react-icons/fi'
import {
	LuArrowUpDown,
	LuBrain,
	LuCheck,
	LuGitBranch,
	LuInfo,
	LuSearch,
	LuThermometer,
} from 'react-icons/lu'
import { SiAnthropic, SiGoogle, SiMistralai, SiOpenai } from 'react-icons/si'
import { PROVIDER_META } from '../../shared/provider-meta'
import { useListModels, useProviderStatus } from '../hooks/use-configs'
import type { TrialRow } from '../pages/EvaluationEditor'
import { Tooltip } from './ui/tooltip'

// ---- Collections ----

/** Full list for fallback / export use */
export const providerOptions = createListCollection({
	items: PROVIDER_META.map((p) => ({ label: p.name, value: p.id })),
})

const reasoningOptions = createListCollection({
	items: [
		{ label: 'Default', value: 'provider-default' },
		{ label: 'None', value: 'none' },
		{ label: 'Minimal', value: 'minimal' },
		{ label: 'Low', value: 'low' },
		{ label: 'Medium', value: 'medium' },
		{ label: 'High', value: 'high' },
		{ label: 'xHigh', value: 'xhigh' },
	],
})

const toolSearchHintOptions = createListCollection({
	items: [
		{ label: 'No hints', value: 'none' },
		{ label: 'Names only', value: 'names_only' },
		{ label: 'Names + descriptions', value: 'names_and_descriptions' },
	],
})

const toolSearchModeOptions = createListCollection({
	items: [
		{ label: 'Keyword', value: 'keyword' },
		{ label: 'Semantic', value: 'semantic' },
	],
})

// ---- Label lookups ----

const hintLabels: Record<string, string> = {
	none: '',
	names_only: '+names',
	names_and_descriptions: '+full',
}

const reasoningLabels: Record<string, string> = {
	'provider-default': 'dflt',
	none: 'none',
	minimal: 'L-',
	low: 'L',
	medium: 'M',
	high: 'H',
	xhigh: 'H+',
}

// ---- Sort ----

type SortField = 'none' | 'provider' | 'model' | 'temperature' | 'reasoning'

const sortOptions: { value: SortField; label: string }[] = [
	{ value: 'none', label: 'Manual order' },
	{ value: 'provider', label: 'Provider' },
	{ value: 'model', label: 'Model' },
	{ value: 'temperature', label: 'Temperature' },
	{ value: 'reasoning', label: 'Reasoning' },
]

// ---- Provider Icons ----

function ProviderIcon({ provider }: { provider: string }) {
	const iconProps = {
		size: 14,
		style: { flexShrink: 0 } as React.CSSProperties,
	}
	switch (provider) {
		case 'openai':
			return <SiOpenai {...iconProps} />
		case 'anthropic':
			return <SiAnthropic {...iconProps} />
		case 'google':
			return <SiGoogle {...iconProps} />
		case 'mistral':
			return <SiMistralai {...iconProps} />
		case 'groq':
			return <LetterBadge letter="Q" colorScheme="purple" />
		case 'xai':
			return <LetterBadge letter="X" colorScheme="gray" />
		case 'azure':
			return <LetterBadge letter="Az" colorScheme="blue" />
		default:
			return <LetterBadge letter="?" colorScheme="gray" />
	}
}

function LetterBadge({
	letter,
	colorScheme,
}: {
	letter: string
	colorScheme: string
}) {
	return (
		<Center
			w="16px"
			h="16px"
			borderRadius="sm"
			bg={`${colorScheme}.100`}
			color={`${colorScheme}.700`}
			fontSize="2xs"
			fontWeight="bold"
			flexShrink={0}
			_dark={{ bg: `${colorScheme}.800`, color: `${colorScheme}.200` }}
		>
			{letter}
		</Center>
	)
}

// ---- Cell display helpers ----

function CellContent({
	children,
	muted,
}: {
	children: React.ReactNode
	muted?: boolean
}) {
	return (
		<HStack
			gap={1.5}
			fontSize="sm"
			color={muted ? 'fg.muted' : undefined}
			whiteSpace="nowrap"
			overflow="hidden"
		>
			{children}
		</HStack>
	)
}

// Inference now excludes repetitions (separate column)
// Returns structured parts for icon-prefixed display
export function getInferenceParts(trial: TrialRow): {
	temp: string
	reasoning: string | null
	showReasoningIcon: boolean
} {
	const isNone = trial.reasoning === 'none'
	return {
		temp: trial.temperature.toFixed(1),
		reasoning: !isNone ? (reasoningLabels[trial.reasoning] ?? trial.reasoning) : null,
		showReasoningIcon: !isNone,
	}
}

// Features summary — structured for icon-prefixed display
export function getFeatureParts(trial: TrialRow): {
	search: string | null
	subagents: string | null
} {
	return {
		search: trial.toolSearch
			? `${trial.toolSearchMode === 'semantic' ? 'sem' : 'kw'}${hintLabels[trial.toolSearchHints] ?? ''}`
			: null,
		subagents: trial.subagentsEnabled ? `dpth:${trial.subagentMaxDepth}` : null,
	}
}

// ---- Model Select ----

function ModelSelect({
	provider,
	value,
	onChange,
}: {
	provider: string
	value: string
	onChange: (value: string) => void
}) {
	const { data: models } = useListModels(provider)
	const modelList = models ?? []

	const modelCollection = useMemo(
		() =>
			createListCollection({
				items: modelList.map((m) => ({ label: m, value: m })),
			}),
		[modelList],
	)

	if (modelList.length > 0) {
		return (
			<Select.Root
				collection={modelCollection}
				size="sm"
				value={value ? [value] : []}
				onValueChange={(e) => onChange(e.value[0] ?? '')}
			>
				<Select.HiddenSelect />
				<Select.Control>
					<Select.Trigger>
						<Select.ValueText placeholder="Select model..." />
					</Select.Trigger>
					<Select.IndicatorGroup>
						<Select.Indicator />
					</Select.IndicatorGroup>
				</Select.Control>
				<Portal>
					<Select.Positioner>
						<Select.Content>
							{modelCollection.items.map((item) => (
								<Select.Item item={item} key={item.value}>
									{item.label}
									<Select.ItemIndicator />
								</Select.Item>
							))}
						</Select.Content>
					</Select.Positioner>
				</Portal>
			</Select.Root>
		)
	}

	return (
		<Input
			size="sm"
			placeholder={provider === 'azure' ? 'e.g. my-gpt4o-deployment' : 'e.g. gpt-4o'}
			value={value}
			onChange={(e) => onChange(e.target.value)}
		/>
	)
}

// ---- Cell Popovers ----

function ModelCellPopover({
	trial,
	idx,
	onUpdate,
	configuredProviders,
}: {
	trial: TrialRow
	idx: number
	onUpdate: (idx: number, field: keyof TrialRow, value: unknown) => void
	configuredProviders: ReturnType<typeof createListCollection<{ label: string; value: string }>>
}) {
	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<Box cursor="pointer" px={1} py={0.5} borderRadius="sm" _hover={{ bg: 'bg.muted' }}>
					<CellContent>
						<ProviderIcon provider={trial.provider} />
						<Text truncate>{trial.model || 'Select model…'}</Text>
					</CellContent>
				</Box>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content w="280px">
						<Popover.Arrow />
						<Popover.Body>
							<Stack gap={3}>
								<Field.Root>
									<Field.Label fontSize="xs">Provider</Field.Label>
									<Select.Root
										collection={configuredProviders}
										size="sm"
										value={[trial.provider]}
										onValueChange={(e) => onUpdate(idx, 'provider', e.value[0])}
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
													{configuredProviders.items.map((item) => (
														<Select.Item item={item} key={item.value}>
															{item.label}
															<Select.ItemIndicator />
														</Select.Item>
													))}
												</Select.Content>
											</Select.Positioner>
										</Portal>
									</Select.Root>
								</Field.Root>
								<Field.Root>
									<Field.Label fontSize="xs">Model</Field.Label>
									<ModelSelect
										provider={trial.provider}
										value={trial.model}
										onChange={(v) => onUpdate(idx, 'model', v)}
									/>
								</Field.Root>
							</Stack>
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

function InferenceCellPopover({
	trial,
	idx,
	onUpdate,
}: {
	trial: TrialRow
	idx: number
	onUpdate: (idx: number, field: keyof TrialRow, value: unknown) => void
}) {
	const inference = getInferenceParts(trial)

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<Box cursor="pointer" px={1} py={0.5} borderRadius="sm" _hover={{ bg: 'bg.muted' }}>
					<CellContent>
						<LuThermometer size={12} />
						<Text>{inference.temp}</Text>
						{inference.showReasoningIcon && (
							<>
								<Text color="fg.muted">·</Text>
								<LuBrain size={12} />
								<Text>{inference.reasoning}</Text>
							</>
						)}
					</CellContent>
				</Box>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content w="260px">
						<Popover.Arrow />
						<Popover.Body>
							<Stack gap={3}>
								<Field.Root>
									<Field.Label fontSize="xs">Temperature</Field.Label>
									<Input
										size="sm"
										type="number"
										step={0.1}
										min={0}
										max={2}
										value={trial.temperature}
										onChange={(e) =>
											onUpdate(idx, 'temperature', Number.parseFloat(e.target.value) || 0)
										}
									/>
								</Field.Root>
								<Field.Root>
									<HStack gap={1}>
										<Field.Label fontSize="xs">Reasoning</Field.Label>
										<Tooltip
											content="AI SDK maps reasoning levels to provider-native equivalents. Some providers support fewer levels and coerce to nearest. Providers without reasoning support ignore this setting."
											contentProps={{ maxW: '240px', fontSize: 'xs' }}
										>
											<Box color="fg.muted" cursor="help">
												<LuInfo size={12} />
											</Box>
										</Tooltip>
									</HStack>
									<Select.Root
										collection={reasoningOptions}
										size="sm"
										value={[trial.reasoning]}
										onValueChange={(e) => onUpdate(idx, 'reasoning', e.value[0])}
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
													{reasoningOptions.items.map((item) => (
														<Select.Item item={item} key={item.value}>
															{item.label}
															<Select.ItemIndicator />
														</Select.Item>
													))}
												</Select.Content>
											</Select.Positioner>
										</Portal>
									</Select.Root>
								</Field.Root>
							</Stack>
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

function FeaturesCellPopover({
	trial,
	idx,
	onUpdate,
}: {
	trial: TrialRow
	idx: number
	onUpdate: (idx: number, field: keyof TrialRow, value: unknown) => void
}) {
	const features = getFeatureParts(trial)

	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<Box cursor="pointer" px={1} py={0.5} borderRadius="sm" _hover={{ bg: 'bg.muted' }}>
					<CellContent muted={!features.search && !features.subagents}>
						{features.search ? (
							<>
								<LuSearch size={12} />
								<Text>{features.search}</Text>
							</>
						) : null}
						{features.search && features.subagents && <Text color="fg.muted">·</Text>}
						{features.subagents ? (
							<>
								<LuGitBranch size={12} />
								<Text>{features.subagents}</Text>
							</>
						) : null}
						{!features.search && !features.subagents && <Text color="fg.muted">none</Text>}
					</CellContent>
				</Box>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content w="300px">
						<Popover.Arrow />
						<Popover.Body>
							<Stack gap={4}>
								{/* Tool Search */}
								<Stack gap={2}>
									<Checkbox.Root
										size="sm"
										checked={trial.toolSearch}
										onCheckedChange={(e) => onUpdate(idx, 'toolSearch', !!e.checked)}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control>
											<Checkbox.Indicator />
										</Checkbox.Control>
										<Checkbox.Label fontSize="sm">Tool Search</Checkbox.Label>
									</Checkbox.Root>
									{trial.toolSearch && (
										<>
											<Field.Root ps={6}>
												<Field.Label fontSize="xs">Hints</Field.Label>
												<Select.Root
													collection={toolSearchHintOptions}
													size="sm"
													value={[trial.toolSearchHints]}
													onValueChange={(e) => onUpdate(idx, 'toolSearchHints', e.value[0])}
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
																{toolSearchHintOptions.items.map((item) => (
																	<Select.Item item={item} key={item.value}>
																		{item.label}
																		<Select.ItemIndicator />
																	</Select.Item>
																))}
															</Select.Content>
														</Select.Positioner>
													</Portal>
												</Select.Root>
											</Field.Root>
											<Field.Root ps={6}>
												<Field.Label fontSize="xs">Mode</Field.Label>
												<Select.Root
													collection={toolSearchModeOptions}
													size="sm"
													value={[trial.toolSearchMode]}
													onValueChange={(e) => onUpdate(idx, 'toolSearchMode', e.value[0])}
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
																{toolSearchModeOptions.items.map((item) => (
																	<Select.Item item={item} key={item.value}>
																		{item.label}
																		<Select.ItemIndicator />
																	</Select.Item>
																))}
															</Select.Content>
														</Select.Positioner>
													</Portal>
												</Select.Root>
											</Field.Root>
										</>
									)}
								</Stack>

								{/* Subagents */}
								<Stack gap={2}>
									<Checkbox.Root
										size="sm"
										checked={trial.subagentsEnabled}
										onCheckedChange={(e) => onUpdate(idx, 'subagentsEnabled', !!e.checked)}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control>
											<Checkbox.Indicator />
										</Checkbox.Control>
										<Checkbox.Label fontSize="sm">Subagents</Checkbox.Label>
									</Checkbox.Root>
									{trial.subagentsEnabled && (
										<Field.Root ps={6}>
											<Field.Label fontSize="xs">Max Depth</Field.Label>
											<NumberInput.Root
												size="sm"
												min={1}
												max={5}
												value={String(trial.subagentMaxDepth)}
												onValueChange={(e) =>
													onUpdate(idx, 'subagentMaxDepth', e.valueAsNumber || 1)
												}
											>
												<NumberInput.Input />
												<NumberInput.Control>
													<NumberInput.IncrementTrigger />
													<NumberInput.DecrementTrigger />
												</NumberInput.Control>
											</NumberInput.Root>
										</Field.Root>
									)}
								</Stack>
							</Stack>
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

function RepsCellPopover({
	trial,
	idx,
	onUpdate,
}: {
	trial: TrialRow
	idx: number
	onUpdate: (idx: number, field: keyof TrialRow, value: unknown) => void
}) {
	return (
		<Popover.Root>
			<Popover.Trigger asChild>
				<Box cursor="pointer" px={1} py={0.5} borderRadius="sm" _hover={{ bg: 'bg.muted' }}>
					<CellContent>
						<Text>×{trial.repetitions}</Text>
					</CellContent>
				</Box>
			</Popover.Trigger>
			<Portal>
				<Popover.Positioner>
					<Popover.Content w="160px">
						<Popover.Arrow />
						<Popover.Body>
							<Field.Root>
								<Field.Label fontSize="xs">Repetitions</Field.Label>
								<NumberInput.Root
									size="sm"
									min={1}
									max={100}
									value={String(trial.repetitions)}
									onValueChange={(e) => onUpdate(idx, 'repetitions', e.valueAsNumber || 1)}
								>
									<NumberInput.Input />
									<NumberInput.Control>
										<NumberInput.IncrementTrigger />
										<NumberInput.DecrementTrigger />
									</NumberInput.Control>
								</NumberInput.Root>
							</Field.Root>
						</Popover.Body>
					</Popover.Content>
				</Popover.Positioner>
			</Portal>
		</Popover.Root>
	)
}

// ---- Main Component ----

export default function TrialMatrixTable({
	trials,
	onRemove,
	onUpdate,
	scenarioType,
	selectedIndices,
	onToggleSelect,
}: {
	trials: TrialRow[]
	onRemove: (idx: number) => void
	onUpdate: (idx: number, field: keyof TrialRow, value: unknown) => void
	scenarioType: string
	selectedIndices: Set<number>
	onToggleSelect: (idx: number) => void
}) {
	const [sortField, setSortField] = useState<SortField>('none')

	const { data: providerStatus } = useProviderStatus()

	const configuredProviders = useMemo(() => {
		const configuredSet = new Set<string>()
		if (Array.isArray(providerStatus)) {
			for (const ps of providerStatus) {
				if (ps.isSet) configuredSet.add(ps.provider)
			}
		}
		// Always include keyless providers
		for (const p of PROVIDER_META) {
			if (!p.requiresKey) configuredSet.add(p.id)
		}
		const items = PROVIDER_META.filter((p) => configuredSet.has(p.id)).map((p) => ({
			label: p.name,
			value: p.id,
		}))
		// Fallback: if nothing configured, show all
		if (items.length === 0) return providerOptions
		return createListCollection({ items })
	}, [providerStatus])

	const sortedIndices = useMemo(() => {
		const indices = trials.map((_, i) => i)
		if (sortField === 'none') return indices
		return [...indices].sort((a, b) => {
			const ta = trials[a]
			const tb = trials[b]
			switch (sortField) {
				case 'provider':
					return ta.provider.localeCompare(tb.provider)
				case 'model':
					return ta.model.localeCompare(tb.model)
				case 'temperature':
					return ta.temperature - tb.temperature
				case 'reasoning':
					return ta.reasoning.localeCompare(tb.reasoning)
				default:
					return 0
			}
		})
	}, [trials, sortField])

	// Highlight cells that MATCH any selected row's value for that column.
	const getMatchStyle = (origIdx: number, column: 'model' | 'inference' | 'reps' | 'features') => {
		if (selectedIndices.size === 0 || selectedIndices.has(origIdx)) return {}
		const trial = trials[origIdx]
		let matches = false
		for (const selIdx of selectedIndices) {
			const sel = trials[selIdx]
			if (!sel) continue
			switch (column) {
				case 'model':
					if (sel.provider === trial.provider && sel.model === trial.model) matches = true
					break
				case 'inference':
					if (sel.temperature === trial.temperature && sel.reasoning === trial.reasoning)
						matches = true
					break
				case 'reps':
					if (sel.repetitions === trial.repetitions) matches = true
					break
				case 'features':
					if (
						sel.toolSearch === trial.toolSearch &&
						sel.toolSearchHints === trial.toolSearchHints &&
						sel.toolSearchMode === trial.toolSearchMode &&
						sel.subagentsEnabled === trial.subagentsEnabled &&
						sel.subagentMaxDepth === trial.subagentMaxDepth
					)
						matches = true
					break
			}
			if (matches) break
		}
		return matches ? { bg: 'blue.50', _dark: { bg: 'blue.900' } } : {}
	}

	const isTask = scenarioType === 'task'

	return (
		<Table.ScrollArea maxH="60vh">
			<Table.Root size="sm" stickyHeader>
				<Table.Header>
					<Table.Row>
						<Table.ColumnHeader w="36px" />
						<Table.ColumnHeader>Model</Table.ColumnHeader>
						<Table.ColumnHeader w="130px">Inference</Table.ColumnHeader>
						{isTask && <Table.ColumnHeader w="200px">Features</Table.ColumnHeader>}
						<Table.ColumnHeader w="60px">Reps</Table.ColumnHeader>
						<Table.ColumnHeader w="36px" textAlign="end">
							<Menu.Root>
								<Menu.Trigger asChild>
									<IconButton size="2xs" variant="ghost" aria-label="Sort trials">
										<LuArrowUpDown />
									</IconButton>
								</Menu.Trigger>
								<Portal>
									<Menu.Positioner>
										<Menu.Content>
											{sortOptions.map((opt) => (
												<Menu.Item
													key={opt.value}
													value={opt.value}
													onClick={() => setSortField(opt.value)}
												>
													<Flex gap={2} align="center" minW="140px">
														<Box w="14px" flexShrink={0}>
															{sortField === opt.value && <LuCheck size={12} />}
														</Box>
														{opt.label}
													</Flex>
												</Menu.Item>
											))}
										</Menu.Content>
									</Menu.Positioner>
								</Portal>
							</Menu.Root>
						</Table.ColumnHeader>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{sortedIndices.map((origIdx) => {
						const trial = trials[origIdx]
						const isSelected = selectedIndices.has(origIdx)

						return (
							<Table.Row
								key={origIdx}
								{...(isSelected ? { bg: 'blue.50', _dark: { bg: 'blue.900' } } : {})}
							>
								<Table.Cell verticalAlign="middle">
									<Checkbox.Root
										size="sm"
										checked={isSelected}
										onCheckedChange={() => onToggleSelect(origIdx)}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control>
											<Checkbox.Indicator />
										</Checkbox.Control>
									</Checkbox.Root>
								</Table.Cell>
								<Table.Cell {...getMatchStyle(origIdx, 'model')}>
									<ModelCellPopover
										trial={trial}
										idx={origIdx}
										onUpdate={onUpdate}
										configuredProviders={configuredProviders}
									/>
								</Table.Cell>
								<Table.Cell {...getMatchStyle(origIdx, 'inference')}>
									<InferenceCellPopover trial={trial} idx={origIdx} onUpdate={onUpdate} />
								</Table.Cell>
								{isTask && (
									<Table.Cell {...getMatchStyle(origIdx, 'features')}>
										<FeaturesCellPopover trial={trial} idx={origIdx} onUpdate={onUpdate} />
									</Table.Cell>
								)}
								<Table.Cell {...getMatchStyle(origIdx, 'reps')}>
									<RepsCellPopover trial={trial} idx={origIdx} onUpdate={onUpdate} />
								</Table.Cell>
								<Table.Cell>
									<IconButton
										size="2xs"
										variant="ghost"
										colorPalette="red"
										onClick={() => onRemove(origIdx)}
										disabled={trials.length <= 1}
										aria-label="Delete trial"
									>
										<FiTrash2 />
									</IconButton>
								</Table.Cell>
							</Table.Row>
						)
					})}
				</Table.Body>
			</Table.Root>
		</Table.ScrollArea>
	)
}

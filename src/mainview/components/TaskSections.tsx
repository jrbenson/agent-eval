import {
	Badge,
	Button,
	Card,
	Checkbox,
	Collapsible,
	Field,
	Flex,
	HStack,
	IconButton,
	Input,
	Menu,
	Portal,
	Select,
	Text,
	Textarea,
	VStack,
	createListCollection,
} from '@chakra-ui/react'
import type { ReactNode } from 'react'
import {
	FiChevronDown,
	FiChevronUp,
	FiEdit,
	FiLayers,
	FiMoreVertical,
	FiPlus,
	FiTrash2,
} from 'react-icons/fi'
import type { StoredContentSet } from '../../shared/schemas/content-set.schema'
import type { StoredContent } from '../../shared/schemas/content.schema'
import type { StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import type { StoredSkill } from '../../shared/schemas/skill.schema'
import type { TaskContentRef, TaskSkillRef, TaskToolRef } from '../../shared/schemas/task.schema'
import type { StoredToolDefinition } from '../../shared/schemas/tool-definition.schema'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import CodeEditor from './CodeEditor'
import { ContentPickerCombobox, ContentSetPickerCombobox } from './ContentPickerCombobox'
import { SectionHeader } from './SectionHeader'
import { SkillPickerCombobox, SkillSetPickerCombobox } from './SkillPickerCombobox'
import { ToolPickerCombobox, ToolSetPickerCombobox } from './ToolPickerCombobox'

// ---- Shared helpers ----

function moveItem<T>(arr: T[], from: number, to: number): T[] {
	const result = [...arr]
	const [item] = result.splice(from, 1)
	result.splice(to, 0, item)
	return result
}

// ---- Goal condition form types (re-exported for reuse) ----

export type GoalConditionType =
	| 'string_match'
	| 'regex'
	| 'tool_called'
	| 'schema_match'
	| 'output_subset'

export interface GoalConditionForm {
	type: GoalConditionType
	pattern: string
	caseSensitive: boolean
	toolName: string
	inputSubsetJson: string
	schemaJson: string
	subsetJson: string
}

export function createEmptyGoalConditionForm(
	type: GoalConditionType = 'string_match',
): GoalConditionForm {
	return {
		type,
		pattern: '',
		caseSensitive: false,
		toolName: '',
		inputSubsetJson: '',
		schemaJson: '',
		subsetJson: '',
	}
}

const goalConditionTypes = createListCollection({
	items: [
		{ label: 'String Match', value: 'string_match' },
		{ label: 'Regex', value: 'regex' },
		{ label: 'Tool Called', value: 'tool_called' },
		{ label: 'Schema Match', value: 'schema_match' },
		{ label: 'Output Subset', value: 'output_subset' },
	],
})

// ---- Task Prompts Section ----

export interface TaskPromptsSectionProps {
	taskPrompts: string[]
	setTaskPrompts: (prompts: string[]) => void
	simulateWithLlm: boolean
	setSimulateWithLlm: (value: boolean) => void
	simulationInstructions: string
	setSimulationInstructions: (value: string) => void
	headerTrailing?: ReactNode
}

export function TaskPromptsSection({
	taskPrompts,
	setTaskPrompts,
	simulateWithLlm,
	setSimulateWithLlm,
	simulationInstructions,
	setSimulationInstructions,
	headerTrailing,
}: TaskPromptsSectionProps) {
	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Task Prompts"
				description="Listed prompts are sent to agent in order. Afterward LLM simulation can optionally continue until goal is met."
				trailing={headerTrailing}
				actions={
					<Button size="xs" variant="outline" onClick={() => setTaskPrompts([...taskPrompts, ''])}>
						<FiPlus /> Add Prompt
					</Button>
				}
			/>
			<VStack gap={3} align="stretch">
				{taskPrompts.map((prompt, index) => (
					<Card.Root key={index} variant="outline" size="sm">
						<Card.Body>
							<VStack gap={2} align="stretch">
								<Flex justify="space-between" align="center">
									<Text fontSize="sm" fontWeight="medium">
										Prompt {index + 1}
									</Text>
									<HStack gap={1}>
										<IconButton
											aria-label="Move up"
											size="xs"
											variant="ghost"
											onClick={() => setTaskPrompts(moveItem(taskPrompts, index, index - 1))}
											disabled={index === 0}
										>
											<FiChevronUp />
										</IconButton>
										<IconButton
											aria-label="Move down"
											size="xs"
											variant="ghost"
											onClick={() => setTaskPrompts(moveItem(taskPrompts, index, index + 1))}
											disabled={index === taskPrompts.length - 1}
										>
											<FiChevronDown />
										</IconButton>
										{taskPrompts.length > 1 && (
											<IconButton
												aria-label="Remove prompt"
												size="xs"
												variant="ghost"
												colorPalette="red"
												onClick={() => setTaskPrompts(taskPrompts.filter((_, i) => i !== index))}
											>
												<FiTrash2 />
											</IconButton>
										)}
									</HStack>
								</Flex>
								<Textarea
									value={prompt}
									onChange={(e) => {
										const updated = [...taskPrompts]
										updated[index] = e.target.value
										setTaskPrompts(updated)
									}}
									placeholder={
										index === 0
											? 'The task prompt given to the agent...'
											: `Follow-up prompt #${index + 1}...`
									}
									rows={3}
									w="full"
								/>
							</VStack>
						</Card.Body>
					</Card.Root>
				))}
			</VStack>

			<Card.Root variant="outline" size="sm">
				<Card.Body>
					<VStack gap={3} align="stretch">
						<Checkbox.Root
							checked={simulateWithLlm}
							onCheckedChange={(e) => setSimulateWithLlm(e.checked === true)}
						>
							<Checkbox.HiddenInput />
							<Checkbox.Control />
							<Checkbox.Label>Simulate user response with LLM</Checkbox.Label>
						</Checkbox.Root>
						{simulateWithLlm && (
							<Field.Root pl={6}>
								<Field.Label>Simulation instructions:</Field.Label>
								<Textarea
									value={simulationInstructions}
									onChange={(e) => setSimulationInstructions(e.target.value)}
									placeholder="Additional guidance for the LLM simulating user prompts..."
									rows={2}
									w="full"
								/>
							</Field.Root>
						)}
					</VStack>
				</Card.Body>
			</Card.Root>
		</VStack>
	)
}

// ---- Agent Settings Section ----

export interface AgentSettingsSectionProps {
	systemPrompt: string
	setSystemPrompt: (value: string) => void
	headerTrailing?: ReactNode
}

export function AgentSettingsSection({
	systemPrompt,
	setSystemPrompt,
	headerTrailing,
}: AgentSettingsSectionProps) {
	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Agent Settings"
				description="Configure the baseline agent behavior before the task is attempted."
				trailing={headerTrailing}
			/>
			<Field.Root>
				<Field.Label>System prompt:</Field.Label>
				<Textarea
					value={systemPrompt}
					onChange={(e) => setSystemPrompt(e.target.value)}
					placeholder="Optional system prompt..."
					rows={2}
				/>
			</Field.Root>
		</VStack>
	)
}

// ---- Goal Conditions Section ----

export interface GoalConditionsSectionProps {
	goalConditions: GoalConditionForm[]
	setGoalConditions: (
		updater: GoalConditionForm[] | ((current: GoalConditionForm[]) => GoalConditionForm[]),
	) => void
	updateGoalCondition: (index: number, patch: Partial<GoalConditionForm>) => void
	headerTrailing?: ReactNode
}

export function GoalConditionsSection({
	goalConditions,
	setGoalConditions,
	updateGoalCondition,
	headerTrailing,
}: GoalConditionsSectionProps) {
	const update = (
		updater: GoalConditionForm[] | ((current: GoalConditionForm[]) => GoalConditionForm[]),
	) => {
		setGoalConditions(updater)
	}

	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Goal Conditions"
				description="All conditions must pass for the task to count as successful. Leave empty to disable goal analysis."
				trailing={headerTrailing}
				actions={
					<Button
						size="xs"
						variant="outline"
						onClick={() => update((current) => [...current, createEmptyGoalConditionForm()])}
					>
						<FiPlus />
						Add Condition
					</Button>
				}
			/>
			<VStack gap={3} align="stretch">
				{goalConditions.length === 0 && (
					<Text fontSize="sm" color="fg.muted">
						No goal conditions defined. Goal success will not be computed or displayed for this
						task.
					</Text>
				)}

				{goalConditions.map((goal, index) => (
					<Card.Root key={`${goal.type}-${index}`} variant="outline" size="sm">
						<Card.Body>
							<VStack gap={3} align="stretch">
								<Flex justify="space-between" align="start" gap={3}>
									<HStack gap={3} align="center" flex="1" minW={0}>
										<Text fontSize="sm" fontWeight="medium">
											Condition {index + 1}
										</Text>
										<Select.Root
											collection={goalConditionTypes}
											size="sm"
											width="260px"
											value={[goal.type]}
											onValueChange={(e) =>
												updateGoalCondition(index, {
													...createEmptyGoalConditionForm(e.value[0] as GoalConditionType),
													type: e.value[0] as GoalConditionType,
												})
											}
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
														{goalConditionTypes.items.map((item) => (
															<Select.Item item={item} key={item.value}>
																{item.label}
																<Select.ItemIndicator />
															</Select.Item>
														))}
													</Select.Content>
												</Select.Positioner>
											</Portal>
										</Select.Root>
									</HStack>
									<HStack gap={1}>
										<IconButton
											aria-label="Move up"
											size="xs"
											variant="ghost"
											onClick={() => update((current) => moveItem(current, index, index - 1))}
											disabled={index === 0}
										>
											<FiChevronUp />
										</IconButton>
										<IconButton
											aria-label="Move down"
											size="xs"
											variant="ghost"
											onClick={() => update((current) => moveItem(current, index, index + 1))}
											disabled={index === goalConditions.length - 1}
										>
											<FiChevronDown />
										</IconButton>
										<IconButton
											aria-label="Remove goal condition"
											size="xs"
											variant="ghost"
											colorPalette="red"
											onClick={() => update((current) => current.filter((_, i) => i !== index))}
										>
											<FiTrash2 />
										</IconButton>
									</HStack>
								</Flex>

								{(goal.type === 'string_match' || goal.type === 'regex') && (
									<Field.Root required>
										<Field.Label>
											{goal.type === 'string_match' ? 'Text pattern:' : 'Regex pattern:'}
										</Field.Label>
										<Input
											size="sm"
											value={goal.pattern}
											onChange={(e) =>
												updateGoalCondition(index, {
													pattern: e.target.value,
												})
											}
											placeholder={
												goal.type === 'string_match'
													? 'Text to find in output'
													: 'assistant\\s+done'
											}
										/>
									</Field.Root>
								)}

								{goal.type === 'string_match' && (
									<Checkbox.Root
										checked={goal.caseSensitive}
										onCheckedChange={(e) =>
											updateGoalCondition(index, {
												caseSensitive: e.checked === true,
											})
										}
									>
										<Checkbox.HiddenInput />
										<Checkbox.Control />
										<Checkbox.Label>Case sensitive</Checkbox.Label>
									</Checkbox.Root>
								)}

								{goal.type === 'tool_called' && (
									<VStack gap={3} align="stretch">
										<Field.Root required>
											<Field.Label>Tool name:</Field.Label>
											<Input
												size="sm"
												value={goal.toolName}
												onChange={(e) =>
													updateGoalCondition(index, {
														toolName: e.target.value,
													})
												}
												placeholder="weather_lookup"
											/>
										</Field.Root>
										<VStack gap={1} align="stretch">
											<Text fontSize="sm" fontWeight="medium">
												Input subset:
											</Text>
											<Text fontSize="xs" color="fg.muted">
												JSON object values that must be present in the tool input.
											</Text>
											<CodeEditor
												value={goal.inputSubsetJson}
												onChange={(value: string) =>
													updateGoalCondition(index, {
														inputSubsetJson: value,
													})
												}
												mode="json"
												placeholder='{"location": "New York"}'
												minLines={3}
												maxLines={12}
												name={`goal-input-subset-${index}`}
											/>
										</VStack>
									</VStack>
								)}

								{goal.type === 'schema_match' && (
									<VStack gap={1} align="stretch">
										<Text fontSize="sm" fontWeight="medium">
											Output schema:
										</Text>
										<CodeEditor
											value={goal.schemaJson}
											onChange={(value: string) =>
												updateGoalCondition(index, { schemaJson: value })
											}
											mode="json"
											placeholder='{"type": "object", "properties": {...}}'
											minLines={3}
											maxLines={15}
											name={`goal-schema-${index}`}
										/>
									</VStack>
								)}

								{goal.type === 'output_subset' && (
									<VStack gap={1} align="stretch">
										<Text fontSize="sm" fontWeight="medium">
											Output subset:
										</Text>
										<CodeEditor
											value={goal.subsetJson}
											onChange={(value: string) =>
												updateGoalCondition(index, { subsetJson: value })
											}
											mode="json"
											placeholder='{"weather": {"location": "New York"}}'
											minLines={3}
											maxLines={12}
											name={`goal-output-subset-${index}`}
										/>
									</VStack>
								)}
							</VStack>
						</Card.Body>
					</Card.Root>
				))}
			</VStack>
		</VStack>
	)
}

// ---- Tools Section ----

export interface ToolRefsSectionProps {
	toolRefs: TaskToolRef[]
	setToolRefs: (refs: TaskToolRef[]) => void
	allToolDefs: StoredToolDefinition[] | undefined
	allToolSets: StoredToolSet[] | undefined
	onEditTool?: (toolDefId: string) => void
	onCreateTool?: () => void
	actions?: ReactNode
	headerTrailing?: ReactNode
}

export function ToolRefsSection({
	toolRefs,
	setToolRefs,
	allToolDefs,
	allToolSets,
	onEditTool,
	onCreateTool,
	actions,
	headerTrailing,
}: ToolRefsSectionProps) {
	const removeToolRef = (idx: number) => {
		setToolRefs(toolRefs.filter((_, i) => i !== idx))
	}

	const addToolRef = (toolDefinitionId: string) => {
		if (toolRefs.some((r) => r.type === 'tool' && r.toolDefinitionId === toolDefinitionId)) return
		setToolRefs([...toolRefs, { type: 'tool', toolDefinitionId }])
	}

	const addToolSetRef = (toolSetId: string) => {
		if (toolRefs.some((r) => r.type === 'toolSet' && r.toolSetId === toolSetId)) return
		setToolRefs([...toolRefs, { type: 'toolSet', toolSetId }])
	}

	const inlineToolSet = (idx: number) => {
		const ref = toolRefs[idx]
		if (ref.type !== 'toolSet') return
		const ts = (allToolSets ?? []).find((s) => s.id === ref.toolSetId)
		if (!ts) return
		const inlined: TaskToolRef[] = ts.toolRefs.map((r) => ({
			type: 'tool' as const,
			toolDefinitionId: r.toolDefinitionId,
		}))
		const updated = [...toolRefs]
		updated.splice(idx, 1, ...inlined)
		setToolRefs(updated)
	}

	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Tools"
				description="Mock or LLM-backed tools the agent can call during the trial."
				trailing={headerTrailing}
				actions={
					actions ??
					(onCreateTool ? (
						<Button size="xs" variant="outline" onClick={onCreateTool}>
							<FiPlus /> New Tool
						</Button>
					) : undefined)
				}
			/>
			<VStack gap={2} align="stretch">
				{toolRefs.map((ref, idx) => {
					if (ref.type === 'toolSet') {
						const ts = (allToolSets ?? []).find((s) => s.id === ref.toolSetId)
						return (
							<Card.Root key={`set-${ref.toolSetId}`} variant="outline" size="sm">
								<Card.Body py={2} px={3}>
									<Collapsible.Root>
										<Flex justify="space-between" align="center">
											<HStack gap={2}>
												<FiLayers />
												<VStack gap={0} align="start">
													<HStack gap={2}>
														<Text fontSize="sm" fontWeight="medium">
															{ts?.label ?? 'Unknown tool set'}
														</Text>
														<Badge size="xs" colorPalette="purple" variant="subtle">
															set
														</Badge>
													</HStack>
													<HStack gap={2}>
														<Text fontSize="xs" color="fg.muted">
															{ts ? `${ts.toolRefs.length} tools` : ''}
														</Text>
														{ts && ts.toolRefs.length > 0 && (
															<Collapsible.Trigger asChild>
																<Button
																	size="xs"
																	variant="plain"
																	color="fg.muted"
																	px={0}
																	height="auto"
																	minH={0}
																	fontSize="xs"
																>
																	preview
																</Button>
															</Collapsible.Trigger>
														)}
													</HStack>
												</VStack>
											</HStack>
											<HStack gap={1}>
												<IconButton
													aria-label="Move up"
													size="xs"
													variant="ghost"
													onClick={() => setToolRefs(moveItem(toolRefs, idx, idx - 1))}
													disabled={idx === 0}
												>
													<FiChevronUp />
												</IconButton>
												<IconButton
													aria-label="Move down"
													size="xs"
													variant="ghost"
													onClick={() => setToolRefs(moveItem(toolRefs, idx, idx + 1))}
													disabled={idx === toolRefs.length - 1}
												>
													<FiChevronDown />
												</IconButton>
												<Menu.Root>
													<Menu.Trigger asChild>
														<IconButton aria-label="More actions" size="xs" variant="ghost">
															<FiMoreVertical />
														</IconButton>
													</Menu.Trigger>
													<Portal>
														<Menu.Positioner>
															<Menu.Content>
																<Menu.Item value="inline" onClick={() => inlineToolSet(idx)}>
																	Inline tools
																</Menu.Item>
															</Menu.Content>
														</Menu.Positioner>
													</Portal>
												</Menu.Root>
												<IconButton
													aria-label="Remove tool set"
													size="xs"
													variant="ghost"
													colorPalette="red"
													onClick={() => removeToolRef(idx)}
												>
													<FiTrash2 />
												</IconButton>
											</HStack>
										</Flex>
										<Collapsible.Content>
											<VStack gap={0} align="start" mt={1} pl={4}>
												{ts?.toolRefs.map((sr) => {
													const td = (allToolDefs ?? []).find((d) => d.id === sr.toolDefinitionId)
													return (
														<Text
															key={sr.toolDefinitionId}
															fontSize="xs"
															color="fg.subtle"
															fontFamily="mono"
														>
															{td?.name ?? sr.toolDefinitionId}
														</Text>
													)
												})}
											</VStack>
										</Collapsible.Content>
									</Collapsible.Root>
								</Card.Body>
							</Card.Root>
						)
					}

					const td = (allToolDefs ?? []).find((d) => d.id === ref.toolDefinitionId)
					return (
						<Card.Root key={`tool-${ref.toolDefinitionId}`} variant="outline" size="sm">
							<Card.Body py={2} px={3}>
								<Flex justify="space-between" align="center">
									<VStack gap={0} align="start">
										<Text fontSize="sm" fontWeight="medium">
											{td?.label ?? td?.name ?? 'Unknown tool'}
										</Text>
										<Text fontSize="xs" color="fg.muted" fontFamily="mono">
											{td?.name ?? ''}
										</Text>
									</VStack>
									<HStack gap={1}>
										<IconButton
											aria-label="Move up"
											size="xs"
											variant="ghost"
											onClick={() => setToolRefs(moveItem(toolRefs, idx, idx - 1))}
											disabled={idx === 0}
										>
											<FiChevronUp />
										</IconButton>
										<IconButton
											aria-label="Move down"
											size="xs"
											variant="ghost"
											onClick={() => setToolRefs(moveItem(toolRefs, idx, idx + 1))}
											disabled={idx === toolRefs.length - 1}
										>
											<FiChevronDown />
										</IconButton>
										{onEditTool && (
											<IconButton
												aria-label="Edit tool"
												size="xs"
												variant="ghost"
												onClick={() => onEditTool(ref.toolDefinitionId)}
											>
												<FiEdit />
											</IconButton>
										)}
										<IconButton
											aria-label="Remove tool"
											size="xs"
											variant="ghost"
											colorPalette="red"
											onClick={() => removeToolRef(idx)}
										>
											<FiTrash2 />
										</IconButton>
									</HStack>
								</Flex>
							</Card.Body>
						</Card.Root>
					)
				})}

				<ToolPickerCombobox
					tools={allToolDefs ?? []}
					excludeIds={
						new Set(
							toolRefs
								.filter((r): r is Extract<TaskToolRef, { type: 'tool' }> => r.type === 'tool')
								.map((r) => r.toolDefinitionId),
						)
					}
					onSelect={addToolRef}
					placeholder="Attach a tool..."
				/>

				<ToolSetPickerCombobox
					toolSets={allToolSets ?? []}
					excludeIds={
						new Set(
							toolRefs
								.filter((r): r is Extract<TaskToolRef, { type: 'toolSet' }> => r.type === 'toolSet')
								.map((r) => r.toolSetId),
						)
					}
					onSelect={addToolSetRef}
					placeholder="Attach a tool set..."
				/>
			</VStack>
		</VStack>
	)
}

// ---- Content Section (refs + inline persistence) ----

export interface ContentSectionProps {
	contentRefs: TaskContentRef[]
	setContentRefs: (refs: TaskContentRef[]) => void
	initialPersistence: Array<{ name: string; content: string }>
	setInitialPersistence: (entries: Array<{ name: string; content: string }>) => void
	allContents: StoredContent[] | undefined
	allContentSets: StoredContentSet[] | undefined
	headerTrailing?: ReactNode
}

export function ContentSection({
	contentRefs,
	setContentRefs,
	initialPersistence,
	setInitialPersistence,
	allContents,
	allContentSets,
	headerTrailing,
}: ContentSectionProps) {
	const addContentRef = (contentId: string) => {
		if (contentRefs.some((r) => r.type === 'content' && r.contentId === contentId)) return
		setContentRefs([...contentRefs, { type: 'content', contentId }])
	}
	const addContentSetRef = (contentSetId: string) => {
		if (contentRefs.some((r) => r.type === 'contentSet' && r.contentSetId === contentSetId)) return
		setContentRefs([...contentRefs, { type: 'contentSet', contentSetId }])
	}
	const removeContentRef = (idx: number) => {
		setContentRefs(contentRefs.filter((_, i) => i !== idx))
	}

	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Content"
				description="Reusable key-value data merged into persistence before inline entries."
				trailing={headerTrailing}
				actions={
					<Button
						size="xs"
						variant="outline"
						onClick={() =>
							setInitialPersistence([...initialPersistence, { name: '', content: '' }])
						}
					>
						<FiPlus /> Add Content
					</Button>
				}
			/>
			<VStack gap={2} align="stretch">
				{contentRefs.map((ref, idx) => {
					const label =
						ref.type === 'content'
							? ((allContents ?? []).find((c) => c.id === ref.contentId)?.label ?? 'Unknown')
							: ((allContentSets ?? []).find((cs) => cs.id === ref.contentSetId)?.label ??
								'Unknown')
					const sub =
						ref.type === 'content'
							? (allContents ?? []).find((c) => c.id === ref.contentId)?.name
							: `${(allContentSets ?? []).find((cs) => cs.id === ref.contentSetId)?.contentRefs.length ?? 0} items`
					return (
						<Card.Root key={`cr-${idx}`} variant="outline" size="sm">
							<Card.Body py={2} px={3}>
								<Flex justify="space-between" align="center">
									<VStack gap={0} align="start">
										<HStack gap={2}>
											<Text fontSize="sm" fontWeight="medium">
												{label}
											</Text>
											{ref.type === 'contentSet' && (
												<Badge size="xs" colorPalette="blue" variant="subtle">
													set
												</Badge>
											)}
										</HStack>
										{sub && (
											<Text fontSize="xs" color="fg.muted" fontFamily="mono">
												{sub}
											</Text>
										)}
									</VStack>
									<IconButton
										aria-label="Remove"
										size="xs"
										variant="ghost"
										colorPalette="red"
										onClick={() => removeContentRef(idx)}
									>
										<FiTrash2 />
									</IconButton>
								</Flex>
							</Card.Body>
						</Card.Root>
					)
				})}
				<ContentPickerCombobox
					contents={allContents ?? []}
					excludeIds={
						new Set(
							contentRefs
								.filter(
									(r): r is Extract<TaskContentRef, { type: 'content' }> => r.type === 'content',
								)
								.map((r) => r.contentId),
						)
					}
					onSelect={addContentRef}
					placeholder="Attach content..."
				/>
				<ContentSetPickerCombobox
					contentSets={allContentSets ?? []}
					excludeIds={
						new Set(
							contentRefs
								.filter(
									(r): r is Extract<TaskContentRef, { type: 'contentSet' }> =>
										r.type === 'contentSet',
								)
								.map((r) => r.contentSetId),
						)
					}
					onSelect={addContentSetRef}
					placeholder="Attach a content set..."
				/>

				{initialPersistence.map((entry, idx) => (
					<Card.Root key={`ip-${idx}`} variant="outline" size="sm">
						<Card.Body py={2} px={3}>
							<VStack gap={2} align="stretch">
								<Flex justify="space-between" align="center">
									<Input
										size="sm"
										value={entry.name}
										onChange={(e) => {
											const updated = [...initialPersistence]
											updated[idx] = { ...entry, name: e.target.value }
											setInitialPersistence(updated)
										}}
										placeholder="Name (e.g. file:todo.md)"
										fontFamily="mono"
										flex={1}
									/>
									<IconButton
										aria-label="Remove entry"
										size="xs"
										variant="ghost"
										colorPalette="red"
										ml={2}
										onClick={() => {
											setInitialPersistence(initialPersistence.filter((_, i) => i !== idx))
										}}
									>
										<FiTrash2 />
									</IconButton>
								</Flex>
								<CodeEditor
									value={entry.content}
									onChange={(val: string) => {
										const updated = [...initialPersistence]
										updated[idx] = { ...entry, content: val }
										setInitialPersistence(updated)
									}}
									mode="text"
									placeholder="Initial content..."
									minLines={2}
									maxLines={10}
									name={`persistence-${idx}`}
								/>
							</VStack>
						</Card.Body>
					</Card.Root>
				))}
			</VStack>
		</VStack>
	)
}

// ---- Skills Section ----

export interface SkillsSectionProps {
	skillRefs: TaskSkillRef[]
	setSkillRefs: (refs: TaskSkillRef[]) => void
	inlineSkills: Array<{ name: string; description: string; content: string }>
	setInlineSkills: (skills: Array<{ name: string; description: string; content: string }>) => void
	allSkills: StoredSkill[] | undefined
	allSkillSets: StoredSkillSet[] | undefined
	headerTrailing?: ReactNode
}

export function SkillsSection({
	skillRefs,
	setSkillRefs,
	inlineSkills,
	setInlineSkills,
	allSkills,
	allSkillSets,
	headerTrailing,
}: SkillsSectionProps) {
	const addSkillRef = (skillId: string) => {
		if (skillRefs.some((r) => r.type === 'skill' && r.skillId === skillId)) return
		setSkillRefs([...skillRefs, { type: 'skill', skillId }])
	}
	const addSkillSetRef = (skillSetId: string) => {
		if (skillRefs.some((r) => r.type === 'skillSet' && r.skillSetId === skillSetId)) return
		setSkillRefs([...skillRefs, { type: 'skillSet', skillSetId }])
	}
	const removeSkillRef = (idx: number) => {
		setSkillRefs(skillRefs.filter((_, i) => i !== idx))
	}

	return (
		<VStack gap={4} align="stretch">
			<SectionHeader
				title="Skills"
				description="Progressive-disclosure instructions loaded on demand via load_skill."
				trailing={headerTrailing}
				actions={
					<Button
						size="xs"
						variant="outline"
						onClick={() =>
							setInlineSkills([...inlineSkills, { name: '', description: '', content: '' }])
						}
					>
						<FiPlus /> Add Skill
					</Button>
				}
			/>
			<VStack gap={2} align="stretch">
				{skillRefs.map((ref, idx) => {
					const label =
						ref.type === 'skill'
							? ((allSkills ?? []).find((s) => s.id === ref.skillId)?.label ?? 'Unknown')
							: ((allSkillSets ?? []).find((ss) => ss.id === ref.skillSetId)?.label ?? 'Unknown')
					const sub =
						ref.type === 'skill'
							? (allSkills ?? []).find((s) => s.id === ref.skillId)?.name
							: `${(allSkillSets ?? []).find((ss) => ss.id === ref.skillSetId)?.skillRefs.length ?? 0} skills`
					return (
						<Card.Root key={`sr-${idx}`} variant="outline" size="sm">
							<Card.Body py={2} px={3}>
								<Flex justify="space-between" align="center">
									<VStack gap={0} align="start">
										<HStack gap={2}>
											<Text fontSize="sm" fontWeight="medium">
												{label}
											</Text>
											{ref.type === 'skillSet' && (
												<Badge size="xs" colorPalette="green" variant="subtle">
													set
												</Badge>
											)}
										</HStack>
										{sub && (
											<Text fontSize="xs" color="fg.muted" fontFamily="mono">
												{sub}
											</Text>
										)}
									</VStack>
									<IconButton
										aria-label="Remove"
										size="xs"
										variant="ghost"
										colorPalette="red"
										onClick={() => removeSkillRef(idx)}
									>
										<FiTrash2 />
									</IconButton>
								</Flex>
							</Card.Body>
						</Card.Root>
					)
				})}
				<SkillPickerCombobox
					skills={allSkills ?? []}
					excludeIds={
						new Set(
							skillRefs
								.filter((r): r is Extract<TaskSkillRef, { type: 'skill' }> => r.type === 'skill')
								.map((r) => r.skillId),
						)
					}
					onSelect={addSkillRef}
					placeholder="Attach a skill..."
				/>
				<SkillSetPickerCombobox
					skillSets={allSkillSets ?? []}
					excludeIds={
						new Set(
							skillRefs
								.filter(
									(r): r is Extract<TaskSkillRef, { type: 'skillSet' }> => r.type === 'skillSet',
								)
								.map((r) => r.skillSetId),
						)
					}
					onSelect={addSkillSetRef}
					placeholder="Attach a skill set..."
				/>

				{inlineSkills.map((sk, idx) => (
					<Card.Root key={`isk-${idx}`} variant="outline" size="sm">
						<Card.Body py={2} px={3}>
							<VStack gap={2} align="stretch">
								<Flex justify="space-between" align="center">
									<HStack gap={2} flex={1}>
										<Input
											size="sm"
											value={sk.name}
											onChange={(e) => {
												const updated = [...inlineSkills]
												updated[idx] = { ...sk, name: e.target.value }
												setInlineSkills(updated)
											}}
											placeholder="skill-name"
											fontFamily="mono"
											flex={1}
										/>
									</HStack>
									<IconButton
										aria-label="Remove"
										size="xs"
										variant="ghost"
										colorPalette="red"
										ml={2}
										onClick={() => setInlineSkills(inlineSkills.filter((_, i) => i !== idx))}
									>
										<FiTrash2 />
									</IconButton>
								</Flex>
								<Input
									size="sm"
									value={sk.description}
									onChange={(e) => {
										const updated = [...inlineSkills]
										updated[idx] = { ...sk, description: e.target.value }
										setInlineSkills(updated)
									}}
									placeholder="Short description for agent discovery..."
								/>
								<CodeEditor
									value={sk.content}
									onChange={(val: string) => {
										const updated = [...inlineSkills]
										updated[idx] = { ...sk, content: val }
										setInlineSkills(updated)
									}}
									mode="text"
									placeholder="Skill instructions..."
									minLines={3}
									maxLines={10}
									name={`inline-skill-${idx}`}
								/>
							</VStack>
						</Card.Body>
					</Card.Root>
				))}
			</VStack>
		</VStack>
	)
}

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
	Spinner,
	Text,
	Textarea,
	VStack,
	createListCollection,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	FiChevronDown,
	FiChevronUp,
	FiEdit,
	FiLayers,
	FiMoreVertical,
	FiPlus,
	FiSave,
	FiTrash2,
	FiZap,
} from 'react-icons/fi'
import type { StoredTask } from '../../shared/rpc-types'
import type {
	GoalCondition,
	TaskContentRef,
	TaskSkillRef,
	TaskToolRef,
	TaskVariant,
	TaskVariantOverrides,
} from '../../shared/schemas/task.schema'
import CodeEditor from '../components/CodeEditor'
import {
	ContentPickerCombobox,
	ContentSetPickerCombobox,
} from '../components/ContentPickerCombobox'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import { SkillPickerCombobox, SkillSetPickerCombobox } from '../components/SkillPickerCombobox'
import { ToolPickerCombobox, ToolSetPickerCombobox } from '../components/ToolPickerCombobox'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { VariantEditor } from '../components/VariantEditor'
import { VariantTabBar } from '../components/VariantTabBar'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useContentSets } from '../hooks/use-content-sets'
import { useContents } from '../hooks/use-contents'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import { useSkillSets } from '../hooks/use-skill-sets'
import { useSkills } from '../hooks/use-skills'
import { useCreateTask, useTask, useTasks, useUpdateTask } from '../hooks/use-tasks'
import { useToolDefinitions } from '../hooks/use-tool-definitions'
import { useToolSets } from '../hooks/use-tool-sets'
import ToolDefinitionBuilder from './ToolDefinitionBuilder'

function moveItem<T>(arr: T[], from: number, to: number): T[] {
	const result = [...arr]
	const [item] = result.splice(from, 1)
	result.splice(to, 0, item)
	return result
}

type GoalConditionType = GoalCondition['type']

interface GoalConditionForm {
	type: GoalConditionType
	pattern: string
	caseSensitive: boolean
	toolName: string
	inputSubsetJson: string
	schemaJson: string
	subsetJson: string
}

function createEmptyGoalConditionForm(type: GoalConditionType = 'string_match'): GoalConditionForm {
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

function goalConditionToForm(condition: GoalCondition): GoalConditionForm {
	switch (condition.type) {
		case 'string_match':
			return {
				...createEmptyGoalConditionForm(condition.type),
				pattern: condition.pattern,
				caseSensitive: condition.caseSensitive,
			}
		case 'regex':
			return {
				...createEmptyGoalConditionForm(condition.type),
				pattern: condition.pattern,
			}
		case 'tool_called':
			return {
				...createEmptyGoalConditionForm(condition.type),
				toolName: condition.toolName,
				inputSubsetJson: condition.inputSubset
					? JSON.stringify(condition.inputSubset, null, 2)
					: '',
			}
		case 'schema_match':
			return {
				...createEmptyGoalConditionForm(condition.type),
				schemaJson: JSON.stringify(condition.schema, null, 2),
			}
		case 'output_subset':
			return {
				...createEmptyGoalConditionForm(condition.type),
				subsetJson: JSON.stringify(condition.subset, null, 2),
			}
	}
}

interface TaskBuilderProps {
	taskId?: string
	onBack: () => void
	onCreated?: (id: string) => void
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

export default function TaskBuilder({ taskId, onBack, onCreated }: TaskBuilderProps) {
	const isPopout = useIsPopout()
	const isEditing = !!taskId
	const { data: existingTask, isLoading: isExistingLoading } = useTask(taskId ?? null)
	const createTask = useCreateTask()
	const updateTask = useUpdateTask()
	const { data: allTasks } = useTasks()
	const { data: allToolDefs } = useToolDefinitions()
	const { data: allToolSets } = useToolSets()
	const { data: allContents } = useContents()
	const { data: allContentSets } = useContentSets()
	const { data: allSkills } = useSkills()
	const { data: allSkillSets } = useSkillSets()

	const [name, setName] = useState('')
	const [taskPrompts, setTaskPrompts] = useState<string[]>([''])
	const [systemPrompt, setSystemPrompt] = useState('')
	const [simulateWithLlm, setSimulateWithLlm] = useState(false)
	const [simulationInstructions, setSimulationInstructions] = useState('')

	const [toolRefs, setToolRefs] = useState<TaskToolRef[]>([])
	const [editingToolId, setEditingToolId] = useState<string | null>(null)
	const [creatingToolForTask, setCreatingToolForTask] = useState(false)
	const [contentRefs, setContentRefs] = useState<TaskContentRef[]>([])
	const [skillRefs, setSkillRefs] = useState<TaskSkillRef[]>([])
	const [inlineSkills, setInlineSkills] = useState<
		Array<{ name: string; description: string; content: string }>
	>([])
	const [goalConditions, setGoalConditions] = useState<GoalConditionForm[]>([])
	const [generateOpen, setGenerateOpen] = useState(false)
	const [initialPersistence, setInitialPersistence] = useState<
		Array<{ name: string; content: string }>
	>([])

	// Variant state
	const [variants, setVariants] = useState<TaskVariant[]>([])
	const [activeTabId, setActiveTabId] = useState<string>('primary')
	const [primaryVariantLabel, setPrimaryVariantLabel] = useState<string>('Primary')

	const addVariant = useCallback(() => {
		const newVariant: TaskVariant = {
			id: crypto.randomUUID(),
			label: `Variant ${variants.length + 1}`,
			overrides: {},
		}
		setVariants((v) => [...v, newVariant])
		setActiveTabId(newVariant.id)
	}, [variants.length])

	const renameVariant = useCallback((id: string, newLabel: string) => {
		if (id === 'primary') {
			setPrimaryVariantLabel(newLabel)
			return
		}
		setVariants((v) => v.map((vr) => (vr.id === id ? { ...vr, label: newLabel } : vr)))
	}, [])

	const deleteVariant = useCallback(
		(id: string) => {
			setVariants((v) => v.filter((vr) => vr.id !== id))
			if (activeTabId === id) setActiveTabId('primary')
		},
		[activeTabId],
	)

	const updateVariantOverrides = useCallback((id: string, overrides: TaskVariantOverrides) => {
		setVariants((v) => v.map((vr) => (vr.id === id ? { ...vr, overrides } : vr)))
	}, [])

	const onPopulate = useCallback((s: StoredTask) => {
		setName(s.label)
		setTaskPrompts(s.taskPrompts)
		setSystemPrompt(s.systemPrompt ?? '')
		setSimulateWithLlm(s.simulateWithLlm ?? false)
		setSimulationInstructions(s.simulationInstructions ?? '')
		setToolRefs(s.toolRefs ?? [])
		setContentRefs(s.contentRefs ?? [])
		setSkillRefs(s.skillRefs ?? [])
		setInlineSkills(s.inlineSkills ?? [])
		setGoalConditions((s.goalConditions ?? []).map(goalConditionToForm))
		setInitialPersistence(s.initialPersistence ?? [])
		setVariants(s.variants ?? [])
		setPrimaryVariantLabel(s.primaryVariantLabel ?? 'Primary')
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing: existingTask,
		allEntities: allTasks,
		entityType: 'Task',
		onPopulate,
		setName,
	})

	// Dirty-guard setup
	const stateJson = useMemo(
		() =>
			JSON.stringify({
				name,
				taskPrompts,
				systemPrompt,
				simulateWithLlm,
				simulationInstructions,
				toolRefs,
				contentRefs,
				skillRefs,
				inlineSkills,
				goalConditions,
				initialPersistence,
				variants,
				primaryVariantLabel,
			}),
		[
			name,
			taskPrompts,
			systemPrompt,
			simulateWithLlm,
			simulationInstructions,
			toolRefs,
			contentRefs,
			skillRefs,
			inlineSkills,
			goalConditions,
			initialPersistence,
			variants,
			primaryVariantLabel,
		],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

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
		toaster.create({
			title: `Expanded "${ts.label}" into ${inlined.length} individual tools`,
			type: 'info',
		})
	}

	// Content ref helpers
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

	// Skill ref helpers
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

	const updateGoalCondition = useCallback((index: number, patch: Partial<GoalConditionForm>) => {
		setGoalConditions((current) =>
			current.map((goal, i) => (i === index ? { ...goal, ...patch } : goal)),
		)
	}, [])

	const parseJsonObject = useCallback((label: string, value: string) => {
		const parsed = JSON.parse(value)
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(`${label} must be a JSON object`)
		}
		return parsed as Record<string, unknown>
	}, [])

	const buildGoalConditions = useCallback((): GoalCondition[] | null => {
		const built: GoalCondition[] = []

		for (let index = 0; index < goalConditions.length; index++) {
			const goal = goalConditions[index]
			const itemNumber = index + 1

			try {
				switch (goal.type) {
					case 'string_match': {
						if (!goal.pattern.trim()) {
							throw new Error(`Goal ${itemNumber} requires text to match`)
						}
						built.push({
							type: 'string_match',
							pattern: goal.pattern.trim(),
							caseSensitive: goal.caseSensitive,
						})
						break
					}
					case 'regex': {
						if (!goal.pattern.trim()) {
							throw new Error(`Goal ${itemNumber} requires a regex pattern`)
						}
						built.push({ type: 'regex', pattern: goal.pattern.trim() })
						break
					}
					case 'tool_called': {
						if (!goal.toolName.trim()) {
							throw new Error(`Goal ${itemNumber} requires a tool name`)
						}
						built.push({
							type: 'tool_called',
							toolName: goal.toolName.trim(),
							...(goal.inputSubsetJson.trim()
								? {
										inputSubset: parseJsonObject(
											`Goal ${itemNumber} input subset`,
											goal.inputSubsetJson,
										),
									}
								: {}),
						})
						break
					}
					case 'schema_match': {
						if (!goal.schemaJson.trim()) {
							throw new Error(`Goal ${itemNumber} requires a JSON schema object`)
						}
						built.push({
							type: 'schema_match',
							schema: parseJsonObject(`Goal ${itemNumber} schema`, goal.schemaJson),
						})
						break
					}
					case 'output_subset': {
						if (!goal.subsetJson.trim()) {
							throw new Error(`Goal ${itemNumber} requires an output subset object`)
						}
						built.push({
							type: 'output_subset',
							subset: parseJsonObject(`Goal ${itemNumber} output subset`, goal.subsetJson),
						})
						break
					}
				}
			} catch (err) {
				toaster.create({
					title: err instanceof Error ? err.message : `Goal ${itemNumber} is invalid`,
					type: 'warning',
				})
				return null
			}
		}

		return built
	}, [goalConditions, parseJsonObject])

	const handleSave = async () => {
		if (!taskPrompts[0]?.trim()) {
			toaster.create({
				title: 'At least one task prompt is required',
				type: 'warning',
			})
			return
		}

		const builtGoalConditions = buildGoalConditions()
		if (!builtGoalConditions) {
			return
		}

		const payload = {
			label: name,
			taskPrompts: taskPrompts.filter((p) => p.trim()),
			systemPrompt,
			toolRefs,
			contentRefs,
			skillRefs,
			inlineSkills,
			goalConditions: builtGoalConditions,
			initialPersistence,
			simulateWithLlm,
			simulationInstructions: simulationInstructions.trim() || undefined,
			variants: variants.length > 0 ? variants : undefined,
			primaryVariantLabel: primaryVariantLabel !== 'Primary' ? primaryVariantLabel : undefined,
		}

		try {
			if (isEditing && taskId) {
				await updateTask.mutateAsync({ id: taskId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createTask.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: `Failed to ${isEditing ? 'update' : 'create'} task`,
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	// Inline tool definition editing
	if (editingToolId) {
		return (
			<ToolDefinitionBuilder
				toolDefId={editingToolId}
				onBack={() => setEditingToolId(null)}
				breadcrumbLabel={name || 'Task'}
			/>
		)
	}

	if (creatingToolForTask) {
		return (
			<ToolDefinitionBuilder
				onBack={() => {
					setCreatingToolForTask(false)
				}}
				onCreated={(newId) => {
					addToolRef(newId)
					setCreatingToolForTask(false)
				}}
				breadcrumbLabel={name || 'Task'}
			/>
		)
	}

	if (isEditing && isExistingLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: isPopout ? '' : 'Scenarios',
						onClick: () => dirtyGuard.guardNavigation(onBack),
					},
				]}
			>
				<Flex justify="center" py={12}>
					<Spinner />
				</Flex>
			</DrillInLayout>
		)
	}

	const isSaving = createTask.isPending || updateTask.isPending

	return (
		<DrillInLayout
			title={name || 'Untitled Task'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Scenarios',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="task"
					entityId={taskId}
					guardNavigation={dirtyGuard.guardNavigation}
					onAfterPopout={onBack}
				/>
			}
			actions={
				<HStack gap={2}>
					<Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
						<FiZap />
						Generate
					</Button>
					<Button
						size="sm"
						colorPalette="blue"
						variant="solid"
						onClick={handleSave}
						loading={isSaving}
					>
						<FiSave />
						Save
					</Button>
				</HStack>
			}
			subHeader={
				<VariantTabBar
					variants={variants.map((v) => ({ id: v.id, label: v.label }))}
					activeTabId={activeTabId}
					primaryLabel={primaryVariantLabel}
					onSelect={setActiveTabId}
					onAdd={addVariant}
					onRename={renameVariant}
					onDelete={deleteVariant}
				/>
			}
		>
			{activeTabId !== 'primary' ? (
				<VariantEditor
					overrides={variants.find((v) => v.id === activeTabId)?.overrides ?? {}}
					onChange={(overrides) => updateVariantOverrides(activeTabId, overrides)}
					primary={{
						taskPrompts,
						systemPrompt,
						simulateWithLlm,
						simulationInstructions,
						toolRefs,
						contentRefs,
						skillRefs,
						inlineSkills,
						goalConditions,
						initialPersistence,
					}}
					allToolDefs={allToolDefs}
					allToolSets={allToolSets}
					allContents={allContents}
					allContentSets={allContentSets}
					allSkills={allSkills}
					allSkillSets={allSkillSets}
					goalConditionToForm={goalConditionToForm}
				/>
			) : (
				<VStack gap={10} align="stretch">
					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Task Prompts"
							description="Listed prompts are sent to agent in order. Afterward LLM simulation can optionally continue until goal is met."
							actions={
								<Button
									size="xs"
									variant="outline"
									onClick={() => setTaskPrompts([...taskPrompts, ''])}
								>
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
															onClick={() =>
																setTaskPrompts(taskPrompts.filter((_, i) => i !== index))
															}
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

					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Agent Settings"
							description="Configure the baseline agent behavior before the task is attempted."
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

					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Goal Conditions"
							description="All conditions must pass for the task to count as successful. Leave empty to disable goal analysis."
							actions={
								<Button
									size="xs"
									variant="outline"
									onClick={() =>
										setGoalConditions((current) => [...current, createEmptyGoalConditionForm()])
									}
								>
									<FiPlus />
									Add Condition
								</Button>
							}
						/>
						<VStack gap={3} align="stretch">
							{goalConditions.length === 0 && (
								<Text fontSize="sm" color="fg.muted">
									No goal conditions defined. Goal success will not be computed or displayed for
									this task.
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
														onClick={() =>
															setGoalConditions((current) => moveItem(current, index, index - 1))
														}
														disabled={index === 0}
													>
														<FiChevronUp />
													</IconButton>
													<IconButton
														aria-label="Move down"
														size="xs"
														variant="ghost"
														onClick={() =>
															setGoalConditions((current) => moveItem(current, index, index + 1))
														}
														disabled={index === goalConditions.length - 1}
													>
														<FiChevronDown />
													</IconButton>
													<IconButton
														aria-label="Remove goal condition"
														size="xs"
														variant="ghost"
														colorPalette="red"
														onClick={() =>
															setGoalConditions((current) => current.filter((_, i) => i !== index))
														}
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
															onChange={(value) =>
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
														onChange={(value) => updateGoalCondition(index, { schemaJson: value })}
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
														onChange={(value) => updateGoalCondition(index, { subsetJson: value })}
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

					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Tools"
							description="Mock or LLM-backed tools the agent can call during the trial."
							actions={
								<Button size="xs" variant="outline" onClick={() => setCreatingToolForTask(true)}>
									<FiPlus /> New Tool
								</Button>
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
																const td = (allToolDefs ?? []).find(
																	(d) => d.id === sr.toolDefinitionId,
																)
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

								// type === "tool"
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
													<IconButton
														aria-label="Edit tool"
														size="xs"
														variant="ghost"
														onClick={() => setEditingToolId(ref.toolDefinitionId)}
													>
														<FiEdit />
													</IconButton>
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
											.filter(
												(r): r is Extract<TaskToolRef, { type: 'toolSet' }> => r.type === 'toolSet',
											)
											.map((r) => r.toolSetId),
									)
								}
								onSelect={addToolSetRef}
								placeholder="Attach a tool set..."
							/>
						</VStack>
					</VStack>

					{/* Content */}
					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Content"
							description="Reusable key-value data merged into persistence before inline entries."
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
												(r): r is Extract<TaskContentRef, { type: 'content' }> =>
													r.type === 'content',
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
												onChange={(val) => {
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

					{/* Skills */}
					<VStack gap={4} align="stretch">
						<SectionHeader
							title="Skills"
							description="Progressive-disclosure instructions loaded on demand via load_skill."
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
										: ((allSkillSets ?? []).find((ss) => ss.id === ref.skillSetId)?.label ??
											'Unknown')
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
											.filter(
												(r): r is Extract<TaskSkillRef, { type: 'skill' }> => r.type === 'skill',
											)
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
												(r): r is Extract<TaskSkillRef, { type: 'skillSet' }> =>
													r.type === 'skillSet',
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
												onChange={(val) => {
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
				</VStack>
			)}
			<UnsavedChangesDialog
				open={dirtyGuard.showDialog}
				onSave={dirtyGuard.handleDialogSave}
				onDiscard={dirtyGuard.handleDiscard}
				onCancel={dirtyGuard.handleCancel}
				saving={isSaving}
			/>
			<GenerateElementDialog
				open={generateOpen}
				onOpenChange={setGenerateOpen}
				entityType="task"
				existingData={{
					label: name,
					taskPrompts,
					systemPrompt,
					toolRefs,
					contentRefs,
					skillRefs,
					goalConditions: goalConditions.map((goal) => ({
						type: goal.type,
						...(goal.pattern ? { pattern: goal.pattern } : {}),
						...(goal.type === 'string_match' ? { caseSensitive: goal.caseSensitive } : {}),
						...(goal.toolName ? { toolName: goal.toolName } : {}),
						...(goal.inputSubsetJson ? { inputSubset: goal.inputSubsetJson } : {}),
						...(goal.schemaJson ? { schema: goal.schemaJson } : {}),
						...(goal.subsetJson ? { subset: goal.subsetJson } : {}),
					})),
				}}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.taskPrompts && Array.isArray(result.taskPrompts))
						setTaskPrompts(result.taskPrompts as string[])
					if (result.systemPrompt !== undefined) setSystemPrompt(result.systemPrompt as string)
					if (result.toolRefs && Array.isArray(result.toolRefs))
						setToolRefs(result.toolRefs as TaskToolRef[])
					if (result.contentRefs && Array.isArray(result.contentRefs))
						setContentRefs(result.contentRefs as TaskContentRef[])
					if (result.skillRefs && Array.isArray(result.skillRefs))
						setSkillRefs(result.skillRefs as TaskSkillRef[])
					if (Array.isArray(result.goalConditions)) {
						setGoalConditions((result.goalConditions as GoalCondition[]).map(goalConditionToForm))
					}
				}}
			/>
		</DrillInLayout>
	)
}

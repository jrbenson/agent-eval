import {
	Badge,
	Button,
	Field,
	Flex,
	HStack,
	IconButton,
	Menu,
	NumberInput,
	Portal,
	Spinner,
	Table,
	Text,
	VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { FiMoreVertical, FiPlay, FiPlus, FiSave, FiZap } from 'react-icons/fi'
import type { StoredRunRecord } from '../../shared/rpc-types'
import type { ReasoningEffort } from '../../shared/schemas/agent-config.schema'
import type { Provider } from '../../shared/schemas/agent-config.schema'
import ApplyToOthersDialog from '../components/ApplyToOthersDialog'
import type { TrialField } from '../components/ApplyToOthersDialog'
import ClickableRow from '../components/ClickableRow'
import DrillInLayout from '../components/DrillInLayout'
import EntityPickerCombobox from '../components/EntityPickerCombobox'
import ExpandTrialsDialog from '../components/ExpandTrialsDialog'
import GenerateElementDialog from '../components/GenerateElementDialog'
import ImportFromEvaluationDialog from '../components/ImportFromEvaluationDialog'
import PopoutButton from '../components/PopoutButton'
import RunStatusBadge from '../components/RunStatusBadge'
import { SectionHeader } from '../components/SectionHeader'
import { getFeatureParts, getInferenceParts } from '../components/TrialMatrixTable'
import TrialMatrixTable from '../components/TrialMatrixTable'
import TrialTemplatesDialog from '../components/TrialTemplatesDialog'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import VariantCrossingEditor from '../components/VariantCrossingEditor'
import { toaster } from '../components/ui/toaster'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import {
	useCreateEvaluation,
	useEvaluation,
	useEvaluations,
	useRuns,
	useStartRun,
	useUpdateEvaluation,
} from '../hooks/use-results'
import { useSurveys } from '../hooks/use-surveys'
import { useTask, useTasks } from '../hooks/use-tasks'
import { generateDefaultName } from '../utils/default-name'

// ---- Types ----

export interface TrialRow {
	provider: Provider
	model: string
	temperature: number
	repetitions: number
	reasoning: ReasoningEffort
	toolSearch: boolean
	toolSearchHints: 'none' | 'names_only' | 'names_and_descriptions'
	toolSearchMode: 'keyword' | 'semantic'
	subagentsEnabled: boolean
	subagentMaxDepth: number
}

// ---- Evaluation Editor (create + edit) ----

export default function EvaluationEditor({
	evaluationId,
	onBack,
	onCreated,
	onViewRun,
}: {
	evaluationId?: string
	onBack: () => void
	onCreated?: (id: string) => void
	onViewRun: (runId: string, evaluationLabel: string) => void
}) {
	const isPopout = useIsPopout()
	const isEdit = !!evaluationId

	// Data hooks
	const { data: surveys } = useSurveys()
	const { data: tasks } = useTasks()
	const { data: existingEval, isLoading: isExistingLoading } = useEvaluation(evaluationId)
	const createEval = useCreateEvaluation()
	const updateEval = useUpdateEvaluation()
	const startEval = useStartRun()
	const { data: runs } = useRuns(evaluationId)
	const { data: allEvaluations } = useEvaluations()

	// Form state
	const [name, setName] = useState('')
	const [defaultNameDone, setDefaultNameDone] = useState(false)
	const [selectedScenarioId, setSelectedScenarioId] = useState('')
	const [concurrency, setConcurrency] = useState(9)
	const [maxSteps, setMaxSteps] = useState(64)
	const [maxSimulatedTurns, setMaxSimulatedTurns] = useState(5)
	const [trials, setTrials] = useState<TrialRow[]>([])
	const [variantCrossings, setVariantCrossings] = useState<string[][]>([])
	const [loaded, setLoaded] = useState(false)
	const [generateOpen, setGenerateOpen] = useState(false)

	// Derive scenarioType from the selectedScenarioId
	const scenarioType = useMemo((): 'task' | 'survey' => {
		if (!selectedScenarioId) return 'task'
		if ((surveys ?? []).some((s) => s.id === selectedScenarioId)) return 'survey'
		return 'task'
	}, [selectedScenarioId, surveys])

	// Fetch selected task for variant crossing UI
	const { data: selectedTask } = useTask(scenarioType === 'task' ? selectedScenarioId : null)
	const taskVariants = selectedTask?.variants ?? []

	// Compute trial breakdown info
	const trialBreakdown = useMemo((): TrialBreakdownInfo => {
		const configLines: ConfigLineItem[] = trials.map((t) => ({
			label: `${t.provider}/${t.model}`,
			repetitions: t.repetitions || 1,
			trial: t,
		}))
		const agentConfigCount = configLines.reduce((sum, c) => sum + c.repetitions, 0)

		const variantLines: VariantLineItem[] = []
		const hasCrossings =
			scenarioType === 'task' &&
			variantCrossings.length >= 2 &&
			variantCrossings.every((g) => g.length > 0)

		if (scenarioType !== 'task' || taskVariants.length === 0) {
			// Survey or task with no variants — single scenario
			return {
				agentConfigCount,
				configLines,
				variantLines: [
					{
						label: selectedTask?.label ?? 'Scenario',
						type: 'primary' as const,
					},
				],
				totalTrials: agentConfigCount,
			}
		}

		const variantMap = new Map(taskVariants.map((v) => [v.id, v]))

		if (hasCrossings) {
			// Crossing mode
			const groupedIds = new Set(variantCrossings.flat())
			const hasPrimaryInGroup = groupedIds.has('primary')

			// Standalone primary if not in any group
			if (!hasPrimaryInGroup) {
				variantLines.push({
					label: selectedTask?.primaryVariantLabel ?? 'Primary',
					type: 'primary',
				})
			}

			// Build labels for each combination
			const cartesian = (arrays: string[][]): string[][] => {
				if (arrays.length === 0) return [[]]
				return arrays.reduce<string[][]>(
					(acc, group) => acc.flatMap((combo) => group.map((item) => [...combo, item])),
					[[]],
				)
			}
			for (const combo of cartesian(variantCrossings)) {
				const labels = combo.map((id) =>
					id === 'primary'
						? (selectedTask?.primaryVariantLabel ?? 'Primary')
						: (variantMap.get(id)?.label ?? id),
				)
				variantLines.push({ label: labels.join(', '), type: 'crossed' })
			}

			// Ungrouped variants
			for (const v of taskVariants) {
				if (!groupedIds.has(v.id)) {
					variantLines.push({ label: v.label, type: 'variant' })
				}
			}
		} else {
			// Flat mode: primary + each variant
			variantLines.push({
				label: selectedTask?.primaryVariantLabel ?? 'Primary',
				type: 'primary',
			})
			for (const v of taskVariants) {
				variantLines.push({ label: v.label, type: 'variant' })
			}
		}

		return {
			agentConfigCount,
			configLines,
			variantLines,
			totalTrials: agentConfigCount * variantLines.length,
		}
	}, [trials, scenarioType, taskVariants, variantCrossings, selectedTask])

	// Build scenario items for combobox
	const scenarioItems = useMemo(() => {
		const items: { label: string; value: string; group: string }[] = []
		for (const s of surveys ?? []) {
			items.push({ label: s.label, value: s.id, group: 'Surveys' })
		}
		for (const t of tasks ?? []) {
			items.push({ label: t.label, value: t.id, group: 'Tasks' })
		}
		return items
	}, [surveys, tasks])

	// Populate form from existing evaluation
	useEffect(() => {
		if (isEdit && existingEval && !loaded) {
			setName(existingEval.label)
			setSelectedScenarioId(existingEval.scenarioId)
			setConcurrency(existingEval.concurrency ?? 9)
			setMaxSteps(existingEval.maxSteps ?? 64)
			setMaxSimulatedTurns(existingEval.maxSimulatedTurns ?? 5)
			setVariantCrossings(existingEval.variantCrossings ?? [])
			setTrials(
				existingEval.agentConfigs.map((ac) => ({
					provider: ac.provider,
					model: ac.model,
					temperature: ac.temperature,
					repetitions: ac.repetitions ?? 1,
					reasoning: ac.reasoning ?? 'provider-default',
					toolSearch: ac.toolSearch ?? false,
					toolSearchHints: ac.toolSearchHints ?? 'none',
					toolSearchMode: ac.toolSearchMode ?? existingEval.toolSearchMode ?? 'keyword',
					subagentsEnabled: ac.subagentsEnabled ?? false,
					subagentMaxDepth: ac.subagentMaxDepth ?? 1,
				})),
			)
			setLoaded(true)
		}
	}, [isEdit, existingEval, loaded])

	// Auto-assign default name for new evaluations
	useEffect(() => {
		if (!isEdit && !defaultNameDone && allEvaluations) {
			setName(
				generateDefaultName(
					'Eval',
					(allEvaluations ?? []).map((d) => d.label),
				),
			)
			setDefaultNameDone(true)
		}
	}, [isEdit, allEvaluations, defaultNameDone])

	// Dirty-guard setup
	const ready = isEdit ? loaded : defaultNameDone
	const stateJson = useMemo(
		() =>
			JSON.stringify({
				name,
				selectedScenarioId,
				concurrency,
				maxSteps,
				maxSimulatedTurns,
				variantCrossings,
				trials,
			}),
		[name, selectedScenarioId, concurrency, maxSteps, maxSimulatedTurns, variantCrossings, trials],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const addTrial = () => {
		const base: TrialRow =
			trials.length > 0
				? { ...trials[trials.length - 1] }
				: {
						provider: 'openai',
						model: '',
						temperature: 1,
						repetitions: 1,
						reasoning: 'provider-default',
						toolSearch: false,
						toolSearchHints: 'none',
						toolSearchMode: 'keyword',
						subagentsEnabled: false,
						subagentMaxDepth: 1,
					}
		setTrials([...trials, base])
	}

	const removeTrial = (idx: number) => {
		if (trials.length <= 1) return
		setTrials(trials.filter((_, i) => i !== idx))
		setSelectedTrials((prev) => {
			const next = new Set<number>()
			for (const s of prev) {
				if (s < idx) next.add(s)
				else if (s > idx) next.add(s - 1)
			}
			return next
		})
	}

	const updateTrial = (idx: number, field: keyof TrialRow, value: unknown) => {
		setTrials(trials.map((t, i) => (i === idx ? { ...t, [field]: value } : t)))
	}

	// Trial multi-select
	const [selectedTrials, setSelectedTrials] = useState<Set<number>>(new Set())
	const toggleTrialSelect = (idx: number) => {
		setSelectedTrials((prev) => {
			const next = new Set(prev)
			if (next.has(idx)) next.delete(idx)
			else next.add(idx)
			return next
		})
	}
	const selectAllTrials = () => setSelectedTrials(new Set(trials.map((_, i) => i)))
	const deselectAllTrials = () => setSelectedTrials(new Set())

	const deleteSelectedTrials = () => {
		if (selectedTrials.size === 0) return
		const remaining = trials.filter((_, i) => !selectedTrials.has(i))
		if (remaining.length === 0) return // keep at least one
		setTrials(remaining)
		setSelectedTrials(new Set())
	}

	const duplicateSelectedTrials = () => {
		if (selectedTrials.size === 0) return
		const clones = [...selectedTrials].sort((a, b) => a - b).map((idx) => ({ ...trials[idx] }))
		const newTrials = [...trials, ...clones]
		setTrials(newTrials)
		// Auto-select the clones
		const newSelection = new Set<number>()
		for (let i = trials.length; i < newTrials.length; i++) {
			newSelection.add(i)
		}
		setSelectedTrials(newSelection)
	}

	// Dialog state
	const [applyToOthersOpen, setApplyToOthersOpen] = useState(false)
	const [expandOpen, setExpandOpen] = useState(false)
	const [templatesOpen, setTemplatesOpen] = useState(false)
	const [importOpen, setImportOpen] = useState(false)

	const handleApplyToOthers = (fields: TrialField[]) => {
		if (selectedTrials.size === 0 || fields.length === 0) return
		// Use first selected trial's values as source
		const sourceIdx = [...selectedTrials].sort((a, b) => a - b)[0]
		const source = trials[sourceIdx]
		setTrials(
			trials.map((t, i) => {
				if (selectedTrials.has(i)) return t
				const updated = { ...t }
				for (const f of fields) {
					;(updated as Record<string, unknown>)[f] = source[f]
				}
				return updated as TrialRow
			}),
		)
	}

	const handleExpand = (newTrials: TrialRow[]) => {
		const appended = [...trials, ...newTrials]
		setTrials(appended)
		// Select the new trials
		const sel = new Set<number>()
		for (let i = trials.length; i < appended.length; i++) sel.add(i)
		setSelectedTrials(sel)
	}

	const handleImportTrials = (imported: TrialRow[], mode: 'append' | 'replace') => {
		if (mode === 'replace') {
			setTrials(imported)
		} else {
			setTrials([...trials, ...imported])
		}
		setSelectedTrials(new Set())
	}

	const handleApplyTemplate = (templateTrials: TrialRow[], mode: 'append' | 'replace') => {
		if (mode === 'replace') {
			setTrials(templateTrials)
		} else {
			setTrials([...trials, ...templateTrials])
		}
		setSelectedTrials(new Set())
	}

	const buildPayload = () => ({
		label: name.trim(),
		scenarioId: selectedScenarioId,
		scenarioType,
		agentConfigs: trials.map((t) => ({
			provider: t.provider,
			model: t.model,
			temperature: t.temperature,
			repetitions: t.repetitions,
			reasoning: t.reasoning,
			toolSearch: t.toolSearch,
			toolSearchHints: t.toolSearchHints,
			toolSearchMode: t.toolSearchMode,
			subagentsEnabled: t.subagentsEnabled,
			subagentMaxDepth: t.subagentMaxDepth,
		})),
		concurrency,
		maxSteps,
		maxSimulatedTurns,
		variantCrossings: variantCrossings.length > 0 ? variantCrossings : undefined,
	})

	const handleSave = async () => {
		if (!selectedScenarioId) {
			toaster.create({ title: 'Select a scenario', type: 'warning' })
			return
		}
		if (trials.length === 0) {
			toaster.create({
				title: 'Add at least one trial',
				type: 'warning',
			})
			return
		}

		const payload = buildPayload()

		try {
			if (isEdit) {
				await updateEval.mutateAsync({ id: evaluationId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createEval.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: 'Save failed',
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	const handleRun = async () => {
		if (!evaluationId) return
		try {
			await updateEval.mutateAsync({ id: evaluationId, ...buildPayload() })
			const { runId } = await startEval.mutateAsync({
				evaluationId: evaluationId,
			})
			toaster.create({ title: 'Evaluation started', type: 'info' })
			onViewRun(runId, name)
		} catch (err) {
			toaster.create({
				title: 'Failed to start',
				description: String(err),
				type: 'error',
			})
		}
	}

	const pastRuns = runs ?? []

	if (isEdit && isExistingLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: isPopout ? '' : 'Evaluations',
						onClick: () => dirtyGuard.guardNavigation(onBack),
					},
				]}
			>
				<Flex justify="center" py={8}>
					<Spinner />
				</Flex>
			</DrillInLayout>
		)
	}

	return (
		<DrillInLayout
			title={name || 'Untitled Evaluation'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Evaluations',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="evaluation"
					entityId={evaluationId}
					guardNavigation={dirtyGuard.guardNavigation}
					onAfterPopout={onBack}
				/>
			}
			actions={
				<HStack>
					<Button size="sm" variant="outline" onClick={() => setGenerateOpen(true)}>
						<FiZap />
						Generate
					</Button>
					<Button
						size="sm"
						variant="outline"
						onClick={handleSave}
						loading={createEval.isPending || updateEval.isPending}
					>
						<FiSave />
						Save
					</Button>
					{isEdit && (
						<Button
							size="sm"
							colorPalette="blue"
							variant="solid"
							onClick={handleRun}
							loading={startEval.isPending}
							disabled={!selectedScenarioId || trials.length === 0}
						>
							<FiPlay />
							Run ({trialBreakdown.totalTrials} trials)
						</Button>
					)}
				</HStack>
			}
		>
			<VStack gap={8} align="stretch">
				{/* Scenario selector */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Scenario Settings"
						description="Choose the task or survey this evaluation will run against."
					/>
					<Field.Root>
						<Field.Label>Scenario:</Field.Label>
						<EntityPickerCombobox
							emptyMessage="No scenarios found"
							items={scenarioItems}
							onSelect={(id) => {
								setSelectedScenarioId(id)
								// Clear crossings when scenario changes
								setVariantCrossings([])
							}}
							placeholder="Search scenarios..."
							renderItem={(item) => item.label}
							value={selectedScenarioId ? [selectedScenarioId] : []}
						/>
					</Field.Root>

					{/* Variant Crossings — shown when task has ≥2 variants */}
					{scenarioType === 'task' && taskVariants.length >= 2 && (
						<Field.Root>
							<Field.Label>Variant Crossings</Field.Label>
							<VariantCrossingEditor
								variants={taskVariants}
								primaryVariantLabel={selectedTask?.primaryVariantLabel}
								groups={variantCrossings}
								onChange={setVariantCrossings}
							/>
						</Field.Root>
					)}
				</VStack>

				{/* Resource Limits */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Resource Limits"
						description="Control concurrency and step budgets for trial execution."
					/>
					<HStack gap={4}>
						<Field.Root w="150px">
							<Field.Label>Concurrency:</Field.Label>
							<NumberInput.Root
								min={1}
								max={50}
								value={String(concurrency)}
								onValueChange={(e) => setConcurrency(e.valueAsNumber || 9)}
							>
								<NumberInput.Input />
								<NumberInput.Control>
									<NumberInput.IncrementTrigger />
									<NumberInput.DecrementTrigger />
								</NumberInput.Control>
							</NumberInput.Root>
						</Field.Root>
						<Field.Root w="150px">
							<Field.Label>Max steps:</Field.Label>
							<NumberInput.Root
								min={1}
								max={100}
								value={String(maxSteps)}
								onValueChange={(e) => setMaxSteps(e.valueAsNumber || 64)}
							>
								<NumberInput.Input />
								<NumberInput.Control>
									<NumberInput.IncrementTrigger />
									<NumberInput.DecrementTrigger />
								</NumberInput.Control>
							</NumberInput.Root>
						</Field.Root>
						<Field.Root w="180px">
							<Field.Label>Max simulated turns:</Field.Label>
							<NumberInput.Root
								min={1}
								max={50}
								value={String(maxSimulatedTurns)}
								onValueChange={(e) => setMaxSimulatedTurns(e.valueAsNumber || 5)}
							>
								<NumberInput.Input />
								<NumberInput.Control>
									<NumberInput.IncrementTrigger />
									<NumberInput.DecrementTrigger />
								</NumberInput.Control>
							</NumberInput.Root>
						</Field.Root>
					</HStack>
				</VStack>

				{/* Trials Matrix */}
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Trials Matrix"
						description="Define model configurations and repetitions to evaluate."
						actions={
							<HStack gap={1}>
								{selectedTrials.size > 0 && (
									<HStack gap={1}>
										<Text fontSize="xs" color="fg.muted">
											{selectedTrials.size} selected
										</Text>
										<Button
											size="2xs"
											variant="ghost"
											onClick={
												selectedTrials.size === trials.length ? deselectAllTrials : selectAllTrials
											}
										>
											{selectedTrials.size === trials.length ? 'Deselect all' : 'Select all'}
										</Button>
									</HStack>
								)}
								<Button size="xs" variant="outline" onClick={addTrial}>
									<FiPlus /> Add Trial
								</Button>
								<Menu.Root>
									<Menu.Trigger asChild>
										<IconButton size="xs" variant="ghost" aria-label="Trial actions">
											<FiMoreVertical />
										</IconButton>
									</Menu.Trigger>
									<Portal>
										<Menu.Positioner>
											<Menu.Content>
												<Menu.Item
													value="expand"
													onClick={() => setExpandOpen(true)}
													disabled={selectedTrials.size === 0}
												>
													Expand…
												</Menu.Item>
												<Menu.Item
													value="apply"
													onClick={() => setApplyToOthersOpen(true)}
													disabled={selectedTrials.size === 0}
												>
													Apply to others…
												</Menu.Item>
												<Menu.Item
													value="duplicate"
													onClick={duplicateSelectedTrials}
													disabled={selectedTrials.size === 0}
												>
													Duplicate selected
												</Menu.Item>
												<Menu.Item
													value="delete"
													onClick={deleteSelectedTrials}
													disabled={
														selectedTrials.size === 0 || trials.length - selectedTrials.size < 1
													}
													color="fg.error"
												>
													Delete selected
												</Menu.Item>
												<Menu.Separator />
												<Menu.Item value="templates" onClick={() => setTemplatesOpen(true)}>
													Apply template…
												</Menu.Item>
												<Menu.Item value="import" onClick={() => setImportOpen(true)}>
													Import from evaluation…
												</Menu.Item>
											</Menu.Content>
										</Menu.Positioner>
									</Portal>
								</Menu.Root>
							</HStack>
						}
					/>
					<TrialMatrixTable
						trials={trials}
						onRemove={removeTrial}
						onUpdate={updateTrial}
						scenarioType={scenarioType}
						selectedIndices={selectedTrials}
						onToggleSelect={toggleTrialSelect}
					/>
				</VStack>

				{/* Trial Breakdown */}
				{trials.length > 0 && selectedScenarioId && (
					<TrialBreakdownSection breakdown={trialBreakdown} />
				)}

				{/* Past runs */}
				{isEdit && pastRuns.length > 0 && (
					<PastRunsSection runs={pastRuns} onViewRun={(runId) => onViewRun(runId, name)} />
				)}
			</VStack>
			<UnsavedChangesDialog
				open={dirtyGuard.showDialog}
				onSave={dirtyGuard.handleDialogSave}
				onDiscard={dirtyGuard.handleDiscard}
				onCancel={dirtyGuard.handleCancel}
				saving={createEval.isPending || updateEval.isPending}
			/>
			<GenerateElementDialog
				open={generateOpen}
				onOpenChange={setGenerateOpen}
				entityType="evaluation"
				existingData={{
					label: name,
					scenarioId: selectedScenarioId,
					scenarioType,
					agentConfigs: trials,
					concurrency,
					maxSteps,
					maxSimulatedTurns,
				}}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.scenarioId) setSelectedScenarioId(result.scenarioId as string)
					if (result.concurrency) setConcurrency(result.concurrency as number)
					if (result.maxSteps) setMaxSteps(result.maxSteps as number)
					if (result.maxSimulatedTurns) setMaxSimulatedTurns(result.maxSimulatedTurns as number)
					if (result.agentConfigs && Array.isArray(result.agentConfigs)) {
						setTrials(
							(result.agentConfigs as Array<Record<string, unknown>>).map((c) => ({
								provider: (c.provider as TrialRow['provider']) ?? 'openai',
								model: (c.model as string) ?? '',
								temperature: (c.temperature as number) ?? 1,
								repetitions: (c.repetitions as number) ?? 1,
								reasoning: (c.reasoning as ReasoningEffort) ?? 'provider-default',
								toolSearch: (c.toolSearch as boolean) ?? false,
								toolSearchHints: (c.toolSearchHints as TrialRow['toolSearchHints']) ?? 'none',
								toolSearchMode: (c.toolSearchMode as TrialRow['toolSearchMode']) ?? 'keyword',
								subagentsEnabled: (c.subagentsEnabled as boolean) ?? false,
								subagentMaxDepth: (c.subagentMaxDepth as number) ?? 1,
							})),
						)
					}
				}}
			/>
			<ApplyToOthersDialog
				open={applyToOthersOpen}
				onOpenChange={setApplyToOthersOpen}
				selectedTrials={[...selectedTrials].sort((a, b) => a - b).map((i) => trials[i])}
				onApply={handleApplyToOthers}
			/>
			<ExpandTrialsDialog
				open={expandOpen}
				onOpenChange={setExpandOpen}
				selectedTrials={[...selectedTrials].sort((a, b) => a - b).map((i) => trials[i])}
				onExpand={handleExpand}
			/>
			<TrialTemplatesDialog
				open={templatesOpen}
				onOpenChange={setTemplatesOpen}
				onApplyTemplate={handleApplyTemplate}
			/>
			<ImportFromEvaluationDialog
				open={importOpen}
				onOpenChange={setImportOpen}
				evaluations={allEvaluations ?? []}
				currentEvaluationId={evaluationId}
				onImport={handleImportTrials}
			/>
		</DrillInLayout>
	)
}

// ---- Trial Breakdown Section ----

type VariantLineItem = {
	label: string
	type: 'primary' | 'variant' | 'crossed'
}
type ConfigLineItem = {
	label: string
	repetitions: number
	trial: TrialRow
}
interface TrialBreakdownInfo {
	agentConfigCount: number
	configLines: ConfigLineItem[]
	variantLines: VariantLineItem[]
	totalTrials: number
}

function TrialBreakdownSection({
	breakdown,
}: {
	breakdown: TrialBreakdownInfo
}) {
	const { agentConfigCount, configLines, variantLines, totalTrials } = breakdown

	const typeBadge = (type: VariantLineItem['type']) => {
		switch (type) {
			case 'primary':
				return (
					<Badge size="xs" variant="outline">
						primary
					</Badge>
				)
			case 'crossed':
				return (
					<Badge size="xs" colorPalette="purple" variant="outline">
						crossed
					</Badge>
				)
			case 'variant':
				return (
					<Badge size="xs" colorPalette="blue" variant="outline">
						variant
					</Badge>
				)
		}
	}

	// Build full expansion: config × variant
	interface ExpandedRow {
		variant: string
		variantType: VariantLineItem['type']
		config: string
		inference: string
		features: string
		repetitions: number
	}

	const expandedRows = useMemo(() => {
		const rows: ExpandedRow[] = []
		for (const cfg of configLines) {
			const inf = getInferenceParts(cfg.trial)
			const infStr = inf.reasoning ? `${inf.temp}, ${inf.reasoning}` : inf.temp
			const feat = getFeatureParts(cfg.trial)
			const featParts: string[] = []
			if (feat.search) featParts.push(feat.search)
			if (feat.subagents) featParts.push(feat.subagents)
			const featStr = featParts.length > 0 ? featParts.join(', ') : '—'
			for (const v of variantLines) {
				rows.push({
					variant: v.label,
					variantType: v.type,
					config: cfg.label,
					inference: infStr,
					features: featStr,
					repetitions: cfg.repetitions,
				})
			}
		}
		return rows
	}, [configLines, variantLines])

	return (
		<VStack gap={2} align="stretch">
			<SectionHeader
				title="Trial Summary"
				description={`${agentConfigCount} agent config${agentConfigCount !== 1 ? 's' : ''} × ${variantLines.length} scenario variant${variantLines.length !== 1 ? 's' : ''} = ${totalTrials} total trial${totalTrials !== 1 ? 's' : ''}`}
				collapsible
				defaultOpen={false}
			>
				<Table.ScrollArea>
					<Table.Root size="sm" variant="outline">
						<Table.Header>
							<Table.Row>
								<Table.ColumnHeader width="1">#</Table.ColumnHeader>
								<Table.ColumnHeader>Scenario Variant</Table.ColumnHeader>
								<Table.ColumnHeader width="1">Type</Table.ColumnHeader>
								<Table.ColumnHeader width="1" whiteSpace="nowrap">
									Agent Config
								</Table.ColumnHeader>
								<Table.ColumnHeader width="1" whiteSpace="nowrap">
									Inference
								</Table.ColumnHeader>
								<Table.ColumnHeader width="1">Features</Table.ColumnHeader>
								<Table.ColumnHeader width="1">Reps</Table.ColumnHeader>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{expandedRows.map((row, i) => (
								<Table.Row key={i}>
									<Table.Cell width="1" fontSize="xs" color="fg.muted" textAlign="end">
										{i + 1}
									</Table.Cell>
									<Table.Cell fontSize="sm">{row.variant}</Table.Cell>
									<Table.Cell width="1">{typeBadge(row.variantType)}</Table.Cell>
									<Table.Cell width="1" whiteSpace="nowrap" fontSize="xs" color="fg.muted">
										{row.config}
									</Table.Cell>
									<Table.Cell width="1" whiteSpace="nowrap" fontSize="xs" color="fg.muted">
										{row.inference}
									</Table.Cell>
									<Table.Cell width="1" whiteSpace="nowrap" fontSize="xs" color="fg.muted">
										{row.features}
									</Table.Cell>
									<Table.Cell width="1" fontSize="xs" color="fg.muted" textAlign="end">
										{row.repetitions}
									</Table.Cell>
								</Table.Row>
							))}
						</Table.Body>
					</Table.Root>
				</Table.ScrollArea>
			</SectionHeader>
		</VStack>
	)
}

// ---- Past Runs Section ----

function PastRunsSection({
	runs,
	onViewRun,
}: {
	runs: StoredRunRecord[]
	onViewRun: (runId: string) => void
}) {
	return (
		<VStack gap={2} align="stretch">
			<SectionHeader
				title="Results"
				description={`${runs.length} past run${runs.length !== 1 ? 's' : ''}`}
			/>
			<Table.ScrollArea>
				<Table.Root size="sm">
					<Table.Body>
						{runs.map((run) => (
							<ClickableRow key={run.id} onClick={() => onViewRun(run.id)}>
								<Table.Cell width="1" whiteSpace="nowrap">
									<RunStatusBadge status={run.status} />
								</Table.Cell>
								<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
									{run.completedTrials}/{run.totalTrials} trials
								</Table.Cell>
								<Table.Cell
									width="1"
									whiteSpace="nowrap"
									color="fg.muted"
									fontSize="xs"
									textAlign="end"
								>
									{new Date(run.createdAt).toLocaleString()}
								</Table.Cell>
							</ClickableRow>
						))}
					</Table.Body>
				</Table.Root>
			</Table.ScrollArea>
		</VStack>
	)
}

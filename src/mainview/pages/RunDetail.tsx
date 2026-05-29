import {
	Alert,
	Box,
	Button,
	Checkbox,
	Flex,
	HStack,
	IconButton,
	Link,
	Progress,
	Table,
	Tabs,
	TagsInput,
	Text,
	VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { FiSquare, FiStar } from 'react-icons/fi'
import type {
	AnalysisLens,
	RunProgress,
	StoredEvaluation,
	StoredSurvey,
	StoredTask,
} from '../../shared/rpc-types'
import ClickableRow from '../components/ClickableRow'
import DrillInLayout from '../components/DrillInLayout'
import EmptyState from '../components/EmptyState'
import LatencyBoxPlot from '../components/LatencyBoxPlot'
import PopoutButton from '../components/PopoutButton'
import ResultConfigDialog, { type ResultConfigDialogRow } from '../components/ResultConfigDialog'
import RunStatusBadge from '../components/RunStatusBadge'
import { SectionHeader } from '../components/SectionHeader'
import SurveyResultsPanel from '../components/SurveyResultsPanel'
import TaskGoalOutcomeChart from '../components/TaskGoalOutcomeChart'
import VariantComparisonChart from '../components/VariantComparisonChart'
import { toaster } from '../components/ui/toaster'
import {
	useCancelRun,
	useEvaluation,
	useRun,
	useRunResults,
	useRunStatus,
	useSurveyRunAnswers,
	useTaskRunAnalysis,
	useUpdateRun,
} from '../hooks/use-results'
import { useSurvey } from '../hooks/use-surveys'
import { useTask } from '../hooks/use-tasks'
import { TrialDetail } from './TrialDetail'

type ConfigDialogKey =
	| 'snapshot-evaluation'
	| 'snapshot-scenario'
	| 'current-evaluation'
	| 'current-scenario'
	| null

function buildEvaluationSummary(
	evaluation: StoredEvaluation | null | undefined,
): ResultConfigDialogRow[] {
	if (!evaluation) return []
	return [
		{ label: 'Label', value: evaluation.label },
		{
			label: 'Scenario',
			value: `${evaluation.scenarioType} (${evaluation.scenarioId})`,
		},
		{
			label: 'Agent configs',
			value: String(evaluation.agentConfigs.length),
		},
		{ label: 'Concurrency', value: String(evaluation.concurrency ?? 9) },
		{ label: 'Max steps', value: String(evaluation.maxSteps ?? 64) },
		{
			label: 'Max simulated turns',
			value: String(evaluation.maxSimulatedTurns ?? 5),
		},
		{
			label: 'Tool search mode',
			value: evaluation.toolSearchMode ?? 'keyword',
		},
	]
}

function buildScenarioSummary(
	scenarioType: 'task' | 'survey' | null | undefined,
	scenario: StoredTask | StoredSurvey | null | undefined,
): ResultConfigDialogRow[] {
	if (!scenario || !scenarioType) return []

	if (scenarioType === 'task') {
		const task = scenario as StoredTask
		return [
			{ label: 'Label', value: task.label },
			{
				label: 'Prompts',
				value: `${task.taskPrompts.length} prompt${task.taskPrompts.length > 1 ? 's' : ''}`,
			},
			{
				label: 'Goal conditions',
				value: String(task.goalConditions?.length ?? 0),
			},
			{ label: 'Tools', value: String(task.toolRefs?.length ?? 0) },
			{ label: 'Content', value: String(task.contentRefs?.length ?? 0) },
			{ label: 'Skills', value: String(task.skillRefs?.length ?? 0) },
		]
	}

	const survey = scenario as StoredSurvey
	return [
		{ label: 'Label', value: survey.label },
		{ label: 'Questions', value: String(survey.questions.length) },
		{ label: 'Ordering', value: survey.orderingStrategy },
		{
			label: 'System prompt',
			value: survey.systemPrompt ? 'Present' : 'None',
		},
	]
}

function getScenarioEntityLabel(scenarioType: 'task' | 'survey' | null | undefined) {
	if (scenarioType === 'task') return 'Task'
	if (scenarioType === 'survey') return 'Survey'
	return 'Scenario'
}

// ---- Eval Run Detail (drill-in view) ----

export function RunDetail({
	runId,
	breadcrumbs,
}: {
	runId: string
	breadcrumbs: { label: string; onClick: () => void }[]
}) {
	const { data: evalStatus, refetch: refetchStatus } = useRunStatus(runId)
	const { data: runRecord } = useRun(runId)
	const { data: runResults, isLoading, refetch: refetchResults } = useRunResults(runId)
	const cancelRun = useCancelRun()
	const updateRun = useUpdateRun()
	const [selectedTrialId, setSelectedTrialId] = useState<string | null>(null)
	const [liveProgress, setLiveProgress] = useState<RunProgress | null>(null)
	const [analysisLens, setAnalysisLens] = useState<AnalysisLens>('current')
	const [configDialog, setConfigDialog] = useState<ConfigDialogKey>(null)
	const [variantFilter, setVariantFilter] = useState<string>('primary')

	const results = runResults ?? []
	const filteredResults = useMemo(() => {
		if (variantFilter === 'primary') return results.filter((r) => !r.variantId)
		return results.filter((r) => r.variantId === variantFilter)
	}, [results, variantFilter])

	const status = evalStatus
	const progress = liveProgress ?? status
	const isActive = progress?.status === 'running' || progress?.status === 'pending'

	const { data: liveEvaluation } = useEvaluation(
		runRecord?.sourceEvaluationId ?? status?.sourceEvaluationId ?? null,
	)
	const liveScenarioType = liveEvaluation?.scenarioType ?? null
	const liveScenarioId = liveEvaluation?.scenarioId ?? null
	const { data: liveTask } = useTask(liveScenarioType === 'task' ? liveScenarioId : null)
	const { data: liveSurvey } = useSurvey(liveScenarioType === 'survey' ? liveScenarioId : null)
	const liveScenario = liveScenarioType === 'task' ? liveTask : liveSurvey

	const currentAvailable = useMemo(() => {
		if (!runRecord || !liveEvaluation) return false
		if (liveEvaluation.scenarioType !== runRecord.evaluationSnapshot.scenarioType) {
			return false
		}
		if (liveEvaluation.scenarioId !== runRecord.evaluationSnapshot.scenarioId) {
			return false
		}
		return liveEvaluation.scenarioType === 'task' ? !!liveTask : !!liveSurvey
	}, [liveEvaluation, liveSurvey, liveTask, runRecord])

	const currentUnavailableReason = useMemo(() => {
		if (!runRecord) return null
		if (!liveEvaluation) return 'Current evaluation no longer exists.'
		if (liveEvaluation.scenarioType !== runRecord.evaluationSnapshot.scenarioType) {
			return 'Current evaluation now references a different scenario type.'
		}
		if (liveEvaluation.scenarioId !== runRecord.evaluationSnapshot.scenarioId) {
			return 'Current evaluation now references a different scenario.'
		}
		if (liveEvaluation.scenarioType === 'task' && !liveTask) {
			return 'Current task no longer exists.'
		}
		if (liveEvaluation.scenarioType === 'survey' && !liveSurvey) {
			return 'Current survey no longer exists.'
		}
		return null
	}, [liveEvaluation, liveSurvey, liveTask, runRecord])

	const effectiveAnalysisLens: AnalysisLens = currentAvailable ? analysisLens : 'snapshot'

	// Scenario-specific data
	const isSurvey = status?.scenarioType === 'survey'
	const isTask = status?.scenarioType === 'task'
	const isRunComplete = !isActive && results.length > 0
	const { data: surveyAnswersResult, isLoading: extractionsLoading } = useSurveyRunAnswers(
		isSurvey && isRunComplete ? runId : null,
		effectiveAnalysisLens,
	)
	const { data: taskAnalysis, isLoading: taskAnalysisLoading } = useTaskRunAnalysis(
		isTask && isRunComplete ? runId : null,
		effectiveAnalysisLens,
	)

	// Auto-select first variant tab when analysis loads
	useEffect(() => {
		if (taskAnalysis?.variants && taskAnalysis.variants.length > 0) {
			setVariantFilter(taskAnalysis.variants[0].variantId)
		}
	}, [taskAnalysis])

	/** taskAnalysis scoped to active variant tab */
	const filteredTaskAnalysis = useMemo(() => {
		if (!taskAnalysis) return null
		if (variantFilter === 'primary') return taskAnalysis
		const variant = taskAnalysis.variants?.find((v) => v.variantId === variantFilter)
		if (!variant) return taskAnalysis
		return {
			...taskAnalysis,
			goalConditions: variant.goalConditions,
			trials: variant.trials,
			aggregates: variant.aggregates,
		}
	}, [taskAnalysis, variantFilter])

	const surveyExtractions = surveyAnswersResult?.extractions
	const analysisInfo = isSurvey
		? surveyAnswersResult?.analysis
		: isTask
			? taskAnalysis?.analysis
			: undefined

	const questionOptions = useMemo(() => {
		const items = surveyAnswersResult?.questionOptions ?? []
		if (items.length === 0) return undefined
		const map = new Map<string, string[]>()
		for (const item of items) {
			map.set(item.questionId, item.options)
		}
		return map.size > 0 ? map : undefined
	}, [surveyAnswersResult])

	const driftKinds = analysisInfo?.drift.kinds ?? []
	const hasEvaluationDrift = driftKinds.includes('evaluation-drift')
	const hasAnalysisDrift = driftKinds.includes('analysis-drift')
	const analysisDriftDetails = analysisInfo?.drift.detailsByKind['analysis-drift'] ?? []
	const evaluationDriftDetails = analysisInfo?.drift.detailsByKind['evaluation-drift'] ?? []
	const scenarioEntityLabel = getScenarioEntityLabel(
		runRecord?.scenario.type ?? liveScenarioType ?? status?.scenarioType,
	)

	// Listen for live progress and completion events
	useEffect(() => {
		const progressHandler = (e: Event) => {
			const detail = (e as CustomEvent).detail as RunProgress
			if (detail.runId === runId) {
				setLiveProgress(detail)
				refetchResults()
			}
		}
		const completeHandler = (e: Event) => {
			const detail = (e as CustomEvent).detail
			if (detail.runId === runId) {
				setLiveProgress(null)
				refetchStatus()
				refetchResults()
			}
		}
		window.addEventListener('eval-progress', progressHandler)
		window.addEventListener('eval-complete', completeHandler)
		return () => {
			window.removeEventListener('eval-progress', progressHandler)
			window.removeEventListener('eval-complete', completeHandler)
		}
	}, [runId, refetchResults, refetchStatus])

	const pageTitle =
		(status?.evaluationLabel ?? runRecord?.evaluationSnapshot.label)
			? `Results: ${status?.evaluationLabel ?? runRecord?.evaluationSnapshot.label}`
			: 'Result'

	const handleCancel = async () => {
		try {
			await cancelRun.mutateAsync(runId)
			setLiveProgress(null)
			refetchStatus()
			toaster.create({ title: 'Run cancelled', type: 'info' })
		} catch {
			// ignore
		}
	}

	// Drill into trial detail
	if (selectedTrialId) {
		const trialIndex = results.findIndex((r) => r.trialId === selectedTrialId)
		return (
			<TrialDetail
				runId={runId}
				trialId={selectedTrialId}
				trialLabel={`Trial ${trialIndex + 1}`}
				breadcrumbs={[
					...breadcrumbs,
					{ label: pageTitle, onClick: () => setSelectedTrialId(null) },
				]}
			/>
		)
	}

	const completedCount = progress?.completedRuns ?? results.length
	const totalCount = progress?.totalRuns ?? results.length
	const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

	return (
		<DrillInLayout
			title={pageTitle}
			breadcrumbs={breadcrumbs}
			subHeader={
				results.length > 0 ? (
					<HStack gap={4} flexWrap="wrap">
						<Text fontSize="sm" color="fg.muted">
							Evaluation (<Link onClick={() => setConfigDialog('current-evaluation')}>current</Link>
							{' / '}
							<Link
								onClick={() => setConfigDialog('snapshot-evaluation')}
								aria-disabled={!runRecord}
							>
								snapshot
							</Link>
							) - {scenarioEntityLabel} (
							<Link onClick={() => setConfigDialog('current-scenario')}>current</Link>
							{' / '}
							<Link onClick={() => setConfigDialog('snapshot-scenario')} aria-disabled={!runRecord}>
								snapshot
							</Link>
							)
						</Text>
						<TagsInput.Root
							size="sm"
							value={runRecord?.tags ?? []}
							onValueChange={(details) => updateRun.mutate({ runId, tags: details.value })}
							blurBehavior="add"
							delimiter=","
							validate={(e) => {
								const trimmed = e.inputValue.trim()
								return trimmed.length > 0 && !(runRecord?.tags ?? []).includes(trimmed)
							}}
						>
							<TagsInput.Control>
								<TagsInput.Items />
								<TagsInput.Input placeholder="Add tag…" fontSize="xs" />
							</TagsInput.Control>
						</TagsInput.Root>
					</HStack>
				) : undefined
			}
			inlineStatus={
				<HStack gap={2}>
					<PopoutButton
						entityType="result"
						entityId={runId}
						guardNavigation={(proceed) => proceed()}
						onAfterPopout={breadcrumbs[0]?.onClick ?? (() => {})}
					/>
					{status && (
						<>
							<RunStatusBadge status={status.status} fontSize="sm" />
							<Text fontSize="sm" color="fg.muted">
								{completedCount}/{totalCount} trials
							</Text>
						</>
					)}
				</HStack>
			}
			actions={
				<HStack gap={2}>
					<IconButton
						aria-label="Toggle favorite"
						variant="ghost"
						size="sm"
						onClick={() => updateRun.mutate({ runId, favorite: !runRecord?.favorite })}
					>
						<Box
							as={FiStar}
							fill={runRecord?.favorite ? 'currentColor' : 'none'}
							color={runRecord?.favorite ? 'yellow.400' : undefined}
						/>
					</IconButton>
					{isActive && (
						<Button
							size="sm"
							colorPalette="red"
							variant="outline"
							onClick={handleCancel}
							loading={cancelRun.isPending}
						>
							<Box as={FiSquare} />
							Cancel
						</Button>
					)}
				</HStack>
			}
		>
			<VStack gap={4} align="stretch">
				{!isActive && hasEvaluationDrift && (
					<Alert.Root status="warning" size="sm">
						<Alert.Indicator />
						<VStack align="start" gap={1}>
							<Alert.Title>Evaluation drift detected.</Alert.Title>
							{evaluationDriftDetails.map((detail) => (
								<Text key={detail} fontSize="sm">
									{detail}
								</Text>
							))}
						</VStack>
					</Alert.Root>
				)}

				{!isActive && (currentUnavailableReason || hasAnalysisDrift) && (
					<Alert.Root status="info" size="sm">
						<Alert.Indicator />
						<Flex align="start" justify="space-between" gap={4} width="full">
							<VStack align="start" gap={1} flex="1">
								<Alert.Title>{currentUnavailableReason ?? 'Analysis drift detected.'}</Alert.Title>
								{analysisDriftDetails.map((detail) => (
									<Text key={detail} fontSize="sm">
										{detail}
									</Text>
								))}
							</VStack>
							{hasAnalysisDrift && (
								<Checkbox.Root
									checked={effectiveAnalysisLens === 'current'}
									onCheckedChange={(event) =>
										setAnalysisLens(event.checked ? 'current' : 'snapshot')
									}
									alignSelf="flex-start"
									flexShrink={0}
								>
									<Checkbox.HiddenInput />
									<Checkbox.Control>
										<Checkbox.Indicator />
									</Checkbox.Control>
									<Checkbox.Label>Use current</Checkbox.Label>
								</Checkbox.Root>
							)}
						</Flex>
					</Alert.Root>
				)}

				{/* Live progress bar */}
				{isActive && (
					<Box>
						<Flex justify="space-between" mb={1}>
							<Text fontSize="sm" color="fg.subtle">
								{progress?.currentModel ? `Running: ${progress.currentModel}` : 'Starting...'}
							</Text>
							<Text fontSize="sm" color="fg.subtle">
								{completedCount}/{totalCount}
							</Text>
						</Flex>
						<Progress.Root
							value={progressPct}
							size="sm"
							colorPalette="blue"
							striped
							animated
							borderRadius="md"
						>
							<Progress.Track>
								<Progress.Range />
							</Progress.Track>
						</Progress.Root>
					</Box>
				)}

				{isLoading && !isActive && (
					<Text color="fg.muted" fontSize="sm">
						Loading results...
					</Text>
				)}

				{results.length > 0 && (
					<>
						{/* Variant Comparison */}
						{isTask &&
							isRunComplete &&
							taskAnalysis?.variants &&
							taskAnalysis.variants.length > 1 && (
								<SectionHeader
									title="Variant Comparison"
									description="Performance comparison across scenario variants."
									collapsible
									defaultOpen
								>
									<VariantComparisonChart variants={taskAnalysis.variants} />
								</SectionHeader>
							)}

						{/* Variant filter tabs */}
						{isTask && taskAnalysis?.variants && taskAnalysis.variants.length > 1 && (
							<Tabs.Root
								value={variantFilter}
								onValueChange={(e) => setVariantFilter(e.value)}
								variant="line"
								size="sm"
							>
								<Tabs.List>
									{taskAnalysis.variants.map((v) => (
										<Tabs.Trigger key={v.variantId} value={v.variantId}>
											{v.variantLabel}
										</Tabs.Trigger>
									))}
								</Tabs.List>
							</Tabs.Root>
						)}

						{/* Trials */}
						<SectionHeader
							title="Trials"
							description={`${filteredResults.length} trial${filteredResults.length !== 1 ? 's' : ''}`}
							collapsible
							defaultOpen={isActive}
							open={isActive ? true : undefined}
						>
							<Table.ScrollArea mt={2}>
								<Table.Root size="sm">
									<Table.Header>
										<Table.Row>
											<Table.ColumnHeader>Config</Table.ColumnHeader>
											<Table.ColumnHeader width="1">Status</Table.ColumnHeader>
											<Table.ColumnHeader width="1">Tokens</Table.ColumnHeader>
											<Table.ColumnHeader width="1">Latency</Table.ColumnHeader>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{filteredResults.map((r) => (
											<ClickableRow key={r.trialId} onClick={() => setSelectedTrialId(r.trialId)}>
												<Table.Cell fontFamily="mono" fontSize="xs">
													{r.agentConfigId}
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap">
													<RunStatusBadge status={r.status} error={r.error} />
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
													{r.totalTokens}
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
													{(r.latencyMs / 1000).toFixed(1)}s
												</Table.Cell>
											</ClickableRow>
										))}
									</Table.Body>
								</Table.Root>
							</Table.ScrollArea>
						</SectionHeader>

						{/* Survey-specific results */}
						{isSurvey && isRunComplete && (
							<SectionHeader
								title="Survey"
								description="Extracted survey responses and distributions."
								collapsible
								defaultOpen
							>
								<SurveyResultsPanel
									extractions={surveyExtractions}
									isLoading={extractionsLoading}
									questionOptions={questionOptions}
								/>
							</SectionHeader>
						)}

						{/* General visualizations */}
						{!isActive && (
							<>
								{isTask && isRunComplete && taskAnalysisLoading && (
									<Text color="fg.muted" fontSize="sm">
										Loading task goal analysis...
									</Text>
								)}

								{isTask && isRunComplete && filteredTaskAnalysis?.hasGoal && (
									<SectionHeader
										title="Task Analysis"
										description="Goal outcome breakdown across trials."
										collapsible
										defaultOpen
									>
										<TaskGoalOutcomeChart analysis={filteredTaskAnalysis} />
									</SectionHeader>
								)}

								<SectionHeader
									title="General"
									description="Latency and token usage distributions."
									collapsible
									defaultOpen
								>
									<LatencyBoxPlot results={filteredResults} />
								</SectionHeader>
							</>
						)}
					</>
				)}

				{!isLoading && !isActive && results.length === 0 && (
					<EmptyState message="No results for this run." />
				)}

				{isActive && results.length === 0 && (
					<Flex justify="center" py={12}>
						<Text color="fg.muted" fontSize="sm">
							Waiting for first trial to complete...
						</Text>
					</Flex>
				)}

				<ResultConfigDialog
					open={configDialog === 'snapshot-evaluation'}
					onOpenChange={(open) => setConfigDialog(open ? 'snapshot-evaluation' : null)}
					title="Snapshot Evaluation"
					badgeLabel="Stored snapshot"
					summary={buildEvaluationSummary(runRecord?.evaluationSnapshot)}
					data={runRecord?.evaluationSnapshot}
					emptyMessage="No stored evaluation snapshot is available."
				/>
				<ResultConfigDialog
					open={configDialog === 'snapshot-scenario'}
					onOpenChange={(open) => setConfigDialog(open ? 'snapshot-scenario' : null)}
					title={`Snapshot ${runRecord?.scenario.type === 'task' ? 'Task' : 'Survey'}`}
					badgeLabel="Stored snapshot"
					summary={buildScenarioSummary(runRecord?.scenario.type, runRecord?.scenarioSnapshot)}
					data={runRecord?.scenarioSnapshot}
					emptyMessage="No stored scenario snapshot is available."
				/>
				<ResultConfigDialog
					open={configDialog === 'current-evaluation'}
					onOpenChange={(open) => setConfigDialog(open ? 'current-evaluation' : null)}
					title="Current Evaluation"
					badgeLabel="Live entity"
					summary={buildEvaluationSummary(liveEvaluation)}
					data={liveEvaluation}
					emptyMessage="Current evaluation is not available."
				/>
				<ResultConfigDialog
					open={configDialog === 'current-scenario'}
					onOpenChange={(open) => setConfigDialog(open ? 'current-scenario' : null)}
					title={`Current ${liveScenarioType === 'task' ? 'Task' : liveScenarioType === 'survey' ? 'Survey' : 'Scenario'}`}
					badgeLabel="Live entity"
					summary={buildScenarioSummary(
						(liveScenarioType ?? null) as 'task' | 'survey' | null,
						(liveScenario ?? null) as StoredTask | StoredSurvey | null,
					)}
					data={liveScenario}
					emptyMessage="Current scenario is not available."
				/>
			</VStack>
		</DrillInLayout>
	)
}

import { Badge, Button, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { FiPlay, FiPlus } from 'react-icons/fi'
import type { StoredEvaluation } from '../../shared/rpc-types'
import BulkDeleteButton from '../components/BulkDeleteButton'
import ClickableRow from '../components/ClickableRow'
import CollectionPageSection from '../components/CollectionPageSection'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'
import ListPageLayout from '../components/ListPageLayout'
import { RowPopoutButton } from '../components/PopoutButton'
import { toaster } from '../components/ui/toaster'
import { type SortOption, useListFilter } from '../hooks/use-list-filter'
import { useMultiSelect } from '../hooks/use-multi-select'
import { useBulkDeleteEvaluations, useDeleteEvaluation, useEvaluations } from '../hooks/use-results'
import EvaluationEditor from './EvaluationEditor'
import { RunDetail } from './RunDetail'

const evalSearch = (item: StoredEvaluation, q: string) =>
	item.label.toLowerCase().includes(q) || item.scenarioType.toLowerCase().includes(q)

const evalSorts: SortOption<StoredEvaluation>[] = [
	{
		label: 'Name',
		value: 'name',
		fn: (a, b) => a.label.localeCompare(b.label),
	},
	{
		label: 'Newest',
		value: 'newest',
		fn: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
	},
	{
		label: 'Oldest',
		value: 'oldest',
		fn: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
	},
]

// ---- Types ----

function scenarioTypeLabel(t: string) {
	return t === 'survey' ? 'Survey' : 'Task'
}

// ---- Views ----

type View =
	| { type: 'list' }
	| { type: 'new-evaluation' }
	| { type: 'edit-evaluation'; id: string }
	| {
			type: 'view-run'
			runId: string
			evaluationId: string
			evaluationLabel: string
	  }

// ---- Component ----

export default function EvaluationsPage() {
	const [view, setView] = useState<View>({ type: 'list' })

	if (view.type === 'new-evaluation') {
		return (
			<EvaluationEditor
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-evaluation', id })}
				onViewRun={(runId) =>
					setView({
						type: 'view-run',
						runId,
						evaluationId: '',
						evaluationLabel: '',
					})
				}
			/>
		)
	}

	if (view.type === 'edit-evaluation') {
		return (
			<EvaluationEditor
				evaluationId={view.id}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-evaluation', id })}
				onViewRun={(runId, evalName) =>
					setView({
						type: 'view-run',
						runId,
						evaluationId: view.id,
						evaluationLabel: evalName,
					})
				}
			/>
		)
	}

	if (view.type === 'view-run') {
		return (
			<RunDetail
				runId={view.runId}
				breadcrumbs={[
					{ label: 'Evaluations', onClick: () => setView({ type: 'list' }) },
					...(view.evaluationId
						? [
								{
									label: view.evaluationLabel || 'Evaluation',
									onClick: () => setView({ type: 'edit-evaluation', id: view.evaluationId }),
								},
							]
						: []),
				]}
			/>
		)
	}

	return <EvaluationList onNavigate={setView} />
}

// ---- Evaluation List ----

function EvaluationList({ onNavigate }: { onNavigate: (view: View) => void }) {
	const { data: evaluations, isLoading: isEvalsLoading } = useEvaluations()
	const deleteEvaluation = useDeleteEvaluation()
	const bulkDeleteEvaluations = useBulkDeleteEvaluations()

	const evals = evaluations ?? []

	const evalFilter = useListFilter({
		items: evals,
		searchFn: evalSearch,
		sortOptions: evalSorts,
		defaultSort: 'newest',
	})

	const evalSelect = useMultiSelect(evalFilter.filteredItems)

	return (
		<ListPageLayout
			title="Evaluations"
			description="Run scenarios against agent samples and collect data."
			actions={
				<Button
					size="xs"
					variant="solid"
					colorPalette="blue"
					onClick={() => onNavigate({ type: 'new-evaluation' })}
				>
					<FiPlus />
					New
				</Button>
			}
		>
			<CollectionPageSection
				title="Evaluations"
				count={evals.length}
				emptyIcon={FiPlay}
				emptyMessage="No evaluations yet. Create one to get started."
				filterPlaceholder="Filter evaluations..."
				filterText={evalFilter.filterText}
				onFilterChange={evalFilter.setFilterText}
				sortValue={evalFilter.sortValue}
				onSortChange={evalFilter.setSortValue}
				sortOptions={evalFilter.sortOptions}
				resultCount={evalFilter.filteredItems.length}
				totalCount={evals.length}
				isLoading={isEvalsLoading}
				collapsible={false}
				multiSelect={evalSelect}
				bulkActions={
					<BulkDeleteButton
						count={evalSelect.selectedCount}
						entityLabel="evaluations"
						onDelete={() =>
							bulkDeleteEvaluations.mutate(evalSelect.selectedIds, {
								onSuccess: () => evalSelect.reset(),
							})
						}
						isLoading={bulkDeleteEvaluations.isPending}
					/>
				}
			>
				{evalFilter.filteredItems.map((evaluation) => (
					<ClickableRow
						key={evaluation.id}
						onClick={() =>
							onNavigate({
								type: 'edit-evaluation',
								id: evaluation.id,
							})
						}
						selected={evalSelect.isSelected(evaluation.id)}
						onSelectToggle={() => evalSelect.toggle(evaluation.id)}
					>
						<Table.Cell fontWeight="medium">{evaluation.label}</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap">
							<Badge colorPalette="gray" variant="subtle" fontSize="xs">
								{scenarioTypeLabel(evaluation.scenarioType)}
							</Badge>
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
							{evaluation.agentConfigs.length} configs
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
							{new Date(evaluation.updatedAt).toLocaleDateString()}
						</Table.Cell>
						<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
							<ConfirmDeleteButton
								onDelete={() =>
									deleteEvaluation.mutate(evaluation.id, {
										onSuccess: () =>
											toaster.create({
												title: 'Deleted',
												type: 'info',
											}),
									})
								}
							/>
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap">
							<RowPopoutButton entityType="evaluation" entityId={evaluation.id} />
						</Table.Cell>
					</ClickableRow>
				))}
			</CollectionPageSection>
		</ListPageLayout>
	)
}

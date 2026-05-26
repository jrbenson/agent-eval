import { Badge, Table } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { FiBarChart2 } from 'react-icons/fi'
import type { StoredRunRecord } from '../../shared/rpc-types'
import ClickableRow from '../components/ClickableRow'
import CollectionPageSection from '../components/CollectionPageSection'
import ListPageLayout from '../components/ListPageLayout'
import { RowPopoutButton } from '../components/PopoutButton'
import RunStatusBadge from '../components/RunStatusBadge'
import { type SortOption, useListFilter } from '../hooks/use-list-filter'
import { useEvaluations, useRuns } from '../hooks/use-results'
import { RunDetail } from './RunDetail'

const runSorts: SortOption<StoredRunRecord>[] = [
	{
		label: 'Newest',
		value: 'newest',
		fn: (a, b) => b.createdAt.localeCompare(a.createdAt),
	},
	{
		label: 'Oldest',
		value: 'oldest',
		fn: (a, b) => a.createdAt.localeCompare(b.createdAt),
	},
	{
		label: 'Status',
		value: 'status',
		fn: (a, b) => a.status.localeCompare(b.status),
	},
]

// ---- Views ----

type View = { type: 'list' } | { type: 'view-run'; runId: string }

// ---- Component ----

export default function ResultsPage({ initialRunId }: { initialRunId?: string } = {}) {
	const [view, setView] = useState<View>(
		initialRunId ? { type: 'view-run', runId: initialRunId } : { type: 'list' },
	)
	const { data: runsData, isLoading } = useRuns()
	const { data: evaluationsData } = useEvaluations()

	const runs = runsData ?? []
	const evaluations = evaluationsData ?? []

	const evaluationNameMap = new Map(evaluations.map((e) => [e.id, e.label]))

	const runSearch = useMemo(() => {
		return (item: StoredRunRecord, q: string) => {
			const evalName = evaluationNameMap.get(item.sourceEvaluationId) ?? ''
			return (
				evalName.toLowerCase().includes(q) ||
				item.status.toLowerCase().includes(q) ||
				item.scenario.type.toLowerCase().includes(q)
			)
		}
	}, [evaluationNameMap])

	const runFilter = useListFilter({
		items: runs,
		searchFn: runSearch,
		sortOptions: runSorts,
		defaultSort: 'newest',
	})

	if (view.type === 'view-run') {
		return (
			<RunDetail
				runId={view.runId}
				breadcrumbs={[{ label: 'Results', onClick: () => setView({ type: 'list' }) }]}
			/>
		)
	}

	return (
		<ListPageLayout title="Results" description="All evaluation runs and their results.">
			<CollectionPageSection
				title="Results"
				count={runs.length}
				emptyIcon={FiBarChart2}
				emptyMessage="No results yet. Run an evaluation to see results here."
				filterPlaceholder="Filter results..."
				filterText={runFilter.filterText}
				onFilterChange={runFilter.setFilterText}
				sortValue={runFilter.sortValue}
				onSortChange={runFilter.setSortValue}
				sortOptions={runFilter.sortOptions}
				resultCount={runFilter.filteredItems.length}
				totalCount={runs.length}
				isLoading={isLoading}
				collapsible={false}
				scrollable
			>
				{runFilter.filteredItems.map((run) => {
					const evalName = evaluationNameMap.get(run.sourceEvaluationId) ?? 'Unknown Evaluation'
					return (
						<ClickableRow key={run.id} onClick={() => setView({ type: 'view-run', runId: run.id })}>
							<Table.Cell width="1" whiteSpace="nowrap">
								<Badge variant="subtle" colorPalette="gray">
									{run.scenario.type === 'survey' ? 'Survey' : 'Task'}
								</Badge>
							</Table.Cell>
							<Table.Cell fontWeight="medium">{evalName}</Table.Cell>
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
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="result" entityId={run.id} />
							</Table.Cell>
						</ClickableRow>
					)
				})}
			</CollectionPageSection>
		</ListPageLayout>
	)
}

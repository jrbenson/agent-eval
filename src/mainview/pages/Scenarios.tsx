import { Button, Table } from '@chakra-ui/react'
import { useState } from 'react'
import { FiActivity, FiClipboard, FiPlus } from 'react-icons/fi'
import type { StoredSurvey, StoredTask } from '../../shared/rpc-types'
import BulkDeleteButton from '../components/BulkDeleteButton'
import ClickableRow from '../components/ClickableRow'
import CollectionPageSection from '../components/CollectionPageSection'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'
import ListPageLayout from '../components/ListPageLayout'
import { RowPopoutButton } from '../components/PopoutButton'
import { type SortOption, useListFilter } from '../hooks/use-list-filter'
import { useMultiSelect } from '../hooks/use-multi-select'
import { useBulkDeleteSurveys, useDeleteSurvey, useSurveys } from '../hooks/use-surveys'
import { useBulkDeleteTasks, useDeleteTask, useTasks } from '../hooks/use-tasks'
import SurveyBuilder from './SurveyBuilder'
import TaskBuilder from './TaskBuilder'

const surveySearch = (item: StoredSurvey, q: string) => item.label.toLowerCase().includes(q)

const surveySorts: SortOption<StoredSurvey>[] = [
	{
		label: 'Name',
		value: 'name',
		fn: (a, b) => a.label.localeCompare(b.label),
	},
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
]

const taskSearch = (item: StoredTask, q: string) => item.label.toLowerCase().includes(q)

const taskSorts: SortOption<StoredTask>[] = [
	{
		label: 'Name',
		value: 'name',
		fn: (a, b) => a.label.localeCompare(b.label),
	},
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
]

type View =
	| { type: 'list' }
	| { type: 'new-survey' }
	| { type: 'edit-survey'; id: string }
	| { type: 'new-task' }
	| { type: 'edit-task'; id: string }

export default function ScenariosPage() {
	const [view, setView] = useState<View>({ type: 'list' })
	const { data: surveys, isLoading: isSurveysLoading } = useSurveys()
	const { data: tasks, isLoading: isTasksLoading } = useTasks()
	const deleteSurvey = useDeleteSurvey()
	const deleteTask = useDeleteTask()
	const surveyList = surveys ?? []
	const taskList = tasks ?? []

	const surveyFilter = useListFilter({
		items: surveyList,
		searchFn: surveySearch,
		sortOptions: surveySorts,
		defaultSort: 'name',
	})
	const taskFilter = useListFilter({
		items: taskList,
		searchFn: taskSearch,
		sortOptions: taskSorts,
		defaultSort: 'name',
	})

	const surveySelect = useMultiSelect(surveyFilter.filteredItems)
	const taskSelect = useMultiSelect(taskFilter.filteredItems)
	const bulkDeleteSurveys = useBulkDeleteSurveys()
	const bulkDeleteTasks = useBulkDeleteTasks()

	if (view.type === 'new-survey' || view.type === 'edit-survey') {
		return (
			<SurveyBuilder
				surveyId={view.type === 'edit-survey' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-survey', id })}
			/>
		)
	}

	if (view.type === 'new-task' || view.type === 'edit-task') {
		return (
			<TaskBuilder
				taskId={view.type === 'edit-task' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-task', id })}
			/>
		)
	}

	return (
		<ListPageLayout title="Scenarios" description="Define surveys and tasks for agent evaluation.">
			<CollectionPageSection
				title="Surveys"
				count={surveyList.length}
				emptyIcon={FiClipboard}
				emptyMessage="No surveys yet."
				filterPlaceholder="Filter surveys..."
				filterText={surveyFilter.filterText}
				headerRight={
					<Button
						size="xs"
						colorPalette="blue"
						variant="solid"
						onClick={() => setView({ type: 'new-survey' })}
					>
						<FiPlus /> New
					</Button>
				}
				isLoading={isSurveysLoading}
				onFilterChange={surveyFilter.setFilterText}
				onSortChange={surveyFilter.setSortValue}
				resultCount={surveyFilter.filteredItems.length}
				sortOptions={surveyFilter.sortOptions}
				sortValue={surveyFilter.sortValue}
				totalCount={surveyList.length}
				multiSelect={surveySelect}
				bulkActions={
					<BulkDeleteButton
						count={surveySelect.selectedCount}
						entityLabel="surveys"
						onDelete={() =>
							bulkDeleteSurveys.mutate(surveySelect.selectedIds, {
								onSuccess: () => surveySelect.reset(),
							})
						}
						isLoading={bulkDeleteSurveys.isPending}
					/>
				}
			>
				{surveyFilter.filteredItems.map((s) => (
					<ClickableRow
						key={s.id}
						onClick={() => setView({ type: 'edit-survey', id: s.id })}
						selected={surveySelect.isSelected(s.id)}
						onSelectToggle={() => surveySelect.toggle(s.id)}
					>
						<Table.Cell fontWeight="medium">{s.label}</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
							{s.questions?.length ?? '?'} questions
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
							{new Date(s.createdAt).toLocaleDateString()}
						</Table.Cell>
						<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
							<ConfirmDeleteButton onDelete={() => deleteSurvey.mutate(s.id)} />
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap">
							<RowPopoutButton entityType="survey" entityId={s.id} />
						</Table.Cell>
					</ClickableRow>
				))}
			</CollectionPageSection>

			<CollectionPageSection
				title="Tasks"
				count={taskList.length}
				emptyIcon={FiActivity}
				emptyMessage="No tasks yet."
				filterPlaceholder="Filter tasks..."
				filterText={taskFilter.filterText}
				headerRight={
					<Button
						size="xs"
						colorPalette="blue"
						variant="solid"
						onClick={() => setView({ type: 'new-task' })}
					>
						<FiPlus /> New
					</Button>
				}
				isLoading={isTasksLoading}
				onFilterChange={taskFilter.setFilterText}
				onSortChange={taskFilter.setSortValue}
				resultCount={taskFilter.filteredItems.length}
				sortOptions={taskFilter.sortOptions}
				sortValue={taskFilter.sortValue}
				totalCount={taskList.length}
				multiSelect={taskSelect}
				bulkActions={
					<BulkDeleteButton
						count={taskSelect.selectedCount}
						entityLabel="tasks"
						onDelete={() =>
							bulkDeleteTasks.mutate(taskSelect.selectedIds, {
								onSuccess: () => taskSelect.reset(),
							})
						}
						isLoading={bulkDeleteTasks.isPending}
					/>
				}
			>
				{taskFilter.filteredItems.map((s) => (
					<ClickableRow
						key={s.id}
						onClick={() => setView({ type: 'edit-task', id: s.id })}
						selected={taskSelect.isSelected(s.id)}
						onSelectToggle={() => taskSelect.toggle(s.id)}
					>
						<Table.Cell fontWeight="medium">{s.label}</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
							{(() => {
								const count = s.goalConditions?.length ?? 0
								if (count === 0) return 'No goal'
								return count === 1 ? '1 goal' : `${count} goals`
							})()}
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
							{new Date(s.createdAt).toLocaleDateString()}
						</Table.Cell>
						<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
							<ConfirmDeleteButton onDelete={() => deleteTask.mutate(s.id)} />
						</Table.Cell>
						<Table.Cell width="1" whiteSpace="nowrap">
							<RowPopoutButton entityType="task" entityId={s.id} />
						</Table.Cell>
					</ClickableRow>
				))}
			</CollectionPageSection>
		</ListPageLayout>
	)
}

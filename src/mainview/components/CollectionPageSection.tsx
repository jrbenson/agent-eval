import { HStack, Table, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'
import type { IconType } from 'react-icons'
import type { SortOption } from '../hooks/use-list-filter'
import type { MultiSelectState } from '../hooks/use-multi-select'
import CollapsibleSection from './CollapsibleSection'
import EmptyState from './EmptyState'
import ListToolbar from './ListToolbar'
import LoadingBlock from './LoadingBlock'

interface CollectionPageSectionProps<T> {
	children: ReactNode
	count: number
	emptyIcon?: IconType
	emptyMessage: string
	filterPlaceholder: string
	filterText: string
	headerRight?: ReactNode
	isLoading: boolean
	onFilterChange: (value: string) => void
	onSortChange: (value: string) => void
	resultCount: number
	sortOptions: SortOption<T>[]
	sortValue: string
	title: string
	totalCount: number
	/** Wrap in a CollapsibleSection (default true) */
	collapsible?: boolean
	/** Wrap children in Table.ScrollArea (default false) */
	scrollable?: boolean
	/** Multi-select state from useMultiSelect. Enables bulk actions when provided. */
	multiSelect?: Pick<
		MultiSelectState,
		'hasSelection' | 'selectedCount' | 'isAllSelected' | 'selectAll' | 'deselectAll'
	>
	/** Rendered in header when multiSelect.hasSelection is true, before headerRight. */
	bulkActions?: ReactNode
}

export default function CollectionPageSection<T>({
	children,
	count,
	emptyIcon,
	emptyMessage,
	filterPlaceholder,
	filterText,
	headerRight,
	isLoading,
	onFilterChange,
	onSortChange,
	resultCount,
	sortOptions,
	sortValue,
	title,
	totalCount,
	collapsible = true,
	scrollable = false,
	multiSelect,
	bulkActions,
}: CollectionPageSectionProps<T>) {
	const resolvedHeaderRight = multiSelect?.hasSelection ? (
		<HStack gap={2}>
			{bulkActions}
			{headerRight}
		</HStack>
	) : (
		headerRight
	)

	const tableContent = <Table.Body>{children}</Table.Body>

	const content = (
		<>
			{isLoading && <LoadingBlock py={2} />}
			{!isLoading && totalCount === 0 && <EmptyState icon={emptyIcon} message={emptyMessage} />}
			{totalCount > 0 && (
				<>
					<ListToolbar
						filterText={filterText}
						onFilterChange={onFilterChange}
						sortValue={sortValue}
						onSortChange={onSortChange}
						sortOptions={sortOptions}
						placeholder={filterPlaceholder}
						resultCount={resultCount}
						totalCount={totalCount}
						selectAllToggle={
							multiSelect
								? {
										isAllSelected: multiSelect.isAllSelected,
										selectAll: multiSelect.selectAll,
										deselectAll: multiSelect.deselectAll,
									}
								: undefined
						}
					/>
					{scrollable ? (
						<Table.ScrollArea>
							<Table.Root
								size="sm"
								css={{ '& td': { borderBottomWidth: '0 !important', py: '0' } }}
							>
								{tableContent}
							</Table.Root>
						</Table.ScrollArea>
					) : (
						<Table.Root size="sm" css={{ '& td': { borderBottomWidth: '0 !important', py: '0' } }}>
							{tableContent}
						</Table.Root>
					)}
				</>
			)}
		</>
	)

	if (collapsible) {
		return (
			<CollapsibleSection title={title} count={count} headerRight={resolvedHeaderRight}>
				{content}
			</CollapsibleSection>
		)
	}

	return (
		<VStack gap={3} align="stretch">
			{content}
		</VStack>
	)
}

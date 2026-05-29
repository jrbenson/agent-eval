import { Button, FileUpload, HStack, IconButton, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FiCopy, FiDownload, FiLayers, FiPackage, FiPlus, FiTool } from 'react-icons/fi'
import type { ImportToolResult } from '../../shared/rpc-types'
import type { StoredToolDefinition } from '../../shared/schemas/tool-definition.schema'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import BatchGenerateDialog from '../components/BatchGenerateDialog'
import BulkDeleteButton from '../components/BulkDeleteButton'
import ClickableRow from '../components/ClickableRow'
import CollectionPageSection from '../components/CollectionPageSection'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'
import ImportConfirmDialog from '../components/ImportConfirmDialog'
import ListPageLayout from '../components/ListPageLayout'
import { RowPopoutButton } from '../components/PopoutButton'
import PresetPickerDialog from '../components/PresetPickerDialog'
import { toaster } from '../components/ui/toaster'
import { type SortOption, useListFilter } from '../hooks/use-list-filter'
import { useMultiSelect } from '../hooks/use-multi-select'
import {
	useAnalyzeToolImport,
	useBulkDeleteToolDefinitions,
	useCommitToolImport,
	useCopyPresetTool,
	useDeleteToolDefinition,
	useDuplicateToolDefinition,
	usePresetTools,
	useToolDefinitions,
} from '../hooks/use-tool-definitions'
import {
	useBulkDeleteToolSets,
	useCopyPresetToolSet,
	useDeleteToolSet,
	usePresetToolSets,
	useToolSets,
} from '../hooks/use-tool-sets'
import ToolDefinitionBuilder from './ToolDefinitionBuilder'
import ToolSetBuilder from './ToolSetBuilder'

const toolSetSearch = (item: StoredToolSet, q: string) => item.label.toLowerCase().includes(q)

const toolSetSorts: SortOption<StoredToolSet>[] = [
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

const toolDefSearch = (item: StoredToolDefinition, q: string) =>
	(item.label ?? '').toLowerCase().includes(q) ||
	item.name.toLowerCase().includes(q) ||
	(item.keywords ?? []).some((k) => k.toLowerCase().includes(q))

const toolDefSorts: SortOption<StoredToolDefinition>[] = [
	{
		label: 'Name',
		value: 'name',
		fn: (a, b) => (a.label ?? a.name).localeCompare(b.label ?? b.name),
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
	| { type: 'new-tool' }
	| { type: 'edit-tool'; id: string }
	| { type: 'new-set' }
	| { type: 'edit-set'; id: string }

export default function ToolsPage() {
	const [view, setView] = useState<View>({ type: 'list' })
	const { data: toolDefs, isLoading: isToolDefsLoading } = useToolDefinitions()
	const { data: toolSets, isLoading: isToolSetsLoading } = useToolSets()
	const deleteToolDef = useDeleteToolDefinition()
	const duplicateToolDef = useDuplicateToolDefinition()
	const deleteToolSet = useDeleteToolSet()

	// Presets
	const { data: presetTools } = usePresetTools()
	const { data: presetToolSets } = usePresetToolSets()
	const copyPresetTool = useCopyPresetTool()
	const copyPresetToolSet = useCopyPresetToolSet()
	const [presetOpen, setPresetOpen] = useState(false)
	const [copyingPresetId, setCopyingPresetId] = useState<string | null>(null)

	// Import
	const analyzeImport = useAnalyzeToolImport()
	const commitImport = useCommitToolImport()
	const [importResults, setImportResults] = useState<ImportToolResult[] | null>(null)
	const [importJson, setImportJson] = useState<string | null>(null)
	const [importToolSetLabel, setImportToolSetLabel] = useState('')
	const [importGenerateMocks, setImportGenerateMocks] = useState(false)
	const [importUploadKey, setImportUploadKey] = useState(0)
	const [batchGenToolIds, setBatchGenToolIds] = useState<string[] | null>(null)
	const toolDefList = toolDefs ?? []
	const toolSetList = toolSets ?? []

	const toolSetFilter = useListFilter({
		items: toolSetList,
		searchFn: toolSetSearch,
		sortOptions: toolSetSorts,
		defaultSort: 'name',
	})
	const toolDefFilter = useListFilter({
		items: toolDefList,
		searchFn: toolDefSearch,
		sortOptions: toolDefSorts,
		defaultSort: 'name',
	})

	const toolSetSelect = useMultiSelect(toolSetFilter.filteredItems)
	const toolDefSelect = useMultiSelect(toolDefFilter.filteredItems)
	const bulkDeleteToolDefs = useBulkDeleteToolDefinitions()
	const bulkDeleteToolSets = useBulkDeleteToolSets()

	const handleCopyPresetTool = (presetId: string) => {
		setCopyingPresetId(presetId)
		copyPresetTool.mutate(presetId, {
			onSuccess: ({ id }) => {
				setCopyingPresetId(null)
				setPresetOpen(false)
				setView({ type: 'edit-tool', id })
				toaster.create({ type: 'success', description: 'Preset tool added' })
			},
			onError: () => setCopyingPresetId(null),
		})
	}

	const handleCopyPresetToolSet = (presetId: string) => {
		setCopyingPresetId(presetId)
		copyPresetToolSet.mutate(presetId, {
			onSuccess: ({ id }) => {
				setCopyingPresetId(null)
				setPresetOpen(false)
				setView({ type: 'edit-set', id })
				toaster.create({
					type: 'success',
					description: 'Preset tool set added',
				})
			},
			onError: () => setCopyingPresetId(null),
		})
	}

	const handleImportFile = async (file: File) => {
		const text = await file.text()
		setImportJson(text)
		setImportUploadKey((key) => key + 1)
		analyzeImport.mutate(text, {
			onSuccess: (results) => setImportResults(results),
			onError: (err) =>
				toaster.create({
					type: 'error',
					description: `Import failed: ${err.message}`,
				}),
		})
	}

	const handleCommitImport = () => {
		if (!importJson) return
		const shouldGenerateMocks = importGenerateMocks
		commitImport.mutate(
			{ json: importJson, toolSetLabel: importToolSetLabel || undefined },
			{
				onSuccess: ({ toolIds }) => {
					setImportResults(null)
					setImportJson(null)
					setImportToolSetLabel('')
					setImportGenerateMocks(false)
					toaster.create({
						type: 'success',
						description: `Imported ${toolIds.length} tool${toolIds.length !== 1 ? 's' : ''}`,
					})
					if (shouldGenerateMocks && toolIds.length > 0) {
						setBatchGenToolIds(toolIds)
					}
				},
			},
		)
	}

	if (view.type === 'new-tool' || view.type === 'edit-tool') {
		return (
			<ToolDefinitionBuilder
				toolDefId={view.type === 'edit-tool' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-tool', id })}
			/>
		)
	}

	if (view.type === 'new-set' || view.type === 'edit-set') {
		return (
			<ToolSetBuilder
				toolSetId={view.type === 'edit-set' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-set', id })}
			/>
		)
	}

	return (
		<ListPageLayout
			title="Tools"
			description="Define tool definitions and tool sets for agent evaluation."
			actions={
				<HStack gap={2}>
					<FileUpload.Root
						key={importUploadKey}
						accept={['application/json']}
						maxFiles={1}
						onFileChange={(details) => {
							const file = details.acceptedFiles[0]
							if (file) {
								void handleImportFile(file)
							}
						}}
					>
						<FileUpload.HiddenInput />
						<FileUpload.Trigger asChild>
							<Button size="xs" variant="outline">
								<FiDownload /> Import
							</Button>
						</FileUpload.Trigger>
					</FileUpload.Root>
					<Button size="xs" variant="outline" onClick={() => setPresetOpen(true)}>
						<FiPackage /> Apply Preset
					</Button>
				</HStack>
			}
		>
			<VStack gap={10} align="stretch">
				<CollectionPageSection
					title="Tool Sets"
					count={toolSetList.length}
					emptyIcon={FiLayers}
					emptyMessage="No tool sets yet."
					filterPlaceholder="Filter tool sets..."
					filterText={toolSetFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-set' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isToolSetsLoading}
					onFilterChange={toolSetFilter.setFilterText}
					onSortChange={toolSetFilter.setSortValue}
					resultCount={toolSetFilter.filteredItems.length}
					sortOptions={toolSetFilter.sortOptions}
					sortValue={toolSetFilter.sortValue}
					totalCount={toolSetList.length}
					multiSelect={toolSetSelect}
					bulkActions={
						<BulkDeleteButton
							count={toolSetSelect.selectedCount}
							entityLabel="tool sets"
							onDelete={() =>
								bulkDeleteToolSets.mutate(toolSetSelect.selectedIds, {
									onSuccess: () => toolSetSelect.reset(),
								})
							}
							isLoading={bulkDeleteToolSets.isPending}
						/>
					}
				>
					{toolSetFilter.filteredItems.map((s) => (
						<ClickableRow
							key={s.id}
							onClick={() => setView({ type: 'edit-set', id: s.id })}
							selected={toolSetSelect.isSelected(s.id)}
							onSelectToggle={() => toolSetSelect.toggle(s.id)}
						>
							<Table.Cell fontWeight="medium">{s.label}</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
								{s.toolRefs.length} tools
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
								{new Date(s.createdAt).toLocaleDateString()}
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<ConfirmDeleteButton onDelete={() => deleteToolSet.mutate(s.id)} />
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="toolSet" entityId={s.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>

				<CollectionPageSection
					title="Tool Definitions"
					count={toolDefList.length}
					emptyIcon={FiTool}
					emptyMessage="No tool definitions yet."
					filterPlaceholder="Filter tool definitions..."
					filterText={toolDefFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-tool' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isToolDefsLoading}
					onFilterChange={toolDefFilter.setFilterText}
					onSortChange={toolDefFilter.setSortValue}
					resultCount={toolDefFilter.filteredItems.length}
					sortOptions={toolDefFilter.sortOptions}
					sortValue={toolDefFilter.sortValue}
					totalCount={toolDefList.length}
					multiSelect={toolDefSelect}
					bulkActions={
						<BulkDeleteButton
							count={toolDefSelect.selectedCount}
							entityLabel="tools"
							onDelete={() =>
								bulkDeleteToolDefs.mutate(toolDefSelect.selectedIds, {
									onSuccess: () => toolDefSelect.reset(),
								})
							}
							isLoading={bulkDeleteToolDefs.isPending}
						/>
					}
				>
					{toolDefFilter.filteredItems.map((t) => (
						<ClickableRow
							key={t.id}
							onClick={() => setView({ type: 'edit-tool', id: t.id })}
							selected={toolDefSelect.isSelected(t.id)}
							onSelectToggle={() => toolDefSelect.toggle(t.id)}
						>
							<Table.Cell>
								<Text fontWeight="medium" display="inline">
									{t.label ?? t.name}
								</Text>
								<Text fontFamily="mono" fontSize="xs" color="fg.muted" display="inline" ml={2}>
									{t.name}
								</Text>
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
								{new Date(t.createdAt).toLocaleDateString()}
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<HStack gap={0}>
									<IconButton
										aria-label="Duplicate"
										size="xs"
										variant="ghost"
										onClick={(e) => {
											e.stopPropagation()
											duplicateToolDef.mutate(t.id)
										}}
									>
										<FiCopy />
									</IconButton>
									<ConfirmDeleteButton onDelete={() => deleteToolDef.mutate(t.id)} />
								</HStack>
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="toolDefinition" entityId={t.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>
			</VStack>

			<PresetPickerDialog
				open={presetOpen}
				onOpenChange={setPresetOpen}
				presetTools={presetTools ?? []}
				presetToolSets={presetToolSets ?? []}
				onCopyTool={handleCopyPresetTool}
				onCopyToolSet={handleCopyPresetToolSet}
				copyingId={copyingPresetId}
			/>

			<ImportConfirmDialog
				open={importResults !== null}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						setImportResults(null)
						setImportJson(null)
						setImportToolSetLabel('')
						setImportGenerateMocks(false)
					}
				}}
				results={importResults ?? []}
				toolSets={toolSets ?? []}
				toolSetLabel={importToolSetLabel}
				onToolSetLabelChange={setImportToolSetLabel}
				generateMocks={importGenerateMocks}
				onGenerateMocksChange={setImportGenerateMocks}
				onConfirm={handleCommitImport}
				onCancel={() => {
					setImportResults(null)
					setImportJson(null)
					setImportToolSetLabel('')
					setImportGenerateMocks(false)
				}}
				committing={commitImport.isPending}
			/>

			<BatchGenerateDialog
				open={batchGenToolIds !== null}
				onOpenChange={(isOpen) => {
					if (!isOpen) setBatchGenToolIds(null)
				}}
				toolIds={batchGenToolIds ?? []}
				toolNames={Object.fromEntries((toolDefs ?? []).map((t) => [t.id, t.name]))}
			/>
		</ListPageLayout>
	)
}

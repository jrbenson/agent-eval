import { Button, Table, Text, VStack } from '@chakra-ui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { FiPackage, FiPlus } from 'react-icons/fi'
import type { StoredContentSet } from '../../shared/schemas/content-set.schema'
import type { StoredContent } from '../../shared/schemas/content.schema'
import type { StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import type { StoredSkill } from '../../shared/schemas/skill.schema'
import BulkDeleteButton from '../components/BulkDeleteButton'
import ClickableRow from '../components/ClickableRow'
import CollectionPageSection from '../components/CollectionPageSection'
import ConfirmDeleteButton from '../components/ConfirmDeleteButton'
import ContextPresetPickerDialog from '../components/ContextPresetPickerDialog'
import ListPageLayout from '../components/ListPageLayout'
import { RowPopoutButton } from '../components/PopoutButton'
import { toaster } from '../components/ui/toaster'
import {
	useBulkDeleteContentSets,
	useContentSets,
	useDeleteContentSet,
} from '../hooks/use-content-sets'
import { useBulkDeleteContent, useContents, useDeleteContent } from '../hooks/use-contents'
import { type SortOption, useListFilter } from '../hooks/use-list-filter'
import { useMultiSelect } from '../hooks/use-multi-select'
import { useBulkDeleteSkillSets, useDeleteSkillSet, useSkillSets } from '../hooks/use-skill-sets'
import { useBulkDeleteSkills, useDeleteSkill, useSkills } from '../hooks/use-skills'
import { rpcRequest } from '../rpc'
import ContentBuilder from './ContentBuilder'
import ContentSetBuilder from './ContentSetBuilder'
import SkillBuilder from './SkillBuilder'
import SkillSetBuilder from './SkillSetBuilder'

const contentSetSearch = (item: StoredContentSet, q: string) => item.label.toLowerCase().includes(q)
const contentSetSorts: SortOption<StoredContentSet>[] = [
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

const contentSearch = (item: StoredContent, q: string) =>
	item.label.toLowerCase().includes(q) || item.name.toLowerCase().includes(q)
const contentSorts: SortOption<StoredContent>[] = [
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

const skillSetSearch = (item: StoredSkillSet, q: string) => item.label.toLowerCase().includes(q)
const skillSetSorts: SortOption<StoredSkillSet>[] = [
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

const skillSearch = (item: StoredSkill, q: string) =>
	item.label.toLowerCase().includes(q) ||
	item.name.toLowerCase().includes(q) ||
	item.description.toLowerCase().includes(q)
const skillSorts: SortOption<StoredSkill>[] = [
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
	| { type: 'new-content' }
	| { type: 'edit-content'; id: string }
	| { type: 'new-content-set' }
	| { type: 'edit-content-set'; id: string }
	| { type: 'new-skill' }
	| { type: 'edit-skill'; id: string }
	| { type: 'new-skill-set' }
	| { type: 'edit-skill-set'; id: string }

export default function ContextPage() {
	const [view, setView] = useState<View>({ type: 'list' })
	const { data: contents, isLoading: isContentsLoading } = useContents()
	const { data: contentSets, isLoading: isContentSetsLoading } = useContentSets()
	const { data: skills, isLoading: isSkillsLoading } = useSkills()
	const { data: skillSets, isLoading: isSkillSetsLoading } = useSkillSets()
	const deleteContent = useDeleteContent()
	const deleteContentSet = useDeleteContentSet()
	const deleteSkill = useDeleteSkill()
	const deleteSkillSet = useDeleteSkillSet()

	// Preset state
	const [presetOpen, setPresetOpen] = useState(false)
	const [copyingId, setCopyingId] = useState<string | null>(null)
	const queryClient = useQueryClient()
	const { data: presetContents = [] } = useQuery({
		queryKey: ['presetContents'],
		queryFn: () => rpcRequest.listPresetContents({}),
	})
	const { data: presetContentSets = [] } = useQuery({
		queryKey: ['presetContentSets'],
		queryFn: () => rpcRequest.listPresetContentSets({}),
	})
	const { data: presetSkills = [] } = useQuery({
		queryKey: ['presetSkills'],
		queryFn: () => rpcRequest.listPresetSkills({}),
	})
	const { data: presetSkillSets = [] } = useQuery({
		queryKey: ['presetSkillSets'],
		queryFn: () => rpcRequest.listPresetSkillSets({}),
	})

	const handlePresetCopy = (item: {
		type: 'content' | 'contentSet' | 'skill' | 'skillSet'
		preset: { presetId: string }
	}) => {
		const { type, preset } = item
		setCopyingId(preset.presetId)
		const rpcCall =
			type === 'content'
				? rpcRequest.copyPresetContent({ presetId: preset.presetId })
				: type === 'contentSet'
					? rpcRequest.copyPresetContentSet({ presetId: preset.presetId })
					: type === 'skill'
						? rpcRequest.copyPresetSkill({ presetId: preset.presetId })
						: rpcRequest.copyPresetSkillSet({ presetId: preset.presetId })

		rpcCall
			.then(() => {
				queryClient.invalidateQueries({ queryKey: ['contents'] })
				queryClient.invalidateQueries({ queryKey: ['contentSets'] })
				queryClient.invalidateQueries({ queryKey: ['skills'] })
				queryClient.invalidateQueries({ queryKey: ['skillSets'] })
				setPresetOpen(false)
				toaster.create({ type: 'success', description: 'Preset applied' })
			})
			.catch((err: Error) => {
				toaster.create({ type: 'error', description: err.message })
			})
			.finally(() => setCopyingId(null))
	}

	const contentList = contents ?? []
	const contentSetList = contentSets ?? []
	const skillList = skills ?? []
	const skillSetList = skillSets ?? []

	const contentSetFilter = useListFilter({
		items: contentSetList,
		searchFn: contentSetSearch,
		sortOptions: contentSetSorts,
		defaultSort: 'name',
	})
	const contentFilter = useListFilter({
		items: contentList,
		searchFn: contentSearch,
		sortOptions: contentSorts,
		defaultSort: 'name',
	})
	const skillSetFilter = useListFilter({
		items: skillSetList,
		searchFn: skillSetSearch,
		sortOptions: skillSetSorts,
		defaultSort: 'name',
	})
	const skillFilter = useListFilter({
		items: skillList,
		searchFn: skillSearch,
		sortOptions: skillSorts,
		defaultSort: 'name',
	})

	const contentSetSelect = useMultiSelect(contentSetFilter.filteredItems)
	const contentSelect = useMultiSelect(contentFilter.filteredItems)
	const skillSetSelect = useMultiSelect(skillSetFilter.filteredItems)
	const skillSelect = useMultiSelect(skillFilter.filteredItems)
	const bulkDeleteContentSets = useBulkDeleteContentSets()
	const bulkDeleteContent = useBulkDeleteContent()
	const bulkDeleteSkillSets = useBulkDeleteSkillSets()
	const bulkDeleteSkills = useBulkDeleteSkills()

	// Content builders
	if (view.type === 'new-content' || view.type === 'edit-content') {
		return (
			<ContentBuilder
				contentId={view.type === 'edit-content' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-content', id })}
			/>
		)
	}
	if (view.type === 'new-content-set' || view.type === 'edit-content-set') {
		return (
			<ContentSetBuilder
				contentSetId={view.type === 'edit-content-set' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-content-set', id })}
			/>
		)
	}

	// Skill builders
	if (view.type === 'new-skill' || view.type === 'edit-skill') {
		return (
			<SkillBuilder
				skillId={view.type === 'edit-skill' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-skill', id })}
			/>
		)
	}
	if (view.type === 'new-skill-set' || view.type === 'edit-skill-set') {
		return (
			<SkillSetBuilder
				skillSetId={view.type === 'edit-skill-set' ? view.id : undefined}
				onBack={() => setView({ type: 'list' })}
				onCreated={(id) => setView({ type: 'edit-skill-set', id })}
			/>
		)
	}

	return (
		<ListPageLayout
			title="Context"
			description="Define reusable content for persistence and skills for progressive instruction disclosure."
			actions={
				<Button size="xs" variant="outline" onClick={() => setPresetOpen(true)}>
					<FiPackage /> Apply Preset
				</Button>
			}
		>
			<VStack gap={8} align="stretch">
				<CollectionPageSection
					title="Content Sets"
					count={contentSetList.length}
					emptyMessage="No content sets yet."
					filterPlaceholder="Filter content sets..."
					filterText={contentSetFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-content-set' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isContentSetsLoading}
					onFilterChange={contentSetFilter.setFilterText}
					onSortChange={contentSetFilter.setSortValue}
					resultCount={contentSetFilter.filteredItems.length}
					sortOptions={contentSetFilter.sortOptions}
					sortValue={contentSetFilter.sortValue}
					totalCount={contentSetList.length}
					multiSelect={contentSetSelect}
					bulkActions={
						<BulkDeleteButton
							count={contentSetSelect.selectedCount}
							entityLabel="content sets"
							onDelete={() =>
								bulkDeleteContentSets.mutate(contentSetSelect.selectedIds, {
									onSuccess: () => contentSetSelect.reset(),
								})
							}
							isLoading={bulkDeleteContentSets.isPending}
						/>
					}
				>
					{contentSetFilter.filteredItems.map((cs) => (
						<ClickableRow
							key={cs.id}
							onClick={() => setView({ type: 'edit-content-set', id: cs.id })}
							selected={contentSetSelect.isSelected(cs.id)}
							onSelectToggle={() => contentSetSelect.toggle(cs.id)}
						>
							<Table.Cell fontWeight="medium">{cs.label}</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
								{cs.contentRefs.length} item
								{cs.contentRefs.length !== 1 ? 's' : ''}
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<ConfirmDeleteButton onDelete={() => deleteContentSet.mutate(cs.id)} />
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="contentSet" entityId={cs.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>

				<CollectionPageSection
					title="Content"
					count={contentList.length}
					emptyMessage="No content yet."
					filterPlaceholder="Filter content..."
					filterText={contentFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-content' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isContentsLoading}
					onFilterChange={contentFilter.setFilterText}
					onSortChange={contentFilter.setSortValue}
					resultCount={contentFilter.filteredItems.length}
					sortOptions={contentFilter.sortOptions}
					sortValue={contentFilter.sortValue}
					totalCount={contentList.length}
					multiSelect={contentSelect}
					bulkActions={
						<BulkDeleteButton
							count={contentSelect.selectedCount}
							entityLabel="content items"
							onDelete={() =>
								bulkDeleteContent.mutate(contentSelect.selectedIds, {
									onSuccess: () => contentSelect.reset(),
								})
							}
							isLoading={bulkDeleteContent.isPending}
						/>
					}
				>
					{contentFilter.filteredItems.map((c) => (
						<ClickableRow
							key={c.id}
							onClick={() => setView({ type: 'edit-content', id: c.id })}
							selected={contentSelect.isSelected(c.id)}
							onSelectToggle={() => contentSelect.toggle(c.id)}
						>
							<Table.Cell>
								<Text fontWeight="medium" display="inline">
									{c.label}
								</Text>
								<Text fontFamily="mono" fontSize="xs" color="fg.muted" display="inline" ml={2}>
									{c.name}
								</Text>
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<ConfirmDeleteButton onDelete={() => deleteContent.mutate(c.id)} />
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="content" entityId={c.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>

				<CollectionPageSection
					title="Skill Sets"
					count={skillSetList.length}
					emptyMessage="No skill sets yet."
					filterPlaceholder="Filter skill sets..."
					filterText={skillSetFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-skill-set' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isSkillSetsLoading}
					onFilterChange={skillSetFilter.setFilterText}
					onSortChange={skillSetFilter.setSortValue}
					resultCount={skillSetFilter.filteredItems.length}
					sortOptions={skillSetFilter.sortOptions}
					sortValue={skillSetFilter.sortValue}
					totalCount={skillSetList.length}
					multiSelect={skillSetSelect}
					bulkActions={
						<BulkDeleteButton
							count={skillSetSelect.selectedCount}
							entityLabel="skill sets"
							onDelete={() =>
								bulkDeleteSkillSets.mutate(skillSetSelect.selectedIds, {
									onSuccess: () => skillSetSelect.reset(),
								})
							}
							isLoading={bulkDeleteSkillSets.isPending}
						/>
					}
				>
					{skillSetFilter.filteredItems.map((ss) => (
						<ClickableRow
							key={ss.id}
							onClick={() => setView({ type: 'edit-skill-set', id: ss.id })}
							selected={skillSetSelect.isSelected(ss.id)}
							onSelectToggle={() => skillSetSelect.toggle(ss.id)}
						>
							<Table.Cell fontWeight="medium">{ss.label}</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="sm">
								{ss.skillRefs.length} skill
								{ss.skillRefs.length !== 1 ? 's' : ''}
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<ConfirmDeleteButton onDelete={() => deleteSkillSet.mutate(ss.id)} />
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="skillSet" entityId={ss.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>

				<CollectionPageSection
					title="Skills"
					count={skillList.length}
					emptyMessage="No skills yet."
					filterPlaceholder="Filter skills..."
					filterText={skillFilter.filterText}
					headerRight={
						<Button
							size="xs"
							colorPalette="blue"
							variant="solid"
							onClick={() => setView({ type: 'new-skill' })}
						>
							<FiPlus /> New
						</Button>
					}
					isLoading={isSkillsLoading}
					onFilterChange={skillFilter.setFilterText}
					onSortChange={skillFilter.setSortValue}
					resultCount={skillFilter.filteredItems.length}
					sortOptions={skillFilter.sortOptions}
					sortValue={skillFilter.sortValue}
					totalCount={skillList.length}
					multiSelect={skillSelect}
					bulkActions={
						<BulkDeleteButton
							count={skillSelect.selectedCount}
							entityLabel="skills"
							onDelete={() =>
								bulkDeleteSkills.mutate(skillSelect.selectedIds, {
									onSuccess: () => skillSelect.reset(),
								})
							}
							isLoading={bulkDeleteSkills.isPending}
						/>
					}
				>
					{skillFilter.filteredItems.map((s) => (
						<ClickableRow
							key={s.id}
							onClick={() => setView({ type: 'edit-skill', id: s.id })}
							selected={skillSelect.isSelected(s.id)}
							onSelectToggle={() => skillSelect.toggle(s.id)}
						>
							<Table.Cell>
								<Text fontWeight="medium" display="inline">
									{s.label}
								</Text>
								<Text fontFamily="mono" fontSize="xs" color="fg.muted" display="inline" ml={2}>
									{s.name}
								</Text>
							</Table.Cell>
							<Table.Cell textAlign="end" width="1" whiteSpace="nowrap">
								<ConfirmDeleteButton onDelete={() => deleteSkill.mutate(s.id)} />
							</Table.Cell>
							<Table.Cell width="1" whiteSpace="nowrap">
								<RowPopoutButton entityType="skill" entityId={s.id} />
							</Table.Cell>
						</ClickableRow>
					))}
				</CollectionPageSection>
			</VStack>

			<ContextPresetPickerDialog
				open={presetOpen}
				onOpenChange={setPresetOpen}
				presetContents={presetContents}
				presetContentSets={presetContentSets}
				presetSkills={presetSkills}
				presetSkillSets={presetSkillSets}
				onCopy={handlePresetCopy}
				copyingId={copyingId}
			/>
		</ListPageLayout>
	)
}

import {
	Button,
	Card,
	Field,
	Flex,
	HStack,
	IconButton,
	Spinner,
	Text,
	Textarea,
	VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiChevronDown, FiChevronUp, FiPlus, FiSave, FiTrash2, FiZap } from 'react-icons/fi'
import type { StoredContentSet } from '../../shared/schemas/content-set.schema'
import { ContentPickerCombobox } from '../components/ContentPickerCombobox'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import {
	useContentSet,
	useContentSets,
	useCreateContentSet,
	useUpdateContentSet,
} from '../hooks/use-content-sets'
import { useContents } from '../hooks/use-contents'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import ContentBuilder from './ContentBuilder'

interface ContentRef {
	contentId: string
}

interface ContentSetBuilderProps {
	contentSetId?: string
	onBack: () => void
	onCreated?: (id: string) => void
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
	const result = [...arr]
	const [item] = result.splice(from, 1)
	result.splice(to, 0, item)
	return result
}

export default function ContentSetBuilder({
	contentSetId,
	onBack,
	onCreated,
}: ContentSetBuilderProps) {
	const isPopout = useIsPopout()
	const isEditing = !!contentSetId
	const { data: existing, isLoading } = useContentSet(contentSetId ?? null)
	const createContentSet = useCreateContentSet()
	const updateContentSet = useUpdateContentSet()
	const { data: allContentSets } = useContentSets()
	const { data: allContents } = useContents()

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [contentRefs, setContentRefs] = useState<ContentRef[]>([])
	const [creatingContent, setCreatingContent] = useState(false)
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((s: StoredContentSet) => {
		setName(s.label)
		setDescription(s.description ?? '')
		setContentRefs(s.contentRefs ?? [])
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allContentSets,
		entityType: 'Content Set',
		onPopulate,
		setName,
	})

	const stateJson = useMemo(
		() => JSON.stringify({ name, description, contentRefs }),
		[name, description, contentRefs],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const addContentRef = (contentId: string) => {
		if (contentRefs.some((r) => r.contentId === contentId)) return
		setContentRefs([...contentRefs, { contentId }])
	}

	const removeContentRef = (idx: number) => {
		setContentRefs(contentRefs.filter((_, i) => i !== idx))
	}

	const handleSave = async () => {
		if (!name.trim()) {
			toaster.create({ title: 'Name is required', type: 'warning' })
			return
		}

		const payload = {
			label: name,
			description: description || undefined,
			contentRefs,
		}

		try {
			if (isEditing && contentSetId) {
				await updateContentSet.mutateAsync({ id: contentSetId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createContentSet.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: `Failed to ${isEditing ? 'update' : 'create'} content set`,
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	if (creatingContent) {
		return (
			<ContentBuilder
				onBack={() => setCreatingContent(false)}
				onCreated={(newId) => {
					addContentRef(newId)
					setCreatingContent(false)
				}}
				breadcrumbLabel={name || 'Content Set'}
			/>
		)
	}

	if (isEditing && isLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: isPopout ? '' : 'Context',
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

	const isSaving = createContentSet.isPending || updateContentSet.isPending

	return (
		<DrillInLayout
			title={name || 'Untitled Content Set'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Context',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="contentSet"
					entityId={contentSetId}
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
		>
			<VStack gap={10} align="stretch">
				<Field.Root>
					<Field.Label>Description:</Field.Label>
					<Textarea
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="What this content set is for..."
						rows={2}
					/>
				</Field.Root>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Content Items"
						description="Content definitions included in this set."
						actions={
							<Button size="xs" variant="outline" onClick={() => setCreatingContent(true)}>
								<FiPlus /> New Content
							</Button>
						}
					/>
					<VStack gap={2} align="stretch">
						{contentRefs.map((ref, idx) => {
							const c = (allContents ?? []).find((d) => d.id === ref.contentId)
							return (
								<Card.Root key={ref.contentId} variant="outline" size="sm">
									<Card.Body py={2} px={3}>
										<Flex justify="space-between" align="center">
											<VStack gap={0} align="start">
												<Text fontSize="sm" fontWeight="medium">
													{c?.label ?? 'Unknown content'}
												</Text>
												<Text fontSize="xs" color="fg.muted" fontFamily="mono">
													{c?.name ?? ref.contentId}
												</Text>
											</VStack>
											<HStack gap={1}>
												<IconButton
													aria-label="Move up"
													size="xs"
													variant="ghost"
													onClick={() => setContentRefs(moveItem(contentRefs, idx, idx - 1))}
													disabled={idx === 0}
												>
													<FiChevronUp />
												</IconButton>
												<IconButton
													aria-label="Move down"
													size="xs"
													variant="ghost"
													onClick={() => setContentRefs(moveItem(contentRefs, idx, idx + 1))}
													disabled={idx === contentRefs.length - 1}
												>
													<FiChevronDown />
												</IconButton>
												<IconButton
													aria-label="Remove"
													size="xs"
													variant="ghost"
													colorPalette="red"
													onClick={() => removeContentRef(idx)}
												>
													<FiTrash2 />
												</IconButton>
											</HStack>
										</Flex>
									</Card.Body>
								</Card.Root>
							)
						})}

						<ContentPickerCombobox
							contents={allContents ?? []}
							excludeIds={new Set(contentRefs.map((r) => r.contentId))}
							onSelect={addContentRef}
							placeholder="Attach content..."
						/>
					</VStack>
				</VStack>
			</VStack>

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
				entityType="contentSet"
				existingData={{ label: name, description, contentRefs }}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.description) setDescription(result.description as string)
					if (result.contentRefs && Array.isArray(result.contentRefs)) {
						setContentRefs(result.contentRefs as typeof contentRefs)
					}
				}}
			/>
		</DrillInLayout>
	)
}

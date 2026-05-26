import {
	Button,
	Card,
	Field,
	Flex,
	HStack,
	IconButton,
	Spinner,
	TagsInput,
	Text,
	Textarea,
	VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	FiChevronDown,
	FiChevronUp,
	FiPlus,
	FiSave,
	FiShare,
	FiTrash2,
	FiZap,
} from 'react-icons/fi'
import type { StoredToolSet } from '../../shared/schemas/tool-set.schema'
import DrillInLayout from '../components/DrillInLayout'
import ExportDialog from '../components/ExportDialog'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import { ToolPickerCombobox } from '../components/ToolPickerCombobox'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import SchemaEditor, {
	type EditorNode,
	editorNodesToJsonSchema,
	jsonSchemaToEditorNodes,
} from '../components/schema-editor/SchemaEditor'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import { useToolDefinitions } from '../hooks/use-tool-definitions'
import {
	useCreateToolSet,
	useExportToolSet,
	useToolSet,
	useToolSets,
	useUpdateToolSet,
} from '../hooks/use-tool-sets'
import ToolDefinitionBuilder from './ToolDefinitionBuilder'

interface ToolSetRef {
	toolDefinitionId: string
}

interface ToolSetBuilderProps {
	toolSetId?: string
	onBack: () => void
	onCreated?: (id: string) => void
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
	const result = [...arr]
	const [item] = result.splice(from, 1)
	result.splice(to, 0, item)
	return result
}

export default function ToolSetBuilder({ toolSetId, onBack, onCreated }: ToolSetBuilderProps) {
	const isPopout = useIsPopout()
	const isEditing = !!toolSetId
	const { data: existing, isLoading } = useToolSet(toolSetId ?? null)
	const createToolSet = useCreateToolSet()
	const updateToolSet = useUpdateToolSet()
	const exportToolSet = useExportToolSet()
	const { data: allToolSets } = useToolSets()
	const { data: allToolDefs } = useToolDefinitions()

	const [exportOpen, setExportOpen] = useState(false)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [keywords, setKeywords] = useState<string[]>([])
	const [toolRefs, setToolRefs] = useState<ToolSetRef[]>([])
	const [schemaNodes, setSchemaNodes] = useState<EditorNode[]>([])
	const [creatingTool, setCreatingTool] = useState(false)
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((s: StoredToolSet) => {
		setName(s.label)
		setDescription(s.description ?? '')
		setKeywords(s.keywords ?? [])
		setToolRefs(s.toolRefs ?? [])
		if (s.schemaAdditions?.properties) {
			setSchemaNodes(jsonSchemaToEditorNodes(s.schemaAdditions))
		} else {
			setSchemaNodes([])
		}
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allToolSets,
		entityType: 'Tool Set',
		onPopulate,
		setName,
	})

	const stateJson = useMemo(
		() => JSON.stringify({ name, description, keywords, toolRefs, schemaNodes }),
		[name, description, keywords, toolRefs, schemaNodes],
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
		if (toolRefs.some((r) => r.toolDefinitionId === toolDefinitionId)) return
		setToolRefs([...toolRefs, { toolDefinitionId }])
	}

	const handleSave = async () => {
		if (!name.trim()) {
			toaster.create({ title: 'Name is required', type: 'warning' })
			return
		}

		const schemaAdditions =
			schemaNodes.length > 0 ? editorNodesToJsonSchema(schemaNodes) : undefined

		const payload = {
			label: name,
			description: description || undefined,
			toolRefs,
			schemaAdditions,
			...(keywords.length > 0 ? { keywords } : {}),
		}

		try {
			if (isEditing && toolSetId) {
				await updateToolSet.mutateAsync({ id: toolSetId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createToolSet.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: `Failed to ${isEditing ? 'update' : 'create'} tool set`,
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	const handleExport = (includeMockBehavior: boolean) => {
		if (!toolSetId) return
		exportToolSet.mutate(
			{ id: toolSetId, includeMockBehavior },
			{
				onSuccess: ({ json }) => {
					const blob = new Blob([json], { type: 'application/json' })
					const url = URL.createObjectURL(blob)
					const a = document.createElement('a')
					a.href = url
					a.download = `${name || 'tool-set'}.json`
					a.click()
					URL.revokeObjectURL(url)
					setExportOpen(false)
					toaster.create({ type: 'success', description: 'Exported' })
				},
			},
		)
	}

	if (creatingTool) {
		return (
			<ToolDefinitionBuilder
				onBack={() => {
					setCreatingTool(false)
				}}
				onCreated={(newId) => {
					addToolRef(newId)
					setCreatingTool(false)
				}}
				breadcrumbLabel={name || 'Tool Set'}
			/>
		)
	}

	if (isEditing && isLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: isPopout ? '' : 'Tools',
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

	const isSaving = createToolSet.isPending || updateToolSet.isPending

	return (
		<DrillInLayout
			title={name || 'Untitled Tool Set'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Tools',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="toolSet"
					entityId={toolSetId}
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
					{isEditing && (
						<Button size="sm" variant="outline" onClick={() => setExportOpen(true)}>
							<FiShare />
							Export
						</Button>
					)}
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
						placeholder="What this tool set is for..."
						rows={2}
					/>
				</Field.Root>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Tools"
						description="Tool definitions included in this set."
						actions={
							<Button size="xs" variant="outline" onClick={() => setCreatingTool(true)}>
								<FiPlus /> New Tool
							</Button>
						}
					/>
					<VStack gap={2} align="stretch">
						{toolRefs.map((ref, idx) => {
							const td = (allToolDefs ?? []).find((d) => d.id === ref.toolDefinitionId)
							return (
								<Card.Root key={ref.toolDefinitionId} variant="outline" size="sm">
									<Card.Body py={2} px={3}>
										<Flex justify="space-between" align="center">
											<VStack gap={0} align="start">
												<Text fontSize="sm" fontWeight="medium">
													{td?.label ?? td?.name ?? 'Unknown tool'}
												</Text>
												<Text fontSize="xs" color="fg.muted" fontFamily="mono">
													{td?.name ?? ref.toolDefinitionId}
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
							excludeIds={new Set(toolRefs.map((r) => r.toolDefinitionId))}
							onSelect={addToolRef}
							placeholder="Attach a tool..."
						/>
					</VStack>
				</VStack>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Schema Additions"
						description="Properties merged into every tool in this set. Use to inject shared parameters like &ldquo;rationale&rdquo;."
					/>
					<SchemaEditor nodes={schemaNodes} onChange={setSchemaNodes} />
				</VStack>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Keywords"
						description="Keywords merged into every tool in this set for search matching."
					/>
					<Field.Root>
						<TagsInput.Root
							size="sm"
							value={keywords}
							onValueChange={(details) => setKeywords(details.value)}
							blurBehavior="add"
							delimiter=","
							validate={(e) => {
								const trimmed = e.inputValue.trim()
								return trimmed.length > 0 && !keywords.includes(trimmed)
							}}
						>
							<TagsInput.Control>
								<TagsInput.Items />
								<TagsInput.Input placeholder="Add keyword…" fontSize="xs" />
							</TagsInput.Control>
						</TagsInput.Root>
					</Field.Root>
				</VStack>
			</VStack>

			<UnsavedChangesDialog
				open={dirtyGuard.showDialog}
				onSave={dirtyGuard.handleDialogSave}
				onDiscard={dirtyGuard.handleDiscard}
				onCancel={dirtyGuard.handleCancel}
				saving={isSaving}
			/>
			<ExportDialog
				open={exportOpen}
				onOpenChange={setExportOpen}
				entityName={name || 'Tool Set'}
				onExport={handleExport}
				exporting={exportToolSet.isPending}
			/>
			<GenerateElementDialog
				open={generateOpen}
				onOpenChange={setGenerateOpen}
				entityType="toolSet"
				existingData={{
					label: name,
					description,
					toolRefs,
					keywords,
				}}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.description) setDescription(result.description as string)
					if (result.toolRefs && Array.isArray(result.toolRefs)) {
						setToolRefs(result.toolRefs as typeof toolRefs)
					}
					if (result.keywords && Array.isArray(result.keywords)) {
						setKeywords(result.keywords as string[])
					}
				}}
			/>
		</DrillInLayout>
	)
}

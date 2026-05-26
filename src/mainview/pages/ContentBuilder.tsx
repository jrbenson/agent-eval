import { Box, Button, Field, Flex, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiSave, FiZap } from 'react-icons/fi'
import type { StoredContent } from '../../shared/schemas/content.schema'
import CodeEditor from '../components/CodeEditor'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useContent, useContents, useCreateContent, useUpdateContent } from '../hooks/use-contents'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'

interface ContentBuilderProps {
	contentId?: string
	onBack: () => void
	onCreated?: (id: string) => void
	breadcrumbLabel?: string
}

export default function ContentBuilder({
	contentId,
	onBack,
	onCreated,
	breadcrumbLabel = 'Context',
}: ContentBuilderProps) {
	const isEditing = !!contentId
	const { data: existing, isLoading } = useContent(contentId ?? null)
	const create = useCreateContent()
	const update = useUpdateContent()
	const { data: allContents } = useContents()

	const [name, setName] = useState('')
	const [key, setKey] = useState('')
	const [content, setContent] = useState('')
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((e: StoredContent) => {
		setName(e.label)
		setKey(e.name)
		setContent(e.content)
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allContents,
		entityType: 'Content',
		onPopulate,
		setName,
	})

	const stateJson = useMemo(() => JSON.stringify({ name, key, content }), [name, key, content])
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const handleSave = async () => {
		if (!name.trim()) {
			toaster.create({ title: 'Name is required', type: 'warning' })
			return
		}
		if (!key.trim()) {
			toaster.create({ title: 'Key is required', type: 'warning' })
			return
		}

		const payload = {
			label: name.trim(),
			name: key.trim(),
			content,
		}

		try {
			if (isEditing && contentId) {
				await update.mutateAsync({ id: contentId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await create.mutateAsync(payload)
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

	if (isEditing && isLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: breadcrumbLabel,
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
			title={name || 'Untitled Content'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: breadcrumbLabel,
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="content"
					entityId={contentId}
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
						variant="outline"
						onClick={handleSave}
						loading={create.isPending || update.isPending}
					>
						<FiSave />
						Save
					</Button>
				</HStack>
			}
		>
			<VStack gap={4} align="stretch">
				<Field.Root required>
					<Field.Label fontSize="sm">Name:</Field.Label>
					<Input
						size="sm"
						value={key}
						onChange={(e) => setKey(e.target.value)}
						placeholder="file:readme.md"
						fontFamily="mono"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
					/>
					<Field.HelperText fontSize="xs">
						Persistence key used to seed mock tool state
					</Field.HelperText>
				</Field.Root>

				<Box>
					<Text fontSize="sm" fontWeight="medium" mb={1}>
						Content:
					</Text>
					<CodeEditor
						value={content}
						onChange={(val) => setContent(val)}
						mode="text"
						placeholder="Enter content..."
						minLines={8}
						maxLines={30}
						name="content-editor"
					/>
				</Box>
			</VStack>

			<UnsavedChangesDialog
				open={dirtyGuard.showDialog}
				onSave={dirtyGuard.handleDialogSave}
				onDiscard={dirtyGuard.handleDiscard}
				onCancel={dirtyGuard.handleCancel}
				saving={create.isPending || update.isPending}
			/>
			<GenerateElementDialog
				open={generateOpen}
				onOpenChange={setGenerateOpen}
				entityType="content"
				existingData={{ label: name, name: key, content }}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.name) setKey(result.name as string)
					if (result.content) setContent(result.content as string)
				}}
			/>
		</DrillInLayout>
	)
}

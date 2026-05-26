import { Box, Button, Field, Flex, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { Textarea } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiSave, FiZap } from 'react-icons/fi'
import type { StoredSkill } from '../../shared/schemas/skill.schema'
import CodeEditor from '../components/CodeEditor'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useCreateSkill, useSkill, useSkills, useUpdateSkill } from '../hooks/use-skills'

interface SkillBuilderProps {
	skillId?: string
	onBack: () => void
	onCreated?: (id: string) => void
	breadcrumbLabel?: string
}

export default function SkillBuilder({
	skillId,
	onBack,
	onCreated,
	breadcrumbLabel = 'Context',
}: SkillBuilderProps) {
	const isEditing = !!skillId
	const { data: existing, isLoading } = useSkill(skillId ?? null)
	const create = useCreateSkill()
	const update = useUpdateSkill()
	const { data: allSkills } = useSkills()

	const [name, setName] = useState('')
	const [machineName, setMachineName] = useState('')
	const [description, setDescription] = useState('')
	const [content, setContent] = useState('')
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((e: StoredSkill) => {
		setName(e.label)
		setMachineName(e.name)
		setDescription(e.description)
		setContent(e.content)
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allSkills,
		entityType: 'Skill',
		onPopulate,
		setName,
	})

	const stateJson = useMemo(
		() => JSON.stringify({ name, machineName, description, content }),
		[name, machineName, description, content],
	)
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
		if (!machineName.trim()) {
			toaster.create({ title: 'Skill name is required', type: 'warning' })
			return
		}
		if (!description.trim()) {
			toaster.create({ title: 'Description is required', type: 'warning' })
			return
		}

		const payload = {
			label: name.trim(),
			name: machineName.trim(),
			description: description.trim(),
			content,
		}

		try {
			if (isEditing && skillId) {
				await update.mutateAsync({ id: skillId, ...payload })
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
			title={name || 'Untitled Skill'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: breadcrumbLabel,
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="skill"
					entityId={skillId}
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
					<Field.Label fontSize="sm">Skill name:</Field.Label>
					<Input
						size="sm"
						value={machineName}
						onChange={(e) => setMachineName(e.target.value)}
						placeholder="pdf-processing"
						fontFamily="mono"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
					/>
					<Field.HelperText fontSize="xs">Used in load_skill calls</Field.HelperText>
				</Field.Root>

				<Field.Root required>
					<Field.Label fontSize="sm">Description:</Field.Label>
					<Textarea
						size="sm"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						placeholder="Extract text and tables from PDF files..."
						rows={2}
					/>
					<Field.HelperText fontSize="xs">Shown to agent for discovery</Field.HelperText>
				</Field.Root>

				<Box>
					<Text fontSize="sm" fontWeight="medium" mb={1}>
						Content:
					</Text>
					<CodeEditor
						value={content}
						onChange={(val) => setContent(val)}
						mode="text"
						placeholder="# Skill Instructions\n\n## When to use..."
						minLines={12}
						maxLines={40}
						name="skill-content-editor"
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
				entityType="skill"
				existingData={{ label: name, name: machineName, description, content }}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.name) setMachineName(result.name as string)
					if (result.description) setDescription(result.description as string)
					if (result.content) setContent(result.content as string)
				}}
			/>
		</DrillInLayout>
	)
}

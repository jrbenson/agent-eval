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
import type { StoredSkillSet } from '../../shared/schemas/skill-set.schema'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import { SkillPickerCombobox } from '../components/SkillPickerCombobox'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import {
	useCreateSkillSet,
	useSkillSet,
	useSkillSets,
	useUpdateSkillSet,
} from '../hooks/use-skill-sets'
import { useSkills } from '../hooks/use-skills'
import SkillBuilder from './SkillBuilder'

interface SkillRef {
	skillId: string
}

interface SkillSetBuilderProps {
	skillSetId?: string
	onBack: () => void
	onCreated?: (id: string) => void
}

function moveItem<T>(arr: T[], from: number, to: number): T[] {
	const result = [...arr]
	const [item] = result.splice(from, 1)
	result.splice(to, 0, item)
	return result
}

export default function SkillSetBuilder({ skillSetId, onBack, onCreated }: SkillSetBuilderProps) {
	const isPopout = useIsPopout()
	const isEditing = !!skillSetId
	const { data: existing, isLoading } = useSkillSet(skillSetId ?? null)
	const createSkillSet = useCreateSkillSet()
	const updateSkillSet = useUpdateSkillSet()
	const { data: allSkillSets } = useSkillSets()
	const { data: allSkills } = useSkills()

	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [skillRefs, setSkillRefs] = useState<SkillRef[]>([])
	const [creatingSkill, setCreatingSkill] = useState(false)
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((s: StoredSkillSet) => {
		setName(s.label)
		setDescription(s.description ?? '')
		setSkillRefs(s.skillRefs ?? [])
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing,
		allEntities: allSkillSets,
		entityType: 'Skill Set',
		onPopulate,
		setName,
	})

	const stateJson = useMemo(
		() => JSON.stringify({ name, description, skillRefs }),
		[name, description, skillRefs],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const addSkillRef = (skillId: string) => {
		if (skillRefs.some((r) => r.skillId === skillId)) return
		setSkillRefs([...skillRefs, { skillId }])
	}

	const removeSkillRef = (idx: number) => {
		setSkillRefs(skillRefs.filter((_, i) => i !== idx))
	}

	const handleSave = async () => {
		if (!name.trim()) {
			toaster.create({ title: 'Name is required', type: 'warning' })
			return
		}

		const payload = {
			label: name,
			description: description || undefined,
			skillRefs,
		}

		try {
			if (isEditing && skillSetId) {
				await updateSkillSet.mutateAsync({ id: skillSetId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createSkillSet.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: `Failed to ${isEditing ? 'update' : 'create'} skill set`,
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	if (creatingSkill) {
		return (
			<SkillBuilder
				onBack={() => setCreatingSkill(false)}
				onCreated={(newId) => {
					addSkillRef(newId)
					setCreatingSkill(false)
				}}
				breadcrumbLabel={name || 'Skill Set'}
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

	const isSaving = createSkillSet.isPending || updateSkillSet.isPending

	return (
		<DrillInLayout
			title={name || 'Untitled Skill Set'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Context',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="skillSet"
					entityId={skillSetId}
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
						placeholder="What this skill set is for..."
						rows={2}
					/>
				</Field.Root>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Skills"
						description="Skill definitions included in this set."
						actions={
							<Button size="xs" variant="outline" onClick={() => setCreatingSkill(true)}>
								<FiPlus /> New Skill
							</Button>
						}
					/>
					<VStack gap={2} align="stretch">
						{skillRefs.map((ref, idx) => {
							const s = (allSkills ?? []).find((d) => d.id === ref.skillId)
							return (
								<Card.Root key={ref.skillId} variant="outline" size="sm">
									<Card.Body py={2} px={3}>
										<Flex justify="space-between" align="center">
											<VStack gap={0} align="start">
												<Text fontSize="sm" fontWeight="medium">
													{s?.label ?? 'Unknown skill'}
												</Text>
												<Text fontSize="xs" color="fg.muted" fontFamily="mono">
													{s?.name ?? ref.skillId}
												</Text>
											</VStack>
											<HStack gap={1}>
												<IconButton
													aria-label="Move up"
													size="xs"
													variant="ghost"
													onClick={() => setSkillRefs(moveItem(skillRefs, idx, idx - 1))}
													disabled={idx === 0}
												>
													<FiChevronUp />
												</IconButton>
												<IconButton
													aria-label="Move down"
													size="xs"
													variant="ghost"
													onClick={() => setSkillRefs(moveItem(skillRefs, idx, idx + 1))}
													disabled={idx === skillRefs.length - 1}
												>
													<FiChevronDown />
												</IconButton>
												<IconButton
													aria-label="Remove"
													size="xs"
													variant="ghost"
													colorPalette="red"
													onClick={() => removeSkillRef(idx)}
												>
													<FiTrash2 />
												</IconButton>
											</HStack>
										</Flex>
									</Card.Body>
								</Card.Root>
							)
						})}

						<SkillPickerCombobox
							skills={allSkills ?? []}
							excludeIds={new Set(skillRefs.map((r) => r.skillId))}
							onSelect={addSkillRef}
							placeholder="Attach a skill..."
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
				entityType="skillSet"
				existingData={{ label: name, description, skillRefs }}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.description) setDescription(result.description as string)
					if (result.skillRefs && Array.isArray(result.skillRefs)) {
						setSkillRefs(result.skillRefs as typeof skillRefs)
					}
				}}
			/>
		</DrillInLayout>
	)
}

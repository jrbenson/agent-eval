import {
	Box,
	Button,
	Card,
	Field,
	Flex,
	HStack,
	IconButton,
	Portal,
	Select,
	Spinner,
	Text,
	Textarea,
	VStack,
	createListCollection,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { FiArrowDown, FiArrowUp, FiPlus, FiSave, FiTrash2, FiZap } from 'react-icons/fi'
import type { StoredSurvey } from '../../shared/rpc-types'
import DrillInLayout from '../components/DrillInLayout'
import GenerateElementDialog from '../components/GenerateElementDialog'
import PopoutButton from '../components/PopoutButton'
import { SectionHeader } from '../components/SectionHeader'
import UnsavedChangesDialog from '../components/UnsavedChangesDialog'
import { toaster } from '../components/ui/toaster'
import { useEntityEditorBootstrap } from '../hooks/use-builder-form'
import { useDirtyGuard } from '../hooks/use-dirty-guard'
import { useNavigationGuard } from '../hooks/use-navigation-guard'
import { useIsPopout } from '../hooks/use-popout'
import { useCreateSurvey, useSurvey, useSurveys, useUpdateSurvey } from '../hooks/use-surveys'

interface QuestionForm {
	id: string
	text: string
	responseFormat: 'free_text' | 'likert' | 'multiple_choice' | 'ranking'
	options: string[]
}

function generateId() {
	return crypto.randomUUID()
}

const orderingStrategies = createListCollection({
	items: [
		{ label: 'Fixed', value: 'fixed' },
		{ label: 'Randomized', value: 'randomized' },
		{ label: 'Latin Square', value: 'latin_square' },
	],
})

const responseFormats = createListCollection({
	items: [
		{ label: 'Free Text', value: 'free_text' },
		{ label: 'Likert Scale', value: 'likert' },
		{ label: 'Multiple Choice', value: 'multiple_choice' },
		{ label: 'Ranking', value: 'ranking' },
	],
})

interface SurveyBuilderProps {
	surveyId?: string
	onBack: () => void
	onCreated?: (id: string) => void
}

export default function SurveyBuilder({ surveyId, onBack, onCreated }: SurveyBuilderProps) {
	const isPopout = useIsPopout()
	const isEditing = !!surveyId
	const { data: existingSurvey, isLoading: isExistingLoading } = useSurvey(surveyId ?? null)
	const createSurvey = useCreateSurvey()
	const updateSurvey = useUpdateSurvey()
	const { data: allSurveys } = useSurveys()

	const [name, setName] = useState('')
	const [orderingStrategy, setOrderingStrategy] = useState<'fixed' | 'randomized' | 'latin_square'>(
		'fixed',
	)
	const [systemPrompt, setSystemPrompt] = useState('')
	const [questions, setQuestions] = useState<QuestionForm[]>([])
	const [generateOpen, setGenerateOpen] = useState(false)

	const onPopulate = useCallback((s: StoredSurvey) => {
		setName(s.label)
		setOrderingStrategy(s.orderingStrategy)
		setSystemPrompt(s.systemPrompt ?? '')
		setQuestions(
			s.questions.map((q) => ({
				id: q.id,
				text: q.text,
				responseFormat: q.responseFormat,
				options: q.options ?? [],
			})),
		)
	}, [])

	const { ready } = useEntityEditorBootstrap({
		isEditing,
		existing: existingSurvey,
		allEntities: allSurveys,
		entityType: 'Survey',
		onPopulate,
		setName,
	})

	// Dirty-guard setup
	const stateJson = useMemo(
		() =>
			JSON.stringify({
				name,
				orderingStrategy,
				systemPrompt,
				questions,
			}),
		[name, orderingStrategy, systemPrompt, questions],
	)
	const dirtyGuard = useDirtyGuard(stateJson)
	useNavigationGuard(dirtyGuard.navGuard)
	useEffect(() => {
		if (ready) dirtyGuard.markClean()
	}, [ready, dirtyGuard.markClean])

	const addQuestion = () => {
		setQuestions([
			...questions,
			{ id: generateId(), text: '', responseFormat: 'free_text', options: [] },
		])
	}

	const removeQuestion = (idx: number) => {
		setQuestions(questions.filter((_, i) => i !== idx))
	}

	const moveQuestion = (idx: number, dir: -1 | 1) => {
		const newIdx = idx + dir
		if (newIdx < 0 || newIdx >= questions.length) return
		const arr = [...questions]
		;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
		setQuestions(arr)
	}

	const updateQuestion = (idx: number, field: keyof QuestionForm, value: unknown) => {
		setQuestions(questions.map((q, i) => (i === idx ? { ...q, [field]: value } : q)))
	}

	const handleSave = async () => {
		if (questions.length === 0) {
			toaster.create({
				title: 'At least one question is required',
				type: 'warning',
			})
			return
		}
		if (questions.some((q) => !q.text.trim())) {
			toaster.create({
				title: 'All questions must have text',
				type: 'warning',
			})
			return
		}

		const payload = {
			label: name.trim(),
			questions: questions.map((q) => {
				const filtered = q.options.filter((l) => l.trim())
				return {
					id: q.id,
					text: q.text,
					responseFormat: q.responseFormat,
					options: filtered.length > 0 ? filtered : undefined,
				}
			}),
			orderingStrategy,
			systemPrompt: systemPrompt || undefined,
		}

		try {
			if (isEditing && surveyId) {
				await updateSurvey.mutateAsync({ id: surveyId, ...payload })
				toaster.create({ title: 'Saved', type: 'success' })
				dirtyGuard.markClean()
			} else {
				const result = await createSurvey.mutateAsync(payload)
				dirtyGuard.markClean()
				toaster.create({ title: 'Created', type: 'success' })
				onCreated?.(result.id)
			}
		} catch (err) {
			toaster.create({
				title: `Failed to ${isEditing ? 'update' : 'create'} survey`,
				description: String(err),
				type: 'error',
			})
		}
	}

	dirtyGuard.saveRef.current = handleSave

	if (isEditing && isExistingLoading) {
		return (
			<DrillInLayout
				title="Loading..."
				breadcrumbs={[
					{
						label: isPopout ? '' : 'Scenarios',
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

	const isSaving = createSurvey.isPending || updateSurvey.isPending

	return (
		<DrillInLayout
			title={name || 'Untitled Survey'}
			onTitleChange={setName}
			breadcrumbs={[
				{
					label: isPopout ? '' : 'Scenarios',
					onClick: () => dirtyGuard.guardNavigation(onBack),
				},
			]}
			inlineStatus={
				<PopoutButton
					entityType="survey"
					entityId={surveyId}
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
			<VStack gap={8} align="stretch">
				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Poll Settings"
						description="Configure ordering and system-level prompts for this survey."
					/>
					<HStack>
						<Field.Root>
							<Field.Label>Ordering strategy:</Field.Label>
							<Select.Root
								collection={orderingStrategies}
								size="sm"
								value={[orderingStrategy]}
								onValueChange={(e) => setOrderingStrategy(e.value[0] as typeof orderingStrategy)}
							>
								<Select.HiddenSelect />
								<Select.Control>
									<Select.Trigger>
										<Select.ValueText />
									</Select.Trigger>
									<Select.IndicatorGroup>
										<Select.Indicator />
									</Select.IndicatorGroup>
								</Select.Control>
								<Portal>
									<Select.Positioner>
										<Select.Content>
											{orderingStrategies.items.map((item) => (
												<Select.Item item={item} key={item.value}>
													{item.label}
													<Select.ItemIndicator />
												</Select.Item>
											))}
										</Select.Content>
									</Select.Positioner>
								</Portal>
							</Select.Root>
						</Field.Root>
					</HStack>

					<Field.Root>
						<Field.Label>System prompt:</Field.Label>
						<Textarea
							value={systemPrompt}
							onChange={(e) => setSystemPrompt(e.target.value)}
							placeholder="Optional system prompt sent with each question..."
							rows={3}
						/>
					</Field.Root>
				</VStack>

				<VStack gap={4} align="stretch">
					<SectionHeader
						title="Questions"
						description="Define the questions presented to the model during evaluation."
						actions={
							<Button size="xs" variant="outline" onClick={addQuestion}>
								<Box as={FiPlus} />
								Add Question
							</Button>
						}
					/>
					<VStack gap={3} align="stretch">
						{questions.map((q, idx) => (
							<Card.Root key={q.id} variant="outline" size="sm">
								<Card.Body>
									<VStack gap={3} align="stretch">
										<Flex justify="space-between" align="center">
											<Text fontSize="sm" fontWeight="medium" color="fg.muted">
												Question {idx + 1}
											</Text>
											<HStack gap={1}>
												<IconButton
													aria-label="Move up"
													size="xs"
													variant="ghost"
													disabled={idx === 0}
													onClick={() => moveQuestion(idx, -1)}
												>
													<FiArrowUp />
												</IconButton>
												<IconButton
													aria-label="Move down"
													size="xs"
													variant="ghost"
													disabled={idx === questions.length - 1}
													onClick={() => moveQuestion(idx, 1)}
												>
													<FiArrowDown />
												</IconButton>
												<IconButton
													aria-label="Remove"
													size="xs"
													variant="ghost"
													colorPalette="red"
													disabled={questions.length <= 1}
													onClick={() => removeQuestion(idx)}
												>
													<FiTrash2 />
												</IconButton>
											</HStack>
										</Flex>
										<Textarea
											value={q.text}
											onChange={(e) => updateQuestion(idx, 'text', e.target.value)}
											placeholder="Enter question text..."
											rows={2}
											size="sm"
										/>
										<Field.Root>
											<Field.Label>Answer type:</Field.Label>
											<Select.Root
												collection={responseFormats}
												size="sm"
												value={[q.responseFormat]}
												onValueChange={(e) => updateQuestion(idx, 'responseFormat', e.value[0])}
											>
												<Select.HiddenSelect />
												<Select.Control>
													<Select.Trigger>
														<Select.ValueText />
													</Select.Trigger>
													<Select.IndicatorGroup>
														<Select.Indicator />
													</Select.IndicatorGroup>
												</Select.Control>
												<Portal>
													<Select.Positioner>
														<Select.Content>
															{responseFormats.items.map((item) => (
																<Select.Item item={item} key={item.value}>
																	{item.label}
																	<Select.ItemIndicator />
																</Select.Item>
															))}
														</Select.Content>
													</Select.Positioner>
												</Portal>
											</Select.Root>
										</Field.Root>
										{(q.responseFormat === 'multiple_choice' || q.responseFormat === 'ranking') && (
											<Field.Root>
												<Field.Label>Options (one per line):</Field.Label>
												<Textarea
													size="sm"
													rows={3}
													value={q.options.join('\n')}
													onChange={(e) =>
														updateQuestion(idx, 'options', e.target.value.split('\n'))
													}
													placeholder="Option 1&#10;Option 2&#10;Option 3"
												/>
											</Field.Root>
										)}
									</VStack>
								</Card.Body>
							</Card.Root>
						))}
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
				entityType="survey"
				existingData={{
					label: name,
					questions,
					orderingStrategy,
					systemPrompt,
				}}
				onApply={(result) => {
					if (result.label) setName(result.label as string)
					if (result.orderingStrategy)
						setOrderingStrategy(result.orderingStrategy as typeof orderingStrategy)
					if (result.systemPrompt !== undefined) setSystemPrompt(result.systemPrompt as string)
					if (result.questions && Array.isArray(result.questions)) {
						setQuestions(
							(
								result.questions as Array<{
									id?: string
									text: string
									responseFormat: string
									options?: string[]
								}>
							).map((q) => ({
								id: q.id || generateId(),
								text: q.text,
								responseFormat: q.responseFormat as QuestionForm['responseFormat'],
								options: q.options ?? [],
							})),
						)
					}
				}}
			/>
		</DrillInLayout>
	)
}

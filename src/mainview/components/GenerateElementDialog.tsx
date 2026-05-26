import { Alert, Box, Button, HStack, Spinner, Text, Textarea, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import type { GeneratableEntityType } from '../../shared/rpc-types'
import { useUtilityLlmProfile } from '../hooks/use-configs'
import { useGenerateElement } from '../hooks/use-generate-element'
import AppDialog, { AppDialogFooter } from './AppDialog'
import CodeEditor from './CodeEditor'

const ENTITY_LABELS: Record<GeneratableEntityType, string> = {
	toolDefinition: 'Tool Definition',
	toolSet: 'Tool Set',
	skill: 'Skill',
	skillSet: 'Skill Set',
	content: 'Content',
	contentSet: 'Content Set',
	task: 'Task',
	survey: 'Survey',
	evaluation: 'Evaluation',
	toolMockResponse: 'Mock Response',
}

interface GenerateElementDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	entityType: GeneratableEntityType
	existingData: Record<string, unknown>
	onApply: (result: Record<string, unknown>) => void
}

export default function GenerateElementDialog({
	open,
	onOpenChange,
	entityType,
	existingData,
	onApply,
}: GenerateElementDialogProps) {
	const [instructions, setInstructions] = useState('')
	const [result, setResult] = useState<Record<string, unknown> | null>(null)
	const generate = useGenerateElement()
	const { data: generateProfile } = useUtilityLlmProfile('generate')
	const profileConfigured = !!generateProfile

	const phase = generate.isPending ? 'generating' : result ? 'result' : 'input'

	const handleGenerate = () => {
		setResult(null)
		generate.mutate(
			{
				entityType,
				existingData,
				userInstructions: instructions.trim() || undefined,
			},
			{
				onSuccess: ({ result: r }) => setResult(r),
			},
		)
	}

	const handleApply = () => {
		if (result) {
			onApply(result)
			handleClose()
		}
	}

	const handleClose = () => {
		setResult(null)
		setInstructions('')
		generate.reset()
		onOpenChange(false)
	}

	const handleRegenerate = () => {
		setResult(null)
		handleGenerate()
	}

	const label = ENTITY_LABELS[entityType]

	return (
		<AppDialog
			open={open}
			onOpenChange={(isOpen) => {
				if (!isOpen) handleClose()
			}}
			title={`Generate ${label}`}
			size="lg"
			error={generate.isError ? String(generate.error) : null}
			footer={
				phase === 'input' ? (
					<AppDialogFooter
						onCancel={handleClose}
						onConfirm={handleGenerate}
						confirmLabel="Generate"
						confirmDisabled={!profileConfigured}
					/>
				) : phase === 'generating' ? (
					<Button size="sm" variant="outline" onClick={handleClose}>
						Cancel
					</Button>
				) : (
					<HStack gap={2} width="100%" justify="flex-end">
						<Button size="sm" variant="outline" onClick={handleClose}>
							Discard
						</Button>
						<Button size="sm" variant="outline" onClick={handleRegenerate}>
							<FiRefreshCw />
							Regenerate
						</Button>
						<Button size="sm" colorPalette="blue" variant="solid" onClick={handleApply}>
							Apply
						</Button>
					</HStack>
				)
			}
		>
			{phase === 'input' && (
				<VStack gap={3} align="stretch">
					{!profileConfigured && (
						<Alert.Root status="warning" size="sm">
							<Alert.Indicator />
							<Alert.Title>
								Configure the Generate utility LLM profile in Settings to use this feature.
							</Alert.Title>
						</Alert.Root>
					)}
					<Text fontSize="sm" color="fg.muted">
						Generate a complete {label.toLowerCase()} using AI. Provide optional instructions to
						guide the generation.
					</Text>
					<Textarea
						value={instructions}
						onChange={(e) => setInstructions(e.target.value)}
						placeholder="Add any specific instructions for the generation..."
						rows={3}
						size="sm"
						disabled={!profileConfigured}
					/>
				</VStack>
			)}

			{phase === 'generating' && (
				<VStack gap={3} py={8} align="center">
					<Spinner size="lg" />
					<Text fontSize="sm" color="fg.muted">
						Generating {label.toLowerCase()}...
					</Text>
				</VStack>
			)}

			{phase === 'result' && result && (
				<VStack gap={3} align="stretch">
					<Text fontSize="sm" color="fg.muted">
						Review the generated {label.toLowerCase()} below. Click Apply to use it or Regenerate to
						try again.
					</Text>
					<Box>
						<CodeEditor
							value={JSON.stringify(result, null, 2)}
							mode="json"
							readOnly
							minLines={5}
							maxLines={25}
							name="generate-preview"
						/>
					</Box>
				</VStack>
			)}
		</AppDialog>
	)
}

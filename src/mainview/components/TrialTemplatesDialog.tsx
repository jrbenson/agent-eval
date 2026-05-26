import { Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { TrialRow } from '../pages/EvaluationEditor'
import AppDialog, { AppDialogFooter } from './AppDialog'

// ---- Built-in templates ----

interface TrialTemplate {
	id: string
	label: string
	description: string
	trials: TrialRow[]
}

const DEFAULT_TRIAL: Omit<TrialRow, 'provider' | 'model' | 'temperature' | 'reasoning'> = {
	repetitions: 1,
	toolSearch: false,
	toolSearchHints: 'none',
	toolSearchMode: 'keyword',
	subagentsEnabled: false,
	subagentMaxDepth: 1,
}

export const BUILT_IN_TEMPLATES: TrialTemplate[] = [
	{
		id: 'speed-vs-quality',
		label: 'Speed vs Quality',
		description: 'Budget model vs flagship model at different temperatures.',
		trials: [
			{
				...DEFAULT_TRIAL,
				provider: 'openai',
				model: 'gpt-4o-mini',
				temperature: 1.0,
				reasoning: 'none',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'openai',
				model: 'gpt-4o',
				temperature: 0.3,
				reasoning: 'medium',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'anthropic',
				model: 'claude-sonnet-4-20250514',
				temperature: 1.0,
				reasoning: 'none',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'anthropic',
				model: 'claude-sonnet-4-20250514',
				temperature: 0.3,
				reasoning: 'medium',
			},
		],
	},
	{
		id: 'provider-shootout',
		label: 'Provider Shootout',
		description: 'Comparable flagship models across providers.',
		trials: [
			{
				...DEFAULT_TRIAL,
				provider: 'openai',
				model: 'gpt-4o',
				temperature: 1.0,
				reasoning: 'provider-default',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'anthropic',
				model: 'claude-sonnet-4-20250514',
				temperature: 1.0,
				reasoning: 'provider-default',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'google',
				model: 'gemini-2.5-pro',
				temperature: 1.0,
				reasoning: 'provider-default',
			},
			{
				...DEFAULT_TRIAL,
				provider: 'mistral',
				model: 'mistral-large-latest',
				temperature: 1.0,
				reasoning: 'provider-default',
			},
		],
	},
	{
		id: 'temperature-sensitivity',
		label: 'Temperature Sensitivity',
		description: 'Single model at 5 temperature points.',
		trials: [0.0, 0.3, 0.5, 0.8, 1.0].map((t) => ({
			...DEFAULT_TRIAL,
			provider: 'openai' as const,
			model: 'gpt-4o',
			temperature: t,
			reasoning: 'provider-default' as const,
		})),
	},
	{
		id: 'reasoning-ladder',
		label: 'Reasoning Ladder',
		description: 'Single model at all reasoning effort levels.',
		trials: (['none', 'low', 'medium', 'high'] as const).map((r) => ({
			...DEFAULT_TRIAL,
			provider: 'openai' as const,
			model: 'gpt-4o',
			temperature: 1.0,
			reasoning: r,
		})),
	},
]

// ---- Dialog ----

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	onApplyTemplate: (trials: TrialRow[], mode: 'append' | 'replace') => void
}

export default function TrialTemplatesDialog({ open, onOpenChange, onApplyTemplate }: Props) {
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [mode, setMode] = useState<'append' | 'replace'>('append')

	const selected = BUILT_IN_TEMPLATES.find((t) => t.id === selectedId)

	const handleApply = () => {
		if (!selected) return
		onApplyTemplate(selected.trials, mode)
		setSelectedId(null)
		onOpenChange(false)
	}

	return (
		<AppDialog
			open={open}
			onOpenChange={(o) => {
				if (!o) setSelectedId(null)
				onOpenChange(o)
			}}
			title="Trial Templates"
			size="md"
			footer={
				<AppDialogFooter
					onCancel={() => onOpenChange(false)}
					onConfirm={handleApply}
					confirmLabel={mode === 'append' ? 'Append' : 'Replace'}
					confirmDisabled={!selected}
				/>
			}
		>
			<VStack align="stretch" gap={3}>
				<Text fontSize="sm" color="fg.muted">
					Apply a pre-built trial matrix template.
				</Text>
				<VStack align="stretch" gap={1}>
					{BUILT_IN_TEMPLATES.map((tmpl) => (
						<HStack
							key={tmpl.id}
							p={2}
							borderRadius="md"
							cursor="pointer"
							bg={selectedId === tmpl.id ? 'blue.50' : 'transparent'}
							_dark={{
								bg: selectedId === tmpl.id ? 'blue.900' : 'transparent',
							}}
							_hover={{ bg: selectedId === tmpl.id ? undefined : 'bg.subtle' }}
							onClick={() => setSelectedId(tmpl.id)}
						>
							<VStack align="start" gap={0}>
								<Text fontSize="sm" fontWeight="medium">
									{tmpl.label}
								</Text>
								<Text fontSize="xs" color="fg.muted">
									{tmpl.description} ({tmpl.trials.length} trials)
								</Text>
							</VStack>
						</HStack>
					))}
				</VStack>
				<HStack gap={2}>
					<Button
						size="xs"
						variant={mode === 'append' ? 'solid' : 'outline'}
						colorPalette={mode === 'append' ? 'blue' : undefined}
						onClick={() => setMode('append')}
					>
						Append
					</Button>
					<Button
						size="xs"
						variant={mode === 'replace' ? 'solid' : 'outline'}
						colorPalette={mode === 'replace' ? 'blue' : undefined}
						onClick={() => setMode('replace')}
					>
						Replace
					</Button>
				</HStack>
			</VStack>
		</AppDialog>
	)
}

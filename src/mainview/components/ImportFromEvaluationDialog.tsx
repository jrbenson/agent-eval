import { Button, Field, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { StoredEvaluation } from '../../shared/rpc-types'
import type { TrialRow } from '../pages/EvaluationEditor'
import AppDialog from './AppDialog'
import EntityPickerCombobox from './EntityPickerCombobox'

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	evaluations: StoredEvaluation[]
	currentEvaluationId?: string
	onImport: (trials: TrialRow[], mode: 'append' | 'replace') => void
}

export default function ImportFromEvaluationDialog({
	open,
	onOpenChange,
	evaluations,
	currentEvaluationId,
	onImport,
}: Props) {
	const [selectedId, setSelectedId] = useState('')
	const [inputValue, setInputValue] = useState('')

	const items = evaluations
		.filter((e) => e.id !== currentEvaluationId)
		.map((e) => ({
			label: e.label,
			value: e.id,
			group: 'Evaluations',
		}))

	const selectedEval = evaluations.find((e) => e.id === selectedId)

	const doImport = (mode: 'append' | 'replace') => {
		if (!selectedEval) return
		const trials: TrialRow[] = selectedEval.agentConfigs.map((ac) => ({
			provider: ac.provider as TrialRow['provider'],
			model: ac.model,
			temperature: ac.temperature,
			repetitions: ac.repetitions ?? 1,
			reasoning: (ac.reasoning ?? 'provider-default') as TrialRow['reasoning'],
			toolSearch: ac.toolSearch ?? false,
			toolSearchHints: (ac.toolSearchHints ?? 'none') as TrialRow['toolSearchHints'],
			toolSearchMode: (ac.toolSearchMode ?? 'keyword') as TrialRow['toolSearchMode'],
			subagentsEnabled: ac.subagentsEnabled ?? false,
			subagentMaxDepth: ac.subagentMaxDepth ?? 1,
		}))
		onImport(trials, mode)
		setSelectedId('')
		setInputValue('')
		onOpenChange(false)
	}

	return (
		<AppDialog
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					setSelectedId('')
					setInputValue('')
				}
				onOpenChange(o)
			}}
			title="Import from Evaluation"
			size="md"
			footer={
				<>
					<Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						size="sm"
						variant="outline"
						colorPalette="blue"
						onClick={() => doImport('replace')}
						disabled={!selectedId}
					>
						Replace
					</Button>
					<Button
						size="sm"
						variant="solid"
						colorPalette="blue"
						onClick={() => doImport('append')}
						disabled={!selectedId}
					>
						Append
					</Button>
				</>
			}
		>
			<VStack align="stretch" gap={3}>
				<Field.Root>
					<Field.Label>Evaluation</Field.Label>
					<EntityPickerCombobox
						items={items}
						value={selectedId ? [selectedId] : []}
						inputValue={inputValue}
						onInputValueChange={setInputValue}
						onSelect={(val) => {
							setSelectedId(val)
							const label = items.find((i) => i.value === val)?.label ?? ''
							setInputValue(label)
						}}
						placeholder="Select evaluation…"
						emptyMessage="No other evaluations found"
						renderItem={(item) => <Text fontSize="sm">{item.label}</Text>}
					/>
				</Field.Root>
				{selectedEval && (
					<Text fontSize="xs" color="fg.muted">
						{selectedEval.agentConfigs.length} trial
						{selectedEval.agentConfigs.length > 1 ? 's' : ''} will be imported.
					</Text>
				)}
			</VStack>
		</AppDialog>
	)
}

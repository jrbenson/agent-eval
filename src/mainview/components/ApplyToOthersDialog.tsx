import { Checkbox, HStack, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { TrialRow } from '../pages/EvaluationEditor'
import AppDialog, { AppDialogFooter } from './AppDialog'

type TrialField =
	| 'provider'
	| 'model'
	| 'temperature'
	| 'reasoning'
	| 'repetitions'
	| 'toolSearch'
	| 'toolSearchHints'
	| 'toolSearchMode'
	| 'subagentsEnabled'
	| 'subagentMaxDepth'

const FIELDS: { key: TrialField; label: string }[] = [
	{ key: 'provider', label: 'Provider' },
	{ key: 'model', label: 'Model' },
	{ key: 'temperature', label: 'Temperature' },
	{ key: 'reasoning', label: 'Reasoning' },
	{ key: 'repetitions', label: 'Repetitions' },
	{ key: 'toolSearch', label: 'Tool Search' },
	{ key: 'toolSearchHints', label: 'Tool Search Hints' },
	{ key: 'toolSearchMode', label: 'Tool Search Mode' },
	{ key: 'subagentsEnabled', label: 'Subagents' },
	{ key: 'subagentMaxDepth', label: 'Subagent Max Depth' },
]

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedTrials: TrialRow[]
	onApply: (fields: TrialField[]) => void
}

export type { TrialField }

export default function ApplyToOthersDialog({
	open,
	onOpenChange,
	selectedTrials,
	onApply,
}: Props) {
	const [checked, setChecked] = useState<Set<TrialField>>(new Set())

	const toggle = (field: TrialField) => {
		setChecked((prev) => {
			const next = new Set(prev)
			if (next.has(field)) next.delete(field)
			else next.add(field)
			return next
		})
	}

	const handleApply = () => {
		if (checked.size === 0) return
		onApply([...checked])
		setChecked(new Set())
		onOpenChange(false)
	}

	// Show value preview for selected field
	const getValuePreview = (field: TrialField): string => {
		const values = [...new Set(selectedTrials.map((t) => String(t[field])))]
		if (values.length === 1) return values[0]
		return `${values.length} different values (first selected wins)`
	}

	return (
		<AppDialog
			open={open}
			onOpenChange={(o) => {
				if (!o) setChecked(new Set())
				onOpenChange(o)
			}}
			title="Apply to Others"
			size="md"
			footer={
				<AppDialogFooter
					onCancel={() => onOpenChange(false)}
					onConfirm={handleApply}
					confirmLabel="Apply"
					confirmDisabled={checked.size === 0}
				/>
			}
		>
			<VStack align="stretch" gap={1}>
				<Text fontSize="sm" color="fg.muted" mb={2}>
					Copy properties from {selectedTrials.length} selected trial
					{selectedTrials.length > 1 ? 's' : ''} to all other trials.
				</Text>
				{FIELDS.map(({ key, label }) => (
					<HStack key={key} gap={3} py={1}>
						<Checkbox.Root size="sm" checked={checked.has(key)} onCheckedChange={() => toggle(key)}>
							<Checkbox.HiddenInput />
							<Checkbox.Control>
								<Checkbox.Indicator />
							</Checkbox.Control>
						</Checkbox.Root>
						<VStack align="start" gap={0}>
							<Text fontSize="sm">{label}</Text>
							<Text fontSize="xs" color="fg.muted">
								{getValuePreview(key)}
							</Text>
						</VStack>
					</HStack>
				))}
			</VStack>
		</AppDialog>
	)
}

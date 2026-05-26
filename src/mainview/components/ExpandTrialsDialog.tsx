import { Checkbox, Field, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { TrialRow } from '../pages/EvaluationEditor'
import AppDialog, { AppDialogFooter } from './AppDialog'

type ExpandAxis = 'temperature' | 'reasoning' | 'repetitions'

interface AxisConfig {
	key: ExpandAxis
	label: string
	placeholder: string
	parse: (input: string) => unknown[]
	fieldKey: keyof TrialRow
}

const AXES: AxisConfig[] = [
	{
		key: 'temperature',
		label: 'Temperature sweep',
		placeholder: '0.0, 0.5, 1.0',
		parse: (s) =>
			s
				.split(',')
				.map((v) => Number.parseFloat(v.trim()))
				.filter((n) => !Number.isNaN(n)),
		fieldKey: 'temperature',
	},
	{
		key: 'reasoning',
		label: 'Reasoning sweep',
		placeholder: 'low, medium, high',
		parse: (s) =>
			s
				.split(',')
				.map((v) => v.trim())
				.filter(Boolean),
		fieldKey: 'reasoning',
	},
	{
		key: 'repetitions',
		label: 'Repetitions sweep',
		placeholder: '1, 3, 5',
		parse: (s) =>
			s
				.split(',')
				.map((v) => Number.parseInt(v.trim(), 10))
				.filter((n) => !Number.isNaN(n) && n > 0),
		fieldKey: 'repetitions',
	},
]

interface Props {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedTrials: TrialRow[]
	onExpand: (newTrials: TrialRow[]) => void
}

export default function ExpandTrialsDialog({
	open,
	onOpenChange,
	selectedTrials,
	onExpand,
}: Props) {
	const [enabled, setEnabled] = useState<Set<ExpandAxis>>(new Set())
	const [inputs, setInputs] = useState<Record<ExpandAxis, string>>({
		temperature: '',
		reasoning: '',
		repetitions: '',
	})

	const toggleAxis = (axis: ExpandAxis) => {
		setEnabled((prev) => {
			const next = new Set(prev)
			if (next.has(axis)) next.delete(axis)
			else next.add(axis)
			return next
		})
	}

	const computeExpansion = (): TrialRow[] => {
		// Build variation arrays for each enabled axis
		const axes: { fieldKey: keyof TrialRow; values: unknown[] }[] = []
		for (const axis of AXES) {
			if (!enabled.has(axis.key)) continue
			const vals = axis.parse(inputs[axis.key])
			if (vals.length > 0) axes.push({ fieldKey: axis.fieldKey, values: vals })
		}
		if (axes.length === 0) return []

		// Cartesian product of all axis values
		const combos: Record<string, unknown>[] = axes.reduce<Record<string, unknown>[]>(
			(acc, { fieldKey, values }) =>
				acc.flatMap((combo) => values.map((v) => ({ ...combo, [fieldKey]: v }))),
			[{}],
		)

		// Apply combos to each selected trial
		const result: TrialRow[] = []
		for (const trial of selectedTrials) {
			for (const combo of combos) {
				result.push({ ...trial, ...combo } as TrialRow)
			}
		}
		return result
	}

	const preview = enabled.size > 0 ? computeExpansion() : []

	const handleExpand = () => {
		if (preview.length === 0) return
		onExpand(preview)
		setEnabled(new Set())
		setInputs({ temperature: '', reasoning: '', repetitions: '' })
		onOpenChange(false)
	}

	return (
		<AppDialog
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					setEnabled(new Set())
					setInputs({ temperature: '', reasoning: '', repetitions: '' })
				}
				onOpenChange(o)
			}}
			title="Expand Trials (Cartesian)"
			size="md"
			footer={
				<AppDialogFooter
					onCancel={() => onOpenChange(false)}
					onConfirm={handleExpand}
					confirmLabel={`Expand (${preview.length} new)`}
					confirmDisabled={preview.length === 0}
				/>
			}
		>
			<VStack align="stretch" gap={3}>
				<Text fontSize="sm" color="fg.muted">
					Generate a cartesian product from {selectedTrials.length} selected trial
					{selectedTrials.length > 1 ? 's' : ''} across one or more axes.
				</Text>
				{AXES.map((axis) => (
					<VStack key={axis.key} align="stretch" gap={1}>
						<HStack gap={3}>
							<Checkbox.Root
								size="sm"
								checked={enabled.has(axis.key)}
								onCheckedChange={() => toggleAxis(axis.key)}
							>
								<Checkbox.HiddenInput />
								<Checkbox.Control>
									<Checkbox.Indicator />
								</Checkbox.Control>
							</Checkbox.Root>
							<Text fontSize="sm" fontWeight="medium">
								{axis.label}
							</Text>
						</HStack>
						{enabled.has(axis.key) && (
							<Field.Root ps={7}>
								<Input
									size="sm"
									placeholder={axis.placeholder}
									value={inputs[axis.key]}
									onChange={(e) =>
										setInputs((prev) => ({
											...prev,
											[axis.key]: e.target.value,
										}))
									}
								/>
								<Field.HelperText>Comma-separated values</Field.HelperText>
							</Field.Root>
						)}
					</VStack>
				))}
				{preview.length > 0 && (
					<Text fontSize="xs" color="fg.muted" mt={2}>
						Will append {preview.length} trial
						{preview.length > 1 ? 's' : ''} ({selectedTrials.length} base ×{' '}
						{preview.length / selectedTrials.length} combinations).
					</Text>
				)}
			</VStack>
		</AppDialog>
	)
}

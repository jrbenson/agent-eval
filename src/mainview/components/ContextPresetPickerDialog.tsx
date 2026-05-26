import { Card, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type {
	PresetContentDef,
	PresetContentSetDef,
	PresetSkillDef,
	PresetSkillSetDef,
} from '../../shared/rpc-types'
import AppDialog, { AppDialogFooter } from './AppDialog'
import CollapsibleSection from './CollapsibleSection'

type PresetItem =
	| { type: 'content'; preset: PresetContentDef }
	| { type: 'contentSet'; preset: PresetContentSetDef }
	| { type: 'skill'; preset: PresetSkillDef }
	| { type: 'skillSet'; preset: PresetSkillSetDef }

interface ContextPresetPickerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	presetContents: PresetContentDef[]
	presetContentSets: PresetContentSetDef[]
	presetSkills: PresetSkillDef[]
	presetSkillSets: PresetSkillSetDef[]
	onCopy: (item: PresetItem) => void
	copyingId: string | null
}

export default function ContextPresetPickerDialog({
	open,
	onOpenChange,
	presetContents,
	presetContentSets,
	presetSkills,
	presetSkillSets,
	onCopy,
	copyingId,
}: ContextPresetPickerDialogProps) {
	const [selected, setSelected] = useState<PresetItem | null>(null)

	const handleConfirm = () => {
		if (!selected) return
		onCopy(selected)
	}

	const handleClose = (isOpen: boolean) => {
		if (!isOpen) setSelected(null)
		onOpenChange(isOpen)
	}

	const isSelected = (type: string, presetId: string) =>
		selected?.type === type && selected.preset.presetId === presetId

	return (
		<AppDialog
			open={open}
			onOpenChange={handleClose}
			title="Apply Preset"
			size="lg"
			footer={
				<AppDialogFooter
					onCancel={() => handleClose(false)}
					onConfirm={handleConfirm}
					confirmLabel="Apply"
					confirmLoading={!!copyingId}
				/>
			}
		>
			<VStack gap={4} align="stretch">
				{presetContentSets.length > 0 && (
					<CollapsibleSection title="Content Sets" count={presetContentSets.length}>
						<Card.Root variant="outline">
							<Card.Body p={0}>
								<Table.Root size="sm">
									<Table.Body>
										{presetContentSets.map((cs) => (
											<Table.Row
												key={cs.presetId}
												cursor="pointer"
												bg={isSelected('contentSet', cs.presetId) ? 'blue.subtle' : undefined}
												_hover={{
													bg: isSelected('contentSet', cs.presetId) ? 'blue.subtle' : 'bg.subtle',
												}}
												onClick={() => setSelected({ type: 'contentSet', preset: cs })}
											>
												<Table.Cell fontWeight="medium">{cs.label}</Table.Cell>
												<Table.Cell color="fg.muted" fontSize="sm">
													{cs.description}
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
													{cs.contentPresetIds.length} items
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</CollapsibleSection>
				)}

				{presetContents.length > 0 && (
					<CollapsibleSection title="Content" count={presetContents.length}>
						<Card.Root variant="outline">
							<Card.Body p={0}>
								<Table.Root size="sm">
									<Table.Body>
										{presetContents.map((c) => (
											<Table.Row
												key={c.presetId}
												cursor="pointer"
												bg={isSelected('content', c.presetId) ? 'blue.subtle' : undefined}
												_hover={{
													bg: isSelected('content', c.presetId) ? 'blue.subtle' : 'bg.subtle',
												}}
												onClick={() => setSelected({ type: 'content', preset: c })}
											>
												<Table.Cell fontWeight="medium">{c.label}</Table.Cell>
												<Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted">
													{c.name}
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</CollapsibleSection>
				)}

				{presetSkillSets.length > 0 && (
					<CollapsibleSection title="Skill Sets" count={presetSkillSets.length}>
						<Card.Root variant="outline">
							<Card.Body p={0}>
								<Table.Root size="sm">
									<Table.Body>
										{presetSkillSets.map((ss) => (
											<Table.Row
												key={ss.presetId}
												cursor="pointer"
												bg={isSelected('skillSet', ss.presetId) ? 'blue.subtle' : undefined}
												_hover={{
													bg: isSelected('skillSet', ss.presetId) ? 'blue.subtle' : 'bg.subtle',
												}}
												onClick={() => setSelected({ type: 'skillSet', preset: ss })}
											>
												<Table.Cell fontWeight="medium">{ss.label}</Table.Cell>
												<Table.Cell color="fg.muted" fontSize="sm">
													{ss.description}
												</Table.Cell>
												<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
													{ss.skillPresetIds.length} skills
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</CollapsibleSection>
				)}

				{presetSkills.length > 0 && (
					<CollapsibleSection title="Skills" count={presetSkills.length}>
						<Card.Root variant="outline">
							<Card.Body p={0}>
								<Table.Root size="sm">
									<Table.Body>
										{presetSkills.map((s) => (
											<Table.Row
												key={s.presetId}
												cursor="pointer"
												bg={isSelected('skill', s.presetId) ? 'blue.subtle' : undefined}
												_hover={{
													bg: isSelected('skill', s.presetId) ? 'blue.subtle' : 'bg.subtle',
												}}
												onClick={() => setSelected({ type: 'skill', preset: s })}
											>
												<Table.Cell fontWeight="medium">{s.label}</Table.Cell>
												<Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted">
													{s.name}
												</Table.Cell>
												<Table.Cell color="fg.muted" fontSize="sm" maxW="200px" truncate>
													{s.description}
												</Table.Cell>
											</Table.Row>
										))}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</CollapsibleSection>
				)}

				<Text fontSize="xs" color="fg.muted">
					A copy will be created that you can edit freely.
				</Text>
			</VStack>
		</AppDialog>
	)
}

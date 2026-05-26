import { Card, Table, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import type { PresetToolDef, PresetToolSetDef } from '../../shared/rpc-types'
import AppDialog, { AppDialogFooter } from './AppDialog'
import CollapsibleSection from './CollapsibleSection'

type PresetItem =
	| { type: 'tool'; preset: PresetToolDef }
	| { type: 'toolSet'; preset: PresetToolSetDef }

interface PresetPickerDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	presetTools: PresetToolDef[]
	presetToolSets: PresetToolSetDef[]
	onCopyTool: (presetId: string) => void
	onCopyToolSet: (presetId: string) => void
	copyingId: string | null
}

export default function PresetPickerDialog({
	open,
	onOpenChange,
	presetTools,
	presetToolSets,
	onCopyTool,
	onCopyToolSet,
	copyingId,
}: PresetPickerDialogProps) {
	const [selected, setSelected] = useState<PresetItem | null>(null)

	const handleConfirm = () => {
		if (!selected) return
		if (selected.type === 'tool') {
			onCopyTool(selected.preset.presetId)
		} else {
			onCopyToolSet(selected.preset.presetId)
		}
	}

	const handleClose = (isOpen: boolean) => {
		if (!isOpen) setSelected(null)
		onOpenChange(isOpen)
	}

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
				{presetToolSets.length > 0 && (
					<CollapsibleSection title="Tool Sets" count={presetToolSets.length}>
						<Card.Root variant="outline">
							<Card.Body p={0}>
								<Table.Root size="sm">
									<Table.Body>
										{presetToolSets.map((s) => {
											const isSel =
												selected?.type === 'toolSet' && selected.preset.presetId === s.presetId
											return (
												<Table.Row
													key={s.presetId}
													cursor="pointer"
													bg={isSel ? 'blue.subtle' : undefined}
													_hover={{ bg: isSel ? 'blue.subtle' : 'bg.subtle' }}
													onClick={() => setSelected({ type: 'toolSet', preset: s })}
												>
													<Table.Cell fontWeight="medium">{s.label}</Table.Cell>
													<Table.Cell color="fg.muted" fontSize="sm">
														{s.description}
													</Table.Cell>
													<Table.Cell width="1" whiteSpace="nowrap" color="fg.muted" fontSize="xs">
														{s.toolPresetIds.length} tools
													</Table.Cell>
												</Table.Row>
											)
										})}
									</Table.Body>
								</Table.Root>
							</Card.Body>
						</Card.Root>
					</CollapsibleSection>
				)}

				<CollapsibleSection title="Tool Definitions" count={presetTools.length}>
					<Card.Root variant="outline">
						<Card.Body p={0}>
							<Table.Root size="sm">
								<Table.Body>
									{presetTools.map((t) => {
										const isSel =
											selected?.type === 'tool' && selected.preset.presetId === t.presetId
										return (
											<Table.Row
												key={t.presetId}
												cursor="pointer"
												bg={isSel ? 'blue.subtle' : undefined}
												_hover={{ bg: isSel ? 'blue.subtle' : 'bg.subtle' }}
												onClick={() => setSelected({ type: 'tool', preset: t })}
											>
												<Table.Cell fontWeight="medium">{t.label}</Table.Cell>
												<Table.Cell fontFamily="mono" fontSize="xs" color="fg.muted">
													{t.name}
												</Table.Cell>
												<Table.Cell color="fg.muted" fontSize="sm" maxW="300px" truncate>
													{t.description}
												</Table.Cell>
											</Table.Row>
										)
									})}
								</Table.Body>
							</Table.Root>
						</Card.Body>
					</Card.Root>
				</CollapsibleSection>

				<Text fontSize="xs" color="fg.muted">
					A copy will be created that you can edit freely.
				</Text>
			</VStack>
		</AppDialog>
	)
}

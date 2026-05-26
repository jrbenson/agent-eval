import { Switch, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import AppDialog, { AppDialogFooter } from './AppDialog'

interface ExportDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	entityName: string
	onExport: (includeMockBehavior: boolean) => void
	exporting: boolean
}

export default function ExportDialog({
	open,
	onOpenChange,
	entityName,
	onExport,
	exporting,
}: ExportDialogProps) {
	const [includeMock, setIncludeMock] = useState(false)

	return (
		<AppDialog
			open={open}
			onOpenChange={onOpenChange}
			title={`Export ${entityName}`}
			size="sm"
			footer={
				<AppDialogFooter
					onCancel={() => onOpenChange(false)}
					onConfirm={() => onExport(includeMock)}
					confirmLabel="Export"
					confirmLoading={exporting}
				/>
			}
		>
			<VStack gap={3} align="stretch">
				<Text fontSize="sm" color="fg.muted">
					Export as a portable JSON file.
				</Text>
				<Switch.Root checked={includeMock} onCheckedChange={(e) => setIncludeMock(e.checked)}>
					<Switch.HiddenInput />
					<Switch.Control>
						<Switch.Thumb />
					</Switch.Control>
					<Switch.Label fontSize="sm">Include mock behavior</Switch.Label>
				</Switch.Root>
				<Text fontSize="xs" color="fg.muted">
					{includeMock
						? 'Export includes label, mock response rules, core flag, and keywords.'
						: 'Export includes only name, description, and parameter schema.'}
				</Text>
			</VStack>
		</AppDialog>
	)
}

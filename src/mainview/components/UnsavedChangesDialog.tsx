import { Button, Dialog, Text } from '@chakra-ui/react'

interface UnsavedChangesDialogProps {
	open: boolean
	onSave: () => void
	onDiscard: () => void
	onCancel: () => void
	saving?: boolean
}

export default function UnsavedChangesDialog({
	open,
	onSave,
	onDiscard,
	onCancel,
	saving,
}: UnsavedChangesDialogProps) {
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(e) => {
				if (!e.open) onCancel()
			}}
			size="sm"
			lazyMount
			unmountOnExit
		>
			<Dialog.Backdrop />
			<Dialog.Positioner>
				<Dialog.Content>
					<Dialog.Header>
						<Dialog.Title>Unsaved Changes</Dialog.Title>
					</Dialog.Header>
					<Dialog.Body>
						<Text>You have unsaved changes that will be lost.</Text>
					</Dialog.Body>
					<Dialog.Footer>
						<Button variant="ghost" onClick={onDiscard}>
							Discard
						</Button>
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button colorPalette="blue" variant="solid" onClick={onSave} loading={saving}>
							Save
						</Button>
					</Dialog.Footer>
				</Dialog.Content>
			</Dialog.Positioner>
		</Dialog.Root>
	)
}

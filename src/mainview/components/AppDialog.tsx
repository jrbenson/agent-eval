import { Alert, Button, Dialog } from '@chakra-ui/react'
import type { ReactNode } from 'react'

export interface AppDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	size?: 'sm' | 'md' | 'lg' | 'xl'
	children: ReactNode
	error?: string | null
	footer?: ReactNode
}

export default function AppDialog({
	open,
	onOpenChange,
	title,
	size = 'lg',
	children,
	error,
	footer,
}: AppDialogProps) {
	return (
		<Dialog.Root
			open={open}
			onOpenChange={(e) => onOpenChange(e.open)}
			size={size}
			lazyMount
			unmountOnExit
		>
			<Dialog.Backdrop />
			<Dialog.Positioner>
				<Dialog.Content maxH="85vh" display="flex" flexDirection="column">
					<Dialog.Header flexShrink={0}>
						<Dialog.Title fontSize="md">{title}</Dialog.Title>
					</Dialog.Header>
					<Dialog.CloseTrigger />
					<Dialog.Body overflowY="auto" flex={1} pb={4}>
						{error && (
							<Alert.Root status="error" size="sm" mb={4}>
								<Alert.Indicator />
								<Alert.Title>{error}</Alert.Title>
							</Alert.Root>
						)}
						{children}
					</Dialog.Body>
					{footer && <Dialog.Footer flexShrink={0}>{footer}</Dialog.Footer>}
				</Dialog.Content>
			</Dialog.Positioner>
		</Dialog.Root>
	)
}

interface AppDialogFooterProps {
	onCancel: () => void
	onConfirm: () => void
	confirmLabel?: string
	cancelLabel?: string
	confirmLoading?: boolean
	confirmDisabled?: boolean
}

export function AppDialogFooter({
	onCancel,
	onConfirm,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	confirmLoading,
	confirmDisabled,
}: AppDialogFooterProps) {
	return (
		<>
			<Button size="sm" variant="outline" onClick={onCancel}>
				{cancelLabel}
			</Button>
			<Button
				size="sm"
				colorPalette="blue"
				variant="solid"
				onClick={onConfirm}
				loading={confirmLoading}
				disabled={confirmDisabled}
			>
				{confirmLabel}
			</Button>
		</>
	)
}

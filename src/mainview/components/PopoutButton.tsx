import { IconButton } from '@chakra-ui/react'
import type { MouseEvent } from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { useIsPopout } from '../hooks/use-popout'
import { rpcRequest } from '../rpc'

interface PopoutButtonProps {
	entityType: string
	entityId: string | undefined
	/** Wrap the action in a dirty guard — should call the callback if clean or after save/discard */
	guardNavigation: (proceed: () => void) => void
	/** Called after the popout window opens (typically navigates main window back to list) */
	onAfterPopout: () => void
}

export default function PopoutButton({
	entityType,
	entityId,
	guardNavigation,
	onAfterPopout,
}: PopoutButtonProps) {
	const isPopout = useIsPopout()
	if (!entityId || isPopout) return null

	const handlePopout = () => {
		guardNavigation(async () => {
			await rpcRequest.openPopoutWindow({ entityType, entityId })
			onAfterPopout()
		})
	}

	return (
		<IconButton aria-label="Open in new window" size="sm" variant="ghost" onClick={handlePopout}>
			<FiExternalLink />
		</IconButton>
	)
}

/** Lightweight popout button for table rows — no dirty guard, stops propagation */
export function RowPopoutButton({
	entityType,
	entityId,
}: {
	entityType: string
	entityId: string
}) {
	const handleClick = (e: MouseEvent) => {
		e.stopPropagation()
		rpcRequest.openPopoutWindow({ entityType, entityId }).catch(() => {
			// Popout creation failed — silently ignore
		})
	}

	return (
		<IconButton aria-label="Open in new window" size="xs" variant="ghost" onClick={handleClick}>
			<FiExternalLink />
		</IconButton>
	)
}

import { useCallback, useRef, useState } from 'react'
import type { NavigationGuard } from './use-navigation-guard'

interface UsePendingGuardActionOptions {
	onDiscard?: () => void
	onCancel?: () => void
	onSaveSuccess?: () => void
}

export function usePendingGuardAction(options: UsePendingGuardActionOptions = {}) {
	const { onDiscard, onCancel, onSaveSuccess } = options
	const guardRef = useRef<NavigationGuard | null>(null)
	const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
	const [saving, setSaving] = useState(false)

	const setGuard = useCallback((guard: NavigationGuard | null) => {
		guardRef.current = guard
	}, [])

	const clearPendingAction = useCallback(() => {
		setPendingAction(null)
	}, [])

	const runGuardedAction = useCallback((action: () => void) => {
		const guard = guardRef.current
		if (guard?.isDirty()) {
			setPendingAction(() => action)
			return
		}
		action()
	}, [])

	const handleDiscard = useCallback(() => {
		onDiscard?.()
		pendingAction?.()
		clearPendingAction()
	}, [clearPendingAction, onDiscard, pendingAction])

	const handleCancel = useCallback(() => {
		onCancel?.()
		clearPendingAction()
	}, [clearPendingAction, onCancel])

	const handleSave = useCallback(async () => {
		const guard = guardRef.current
		if (!guard) return

		setSaving(true)
		try {
			await guard.save()
			if (!guard.isDirty()) {
				onSaveSuccess?.()
				pendingAction?.()
				clearPendingAction()
			} else {
				onCancel?.()
				clearPendingAction()
			}
		} catch {
			onCancel?.()
			clearPendingAction()
		} finally {
			setSaving(false)
		}
	}, [clearPendingAction, onCancel, onSaveSuccess, pendingAction])

	return {
		clearPendingAction,
		guardRef,
		handleCancel,
		handleDiscard,
		handleSave,
		hasPendingAction: pendingAction !== null,
		runGuardedAction,
		saving,
		setGuard,
		setPendingAction,
	}
}

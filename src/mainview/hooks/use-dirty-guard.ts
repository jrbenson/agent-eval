import { useCallback, useMemo, useRef, useState } from 'react'
import type { NavigationGuard } from './use-navigation-guard'

/**
 * Tracks whether form state has changed since last save/load.
 * Uses JSON snapshot comparison. Tracking only activates after
 * the first `markClean()` call (so initial populate doesn't
 * register as dirty).
 */
export function useDirtyGuard(currentStateJson: string) {
	const currentRef = useRef(currentStateJson)
	currentRef.current = currentStateJson

	const savedSnapshotRef = useRef<string | null>(null)
	const [, setTick] = useState(0)
	const [pendingNav, setPendingNav] = useState<(() => void) | null>(null)
	const saveRef = useRef<(() => Promise<void>) | null>(null)

	const isDirty =
		savedSnapshotRef.current !== null && currentRef.current !== savedSnapshotRef.current

	/** Capture current state as the "clean" baseline. */
	const markClean = useCallback(() => {
		savedSnapshotRef.current = currentRef.current
		setTick((c) => c + 1)
	}, [])

	/** If dirty, show dialog instead of navigating. If clean, proceed. */
	const guardNavigation = useCallback((proceed: () => void) => {
		const dirty =
			savedSnapshotRef.current !== null && currentRef.current !== savedSnapshotRef.current
		if (!dirty) {
			proceed()
			return
		}
		setPendingNav(() => proceed)
	}, [])

	const handleDiscard = useCallback(() => {
		pendingNav?.()
		setPendingNav(null)
	}, [pendingNav])

	const handleCancel = useCallback(() => {
		setPendingNav(null)
	}, [])

	const handleDialogSave = useCallback(async () => {
		if (saveRef.current) {
			const snapshotBefore = savedSnapshotRef.current
			try {
				await saveRef.current()
				// Only navigate away if save actually succeeded (markClean was called)
				if (savedSnapshotRef.current !== snapshotBefore) {
					pendingNav?.()
					setPendingNav(null)
				} else {
					// Save returned without calling markClean — validation failed, stay on page
					setPendingNav(null)
				}
			} catch {
				// Save threw — builder shows error toast, stay on page
				setPendingNav(null)
			}
		} else {
			setPendingNav(null)
		}
	}, [pendingNav])

	/** Stable guard object for App-level sidebar navigation interception. */
	const navGuard = useMemo<NavigationGuard>(
		() => ({
			isDirty: () =>
				savedSnapshotRef.current !== null && currentRef.current !== savedSnapshotRef.current,
			save: async () => {
				await saveRef.current?.()
				// Don't force-update snapshot here — let markClean() handle it in the save handler
			},
		}),
		[],
	)

	return {
		isDirty,
		markClean,
		guardNavigation,
		showDialog: pendingNav !== null,
		handleDialogSave,
		handleDiscard,
		handleCancel,
		saveRef,
		navGuard,
	}
}

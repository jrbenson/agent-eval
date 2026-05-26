import { useCallback, useEffect, useRef, useState } from 'react'

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseAutosaveOptions {
	/** Debounce delay in ms. Default 800. */
	delay?: number
	/** Skip autosave when true (e.g., disabled fields, empty required values). */
	skip?: boolean
	/** Called whenever the status changes. Useful for bubbling status to a parent. */
	onStatusChange?: (status: AutosaveStatus) => void
}

/**
 * Debounced autosave hook.
 *
 * Fires `saveFn` after `delay` ms of idle time following a `data` change.
 * Compares `data` against the last-saved snapshot to avoid redundant saves
 * and crucially prevents saving on initial mount.
 *
 * @param data - Serialized form state (JSON.stringify of the values to persist).
 * @param saveFn - Async function that performs the actual save.
 * @param options - Configuration.
 * @returns { status } for UI indicator.
 */
export function useAutosave(
	data: string,
	saveFn: () => Promise<void>,
	options?: UseAutosaveOptions,
): { status: AutosaveStatus } {
	const { delay = 800, skip = false, onStatusChange } = options ?? {}
	const [status, setStatus] = useState<AutosaveStatus>('idle')

	// Track the last successfully saved snapshot to avoid redundant saves.
	const lastSavedRef = useRef<string>(data)
	// Keep saveFn ref stable to avoid re-triggering effect on fn identity change.
	const saveFnRef = useRef(saveFn)
	saveFnRef.current = saveFn
	// Keep onStatusChange ref stable.
	const onStatusChangeRef = useRef(onStatusChange)
	onStatusChangeRef.current = onStatusChange
	// Timer handle.
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	// Track whether a save is in-flight to avoid overlapping saves.
	const savingRef = useRef(false)

	const updateStatus = useCallback((s: AutosaveStatus) => {
		setStatus(s)
		onStatusChangeRef.current?.(s)
	}, [])

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}
	}, [])

	useEffect(() => {
		// Don't save if skip is set or data matches last saved snapshot.
		if (skip || data === lastSavedRef.current) {
			clearTimer()
			return
		}

		clearTimer()
		timerRef.current = setTimeout(async () => {
			if (savingRef.current) return
			savingRef.current = true
			updateStatus('saving')
			try {
				await saveFnRef.current()
				lastSavedRef.current = data
				updateStatus('saved')
				// Reset to idle after 2s so indicator fades.
				setTimeout(() => updateStatus('idle'), 2000)
			} catch {
				updateStatus('error')
				setTimeout(() => updateStatus('idle'), 3000)
			} finally {
				savingRef.current = false
			}
		}, delay)

		return clearTimer
	}, [data, skip, delay, clearTimer, updateStatus])

	// On unmount, clear any pending timer.
	useEffect(() => clearTimer, [clearTimer])

	return { status }
}

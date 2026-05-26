import { useCallback, useMemo, useState } from 'react'

export interface MultiSelectState {
	isSelected: (id: string) => boolean
	toggle: (id: string) => void
	selectAll: () => void
	deselectAll: () => void
	isAllSelected: boolean
	hasSelection: boolean
	selectedCount: number
	selectedIds: string[]
	reset: () => void
}

export function useMultiSelect<T extends { id: string }>(visibleItems: T[]): MultiSelectState {
	const [selected, setSelected] = useState<Set<string>>(new Set())

	const visibleIds = useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems])

	// Only count selections that are still visible
	const activeSelected = useMemo(
		() => new Set([...selected].filter((id) => visibleIds.has(id))),
		[selected, visibleIds],
	)

	const isSelected = useCallback((id: string) => activeSelected.has(id), [activeSelected])

	const toggle = useCallback((id: string) => {
		setSelected((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}, [])

	const selectAll = useCallback(() => {
		setSelected(new Set(visibleIds))
	}, [visibleIds])

	const deselectAll = useCallback(() => {
		setSelected(new Set())
	}, [])

	const reset = useCallback(() => {
		setSelected(new Set())
	}, [])

	const selectedIds = useMemo(() => [...activeSelected], [activeSelected])
	const selectedCount = activeSelected.size
	const hasSelection = selectedCount > 0
	const isAllSelected = visibleItems.length > 0 && selectedCount === visibleItems.length

	return {
		isSelected,
		toggle,
		selectAll,
		deselectAll,
		isAllSelected,
		hasSelection,
		selectedCount,
		selectedIds,
		reset,
	}
}

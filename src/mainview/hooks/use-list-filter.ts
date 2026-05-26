import { useMemo, useState } from 'react'

export interface SortOption<T> {
	label: string
	value: string
	fn: (a: T, b: T) => number
}

export interface UseListFilterOptions<T> {
	items: T[]
	searchFn: (item: T, query: string) => boolean
	sortOptions: SortOption<T>[]
	defaultSort?: string
}

export function useListFilter<T>({
	items,
	searchFn,
	sortOptions,
	defaultSort,
}: UseListFilterOptions<T>) {
	const [filterText, setFilterText] = useState('')
	const [sortValue, setSortValue] = useState(defaultSort ?? sortOptions[0]?.value ?? '')

	const filteredItems = useMemo(() => {
		let result = items
		if (filterText) {
			const q = filterText.toLowerCase()
			result = result.filter((item) => searchFn(item, q))
		}
		const sortOpt = sortOptions.find((s) => s.value === sortValue)
		if (sortOpt) {
			result = [...result].sort(sortOpt.fn)
		}
		return result
	}, [items, filterText, sortValue, searchFn, sortOptions])

	return {
		filteredItems,
		filterText,
		setFilterText,
		sortValue,
		setSortValue,
		sortOptions,
	}
}

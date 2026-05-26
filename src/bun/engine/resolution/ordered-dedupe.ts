interface OrderedDedupeOptions<TItem> {
	key: (item: TItem) => string
	normalizeKey?: (key: string) => string
	duplicateWarning?: (key: string, item: TItem) => string | undefined
}

export function dedupeByLastWrite<TItem>(
	items: TItem[],
	options: OrderedDedupeOptions<TItem>,
): { items: TItem[]; warnings: string[] } {
	const normalizeKey = options.normalizeKey ?? ((key: string) => key)
	const lastSeenIndex = new Map<string, number>()
	const firstSeenKeys: string[] = []
	const warnings: string[] = []

	for (let index = 0; index < items.length; index++) {
		const item = items[index]
		const rawKey = options.key(item)
		const dedupeKey = normalizeKey(rawKey)

		if (lastSeenIndex.has(dedupeKey)) {
			const warning = options.duplicateWarning?.(rawKey, item)
			if (warning) {
				warnings.push(warning)
			}
		} else {
			firstSeenKeys.push(dedupeKey)
		}

		lastSeenIndex.set(dedupeKey, index)
	}

	return {
		items: firstSeenKeys.map((key) => items[lastSeenIndex.get(key)!]),
		warnings,
	}
}

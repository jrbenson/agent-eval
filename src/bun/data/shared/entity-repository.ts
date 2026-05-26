import { deleteJsonFile, listJsonDir, readJsonOrNull, writeJsonAtomic } from '../fs/json-store'

interface EntityRecord {
	id: string
	createdAt: string
	updatedAt: string
}

interface EntityMeta {
	id: string
	now: string
}

interface UpdateEntityMeta {
	now: string
}

interface EntityRepositoryOptions<TCreate, TStored extends EntityRecord, TListItem = TStored> {
	pathForId: (id: string) => string
	dirPath: () => string
	createStored: (data: TCreate, meta: EntityMeta) => TStored
	updateStored?: (existing: TStored, data: Partial<TCreate>, meta: UpdateEntityMeta) => TStored
	normalize?: (stored: TStored) => TStored
	sort?: (left: TStored, right: TStored) => number
	mapListItem?: (stored: TStored) => TListItem
}

function defaultUpdateStored<TCreate, TStored extends EntityRecord>(
	existing: TStored,
	data: Partial<TCreate>,
	meta: UpdateEntityMeta,
): TStored {
	return {
		...existing,
		...data,
		id: existing.id,
		updatedAt: meta.now,
	} as TStored
}

export function sortByCreatedAtAscending<TStored extends EntityRecord>(
	left: TStored,
	right: TStored,
) {
	return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
}

export function sortByCreatedAtDescending<TStored extends EntityRecord>(
	left: TStored,
	right: TStored,
) {
	return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

export function createEntityRepository<TCreate, TStored extends EntityRecord, TListItem = TStored>(
	options: EntityRepositoryOptions<TCreate, TStored, TListItem>,
) {
	const normalize = options.normalize ?? ((stored: TStored) => stored)
	const updateStored = options.updateStored ?? defaultUpdateStored<TCreate, TStored>
	const mapListItem = options.mapListItem ?? ((stored: TStored) => stored as unknown as TListItem)
	const sort = options.sort ?? sortByCreatedAtAscending<TStored>

	function create(data: TCreate) {
		const id = crypto.randomUUID()
		const now = new Date().toISOString()
		const stored = normalize(options.createStored(data, { id, now }))

		writeJsonAtomic(options.pathForId(id), stored)
		return { id }
	}

	function get(id: string): TStored | null {
		const stored = readJsonOrNull<TStored>(options.pathForId(id))
		if (!stored) return null
		return normalize(stored)
	}

	function list(): TListItem[] {
		return listJsonDir<TStored>(options.dirPath(), sort).map((stored) =>
			mapListItem(normalize(stored)),
		)
	}

	function update(id: string, data: Partial<TCreate>) {
		const existing = get(id)
		if (!existing) return { success: false }

		const updated = normalize(
			updateStored(existing, data, {
				now: new Date().toISOString(),
			}),
		)

		writeJsonAtomic(options.pathForId(id), updated)
		return { success: true }
	}

	function remove(id: string) {
		return { success: deleteJsonFile(options.pathForId(id)) }
	}

	return {
		create,
		get,
		list,
		update,
		delete: remove,
	}
}

import { useEffect, useState } from 'react'
import { generateDefaultName } from '../utils/default-name'

/**
 * Shared hook for builder pages: handles form population from existing entities
 * and auto-naming for new entities.
 */
export function useEntityEditorBootstrap<T>({
	isEditing,
	existing,
	allEntities,
	entityType,
	nameExtractor = (e) => e.label,
	onPopulate,
	setName,
}: {
	isEditing: boolean
	existing: T | undefined | null
	allEntities: { label: string }[] | undefined
	entityType: string
	nameExtractor?: (entity: { label: string }) => string
	onPopulate: (data: NonNullable<T>) => void
	setName: (name: string) => void
}) {
	const [loaded, setLoaded] = useState(false)
	const [defaultNameDone, setDefaultNameDone] = useState(false)

	// Populate form from existing entity on edit
	useEffect(() => {
		if (isEditing && existing && !loaded) {
			onPopulate(existing as NonNullable<T>)
			setLoaded(true)
		}
	}, [isEditing, existing, loaded, onPopulate])

	// Auto-generate default name on create
	useEffect(() => {
		if (!isEditing && !defaultNameDone && allEntities) {
			const names = allEntities.map(nameExtractor)
			setName(generateDefaultName(entityType, names))
			setDefaultNameDone(true)
		}
	}, [isEditing, allEntities, entityType, nameExtractor, setName, defaultNameDone])

	/** True once form state has stabilized after initial populate or default name. */
	const ready = isEditing ? loaded : defaultNameDone

	return { loaded, ready }
}

export const useBuilderForm = useEntityEditorBootstrap

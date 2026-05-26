import type { TaskParams } from '../../shared/rpc-types'
import { taskPath, tasksDir } from './paths'
import { createEntityRepository, sortByCreatedAtAscending } from './shared/entity-repository'
import { normalizeTaskCollections } from './task-normalization'

export interface StoredTask extends TaskParams {
	id: string
	createdAt: string
	updatedAt: string
}

function applyMigrations(task: StoredTask): StoredTask {
	return normalizeTaskCollections(task)
}

const taskRepository = createEntityRepository<TaskParams, StoredTask>({
	pathForId: taskPath,
	dirPath: tasksDir,
	createStored(data, meta) {
		return normalizeTaskCollections({
			id: meta.id,
			...data,
			createdAt: meta.now,
			updatedAt: meta.now,
		})
	},
	updateStored(existing, data, meta) {
		return normalizeTaskCollections({
			...existing,
			...data,
			id: existing.id,
			updatedAt: meta.now,
		})
	},
	normalize: applyMigrations,
	sort: sortByCreatedAtAscending,
})

export const createTask = taskRepository.create
export const getTask = taskRepository.get
export const listTasks = taskRepository.list
export const updateTask = taskRepository.update
export const deleteTask = taskRepository.delete

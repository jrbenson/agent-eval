import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useTasks() {
	return useQuery({
		queryKey: ['tasks'],
		queryFn: () => rpcRequest.listTasks({}),
	})
}

export function useTask(id: string | null) {
	return useQuery({
		queryKey: ['task', id],
		queryFn: () => rpcRequest.getTask({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateTask() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createTask>[0]) =>
			rpcRequest.createTask(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tasks'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useUpdateTask() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateTask>[0]) =>
			rpcRequest.updateTask(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['tasks'] })
			qc.invalidateQueries({ queryKey: ['task', variables.id] })
		},
	})
}

export function useDeleteTask() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteTask({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tasks'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useBulkDeleteTasks() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteTasks({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['tasks'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

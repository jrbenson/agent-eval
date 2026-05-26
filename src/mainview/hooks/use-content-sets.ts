import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useContentSets() {
	return useQuery({
		queryKey: ['contentSets'],
		queryFn: () => rpcRequest.listContentSets({}),
	})
}

export function useContentSet(id: string | null) {
	return useQuery({
		queryKey: ['contentSet', id],
		queryFn: () => rpcRequest.getContentSet({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateContentSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createContentSet>[0]) =>
			rpcRequest.createContentSet(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contentSets'] })
		},
	})
}

export function useUpdateContentSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateContentSet>[0]) =>
			rpcRequest.updateContentSet(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['contentSets'] })
			qc.invalidateQueries({ queryKey: ['contentSet', variables.id] })
		},
	})
}

export function useDeleteContentSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteContentSet({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contentSets'] })
		},
	})
}

export function useBulkDeleteContentSets() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteContentSets({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contentSets'] })
		},
	})
}

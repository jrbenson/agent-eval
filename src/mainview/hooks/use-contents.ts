import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useContents() {
	return useQuery({
		queryKey: ['contents'],
		queryFn: () => rpcRequest.listContents({}),
	})
}

export function useContent(id: string | null) {
	return useQuery({
		queryKey: ['content', id],
		queryFn: () => rpcRequest.getContent({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateContent() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createContent>[0]) =>
			rpcRequest.createContent(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contents'] })
		},
	})
}

export function useUpdateContent() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateContent>[0]) =>
			rpcRequest.updateContent(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['contents'] })
			qc.invalidateQueries({ queryKey: ['content', variables.id] })
		},
	})
}

export function useDeleteContent() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteContent({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contents'] })
		},
	})
}

export function useBulkDeleteContent() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteContent({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['contents'] })
		},
	})
}

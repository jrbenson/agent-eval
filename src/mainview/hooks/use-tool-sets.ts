import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useToolSets() {
	return useQuery({
		queryKey: ['toolSets'],
		queryFn: () => rpcRequest.listToolSets({}),
	})
}

export function useToolSet(id: string | null) {
	return useQuery({
		queryKey: ['toolSet', id],
		queryFn: () => rpcRequest.getToolSet({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateToolSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createToolSet>[0]) =>
			rpcRequest.createToolSet(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolSets'] })
		},
	})
}

export function useUpdateToolSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateToolSet>[0]) =>
			rpcRequest.updateToolSet(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['toolSets'] })
			qc.invalidateQueries({ queryKey: ['toolSet', variables.id] })
		},
	})
}

export function useDeleteToolSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteToolSet({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolSets'] })
		},
	})
}

export function useBulkDeleteToolSets() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteToolSets({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolSets'] })
		},
	})
}

// ---- Presets ----

export function usePresetToolSets() {
	return useQuery({
		queryKey: ['presetToolSets'],
		queryFn: () => rpcRequest.listPresetToolSets({}),
	})
}

export function useCopyPresetToolSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (presetId: string) => rpcRequest.copyPresetToolSet({ presetId }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolSets'] })
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

// ---- Export ----

export function useExportToolSet() {
	return useMutation({
		mutationFn: (params: { id: string; includeMockBehavior: boolean }) =>
			rpcRequest.exportToolSet(params),
	})
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useToolDefinitions() {
	return useQuery({
		queryKey: ['toolDefinitions'],
		queryFn: () => rpcRequest.listToolDefinitions({}),
	})
}

export function useToolDefinition(id: string | null) {
	return useQuery({
		queryKey: ['toolDefinition', id],
		queryFn: () => rpcRequest.getToolDefinition({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateToolDefinition() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createToolDefinition>[0]) =>
			rpcRequest.createToolDefinition(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

export function useUpdateToolDefinition() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateToolDefinition>[0]) =>
			rpcRequest.updateToolDefinition(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
			qc.invalidateQueries({ queryKey: ['toolDefinition', variables.id] })
		},
	})
}

export function useDeleteToolDefinition() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteToolDefinition({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

export function useBulkDeleteToolDefinitions() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteToolDefinitions({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

// ---- Presets ----

export function usePresetTools() {
	return useQuery({
		queryKey: ['presetTools'],
		queryFn: () => rpcRequest.listPresetTools({}),
	})
}

export function useCopyPresetTool() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (presetId: string) => rpcRequest.copyPresetTool({ presetId }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

// ---- Import/Export ----

export function useAnalyzeToolImport() {
	return useMutation({
		mutationFn: (json: string) => rpcRequest.analyzeToolImport({ json }),
	})
}

export function useCommitToolImport() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: { json: string; toolSetLabel?: string }) =>
			rpcRequest.commitToolImport(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
			qc.invalidateQueries({ queryKey: ['toolSets'] })
		},
	})
}

export function useExportToolDefinition() {
	return useMutation({
		mutationFn: (params: { id: string; includeMockBehavior: boolean }) =>
			rpcRequest.exportToolDefinition(params),
	})
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GeneratableEntityType } from '../../shared/rpc-types'
import { rpcRequest } from '../rpc'

export function useGenerateElement() {
	return useMutation({
		mutationFn: (params: {
			entityType: GeneratableEntityType
			existingData: Record<string, unknown>
			userInstructions?: string
		}) => rpcRequest.generateElement(params),
	})
}

export function useGenerateBatchToolMocks() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: { toolIds: string[] }) => rpcRequest.generateBatchToolMocks(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['toolDefinitions'] })
		},
	})
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useSkillSets() {
	return useQuery({
		queryKey: ['skillSets'],
		queryFn: () => rpcRequest.listSkillSets({}),
	})
}

export function useSkillSet(id: string | null) {
	return useQuery({
		queryKey: ['skillSet', id],
		queryFn: () => rpcRequest.getSkillSet({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateSkillSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createSkillSet>[0]) =>
			rpcRequest.createSkillSet(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skillSets'] })
		},
	})
}

export function useUpdateSkillSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateSkillSet>[0]) =>
			rpcRequest.updateSkillSet(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['skillSets'] })
			qc.invalidateQueries({ queryKey: ['skillSet', variables.id] })
		},
	})
}

export function useDeleteSkillSet() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteSkillSet({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skillSets'] })
		},
	})
}

export function useBulkDeleteSkillSets() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteSkillSets({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skillSets'] })
		},
	})
}

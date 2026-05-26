import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useSkills() {
	return useQuery({
		queryKey: ['skills'],
		queryFn: () => rpcRequest.listSkills({}),
	})
}

export function useSkill(id: string | null) {
	return useQuery({
		queryKey: ['skill', id],
		queryFn: () => rpcRequest.getSkill({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateSkill() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createSkill>[0]) =>
			rpcRequest.createSkill(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skills'] })
		},
	})
}

export function useUpdateSkill() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateSkill>[0]) =>
			rpcRequest.updateSkill(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['skills'] })
			qc.invalidateQueries({ queryKey: ['skill', variables.id] })
		},
	})
}

export function useDeleteSkill() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteSkill({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skills'] })
		},
	})
}

export function useBulkDeleteSkills() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteSkills({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['skills'] })
		},
	})
}

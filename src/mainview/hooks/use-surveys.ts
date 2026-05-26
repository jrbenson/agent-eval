import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rpcRequest } from '../rpc'

export function useSurveys() {
	return useQuery({
		queryKey: ['surveys'],
		queryFn: () => rpcRequest.listSurveys({}),
	})
}

export function useSurvey(id: string | null) {
	return useQuery({
		queryKey: ['survey', id],
		queryFn: () => rpcRequest.getSurvey({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateSurvey() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createSurvey>[0]) =>
			rpcRequest.createSurvey(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['surveys'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useUpdateSurvey() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateSurvey>[0]) =>
			rpcRequest.updateSurvey(params),
		onSuccess: (_, variables) => {
			qc.invalidateQueries({ queryKey: ['surveys'] })
			qc.invalidateQueries({ queryKey: ['survey', variables.id] })
		},
	})
}

export function useDeleteSurvey() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteSurvey({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['surveys'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useBulkDeleteSurveys() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteSurveys({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['surveys'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

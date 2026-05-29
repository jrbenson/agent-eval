import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AnalysisLens } from '../../shared/rpc-types'
import { rpcRequest } from '../rpc'

// ---- Evaluations ----

export function useEvaluations() {
	return useQuery({
		queryKey: ['evaluations'],
		queryFn: () => rpcRequest.listEvaluations({}),
	})
}

export function useEvaluation(id: string | null | undefined) {
	return useQuery({
		queryKey: ['evaluation', id],
		queryFn: () => rpcRequest.getEvaluation({ id: id! }),
		enabled: !!id,
	})
}

export function useCreateEvaluation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.createEvaluation>[0]) =>
			rpcRequest.createEvaluation(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['evaluations'] })
		},
	})
}

export function useUpdateEvaluation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateEvaluation>[0]) =>
			rpcRequest.updateEvaluation(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['evaluations'] })
			qc.invalidateQueries({ queryKey: ['evaluation'] })
		},
	})
}

export function useDeleteEvaluation() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteEvaluation({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['evaluations'] })
		},
	})
}

export function useBulkDeleteEvaluations() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) => rpcRequest.bulkDeleteEvaluations({ ids }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['evaluations'] })
		},
	})
}

// ---- Runs ----

export function useRuns(evaluationId?: string) {
	return useQuery({
		queryKey: ['runs', evaluationId],
		queryFn: () => rpcRequest.listRuns({ evaluationId }),
	})
}

export function useRun(runId: string | null) {
	return useQuery({
		queryKey: ['run', runId],
		queryFn: () => rpcRequest.getRun({ runId: runId! }),
		enabled: !!runId,
	})
}

export function useRunResults(runId: string | null) {
	return useQuery({
		queryKey: ['runResults', runId],
		queryFn: () => rpcRequest.getRunResults({ runId: runId! }),
		enabled: !!runId,
	})
}

export function useTrialData(runId: string | null, trialId: string | null) {
	return useQuery({
		queryKey: ['trialData', runId, trialId],
		queryFn: () => rpcRequest.getTrialData({ runId: runId!, trialId: trialId! }),
		enabled: !!runId && !!trialId,
	})
}

export function useTaskRunAnalysis(runId: string | null, analysisLens: AnalysisLens) {
	return useQuery({
		queryKey: ['taskRunAnalysis', runId, analysisLens],
		queryFn: () => rpcRequest.getTaskRunAnalysis({ runId: runId!, analysisLens }),
		enabled: !!runId,
	})
}

export function useAllRunResults(params: {
	scenarioId?: string
	scenarioType?: string
	limit?: number
	offset?: number
}) {
	return useQuery({
		queryKey: ['allRunResults', params],
		queryFn: () => rpcRequest.listRunResults(params),
	})
}

export function useStartRun() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.startRun>[0]) => rpcRequest.startRun(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['allRunResults'] })
			qc.invalidateQueries({ queryKey: ['runs'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useUpdateRun() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.updateRun>[0]) =>
			rpcRequest.updateRun(params),
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ['runs'] })
			qc.invalidateQueries({ queryKey: ['run', vars.runId] })
		},
	})
}

export function useCancelRun() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (runId: string) => rpcRequest.cancelRun({ runId }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['runs'] })
			qc.invalidateQueries({ queryKey: ['dashboardStats'] })
		},
	})
}

export function useRunStatus(runId: string | null) {
	return useQuery({
		queryKey: ['runStatus', runId],
		queryFn: () => rpcRequest.getRunStatus({ runId: runId! }),
		enabled: !!runId,
		refetchInterval: 2000,
	})
}

export function useDashboardStats() {
	return useQuery({
		queryKey: ['dashboardStats'],
		queryFn: () => rpcRequest.getDashboardStats({}),
	})
}

export function useSurveyRunAnswers(runId: string | null | undefined, analysisLens: AnalysisLens) {
	return useQuery({
		queryKey: ['surveyRunAnswers', runId, analysisLens],
		queryFn: () => rpcRequest.extractSurveyRunAnswers({ runId: runId!, analysisLens }),
		enabled: !!runId,
	})
}

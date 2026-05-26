import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UtilityLlmProfile, UtilityLlmPurpose } from '../../shared/rpc-types'
import { rpcRequest } from '../rpc'

export function useAgentConfigs() {
	return useQuery({
		queryKey: ['agentConfigs'],
		queryFn: () => rpcRequest.listAgentConfigs({}),
	})
}

export function useSaveAgentConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: Parameters<typeof rpcRequest.saveAgentConfig>[0]) =>
			rpcRequest.saveAgentConfig(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['agentConfigs'] })
		},
	})
}

export function useDeleteAgentConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (id: string) => rpcRequest.deleteAgentConfig({ id }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['agentConfigs'] })
		},
	})
}

export function useProviderStatus() {
	return useQuery({
		queryKey: ['providerStatus'],
		queryFn: () => rpcRequest.listProviderStatus({}),
	})
}

export function useSetApiKey() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: { provider: string; apiKey: string }) => rpcRequest.setApiKey(params),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['providerStatus'] })
		},
	})
}

export function useValidateApiKey() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (provider: string) => rpcRequest.validateApiKey({ provider }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['providerStatus'] })
		},
	})
}

export function useListModels(provider: string, enabled = true) {
	return useQuery({
		queryKey: ['models', provider],
		queryFn: () => rpcRequest.listModels({ provider }),
		enabled,
	})
}

export function useProviderConfig(provider: string) {
	return useQuery({
		queryKey: ['providerConfig', provider],
		queryFn: () => rpcRequest.getProviderConfig({ provider }),
	})
}

export function useSetProviderConfig() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: {
			provider: string
			config: Record<string, string>
		}) => rpcRequest.setProviderConfig(params),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['providerConfig', vars.provider] })
			qc.invalidateQueries({ queryKey: ['providerStatus'] })
			qc.invalidateQueries({ queryKey: ['models', vars.provider] })
		},
	})
}

// ---- Utility LLM Profiles ----

export function useUtilityLlmProfiles() {
	return useQuery({
		queryKey: ['utilityLlmProfiles'],
		queryFn: () => rpcRequest.listUtilityLlmProfiles({}),
	})
}

export function useUtilityLlmProfile(purpose: UtilityLlmPurpose) {
	return useQuery({
		queryKey: ['utilityLlmProfile', purpose],
		queryFn: () => rpcRequest.getUtilityLlmProfile({ purpose }),
	})
}

export function useSetUtilityLlmProfile() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (params: {
			purpose: UtilityLlmPurpose
			profile: UtilityLlmProfile
		}) => rpcRequest.setUtilityLlmProfile(params),
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({
				queryKey: ['utilityLlmProfile', vars.purpose],
			})
			qc.invalidateQueries({ queryKey: ['utilityLlmProfiles'] })
		},
	})
}

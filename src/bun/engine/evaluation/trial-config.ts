import type { AgentConfigParams } from '../../../shared/rpc-types'
import type { HarnessConfig } from '../harness'

export type AgentEntry = {
	config: HarnessConfig
	sourceParams: AgentConfigParams
	sourceIndex: number
}

export function buildAgentEntries(agentConfigs: AgentConfigParams[]): AgentEntry[] {
	return agentConfigs.flatMap((agentConfig, sourceIndex) => {
		const repetitions = agentConfig.repetitions ?? 1
		const config: HarnessConfig = {
			provider: agentConfig.provider,
			model: agentConfig.model,
			temperature: agentConfig.temperature,
			maxTokens: agentConfig.maxTokens,
			topP: agentConfig.topP,
			reasoning: agentConfig.reasoning,
		}

		return Array.from({ length: repetitions }, () => ({
			config: { ...config },
			sourceParams: agentConfig,
			sourceIndex,
		}))
	})
}

export function buildAgentConfigId(entry: AgentEntry): string {
	const base = `${entry.config.provider}:${entry.config.model}`
	const parts: string[] = []

	if (entry.config.temperature !== 0) {
		parts.push(`t=${entry.config.temperature}`)
	}
	if (entry.sourceParams.reasoning && entry.sourceParams.reasoning !== 'provider-default') {
		parts.push(`r=${entry.sourceParams.reasoning}`)
	}
	if (entry.sourceParams.toolSearch) {
		parts.push('ts')
	}
	if (entry.sourceParams.subagentsEnabled) {
		parts.push(`sa:${entry.sourceParams.subagentMaxDepth ?? 1}`)
	}

	return parts.length > 0 ? `${base} (${parts.join(', ')})` : base
}

import type { AgentConfigParams } from '../../shared/rpc-types'
import type { Provider } from '../../shared/schemas/agent-config.schema'
import { readJsonOrNull, writeJsonAtomic } from './fs/json-store'
import { settingsPath } from './paths'
import { invalidateModelCache } from './providers'

const SECRETS_SERVICE = 'app.agenteval'

export type KeyStatus = 'unvalidated' | 'valid' | 'invalid'

export interface UtilityLlmProfile {
	provider: string
	model: string
	temperature: number
	maxTokens?: number
}

export type UtilityLlmPurpose =
	| 'toolMock'
	| 'evaluation'
	| 'summarization'
	| 'generate'
	| 'simulation'

interface Settings {
	keyStatus: Record<string, KeyStatus>
	providerConfig: Record<string, Record<string, string>>
	agentPresets: (AgentConfigParams & { id: string })[]
	utilityLlm: Partial<Record<UtilityLlmPurpose, UtilityLlmProfile>>
}

function defaultSettings(): Settings {
	return {
		keyStatus: {},
		providerConfig: {},
		agentPresets: [],
		utilityLlm: {},
	}
}

function readSettings(): Settings {
	const data = readJsonOrNull<Partial<Settings>>(settingsPath())
	if (!data) return defaultSettings()
	return { ...defaultSettings(), ...data }
}

function writeSettings(settings: Settings): void {
	writeJsonAtomic(settingsPath(), settings)
}

// ---- API Keys (Bun.secrets) ----

export async function setApiKey(provider: string, apiKey: string): Promise<{ success: boolean }> {
	await Bun.secrets.set({
		service: SECRETS_SERVICE,
		name: provider,
		value: apiKey,
	})
	// Mark as unvalidated
	const settings = readSettings()
	settings.keyStatus[provider] = 'unvalidated'
	writeSettings(settings)
	invalidateModelCache(provider)
	return { success: true }
}

export async function getApiKey(provider: string): Promise<string | null> {
	return Bun.secrets.get({ service: SECRETS_SERVICE, name: provider })
}

export async function getApiKeyStatus(
	provider: string,
): Promise<{ isSet: boolean; keyStatus: KeyStatus | null }> {
	const key = await Bun.secrets.get({
		service: SECRETS_SERVICE,
		name: provider,
	})
	const settings = readSettings()
	return {
		isSet: !!key,
		keyStatus: key ? (settings.keyStatus[provider] ?? 'unvalidated') : null,
	}
}

export function setKeyValidationStatus(provider: string, status: KeyStatus): void {
	const settings = readSettings()
	settings.keyStatus[provider] = status
	writeSettings(settings)
}

export async function listProviderStatus() {
	const { ProviderSchema } = await import('../../shared/schemas/agent-config.schema')
	const providers = ProviderSchema.options
	const settings = readSettings()
	const statuses = await Promise.all(
		providers.map(async (provider) => {
			const key = await Bun.secrets.get({
				service: SECRETS_SERVICE,
				name: provider,
			})
			return {
				provider,
				isSet: !!key,
				keyStatus: key ? (settings.keyStatus[provider] ?? ('unvalidated' as KeyStatus)) : null,
			}
		}),
	)
	return statuses
}

// ---- Provider Config (non-secret provider settings, e.g. Azure resource name) ----

export function setProviderConfig(
	provider: string,
	config: Record<string, string>,
): { success: boolean } {
	const settings = readSettings()
	settings.providerConfig[provider] = {
		...(settings.providerConfig[provider] ?? {}),
		...config,
	}
	writeSettings(settings)
	invalidateModelCache(provider)
	return { success: true }
}

export function getProviderConfig(provider: string): Record<string, string> {
	const settings = readSettings()
	return settings.providerConfig[provider] ?? {}
}

// ---- Agent Presets ----

export function saveAgentConfig(data: {
	provider: string
	model: string
	temperature: number
	maxTokens?: number
	topP?: number
}) {
	const settings = readSettings()
	const id = crypto.randomUUID()
	settings.agentPresets.push({
		id,
		provider: data.provider as Provider,
		model: data.model,
		temperature: data.temperature,
		maxTokens: data.maxTokens,
		topP: data.topP,
	})
	writeSettings(settings)
	return { id }
}

export function listAgentConfigs() {
	const settings = readSettings()
	return settings.agentPresets
}

export function deleteAgentConfig(id: string) {
	const settings = readSettings()
	settings.agentPresets = settings.agentPresets.filter((p) => p.id !== id)
	writeSettings(settings)
	return { success: true }
}

// ---- Utility LLM Profiles ----

export function getUtilityLlmProfile(purpose: UtilityLlmPurpose): UtilityLlmProfile | null {
	const settings = readSettings()
	return settings.utilityLlm[purpose] ?? null
}

export function setUtilityLlmProfile(
	purpose: UtilityLlmPurpose,
	profile: UtilityLlmProfile,
): { success: boolean } {
	const settings = readSettings()
	settings.utilityLlm[purpose] = profile
	writeSettings(settings)
	return { success: true }
}

export function listUtilityLlmProfiles(): Record<string, UtilityLlmProfile | null> {
	const settings = readSettings()
	return {
		toolMock: settings.utilityLlm.toolMock ?? null,
		evaluation: settings.utilityLlm.evaluation ?? null,
		summarization: settings.utilityLlm.summarization ?? null,
		generate: settings.utilityLlm.generate ?? null,
		simulation: settings.utilityLlm.simulation ?? null,
	}
}

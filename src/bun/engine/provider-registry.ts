import { createAnthropic } from '@ai-sdk/anthropic'
import { createAzure } from '@ai-sdk/azure'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModelV3 } from '@ai-sdk/provider'
import { createXai } from '@ai-sdk/xai'
import type { Provider } from '../../shared/schemas/agent-config.schema'
import { getApiKey, getProviderConfig } from '../data/settings'
import type { UtilityLlmProfile } from '../data/settings'

export interface HarnessConfig {
	provider: Provider
	model: string
	temperature: number
	maxTokens?: number
	topP?: number
	reasoning?: string
}

export type ProviderModelResolver = (
	config: HarnessConfig,
) => LanguageModelV3 | Promise<LanguageModelV3>

let providerModelResolverForTests: ProviderModelResolver | null = null

export function setProviderModelResolverForTests(resolver: ProviderModelResolver): void {
	providerModelResolverForTests = resolver
}

export function resetProviderModelResolverForTests(): void {
	providerModelResolverForTests = null
}

const PROVIDER_FACTORIES: Record<
	string,
	(opts: {
		apiKey: string
	}) => (model: string) => ReturnType<ReturnType<typeof createOpenAI>>
> = {
	openai: createOpenAI,
	groq: createGroq,
	mistral: createMistral,
	anthropic: createAnthropic,
	google: createGoogleGenerativeAI,
	xai: createXai,
}

export async function getProviderModel(config: HarnessConfig) {
	if (providerModelResolverForTests) {
		return providerModelResolverForTests(config)
	}

	const apiKey = await getApiKey(config.provider)
	if (!apiKey) {
		throw new Error(`No API key configured for provider: ${config.provider}`)
	}

	// Azure needs special handling for resource name
	if (config.provider === 'azure') {
		const azureConfig = getProviderConfig('azure')
		const resourceName = azureConfig.resourceName
		if (!resourceName) {
			throw new Error('Azure resource name not configured. Set it in Settings.')
		}
		const provider = createAzure({ resourceName, apiKey })
		return provider(config.model)
	}

	const factory = PROVIDER_FACTORIES[config.provider]
	if (!factory) {
		throw new Error(`Unsupported provider: ${config.provider}`)
	}

	// biome-ignore lint/suspicious/noExplicitAny: provider factory types vary
	const provider = (factory as any)({ apiKey })
	return provider(config.model)
}

/**
 * Resolve a UtilityLlmProfile to an AI SDK model instance.
 */
export async function getUtilityModel(profile: UtilityLlmProfile) {
	return getProviderModel({
		provider: profile.provider as Provider,
		model: profile.model,
		temperature: profile.temperature,
	})
}
